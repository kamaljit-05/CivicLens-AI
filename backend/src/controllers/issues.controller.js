const { z } = require('zod');
const db = require('../config/db');
const { findPotentialDuplicates } = require('../services/duplicateDetection.service');
const { summarizeIssue, checkImageAuthenticity } = require('../services/aiClient.service');

const createIssueSchema = z.object({
  categorySlug: z.string(),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  solutionIdea: z.string().max(500).optional(),
  lat: z.number(),
  lng: z.number(),
  addressHint: z.string().max(200).optional(),
  imageUrl: z.string().url(), // uploaded separately via /api/issues/upload, referenced here
});

/**
 * POST /api/issues
 * Full pipeline: validate → authenticity check → insert (pending_review) →
 * duplicate detection → AI summary → return the created issue + any duplicate flags.
 * The issue is NEVER auto-published; it always lands in the admin queue first.
 */
async function createIssue(req, res, next) {
  try {
    const input = createIssueSchema.parse(req.body);

    const { rows: categoryRows } = await db.query(
      'SELECT id, slug FROM categories WHERE slug = $1',
      [input.categorySlug]
    );
    if (categoryRows.length === 0) {
      return res.status(400).json({ error: `Unknown category: ${input.categorySlug}` });
    }
    const category = categoryRows[0];

    // Authenticity check runs before the report is ever stored as "real evidence".
    const authenticity = await checkImageAuthenticity({ imageUrl: input.imageUrl });

    const { rows: inserted } = await db.query(
      `INSERT INTO issues (user_id, category_id, title, description, solution_idea, lat, lng, address_hint, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review')
       RETURNING *`,
      [
        req.user.id,
        category.id,
        input.title,
        input.description,
        input.solutionIdea || null,
        input.lat,
        input.lng,
        input.addressHint || null,
      ]
    );
    const issue = inserted[0];

    await db.query(
      `INSERT INTO issue_images (issue_id, url, is_ai_generated, authenticity_checked_at)
       VALUES ($1, $2, $3, now())`,
      [issue.id, input.imageUrl, authenticity.isAiGenerated]
    );

    // Duplicate detection (three-layer filter) — flags go to the admin queue, never auto-merged.
    const duplicates = await findPotentialDuplicates({
      id: issue.id,
      categoryId: category.id,
      categorySlug: category.slug,
      title: issue.title,
      description: issue.description,
      addressHint: issue.address_hint,
      lat: issue.lat,
      lng: issue.lng,
    });

    for (const dup of duplicates) {
      await db.query(
        `INSERT INTO duplicate_flags (issue_id, matched_issue_id, similarity_score, spatial_match, temporal_match, semantic_match)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [issue.id, dup.matchedIssueId, dup.score, dup.spatialMatch, dup.temporalMatch, dup.semanticMatch]
      );
    }

    if (duplicates.length > 0) {
      await db.query(`UPDATE issues SET status = 'potential_duplicate' WHERE id = $1`, [issue.id]);
    }

    // AI summary/suggestion — best-effort, non-blocking to the response shape.
    const { summary, suggestion } = await summarizeIssue({
      imageUrl: input.imageUrl,
      title: issue.title,
      description: issue.description,
    });
    if (summary) {
      await db.query(`UPDATE issues SET ai_summary = $1, ai_suggestion = $2 WHERE id = $3`, [
        summary,
        suggestion,
        issue.id,
      ]);
    }

    return res.status(201).json({
      issue: { ...issue, ai_summary: summary, ai_suggestion: suggestion },
      potentialDuplicates: duplicates,
      imageAuthenticity: authenticity,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    next(err);
  }
}

/**
 * GET /api/issues
 * Public browse/map feed — only ever returns issues an admin has approved.
 * Supports category and radius filtering.
 */
async function listIssues(req, res, next) {
  try {
    const { category, lat, lng, radiusKm = 5, limit = 50 } = req.query;

    const clauses = [`status IN ('approved', 'resolved')`];
    const params = [];

    if (category) {
      params.push(category);
      clauses.push(`category_id = (SELECT id FROM categories WHERE slug = $${params.length})`);
    }

    let radiusClause = '';
    if (lat && lng) {
      params.push(Number(lat), Number(lng), Number(radiusKm) * 1000);
      radiusClause = `AND (
        6371000 * acos(
          cos(radians($${params.length - 2})) * cos(radians(lat)) *
          cos(radians(lng) - radians($${params.length - 1})) +
          sin(radians($${params.length - 2})) * sin(radians(lat))
        )
      ) <= $${params.length}`;
    }

    params.push(Number(limit));

    const { rows } = await db.query(
      `SELECT i.id, i.title, i.description, i.status, i.lat, i.lng, i.created_at,
              c.slug AS category, c.label AS category_label,
              (SELECT url FROM issue_images WHERE issue_id = i.id ORDER BY created_at ASC LIMIT 1) AS thumbnail_url
       FROM issues i
       JOIN categories c ON c.id = i.category_id
       WHERE ${clauses.join(' AND ')} ${radiusClause}
       ORDER BY i.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ issues: rows });
  } catch (err) {
    next(err);
  }
}

async function getIssue(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT i.*, c.slug AS category, c.label AS category_label
       FROM issues i JOIN categories c ON c.id = i.category_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });

    const { rows: images } = await db.query('SELECT url FROM issue_images WHERE issue_id = $1', [
      req.params.id,
    ]);

    res.json({ issue: rows[0], images });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/issues/preview-analysis
 * Lets the reporter see the AI summary/suggestion (and authenticity read)
 * before they commit to submitting — nothing is written to the database here.
 */
async function previewAnalysis(req, res, next) {
  try {
    const { imageUrl, title, description } = req.body;
    if (!imageUrl || !title || !description) {
      return res.status(400).json({ error: 'imageUrl, title, and description are required' });
    }

    const [authenticity, aiResult] = await Promise.all([
      checkImageAuthenticity({ imageUrl }),
      summarizeIssue({ imageUrl, title, description }),
    ]);

    res.json({
      summary: aiResult.summary || 'AI summary unavailable right now — you can still submit your report.',
      suggestion: aiResult.suggestion || 'A suggested fix will be added once the report is reviewed.',
      imageAuthenticity: authenticity,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createIssue, listIssues, getIssue, previewAnalysis };

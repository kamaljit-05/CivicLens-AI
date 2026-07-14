const db = require('../config/db');

// Categories whose issues span a line rather than a point (wider search radius).
const LINEAR_CATEGORIES = new Set(['water_leak', 'drainage']);

const POINT_RADIUS_M = Number(process.env.DUPLICATE_POINT_RADIUS_M || 100);
const LINEAR_RADIUS_M = Number(process.env.DUPLICATE_LINEAR_RADIUS_M || 500);
const RESOLVED_WINDOW_DAYS = Number(process.env.DUPLICATE_RESOLVED_WINDOW_DAYS || 60);
const SIMILARITY_THRESHOLD = Number(process.env.DUPLICATE_SIMILARITY_THRESHOLD || 0.7);

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'near', 'at', 'in', 'on',
  'of', 'to', 'and', 'it', 'this', 'that', 'there', 'has', 'have', 'with',
]);

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

/** Jaccard similarity between two token sets — a lightweight stand-in for full NLP embeddings. */
function jaccardSimilarity(textA, textB) {
  const setA = new Set(tokenize(textA));
  const setB = new Set(tokenize(textB));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Haversine distance in meters between two lat/lng points.
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Three-layer duplicate filter, run synchronously right after a new issue is inserted.
 *
 * Layer 1 — Spatial proximity: candidate issues within a category-appropriate radius.
 * Layer 2 — Temporal relevance: drop issues resolved more than RESOLVED_WINDOW_DAYS ago.
 * Layer 3 — Semantic similarity: same category + text/keyword overlap above SIMILARITY_THRESHOLD.
 *
 * Returns an array of { matchedIssueId, score, spatialMatch, temporalMatch, semanticMatch }
 * for every candidate that trips all three layers. Callers should write these as
 * `duplicate_flags` rows and route the new issue to the admin queue rather than
 * auto-merging — merging silently would hide a citizen's report without any notice.
 */
async function findPotentialDuplicates(newIssue) {
  const radius = LINEAR_CATEGORIES.has(newIssue.categorySlug) ? LINEAR_RADIUS_M : POINT_RADIUS_M;

  // Layer 1 + 2 pushed into SQL: bounding box pre-filter (cheap) + explicit resolved-window cutoff.
  // ~1 degree latitude ≈ 111km, used to build a generous bounding box before the precise haversine check.
  const degreeBuffer = radius / 111000;

  const { rows: candidates } = await db.query(
    `SELECT id, category_id, title, description, address_hint, lat, lng, status, resolved_at, created_at
     FROM issues
     WHERE id != $1
       AND category_id = $2
       AND lat BETWEEN $3 - $6 AND $3 + $6
       AND lng BETWEEN $4 - $6 AND $4 + $6
       AND status != 'rejected'
       AND (resolved_at IS NULL OR resolved_at > now() - ($5 || ' days')::interval)
     ORDER BY created_at DESC
     LIMIT 25`,
    [newIssue.id, newIssue.categoryId, newIssue.lat, newIssue.lng, RESOLVED_WINDOW_DAYS, degreeBuffer]
  );

  const flags = [];

  for (const candidate of candidates) {
    // Layer 1 (precise): haversine distance within the true radius.
    const distanceM = haversineMeters(newIssue.lat, newIssue.lng, candidate.lat, candidate.lng);
    const spatialMatch = distanceM <= radius;
    if (!spatialMatch) continue;

    // Layer 2: already filtered in SQL, but keep an explicit flag for the audit record.
    const temporalMatch = true;

    // Layer 3: semantic similarity — category already matched via the query;
    // combine title+description+address for the text comparison.
    const newText = `${newIssue.title} ${newIssue.description} ${newIssue.addressHint || ''}`;
    const candidateText = `${candidate.title} ${candidate.description} ${candidate.address_hint || ''}`;
    const score = jaccardSimilarity(newText, candidateText);
    const semanticMatch = score >= SIMILARITY_THRESHOLD;

    if (spatialMatch && temporalMatch && semanticMatch) {
      flags.push({
        matchedIssueId: candidate.id,
        score: Number(score.toFixed(3)),
        spatialMatch,
        temporalMatch,
        semanticMatch,
      });
    }
  }

  return flags;
}

module.exports = { findPotentialDuplicates, jaccardSimilarity, haversineMeters };

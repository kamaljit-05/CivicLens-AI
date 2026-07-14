const db = require('../config/db');

/** GET /api/admin/queue — pending issues + open duplicate flags, oldest first. */
async function getQueue(req, res, next) {
  try {
    const { rows: pendingIssues } = await db.query(
      `SELECT i.id, i.title, i.description, i.status, i.created_at, i.ai_summary,
              c.label AS category_label,
              u.name AS reported_by,
              (SELECT url FROM issue_images WHERE issue_id = i.id ORDER BY created_at ASC LIMIT 1) AS thumbnail_url
       FROM issues i
       JOIN categories c ON c.id = i.category_id
       JOIN users u ON u.id = i.user_id
       WHERE i.status IN ('pending_review', 'potential_duplicate')
       ORDER BY i.created_at ASC`
    );

    const { rows: duplicateFlags } = await db.query(
      `SELECT df.id, df.similarity_score, df.status,
              df.issue_id, i1.title AS new_issue_title,
              df.matched_issue_id, i2.title AS matched_issue_title
       FROM duplicate_flags df
       JOIN issues i1 ON i1.id = df.issue_id
       JOIN issues i2 ON i2.id = df.matched_issue_id
       WHERE df.status = 'pending_review'
       ORDER BY df.created_at ASC`
    );

    res.json({ pendingIssues, duplicateFlags });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/issues/:id/approve — publishes the issue to the public feed. */
async function approveIssue(req, res, next) {
  try {
    const { rows } = await db.query(
      `UPDATE issues SET status = 'approved', reviewed_by = $1, reviewed_at = now(), updated_at = now()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });

    await db.query(
      `INSERT INTO admin_actions (admin_id, issue_id, action, notes) VALUES ($1, $2, 'approve', $3)`,
      [req.user.id, req.params.id, req.body.notes || null]
    );

    res.json({ issue: rows[0] });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/issues/:id/reject — declines a report (spam, inappropriate, unverifiable). */
async function rejectIssue(req, res, next) {
  try {
    const { rows } = await db.query(
      `UPDATE issues SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), updated_at = now()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });

    await db.query(
      `INSERT INTO admin_actions (admin_id, issue_id, action, notes) VALUES ($1, $2, 'reject', $3)`,
      [req.user.id, req.params.id, req.body.notes || null]
    );

    res.json({ issue: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/duplicates/:flagId/resolve
 * body: { resolution: 'confirmed_merge' | 'rejected_as_duplicate' | 'marked_related' }
 * Never merges automatically — an admin always makes the final call, and the
 * original reporter can be notified either way.
 */
async function resolveDuplicateFlag(req, res, next) {
  try {
    const { resolution } = req.body;
    const valid = ['confirmed_merge', 'rejected_as_duplicate', 'marked_related'];
    if (!valid.includes(resolution)) {
      return res.status(400).json({ error: `resolution must be one of: ${valid.join(', ')}` });
    }

    const { rows: flagRows } = await db.query(
      `UPDATE duplicate_flags SET status = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3 RETURNING *`,
      [resolution, req.user.id, req.params.flagId]
    );
    if (flagRows.length === 0) return res.status(404).json({ error: 'Duplicate flag not found' });
    const flag = flagRows[0];

    if (resolution === 'confirmed_merge') {
      // The new report is folded into the existing issue rather than published separately.
      await db.query(`UPDATE issues SET status = 'rejected', updated_at = now() WHERE id = $1`, [
        flag.issue_id,
      ]);
    } else if (resolution === 'rejected_as_duplicate' || resolution === 'marked_related') {
      // Not actually a duplicate — send it back into the normal review queue.
      await db.query(`UPDATE issues SET status = 'pending_review', updated_at = now() WHERE id = $1`, [
        flag.issue_id,
      ]);
    }

    await db.query(
      `INSERT INTO admin_actions (admin_id, issue_id, action, notes) VALUES ($1, $2, $3, $4)`,
      [req.user.id, flag.issue_id, resolution, req.body.notes || null]
    );

    res.json({ flag });
  } catch (err) {
    next(err);
  }
}

module.exports = { getQueue, approveIssue, rejectIssue, resolveDuplicateFlag };

const express = require('express');
const { z } = require('zod');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const profileSchema = z.object({
  username: z.string().min(3).max(30),
  occupation: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  photoUrl: z.string().url().optional(),
});

/**
 * PATCH /api/users/me/profile
 * Progressive profiling step-2: collects the non-essential fields
 * (occupation, city/district, username, photo) after the minimal Google
 * sign-in. Marks profile_completed = true once submitted.
 */
router.patch('/me/profile', requireAuth, async (req, res, next) => {
  try {
    const input = profileSchema.parse(req.body);

    const { rows } = await db.query(
      `UPDATE users
       SET username = $1, occupation = $2, city = $3, district = $4,
           photo_url = COALESCE($5, photo_url), profile_completed = true, updated_at = now()
       WHERE id = $6
       RETURNING id, name, email, username, occupation, city, district, photo_url, profile_completed`,
      [input.username, input.occupation, input.city, input.district, input.photoUrl, req.user.id]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Invalid input', details: err.errors });
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, username, occupation, city, district, photo_url, role, profile_completed
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

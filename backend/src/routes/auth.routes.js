const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * body: { idToken }  — the credential returned by Google's Sign-In button.
 * Creates the user on first sign-in (name/email pulled from Google, nothing
 * retyped), then issues a session JWT. New users get profileCompleted=false
 * so the frontend can route them into the short profile-setup flow.
 */
router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { rows: existing } = await db.query('SELECT * FROM users WHERE google_id = $1', [payload.sub]);

    let user;
    if (existing.length > 0) {
      user = existing[0];
    } else {
      const { rows: created } = await db.query(
        `INSERT INTO users (google_id, email, name, photo_url, profile_completed)
         VALUES ($1, $2, $3, $4, false) RETURNING *`,
        [payload.sub, payload.email, payload.name, payload.picture]
      );
      user = created[0];
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, profileCompleted: user.profile_completed },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token, user, isNewUser: existing.length === 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

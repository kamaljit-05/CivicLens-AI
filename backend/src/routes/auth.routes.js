const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const { isAdminEmail } = require('../config/adminEmails');

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

    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Google account email is not verified' });
    }

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

    // The ADMIN_EMAILS env var is the single source of truth for admin
    // access (see config/adminEmails.js). Sync it into the role column on
    // every login so it's reflected in user-management views, and so a
    // Gmail address removed from the allow-list loses admin on next login
    // even if the DB row still says role='admin'.
    const shouldBeAdmin = isAdminEmail(user.email);
    const isCurrentlyAdmin = user.role === 'admin';
    if (shouldBeAdmin !== isCurrentlyAdmin) {
      const { rows: updated } = await db.query(
        `UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING *`,
        [shouldBeAdmin ? 'admin' : 'citizen', user.id]
      );
      user = updated[0];
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, profileCompleted: user.profile_completed },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token, user, isNewUser: existing.length === 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

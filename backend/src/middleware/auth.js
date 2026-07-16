const jwt = require('jsonwebtoken');
const { isAdminEmail } = require('../config/adminEmails');

/**
 * Verifies the session JWT issued at /api/auth/google (after Google Sign-In).
 * Attaches { id, email, role, profileCompleted } to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Missing session token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role, profileCompleted }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/**
 * Gate admin-only routes (approval queue, user management, duplicate merges).
 *
 * Checks the live ADMIN_EMAILS allow-list rather than the `role` claim
 * embedded in the JWT at login time. Session tokens can live for days
 * (JWT_EXPIRES_IN), so if a Gmail address is removed from the allow-list,
 * this makes that change take effect immediately on the next request
 * instead of waiting for the old token to expire.
 */
function requireAdmin(req, res, next) {
  if (!req.user || !isAdminEmail(req.user.email)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };

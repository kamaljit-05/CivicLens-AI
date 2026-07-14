const jwt = require('jsonwebtoken');

/**
 * Verifies the session JWT issued at /api/auth/google (after Google Sign-In).
 * Attaches { id, role, profileCompleted } to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Missing session token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, profileCompleted }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/** Gate admin/moderator-only routes (approval queue, duplicate merges). */
function requireAdmin(req, res, next) {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };

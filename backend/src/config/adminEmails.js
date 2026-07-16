/**
 * Admin allow-list, sourced entirely from the ADMIN_EMAILS env var
 * (comma-separated Gmail addresses). This is the single source of truth for
 * "who can access /admin" — nobody can grant themselves admin by editing
 * their own DB row, and revoking access is a redeploy-free env var change.
 *
 * Example:
 *   ADMIN_EMAILS=kamaljittripathy025@gmail.com,second.admin@gmail.com
 */
function getAdminEmailSet() {
  return new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmailSet().has(String(email).trim().toLowerCase());
}

module.exports = { getAdminEmailSet, isAdminEmail };

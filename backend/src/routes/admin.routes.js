const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getQueue,
  approveIssue,
  rejectIssue,
  resolveDuplicateFlag,
  listUsers,
  suspendUser,
  unsuspendUser,
  getStats,
} = require('../controllers/admin.controller');

const router = express.Router();

// Every route below requires a valid session AND an email on the
// ADMIN_EMAILS allow-list (see middleware/auth.js + config/adminEmails.js).
// A normal signed-in user hitting any of these gets a 403, not a redirect —
// there is no partial-access tier.
router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/queue', getQueue);
router.post('/issues/:id/approve', approveIssue);
router.post('/issues/:id/reject', rejectIssue);
router.post('/duplicates/:flagId/resolve', resolveDuplicateFlag);

router.get('/users', listUsers);
router.post('/users/:id/suspend', suspendUser);
router.post('/users/:id/unsuspend', unsuspendUser);

module.exports = router;

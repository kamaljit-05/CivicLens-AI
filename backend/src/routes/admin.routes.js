const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getQueue,
  approveIssue,
  rejectIssue,
  resolveDuplicateFlag,
} = require('../controllers/admin.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/queue', getQueue);
router.post('/issues/:id/approve', approveIssue);
router.post('/issues/:id/reject', rejectIssue);
router.post('/duplicates/:flagId/resolve', resolveDuplicateFlag);

module.exports = router;

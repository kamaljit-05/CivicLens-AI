const express = require('express');
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { createIssue, listIssues, getIssue, previewAnalysis } = require('../controllers/issues.controller');

const router = express.Router();

// Local disk storage for the starter kit — swap for an S3/GCS multer-storage
// driver in production. Only image mimetypes are accepted.
const upload = multer({
  dest: process.env.UPLOADS_DIR || './uploads',
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only JPG, PNG, or WEBP images are allowed'), ok);
  },
});

/** POST /api/issues/upload — returns a URL to reference in the create-issue payload. */
router.post('/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  // In production this would be the CDN/object-storage URL, not a local path.
  // Must be an absolute URL: issues.controller.js validates it with zod's
  // .url(), and the AI service needs to be able to fetch it directly.
  const base = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ imageUrl: `${base}/uploads/${req.file.filename}` });
});

router.get('/', listIssues);
router.get('/:id', getIssue);
router.post('/', requireAuth, createIssue);

/** POST /api/issues/preview-analysis — live AI preview before final submit, nothing persisted. */
router.post('/preview-analysis', requireAuth, previewAnalysis);

module.exports = router;

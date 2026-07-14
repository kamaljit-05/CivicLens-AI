require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const issueRoutes = require('./routes/issues.routes');
const adminRoutes = require('./routes/admin.routes');
const newsRoutes = require('./routes/news.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1); // Render sits behind a reverse proxy — needed for correct req.protocol/req.ip

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' })); // generous limit for base64 image payloads
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'civiclens-backend' }));

// Serve uploaded issue photos back out. Note: on most free-tier hosts
// (including Render's free plan) this disk is EPHEMERAL — files are wiped on
// every redeploy/restart. Fine for getting things working; swap the disk
// storage in issues.routes.js for Cloudinary/S3 before relying on this in
// production, per the comment already in that file.
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use(
  '/uploads',
  (req, res, next) => {
    // helmet's default Cross-Origin-Resource-Policy would otherwise block the
    // Netlify frontend (a different origin) from loading these images.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.resolve(UPLOADS_DIR))
);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/news', newsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`CivicLens backend listening on :${PORT}`));

module.exports = app;

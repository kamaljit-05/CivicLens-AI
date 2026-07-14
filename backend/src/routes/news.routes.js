const express = require('express');
const { getCachedNews, refreshLocalNews } = require('../services/news.service');

const router = express.Router();

/** GET /api/news?locale=Bhubaneswar&category=local */
router.get('/', async (req, res, next) => {
  try {
    const { locale, category = 'local' } = req.query;
    if (!locale) return res.status(400).json({ error: 'locale query param is required' });

    let articles = await getCachedNews({ locale, category });
    if (articles.length === 0) {
      // Cold cache — fetch synchronously once so the first visitor isn't stuck empty.
      await refreshLocalNews({ locale, category });
      articles = await getCachedNews({ locale, category });
    }
    res.json({ articles });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

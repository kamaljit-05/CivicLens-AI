const express = require('express');
const { getCachedNews, refreshNews, VALID_SCOPES } = require('../services/news.service');

const router = express.Router();

/**
 * GET /api/news?scope=city&locale=Bhubaneswar
 * scope: 'area' | 'city' | 'state' | 'country' | 'world' (default 'city')
 * locale: required for every scope except 'world'
 */
router.get('/', async (req, res, next) => {
  try {
    const { locale, scope = 'city' } = req.query;

    if (!VALID_SCOPES.includes(scope)) {
      return res.status(400).json({ error: `scope must be one of: ${VALID_SCOPES.join(', ')}` });
    }
    if (scope !== 'world' && !locale) {
      return res.status(400).json({ error: 'locale query param is required for this scope' });
    }

    let articles = await getCachedNews({ locale, scope });
    if (articles.length === 0) {
      // Cold cache -- fetch synchronously once so the first visitor for this
      // place/scope combination isn't stuck looking at an empty tab.
      await refreshNews({ locale, scope });
      articles = await getCachedNews({ locale, scope });
    }
    res.json({ articles, scope, locale: locale || 'world' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

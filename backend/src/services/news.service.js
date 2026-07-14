const axios = require('axios');
const db = require('../config/db');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const TRUSTED_DOMAINS = (process.env.NEWS_TRUSTED_DOMAINS || '').split(',').filter(Boolean);

/**
 * Pulls locally-relevant headlines from NewsAPI, restricted to a trusted-domain
 * allowlist, and caches them so the home page never calls the third-party API
 * directly on every page load.
 */
async function refreshLocalNews({ locale, category = 'local' }) {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not set — skipping news refresh');
    return [];
  }

  const { data } = await axios.get('https://newsapi.org/v2/everything', {
    params: {
      q: locale,
      domains: TRUSTED_DOMAINS.join(',') || undefined,
      sortBy: 'publishedAt',
      language: 'en',
      pageSize: 10,
      apiKey: NEWS_API_KEY,
    },
    timeout: 10000,
  });

  const articles = data.articles || [];

  for (const article of articles) {
    await db.query(
      `INSERT INTO news_cache (title, url, source, image_url, locale, category, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        article.title,
        article.url,
        article.source?.name || 'Unknown',
        article.urlToImage,
        locale,
        category,
        article.publishedAt,
      ]
    );
  }

  return articles;
}

async function getCachedNews({ locale, category = 'local', limit = 10 }) {
  const { rows } = await db.query(
    `SELECT title, url, source, image_url, published_at
     FROM news_cache
     WHERE locale = $1 AND category = $2
     ORDER BY published_at DESC
     LIMIT $3`,
    [locale, category, limit]
  );
  return rows;
}

module.exports = { refreshLocalNews, getCachedNews };

const axios = require('axios');
const db = require('../config/db');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const TRUSTED_DOMAINS = (process.env.NEWS_TRUSTED_DOMAINS || '').split(',').filter(Boolean);

const VALID_SCOPES = ['area', 'city', 'state', 'country', 'world'];

/**
 * Pulls headlines from NewsAPI, restricted to a trusted-domain allowlist
 * (see NEWS_TRUSTED_DOMAINS -- thehindu.com, indianexpress.com,
 * timesofindia.indiatimes.com, bbc.com, reuters.com, plus any government
 * domains you add), and caches them so the home page never calls the
 * third-party API directly on every page load.
 *
 * scope: 'area' | 'city' | 'state' | 'country' | 'world'
 * locale: the place keyword to search for -- e.g. "Jaydev Vihar" (area),
 *   "Bhubaneswar" (city), "Odisha" (state), "India" (country).
 *   Not required for scope='world': that tier intentionally has no keyword
 *   and just returns the latest from the trusted global wires (BBC, Reuters).
 */
async function refreshNews({ locale, scope = 'city' }) {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not set -- skipping news refresh');
    return [];
  }
  if (!VALID_SCOPES.includes(scope)) {
    throw new Error(`Invalid scope: ${scope}`);
  }
  if (scope !== 'world' && !locale) {
    throw new Error(`locale is required for scope=${scope}`);
  }

  const params = {
    domains: TRUSTED_DOMAINS.join(',') || undefined,
    sortBy: 'publishedAt',
    language: 'en',
    pageSize: 12,
    apiKey: NEWS_API_KEY,
  };
  if (scope === 'world') {
    // No keyword -- just the latest wire stories from the trusted domain list.
    params.domains = TRUSTED_DOMAINS.join(',') || 'bbc.com,reuters.com';
  } else {
    params.q = locale;
  }

  const { data } = await axios.get('https://newsapi.org/v2/everything', { params, timeout: 10000 });
  const articles = data.articles || [];

  for (const article of articles) {
    await db.query(
      `INSERT INTO news_cache (title, url, source, image_url, summary, locale, category, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        article.title,
        article.url,
        article.source?.name || 'Unknown',
        article.urlToImage,
        article.description || null,
        locale || 'world',
        scope,
        article.publishedAt,
      ]
    );
  }

  return articles.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source?.name || 'Unknown',
    imageUrl: a.urlToImage,
    // NewsAPI's `description` is already a short standfirst -- used as the
    // 2-3 line summary in the UI without an extra AI call per article.
    summary: a.description || null,
    publishedAt: a.publishedAt,
  }));
}

async function getCachedNews({ locale, scope = 'city', limit = 12 }) {
  const { rows } = await db.query(
    `SELECT title, url, source, image_url AS "imageUrl", summary, published_at AS "publishedAt"
     FROM news_cache
     WHERE locale = $1 AND category = $2
     ORDER BY published_at DESC
     LIMIT $3`,
    [locale || 'world', scope, limit]
  );
  return rows;
}

module.exports = { refreshNews, getCachedNews, VALID_SCOPES };

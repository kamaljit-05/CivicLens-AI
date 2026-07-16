const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const db = require('../config/db');

// Comma-separated allowlist (thehindu.com, indianexpress.com, bbc.com, ...).
// Reused as Google search `site:` operators, so results are still limited to
// vetted publishers even though the underlying feed is Google News.
const TRUSTED_DOMAINS = (process.env.NEWS_TRUSTED_DOMAINS || '').split(',').filter(Boolean);

// Language/country for Google News' own locale params (hl/gl/ceid) -- swap
// these if you're not running this for an Indian audience.
const NEWS_HL = process.env.NEWS_HL || 'en-IN';
const NEWS_GL = process.env.NEWS_GL || 'IN';
const NEWS_CEID = `${NEWS_GL}:${NEWS_HL.split('-')[0]}`;

const VALID_SCOPES = ['area', 'city', 'state', 'country', 'world'];

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });

function stripHtml(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pulls headlines from Google News' public RSS search feed -- free, no API
 * key, no daily quota, and safe to use in production (unlike NewsAPI.org's
 * free tier, which its own terms restrict to development use only). Results
 * are still restricted to NEWS_TRUSTED_DOMAINS via Google's `site:` search
 * operator, and cached the same way as before so the frontend never talks
 * to Google directly.
 *
 * scope: 'area' | 'city' | 'state' | 'country' | 'world'
 * locale: the place keyword to search for -- e.g. "Jaydev Vihar" (area),
 *   "Bhubaneswar" (city), "Odisha" (state), "India" (country).
 *   Not required for scope='world': that tier intentionally has no keyword
 *   and just returns the latest from the trusted domain list.
 *
 * Note: Google News RSS article links are Google redirect URLs, not direct
 * publisher links -- clicking through still lands on the original article,
 * it just bounces through Google first. This is inherent to the feed itself.
 */
async function refreshNews({ locale, scope = 'city' }) {
  if (!VALID_SCOPES.includes(scope)) {
    throw new Error(`Invalid scope: ${scope}`);
  }
  if (scope !== 'world' && !locale) {
    throw new Error(`locale is required for scope=${scope}`);
  }

  const siteClause = TRUSTED_DOMAINS.length
    ? `(${TRUSTED_DOMAINS.map((d) => `site:${d}`).join(' OR ')})`
    : '';
  const query = [locale, siteClause].filter(Boolean).join(' ');

  if (!query) {
    console.warn('news.service: no locale and no NEWS_TRUSTED_DOMAINS set -- skipping refresh');
    return [];
  }

  const { data: xml } = await axios.get('https://news.google.com/rss/search', {
    params: { q: query, hl: NEWS_HL, gl: NEWS_GL, ceid: NEWS_CEID },
    timeout: 10000,
    headers: {
      // Identify the app, same courtesy as the Nominatim integration --
      // Google News RSS has no published rate limit, but it's still polite
      // (and lower-risk) to not look like an anonymous scraper.
      'User-Agent': 'CivicLensAI/1.0 (+civic issue reporting app; news aggregation feature)',
    },
  });

  const parsed = xmlParser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const articles = items.slice(0, 12).map((item) => {
    const sourceName =
      (typeof item.source === 'object' ? item.source['#text'] : item.source) || 'Google News';
    const cleanDescription = stripHtml(item.description);
    // Google News' description is usually just the title re-wrapped in an
    // <a> tag plus the source name -- only keep it if it actually adds
    // something beyond the headline itself.
    const summary =
      cleanDescription && !cleanDescription.startsWith(item.title) ? cleanDescription : null;

    return {
      title: item.title,
      url: item.link,
      source: sourceName,
      imageUrl: null, // the RSS search feed doesn't include article images
      summary,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    };
  });

  for (const article of articles) {
    await db.query(
      `INSERT INTO news_cache (title, url, source, image_url, summary, locale, category, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [article.title, article.url, article.source, article.imageUrl, article.summary, locale || 'world', scope, article.publishedAt]
    );
  }

  return articles;
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

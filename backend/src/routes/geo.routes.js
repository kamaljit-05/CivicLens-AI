const express = require('express');
const axios = require('axios');

const router = express.Router();

// Very small in-memory cache (rounded coords -> resolved place). Nominatim's
// usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// caps free usage at ~1 request/second and requires a real User-Agent, so we
// (a) proxy through the backend instead of calling it from the browser,
// where we can't reliably set/control that header, and (b) cache so a
// street-level pin drag doesn't fire a new request per pixel.
const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

function cacheKey(lat, lng) {
  // ~1km precision is plenty for "which city/state is this in".
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/**
 * GET /api/geo/reverse?lat=..&lng=..
 * Resolves coordinates to { area, city, state, country } for use as:
 *  - the address hint shown in the Report Issue location picker
 *  - the locale strings the News tabs (My Area / My City / My State) query
 */
router.get('/reverse', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng query params are required numbers' });
    }

    const key = cacheKey(lat, lng);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'jsonv2', zoom: 14, addressdetails: 1 },
      headers: {
        // Nominatim requires an identifying User-Agent or Referer for free-tier use.
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'CivicLensAI/1.0 (civic issue reporting app)',
      },
      timeout: 8000,
    });

    const addr = data.address || {};
    const resolved = {
      area: addr.suburb || addr.neighbourhood || addr.city_district || addr.road || null,
      city: addr.city || addr.town || addr.municipality || addr.county || null,
      state: addr.state || null,
      country: addr.country || null,
      displayName: data.display_name || null,
    };

    cache.set(key, { at: Date.now(), data: resolved });
    res.json(resolved);
  } catch (err) {
    // Reverse geocoding failing shouldn't break the report flow or the news
    // feed — degrade to nulls rather than a hard error.
    if (err.response || err.code === 'ECONNABORTED') {
      return res.json({ area: null, city: null, state: null, country: null, displayName: null });
    }
    next(err);
  }
});

module.exports = router;

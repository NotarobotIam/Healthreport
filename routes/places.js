const express = require('express');
const { protect } = require('../middleware/auth');
const { handler } = require('../middleware/errors');
const { perUserLimiter } = require('../middleware/rateLimit');
const { nearby, geocode, PlacesUnavailableError, TYPES } = require('../lib/places');
const { findProblems } = require('../lib/contentPolicy');
const { text } = require('../lib/validate');

const router = express.Router();
router.use(protect);

const HOUR = 60 * 60 * 1000;
const nearbyLimit = perUserLimiter({ windowMs: HOUR, limit: 60, message: 'You have searched a lot. Please try again in a little while.' });
const geocodeLimit = perUserLimiter({ windowMs: HOUR, limit: 30, message: 'You have searched a lot. Please try again in a little while.' });

const NUMBER = /^-?\d{1,3}(?:\.\d{1,8})?$/;
const parseCoord = (value, limit) => {
  if (typeof value !== 'string' || !NUMBER.test(value)) return null;
  const n = Number(value);
  return Math.abs(n) <= limit ? n : null;
};

const ATTRIBUTION = '© OpenStreetMap contributors';
const UNAVAILABLE = { code: 'unavailable', message: 'The map service is busy right now. Please try again in a minute, or call your local health service if it is urgent.' };

// @route   GET /api/places/nearby?lat=&lon=&radiusKm=10&type=hospital|clinic
// @desc    Hospitals or urgent-care clinics around a position. The position is rounded, used for this lookup
//          only, and never stored.
router.get(
  '/nearby',
  nearbyLimit,
  handler(async (req, res) => {
    const lat = parseCoord(req.query.lat, 90);
    const lon = parseCoord(req.query.lon, 180);
    if (lat === null || lon === null) return res.status(400).json({ message: 'lat and lon must be valid coordinates' });
    const type = req.query.type === undefined ? 'hospital' : req.query.type;
    if (!TYPES.includes(type)) return res.status(400).json({ message: `type must be one of: ${TYPES.join(', ')}` });
    const radiusKm = req.query.radiusKm === undefined ? 10 : Number(req.query.radiusKm);
    if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 50) return res.status(400).json({ message: 'radiusKm must be between 1 and 50' });

    try {
      const out = await nearby({ lat, lon, radiusM: radiusKm * 1000, type });
      return res.json({ success: true, type, radiusKm, center: out.center, results: out.results, stale: out.stale, source: out.source, attribution: ATTRIBUTION });
    } catch (err) {
      if (err instanceof PlacesUnavailableError) return res.status(503).json(UNAVAILABLE);
      throw err;
    }
  }),
);

// @route   GET /api/places/geocode?q=Denver
// @desc    Candidate locations for a typed place name, so someone can search without sharing their position.
router.get(
  '/geocode',
  geocodeLimit,
  handler(async (req, res) => {
    const q = text(req.query.q, { min: 2, max: 100 });
    if (!q) return res.status(400).json({ message: 'Type a city, town or postcode (2 to 100 characters).' });
    if (findProblems(q).length) return res.status(400).json({ message: 'Please type just a place name, such as a city or postcode.' });
    try {
      return res.json({ success: true, results: await geocode(q), attribution: ATTRIBUTION });
    } catch (err) {
      if (err instanceof PlacesUnavailableError) return res.status(503).json(UNAVAILABLE);
      throw err;
    }
  }),
);

module.exports = router;

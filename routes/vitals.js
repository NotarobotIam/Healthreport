const express = require('express');
const mongoose = require('mongoose');
const Vital = require('../models/Vital');
const { RANGES } = require('../models/Vital');
const protect = require('../middleware/auth');
const { handler, validateObjectId } = require('../middleware/errors');
const { text } = require('../lib/validate');

const router = express.Router();
router.param('id', validateObjectId);

const METRICS = Object.keys(RANGES);

/**
 * Validates and whitelists a reading. Every number must be a real, plausible measurement, so a typo
 * (e.g. 1200 for a heart rate) is refused instead of quietly skewing the charts and any AI summary.
 */
function parseVital(body, { partial = false } = {}) {
  const value = {};
  const has = (k) => body[k] !== undefined && body[k] !== null && body[k] !== '';

  if (!partial || body.measuredAt !== undefined) {
    const d = new Date(body.measuredAt ?? Date.now());
    if (typeof (body.measuredAt ?? 'x') !== 'string' && body.measuredAt !== undefined) return { error: 'measuredAt must be a date' };
    if (Number.isNaN(d.getTime())) return { error: 'measuredAt must be a valid date' };
    if (d.getTime() > Date.now() + 24 * 60 * 60 * 1000) return { error: 'measuredAt cannot be in the future' };
    value.measuredAt = d;
  }

  for (const key of METRICS) {
    if (!has(key)) continue;
    const n = body[key];
    const [min, max] = RANGES[key];
    if (typeof n !== 'number' || !Number.isFinite(n)) return { error: `${key} must be a number` };
    if (n < min || n > max) return { error: `${key} must be between ${min} and ${max}` };
    value[key] = Math.round(n * 10) / 10;
  }

  if (has('note')) {
    const note = text(body.note, { max: 200 });
    if (note === null) return { error: 'note must be text of at most 200 characters' };
    value.note = note;
  }

  if (!partial) {
    if (!METRICS.some((k) => value[k] !== undefined)) return { error: 'Enter at least one measurement' };
  }
  // Blood pressure only makes sense as a pair.
  const sys = has('systolic');
  const dia = has('diastolic');
  if (sys !== dia && !partial) return { error: 'Enter both the top (systolic) and bottom (diastolic) blood pressure numbers' };
  if (sys && dia && value.systolic <= value.diastolic) return { error: 'The top blood pressure number should be higher than the bottom one' };
  return { value };
}

// @route   GET /api/vitals?days=90
// @desc    The member's readings, newest first (all of them, or the last N days)
router.get(
  '/',
  protect,
  handler(async (req, res) => {
    const filter = { userId: req.user.id };
    if (req.query.days !== undefined) {
      const days = Number.parseInt(req.query.days, 10);
      if (!Number.isInteger(days) || days < 1 || days > 3650) return res.status(400).json({ message: 'days must be between 1 and 3650' });
      // Our own operator: must be marked trusted or mongoose's sanitizeFilter turns it into a literal.
      filter.measuredAt = mongoose.trusted({ $gte: new Date(Date.now() - days * 86400000) });
    }
    const vitals = await Vital.find(filter).sort({ measuredAt: -1 }).limit(1000);
    res.json({ success: true, count: vitals.length, vitals });
  }),
);

// @route   POST /api/vitals
router.post(
  '/',
  protect,
  handler(async (req, res) => {
    const { value, error } = parseVital(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const vital = await Vital.create({ userId: req.user.id, ...value });
    res.status(201).json({ success: true, vital });
  }),
);

// @route   PUT /api/vitals/:id
router.put(
  '/:id',
  protect,
  handler(async (req, res) => {
    const { value, error } = parseVital(req.body || {}, { partial: true });
    if (error) return res.status(400).json({ message: error });
    const vital = await Vital.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: value }, { new: true, runValidators: true });
    if (!vital) return res.status(404).json({ message: 'Reading not found' });
    res.json({ success: true, vital });
  }),
);

// @route   DELETE /api/vitals/:id
router.delete(
  '/:id',
  protect,
  handler(async (req, res) => {
    const vital = await Vital.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!vital) return res.status(404).json({ message: 'Reading not found' });
    res.json({ success: true });
  }),
);

module.exports = router;
module.exports.parseVital = parseVital;

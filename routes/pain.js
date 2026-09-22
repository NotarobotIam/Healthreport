const express = require('express');
const PainEntry = require('../models/PainEntry');
const { PAIN_TYPES, PAIN_PATTERNS, PAIN_STATUSES, PAIN_SIDES, PAIN_VISIBILITIES } = require('../models/painConstants');
const protect = require('../middleware/auth');
const { handler, validateObjectId } = require('../middleware/errors');

const router = express.Router();
router.param('id', validateObjectId);

const MAX_TRIGGERS = 10;
const MAX_TEXT = { trigger: 40, radiatesTo: 120, notes: 2000, partId: 40, partName: 200, system: 40 };
// The atlas model is roughly human sized (metres); anything far outside that
// is a bad client, not a real click.
const MAX_COORDINATE = 5;

const isString = (v) => typeof v === 'string';

/**
 * Validates and whitelists a pain entry payload. Returns { value } on success
 * or { error } on failure. Only known fields are copied out, so a client can't
 * smuggle in userId/_id/createdAt (mass assignment). With `partial: true`
 * (PUT) absent fields are simply left out of the result.
 */
function parsePainInput(body, { partial = false } = {}) {
  const value = {};
  const has = (key) => body[key] !== undefined;
  const need = (key) => !partial && !has(key);

  if (need('location') || has('location')) {
    const loc = body.location;
    if (!loc || typeof loc !== 'object') return { error: 'location is required' };
    const { partId, partName, system, side = 'unknown', point } = loc;
    if (!isString(partId) || !partId || partId.length > MAX_TEXT.partId) return { error: 'location.partId is invalid' };
    if (!isString(partName) || !partName || partName.length > MAX_TEXT.partName) return { error: 'location.partName is invalid' };
    if (!isString(system) || !system || system.length > MAX_TEXT.system) return { error: 'location.system is invalid' };
    if (!PAIN_SIDES.includes(side)) return { error: `location.side must be one of: ${PAIN_SIDES.join(', ')}` };
    if (
      !Array.isArray(point) ||
      point.length !== 3 ||
      !point.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= MAX_COORDINATE)
    ) {
      return { error: 'location.point must be three finite numbers' };
    }
    value.location = { partId, partName, system, side, point };
  }

  if (need('painTypes') || has('painTypes')) {
    const types = body.painTypes;
    if (!Array.isArray(types) || types.length === 0 || types.length > PAIN_TYPES.length) {
      return { error: 'painTypes must be a non-empty list' };
    }
    if (!types.every((t) => PAIN_TYPES.includes(t))) {
      return { error: `painTypes may only contain: ${PAIN_TYPES.join(', ')}` };
    }
    value.painTypes = [...new Set(types)];
  }

  if (need('severity') || has('severity')) {
    const s = body.severity;
    if (!Number.isInteger(s) || s < 0 || s > 10) return { error: 'severity must be a whole number from 0 to 10' };
    value.severity = s;
  }

  if (need('onset') || has('onset')) {
    const onset = new Date(body.onset);
    if (!isString(body.onset) || Number.isNaN(onset.getTime())) return { error: 'onset must be a valid date' };
    // Allow a day of slack for timezone differences between client and server.
    if (onset.getTime() > Date.now() + 24 * 60 * 60 * 1000) return { error: 'onset cannot be in the future' };
    value.onset = onset;
  }

  if (has('pattern')) {
    if (!PAIN_PATTERNS.includes(body.pattern)) return { error: `pattern must be one of: ${PAIN_PATTERNS.join(', ')}` };
    value.pattern = body.pattern;
  } else if (!partial) {
    value.pattern = 'constant';
  }

  if (has('triggers')) {
    const t = body.triggers;
    if (!Array.isArray(t) || t.length > MAX_TRIGGERS || !t.every((x) => isString(x) && x.length <= MAX_TEXT.trigger)) {
      return { error: `triggers must be up to ${MAX_TRIGGERS} short strings` };
    }
    value.triggers = t.map((x) => x.trim()).filter(Boolean);
  } else if (!partial) {
    value.triggers = [];
  }

  for (const key of ['radiatesTo', 'notes']) {
    if (has(key)) {
      if (!isString(body[key]) || body[key].length > MAX_TEXT[key]) {
        return { error: `${key} must be text of at most ${MAX_TEXT[key]} characters` };
      }
      value[key] = body[key].trim();
    }
  }

  if (has('visibility')) {
    if (!PAIN_VISIBILITIES.includes(body.visibility)) {
      return { error: `visibility must be one of: ${PAIN_VISIBILITIES.join(', ')}` };
    }
    value.visibility = body.visibility;
  } else if (!partial) {
    value.visibility = 'private';
  }

  if (has('status')) {
    if (!PAIN_STATUSES.includes(body.status)) return { error: `status must be one of: ${PAIN_STATUSES.join(', ')}` };
    value.status = body.status;
  } else if (!partial) {
    value.status = 'active';
  }

  return { value };
}

// Every query below filters on userId, so another member's entry looks exactly like a missing one.

// @route   GET /api/pain
// @desc    Get all pain entries for the logged-in user, newest onset first
// @access  Private
router.get(
  '/',
  protect,
  handler(async (req, res) => {
    const entries = await PainEntry.find({ userId: req.user.id }).sort({ onset: -1 });
    res.status(200).json({ success: true, count: entries.length, entries });
  }),
);

// @route   POST /api/pain
// @desc    Record a new pain entry
// @access  Private
router.post(
  '/',
  protect,
  handler(async (req, res) => {
    const { value, error } = parsePainInput(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const entry = await PainEntry.create({ userId: req.user.id, ...value });
    res.status(201).json({ success: true, entry });
  }),
);

// @route   PUT /api/pain/:id
// @desc    Update a pain entry (e.g. adjust severity, mark resolved, change who can see it)
// @access  Private
router.put(
  '/:id',
  protect,
  handler(async (req, res) => {
    const { value, error } = parsePainInput(req.body || {}, { partial: true });
    if (error) return res.status(400).json({ message: error });
    const entry = await PainEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: value },
      { new: true, runValidators: true },
    );
    if (!entry) return res.status(404).json({ message: 'Pain entry not found' });
    res.status(200).json({ success: true, entry });
  }),
);

// @route   DELETE /api/pain/:id
// @desc    Delete a pain entry
// @access  Private
router.delete(
  '/:id',
  protect,
  handler(async (req, res) => {
    const entry = await PainEntry.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!entry) return res.status(404).json({ message: 'Pain entry not found' });
    res.status(200).json({ success: true, message: 'Pain entry deleted' });
  }),
);

module.exports = router;
module.exports.parsePainInput = parsePainInput;

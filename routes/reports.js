const express = require('express');
const TestReport = require('../models/TestReport');
const protect = require('../middleware/auth');
const { handler, validateObjectId } = require('../middleware/errors');
const { text, isPlainObject } = require('../lib/validate');

const router = express.Router();
router.param('id', validateObjectId);

// Mirrors the testType enum in models/TestReport.js
const VALID_TEST_TYPES = ['Blood', 'Urine', 'Imaging', 'Genetic', 'Cardiac', 'Physical Exam', 'Microbiome', 'Other'];

/**
 * Validates and whitelists a report payload. Only these fields are ever
 * copied out of the request, so a client can't set userId (which would hand
 * its report to another account) or any other internal field.
 * With `partial: true` (PUT), absent fields are simply left out.
 */
function parseReport(body, { partial = false } = {}) {
  const value = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('testName')) {
    const testName = text(body.testName, { min: 1, max: 200 });
    if (!testName) return { error: 'testName is required (max 200 characters)' };
    value.testName = testName;
  }
  if (!partial || has('testDate')) {
    const d = new Date(body.testDate ?? Date.now());
    if (Number.isNaN(d.getTime())) return { error: 'testDate must be a valid date' };
    value.testDate = d;
  }
  if (!partial || has('testType')) {
    if (!VALID_TEST_TYPES.includes(body.testType)) {
      return { error: `testType must be one of: ${VALID_TEST_TYPES.join(', ')}` };
    }
    value.testType = body.testType;
  }
  if (!partial || has('results')) {
    if (!isPlainObject(body.results)) return { error: 'results must be an object' };
    // Map keys can't start with "$" or contain "." in MongoDB.
    if (Object.keys(body.results).some((k) => k.startsWith('$') || k.includes('.'))) {
      return { error: 'results keys may not start with "$" or contain "."' };
    }
    value.results = body.results;
  }
  if (has('doctor')) {
    if (!isPlainObject(body.doctor)) return { error: 'doctor must be an object' };
    value.doctor = {};
    for (const k of ['name', 'email', 'clinic']) {
      if (body.doctor[k] !== undefined) {
        const v = text(body.doctor[k], { max: 200 });
        if (v === null) return { error: `doctor.${k} must be text` };
        value.doctor[k] = v;
      }
    }
  }
  if (has('notes')) {
    const notes = text(body.notes, { max: 5000 });
    if (notes === null) return { error: 'notes must be text (max 5000 characters)' };
    value.notes = notes;
  }
  if (has('normal')) {
    if (typeof body.normal !== 'boolean') return { error: 'normal must be true or false' };
    value.normal = body.normal;
  }
  return { value };
}

// Ownership lives in the query itself, so another user's report is indistinguishable
// from a missing one (404) instead of confirming that the id exists.
const findOwned = (req) => TestReport.findOne({ _id: req.params.id, userId: req.user.id });

// @route   POST /api/reports
// @desc    Create a new test report
// @access  Private
router.post(
  '/',
  protect,
  handler(async (req, res) => {
    const { value, error } = parseReport(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const report = await TestReport.create({ userId: req.user.id, ...value });
    res.status(201).json({ success: true, report });
  }),
);

// @route   GET /api/reports
// @desc    Get all test reports for the logged-in user, optionally scoped to
//          one testType (?testType=Imaging)
// @access  Private
router.get(
  '/',
  protect,
  handler(async (req, res) => {
    const { testType } = req.query;
    if (testType !== undefined && !VALID_TEST_TYPES.includes(testType)) {
      return res.status(400).json({ message: `Invalid testType. Must be one of: ${VALID_TEST_TYPES.join(', ')}` });
    }
    const filter = { userId: req.user.id, ...(testType ? { testType } : {}) };
    const reports = await TestReport.find(filter).sort({ testDate: -1 });
    res.status(200).json({ success: true, count: reports.length, reports });
  }),
);

// @route   GET /api/reports/:id
// @access  Private
router.get(
  '/:id',
  protect,
  handler(async (req, res) => {
    const report = await findOwned(req);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.status(200).json({ success: true, report });
  }),
);

// @route   PUT /api/reports/:id
// @access  Private
router.put(
  '/:id',
  protect,
  handler(async (req, res) => {
    const { value, error } = parseReport(req.body || {}, { partial: true });
    if (error) return res.status(400).json({ message: error });
    const report = await TestReport.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: value },
      { new: true, runValidators: true },
    );
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.status(200).json({ success: true, report });
  }),
);

// @route   DELETE /api/reports/:id
// @access  Private
router.delete(
  '/:id',
  protect,
  handler(async (req, res) => {
    const report = await TestReport.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.status(200).json({ success: true, message: 'Report deleted' });
  }),
);

// @route   POST /api/reports/transpose/data
// @desc    Get transposed test data for comparison, optionally scoped to one
//          testType (?testType=Blood) — same domain-scoping as GET /
// @access  Private
router.post(
  '/transpose/data',
  protect,
  handler(async (req, res) => {
    const { testType } = req.query;
    if (testType !== undefined && !VALID_TEST_TYPES.includes(testType)) {
      return res.status(400).json({ message: `Invalid testType. Must be one of: ${VALID_TEST_TYPES.join(', ')}` });
    }

    const filter = { userId: req.user.id, ...(testType ? { testType } : {}) };
    const reports = await TestReport.find(filter).sort({ testDate: 1 });

    // Always include testDates: the Data page spreads it, so omitting it crashes for members with no reports yet.
    if (reports.length === 0) return res.status(200).json({ success: true, testDates: [], transposed: {} });

    // Transpose data: columns are test values, rows are test dates.
    // Nested object values (e.g. an Imaging report's `imaging`/`organMapping`
    // blobs) aren't sensible chart "metrics" for any testType, so they're
    // skipped rather than transposed as-is.
    const transposed = {};
    const testDates = [];

    reports.forEach((report) => {
      // Key by the ISO string, exactly as it appears in `testDates`. (Using the Date object as
      // a key would coerce it with Date.toString() — "Sun Jan 14 2024 18:00:00 GMT-0600 …" —
      // which never matches the ISO dates the client looks values up by.)
      const date = report.testDate.toISOString();
      testDates.push(date);
      // `results` is a Mongoose Map on stored documents, so read it through entries().
      for (const [key, value] of report.results.entries()) {
        if (value !== null && typeof value === 'object') continue;
        if (!transposed[key]) transposed[key] = {};
        transposed[key][date] = value;
      }
    });

    res.status(200).json({ success: true, testDates, transposed });
  }),
);

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const config = require('../config');
const AiInsight = require('../models/AiInsight');
const PainEntry = require('../models/PainEntry');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { handler, validateObjectId } = require('../middleware/errors');
const { perUserLimiter } = require('../middleware/rateLimit');
const { getProvider, isAvailable, AiRefusedError, AiBusyError, AiUnavailableError } = require('../lib/ai/provider');
const { sanitizeResult } = require('../lib/ai/schema');
const { systemPrompt, userMessage, questionMessage } = require('../lib/ai/prompts');
const { collectPain, collectPhysiology, physiologyCounts, redFlagsFor, redFlagsForQuestion, DISCLAIMER } = require('../lib/ai/input');
const { evaluateEligibility, THRESHOLD, NEW_RECORDS_NEEDED, MIN_DAYS_BETWEEN } = require('../lib/ai/policy');
const { analyzePain, analyzePhysiology } = require('../lib/ai/rules');
const { REVIEWED: KB_REVIEWED } = require('../lib/ai/knowledge/pain');
const { estimateCostUsd } = require('../lib/ai/cost');
const { normalize, findProblems, detectCrisis } = require('../lib/contentPolicy');

const router = express.Router();
router.param('id', validateObjectId);
router.use(protect);

const KINDS = ['pain', 'physiology'];
const DAY = 24 * 60 * 60 * 1000;
const WINDOW_MS = 30 * DAY;
const generateLimit = perUserLimiter({ windowMs: DAY, limit: 20, message: 'You have generated several insights today. Please try again tomorrow.' });
const askLimit = perUserLimiter({ windowMs: DAY, limit: 10, message: 'You have asked several questions today. Please try again tomorrow.' });

// One AI call per member at a time, so a double-click can't run (and be billed) twice.
const running = new Set();

const cap = (n) => Math.min(3, Math.max(1, Number(n) || 3));

async function countFor(kind, userId) {
  return kind === 'pain' ? PainEntry.countDocuments({ userId }) : (await physiologyCounts(userId)).total;
}

/** What the member sees. The stored copy is trimmed to the member's *current* limit each time it is shown. */
function present(doc, member) {
  const limit = Math.min(doc.maxPossibilities || 3, cap(member.ai && member.ai.maxPossibilities));
  const r = doc.result || {};
  const all = Array.isArray(r.possibilities) ? r.possibilities : [];
  const choice = doc.followUp && doc.followUp.choice;
  return {
    id: doc._id,
    kind: doc.kind,
    mode: doc.mode || 'deep',
    source: doc.provider === 'rules' ? 'rules' : 'ai',
    question: doc.question || null,
    createdAt: doc.createdAt,
    demo: doc.provider === 'mock',
    // The pattern-matching knowledge base is a draft until a clinician has reviewed it.
    draftKnowledge: doc.provider === 'rules' && doc.kind === 'pain' && !KB_REVIEWED,
    basisCount: doc.basisCount,
    includeDetail: doc.includeDetail,
    result: { ...r, possibilities: all.slice(0, limit), hiddenPossibilities: Math.max(0, all.length - limit) },
    disclaimer: DISCLAIMER,
    followUp: choice ? { choice, at: doc.followUp.at } : null,
    needsFollowUp: !choice,
  };
}

/** Everything the eligibility rules need about one member, in as few queries as possible. */
async function memberState(userId, member) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [unresolved, deepDocs, questionDocs] = await Promise.all([
    AiInsight.exists({ userId, 'followUp.choice': null }),
    AiInsight.find({ userId, mode: 'deep', createdAt: mongoose.trusted({ $gte: since }) }).sort({ createdAt: 1 }).select('createdAt').lean(),
    AiInsight.find({ userId, mode: 'question', createdAt: mongoose.trusted({ $gte: since }) }).sort({ createdAt: 1 }).select('createdAt').lean(),
  ]);
  const quota = (docs, limit) => ({ used: docs.length, limit, remaining: Math.max(0, limit - docs.length), resetsAt: docs.length ? new Date(new Date(docs[0].createdAt).getTime() + WINDOW_MS) : null });
  return {
    unresolved: Boolean(unresolved),
    deepQuota: quota(deepDocs, config.aiDeepPerMonth),
    questionQuota: quota(questionDocs, config.aiQuestionsPerMonth),
    settings: member.ai,
  };
}

const verdictFor = (mode, kind, count, latestDeep, state) => {
  const q = mode === 'question' ? state.questionQuota : state.deepQuota;
  return evaluateEligibility({ mode, count, latestDeep, unresolved: state.unresolved, settings: state.settings, available: isAvailable(), used: q.used, limit: q.limit, resetsAt: q.resetsAt });
};

// @route   GET /api/insights/status
router.get(
  '/status',
  handler(async (req, res) => {
    const member = req.account;
    const provider = getProvider();
    const state = await memberState(req.user.id, member);
    const settings = { consented: Boolean(member.ai && member.ai.consentAt), enabled: Boolean(member.ai && member.ai.enabled), maxPossibilities: cap(member.ai && member.ai.maxPossibilities) };
    const kinds = {};
    for (const kind of KINDS) {
      const [count, latest, latestDeep] = await Promise.all([
        countFor(kind, req.user.id),
        AiInsight.findOne({ userId: req.user.id, kind }).sort({ createdAt: -1 }).lean(),
        AiInsight.findOne({ userId: req.user.id, kind, mode: 'deep' }).sort({ createdAt: -1 }).lean(),
      ]);
      kinds[kind] = {
        count,
        basic: verdictFor('basic', kind, count, latestDeep, state),
        deep: verdictFor('deep', kind, count, latestDeep, state),
        latest: latest ? { id: latest._id, createdAt: latest.createdAt, needsFollowUp: !(latest.followUp && latest.followUp.choice) } : null,
      };
    }
    res.json({
      success: true,
      available: isAvailable(),
      demo: provider.demo,
      threshold: THRESHOLD,
      newRecordsNeeded: NEW_RECORDS_NEEDED,
      minDaysBetween: MIN_DAYS_BETWEEN,
      settings,
      unresolved: state.unresolved,
      quotas: { deep: state.deepQuota, question: state.questionQuota },
      question: verdictFor('question', 'question', 0, null, state),
      kinds,
    });
  }),
);

// @route   PUT /api/insights/settings   { consent?, enabled?, maxPossibilities? }
router.put(
  '/settings',
  handler(async (req, res) => {
    const { consent, enabled, maxPossibilities } = req.body || {};
    const member = await User.findById(req.user.id);
    member.ai = member.ai || {};

    if (consent !== undefined) {
      if (typeof consent !== 'boolean') return res.status(400).json({ message: 'consent must be true or false' });
      if (consent) {
        member.ai.consentAt = new Date();
        member.ai.consentVersion = config.aiConsentVersion;
        member.ai.enabled = true;
      } else {
        // Withdrawing consent switches the feature off and forgets that consent was ever given.
        member.ai.consentAt = undefined;
        member.ai.consentVersion = undefined;
        member.ai.enabled = false;
      }
    }
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') return res.status(400).json({ message: 'enabled must be true or false' });
      if (enabled && !member.ai.consentAt) return res.status(403).json({ code: 'consent-required', message: 'Please read and agree to how your records are used first.' });
      member.ai.enabled = enabled;
    }
    if (maxPossibilities !== undefined) {
      if (!Number.isInteger(maxPossibilities) || maxPossibilities < 1 || maxPossibilities > 3) return res.status(400).json({ message: 'maxPossibilities must be 1, 2 or 3' });
      member.ai.maxPossibilities = maxPossibilities;
    }
    await member.save();
    res.json({ success: true, settings: { consented: Boolean(member.ai.consentAt), enabled: Boolean(member.ai.enabled), maxPossibilities: cap(member.ai.maxPossibilities) } });
  }),
);

const WHY = {
  'need-more-logs': 'You need a few more records before there is enough to look at.',
  'need-consent': 'Please read and agree to how your records are used first.',
  'turned-off': 'AI suggestions are turned off. You can turn them back on in the settings.',
  'follow-up-required': 'Please choose what to do with your last result first: take it to your doctor, or limit the suggestions.',
  'need-more-new-logs': 'Add a few more records first, so there is something new to look at.',
  'too-soon': 'You had an AI look recently. Please wait a little before another.',
  'quota-reached': 'You have used this month’s AI allowance. The free quick summary is always available.',
  unavailable: 'AI suggestions are not set up on this server yet.',
};
const refuse = (res, verdict) => {
  const status = verdict.reason === 'need-consent' || verdict.reason === 'turned-off' ? 403 : verdict.reason === 'unavailable' ? 503 : verdict.reason === 'quota-reached' ? 429 : 409;
  return res.status(status).json({ code: verdict.reason, message: WHY[verdict.reason], remaining: verdict.remaining, nextEligibleAt: verdict.nextEligibleAt });
};

const providerErrorResponse = (res, err) => {
  if (err instanceof AiRefusedError) return res.status(422).json({ code: 'declined', message: "We couldn't prepare a response for this. Please talk to your doctor about it directly." });
  if (err instanceof AiBusyError) return res.status(429).json({ code: 'busy', message: 'The AI service is busy right now. Please try again in a few minutes.' });
  if (err instanceof AiUnavailableError) return res.status(503).json({ code: 'unavailable', message: 'The AI service could not be reached. Please try again later.' });
  return res.status(502).json({ code: 'failed', message: "We couldn't prepare a response this time. Please try again later." });
};

// @route   POST /api/insights/generate   { kind, mode?: 'basic'|'deep', includeDetail? }
// @desc    basic = free rules-based summary (default, nothing leaves the site). deep = AI look at the records.
router.post(
  '/generate',
  generateLimit,
  handler(async (req, res) => {
    const { kind } = req.body || {};
    const mode = req.body && req.body.mode !== undefined ? req.body.mode : 'basic';
    const includeDetail = req.body && req.body.includeDetail === true;
    if (!KINDS.includes(kind)) return res.status(400).json({ message: `kind must be one of: ${KINDS.join(', ')}` });
    if (mode !== 'basic' && mode !== 'deep') return res.status(400).json({ message: "mode must be 'basic' or 'deep'" });

    const member = await User.findById(req.user.id);
    const state = await memberState(req.user.id, member);
    const [count, latestDeep] = await Promise.all([countFor(kind, req.user.id), AiInsight.findOne({ userId: req.user.id, kind, mode: 'deep' }).sort({ createdAt: -1 }).lean()]);
    const verdict = verdictFor(mode, kind, count, latestDeep, state);
    if (!verdict.eligible) return refuse(res, verdict);

    if (mode === 'deep') {
      if (running.has(req.user.id)) return res.status(409).json({ code: 'already-running', message: 'A response is already being prepared. Please wait a moment.' });
      running.add(req.user.id);
    }
    try {
      const data = kind === 'pain' ? await collectPain(req.user.id, { includeDetail }) : await collectPhysiology(req.user.id, { includeDetail });
      // If anything the member wrote suggests they are in distress, they get support instead of a summary.
      if (data.crisis) return res.json({ success: true, crisis: true, insight: null });

      const limit = cap(member.ai && member.ai.maxPossibilities);
      let generated;
      let providerName;
      if (mode === 'basic') {
        providerName = 'rules';
        generated = { model: 'rules-v1', raw: kind === 'pain' ? analyzePain(data, { maxPossibilities: limit }) : analyzePhysiology(data, { maxPossibilities: limit }), usage: { inputTokens: 0, outputTokens: 0 } };
      } else {
        const provider = getProvider();
        providerName = provider.name;
        try {
          generated = await provider.generate({ kind, data, system: systemPrompt(kind, limit), user: userMessage(kind, data.input) });
        } catch (err) {
          return providerErrorResponse(res, err);
        }
      }

      const { result } = sanitizeResult(generated.raw, { maxPossibilities: limit });
      // Server-side warning signs come first and are never left to the model.
      result.redFlags = [...new Set([...redFlagsFor(kind, data), ...result.redFlags])].slice(0, 8);

      const usage = generated.usage || { inputTokens: 0, outputTokens: 0 };
      const doc = await AiInsight.create({
        userId: req.user.id,
        kind,
        mode,
        provider: providerName,
        model: String(generated.model || '').slice(0, 80),
        basisCount: count,
        includeDetail,
        maxPossibilities: limit,
        result,
        usage,
        costUsd: mode === 'basic' ? 0 : estimateCostUsd(generated.model, usage),
      });
      return res.status(201).json({ success: true, crisis: false, insight: present(doc, member) });
    } finally {
      if (mode === 'deep') running.delete(req.user.id);
    }
  }),
);

// @route   POST /api/insights/ask   { question, includeContext? }
// @desc    An AI answer to a question the member typed, e.g. "why does it hurt when I touch it in circles but not when I press?"
router.post(
  '/ask',
  askLimit,
  handler(async (req, res) => {
    const body = req.body || {};
    const question = typeof body.question === 'string' ? normalize(body.question) : '';
    if (question.length < 10 || question.length > 500) return res.status(400).json({ message: 'Please write your question in 10 to 500 characters.' });
    const problems = findProblems(question);
    if (problems.length) return res.status(422).json({ message: problems[0], problems });
    const includeContext = body.includeContext === true;

    const member = await User.findById(req.user.id);
    const state = await memberState(req.user.id, member);
    const verdict = verdictFor('question', 'question', 0, null, state);
    if (!verdict.eligible) return refuse(res, verdict);

    // Distress gets support resources, not an answer, and nothing is sent to the AI.
    if (detectCrisis(question)) return res.json({ success: true, crisis: true, insight: null });

    if (running.has(req.user.id)) return res.status(409).json({ code: 'already-running', message: 'A response is already being prepared. Please wait a moment.' });
    running.add(req.user.id);
    try {
      const data = includeContext ? await collectPain(req.user.id, { includeDetail: false }) : null;
      if (data && data.crisis) return res.json({ success: true, crisis: true, insight: null });
      const limit = cap(member.ai && member.ai.maxPossibilities);
      const provider = getProvider();
      let generated;
      try {
        generated = await provider.generate({ kind: 'question', question, data, system: systemPrompt('question', limit), user: questionMessage(question, data ? data.input : null), maxTokens: 1200 });
      } catch (err) {
        return providerErrorResponse(res, err);
      }
      const { result } = sanitizeResult(generated.raw, { maxPossibilities: limit });
      result.redFlags = [...new Set([...redFlagsForQuestion(question), ...result.redFlags])].slice(0, 8);
      const usage = generated.usage || { inputTokens: 0, outputTokens: 0 };
      const doc = await AiInsight.create({
        userId: req.user.id, kind: 'question', mode: 'question', provider: provider.name, model: String(generated.model || '').slice(0, 80),
        question, basisCount: 0, includeDetail: false, maxPossibilities: limit, result, usage, costUsd: estimateCostUsd(generated.model, usage),
      });
      return res.status(201).json({ success: true, crisis: false, insight: present(doc, member) });
    } finally {
      running.delete(req.user.id);
    }
  }),
);

const LIST_KINDS = [...KINDS, 'question'];

// @route   GET /api/insights?kind=
router.get(
  '/',
  handler(async (req, res) => {
    const filter = { userId: req.user.id };
    if (req.query.kind !== undefined) {
      if (!LIST_KINDS.includes(req.query.kind)) return res.status(400).json({ message: `kind must be one of: ${LIST_KINDS.join(', ')}` });
      filter.kind = req.query.kind;
    }
    const docs = await AiInsight.find(filter).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, insights: docs.map((d) => present(d, req.account)) });
  }),
);

// @route   GET /api/insights/:id
router.get(
  '/:id',
  handler(async (req, res) => {
    const doc = await AiInsight.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Insight not found' });
    res.json({ success: true, insight: present(doc, req.account) });
  }),
);

// @route   POST /api/insights/:id/follow-up
// @desc    The required next step. choice: 'discuss-with-doctor' | 'limit' (with maxPossibilities 1-3) | 'turn-off'
router.post(
  '/:id/follow-up',
  handler(async (req, res) => {
    const { choice, maxPossibilities } = req.body || {};
    const doc = await AiInsight.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Insight not found' });
    const member = await User.findById(req.user.id);
    member.ai = member.ai || {};

    let stored;
    if (choice === 'discuss-with-doctor') {
      stored = 'discuss-with-doctor';
    } else if (choice === 'limit') {
      if (!Number.isInteger(maxPossibilities) || maxPossibilities < 1 || maxPossibilities > 3) return res.status(400).json({ message: 'Choose to see 1, 2 or 3 possibilities at most' });
      member.ai.maxPossibilities = maxPossibilities;
      stored = 'limited';
    } else if (choice === 'turn-off') {
      member.ai.enabled = false;
      stored = 'turned-off';
    } else {
      return res.status(400).json({ message: "choice must be 'discuss-with-doctor', 'limit' or 'turn-off'" });
    }
    doc.followUp = { choice: stored, at: new Date() };
    await Promise.all([doc.save(), member.save()]);
    res.json({ success: true, insight: present(doc, member) });
  }),
);

// @route   DELETE /api/insights/:id   and   DELETE /api/insights (all of mine)
router.delete(
  '/:id',
  handler(async (req, res) => {
    const doc = await AiInsight.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Insight not found' });
    res.json({ success: true });
  }),
);
router.delete(
  '/',
  handler(async (req, res) => {
    const r = await AiInsight.deleteMany({ userId: req.user.id });
    res.json({ success: true, deleted: r.deletedCount });
  }),
);

module.exports = router;

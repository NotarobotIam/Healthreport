const express = require('express');
const mongoose = require('mongoose');
const Thread = require('../models/Thread');
const Reply = require('../models/Reply');
const Report = require('../models/Report');
const User = require('../models/User');
const ModAction = require('../models/ModAction');
const AiInsight = require('../models/AiInsight');
const { USER_ROLES } = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { handler, validateObjectId } = require('../middleware/errors');
const { text } = require('../lib/validate');
const { authorView, excerpt, paging, removeContent, hideContent } = require('../lib/community');

const router = express.Router();
router.param('id', validateObjectId);
router.use(protect, requireRole('moderator', 'admin'));

const RANK = { user: 0, moderator: 1, admin: 2 };
const outranks = (actor, target) => RANK[actor.role] > RANK[target.role];

const log = (req, action, targetType, targetId, note = '') =>
  ModAction.create({ moderatorId: req.user.id, action, targetType, targetId, note });

/** Loads the thing a report points at, in a form safe to show a moderator. */
async function previewTarget(report) {
  if (report.targetType === 'thread') {
    const t = await Thread.findById(report.targetId).populate('authorId', 'handle status role');
    if (!t) return null;
    return { type: 'thread', id: t._id, title: t.title, excerpt: excerpt(t.body, 400), status: t.status, author: authorView(t.authorId), threadId: t._id };
  }
  if (report.targetType === 'reply') {
    const r = await Reply.findById(report.targetId).populate('authorId', 'handle status role');
    if (!r) return null;
    return { type: 'reply', id: r._id, excerpt: excerpt(r.body, 400), status: r.status, author: authorView(r.authorId), threadId: r.threadId };
  }
  const u = await User.findById(report.targetId);
  if (!u) return null;
  return { type: 'user', id: u._id, handle: u.handle, bio: u.bio, status: u.status };
}

// @route   GET /api/mod/reports?status=open
router.get(
  '/reports',
  handler(async (req, res) => {
    const status = req.query.status || 'open';
    if (!['open', 'actioned', 'dismissed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const { page, limit, skip } = paging(req.query, { defaultLimit: 25, maxLimit: 50 });
    // Crisis flags first: they are the most time-sensitive.
    const [reports, total] = await Promise.all([
      Report.find({ status }).sort({ reason: 1, createdAt: 1 }).skip(skip).limit(limit).populate('reporterId', 'handle').lean(),
      Report.countDocuments({ status }),
    ]);
    const items = await Promise.all(
      reports.map(async (r) => ({
        id: r._id,
        reason: r.reason,
        details: r.details,
        source: r.source,
        status: r.status,
        action: r.action || null,
        reporter: r.reporterId ? r.reporterId.handle : null,
        createdAt: r.createdAt,
        target: await previewTarget(r),
      })),
    );
    items.sort((a, b) => (b.reason === 'self-harm') - (a.reason === 'self-harm'));
    res.json({ success: true, reports: items, page, total, hasMore: skip + reports.length < total });
  }),
);

/** Suspends a member. `days` omitted means until a moderator lifts it. */
async function suspendUser(user, { days, reason }) {
  user.status = 'suspended';
  user.suspendedUntil = days ? new Date(Date.now() + days * 86400000) : undefined;
  user.suspensionReason = reason;
  await user.save();
}

// @route   POST /api/mod/reports/:id/resolve
// @desc    action: dismiss | hide | remove | suspend_author (with optional days, reason)
router.post(
  '/reports/:id/resolve',
  handler(async (req, res) => {
    const { action } = req.body || {};
    if (!['dismiss', 'hide', 'remove', 'suspend_author'].includes(action)) return res.status(400).json({ message: 'Invalid action' });
    const note = req.body.note === undefined ? '' : text(req.body.note, { max: 500 });
    if (note === null) return res.status(400).json({ message: 'Note must be 500 characters or fewer' });

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.status !== 'open') return res.status(409).json({ message: 'This report has already been handled' });

    if (action !== 'dismiss') {
      // Work out the content and its author.
      const Model = { thread: Thread, reply: Reply, user: User }[report.targetType];
      const target = await Model.findById(report.targetId);
      if (!target) return res.status(404).json({ message: 'The reported item no longer exists' });
      const authorId = report.targetType === 'user' ? target._id : target.authorId;
      const author = await User.findById(authorId);

      if ((action === 'hide' || action === 'remove') && report.targetType === 'user') {
        return res.status(400).json({ message: 'Only threads and replies can be hidden or removed' });
      }
      if (author && !outranks(req.user, author)) {
        return res.status(403).json({ message: "You can't take action against a member of equal or higher rank" });
      }
      if (action === 'hide') await hideContent(report.targetType, target);
      if (action === 'remove') await removeContent(report.targetType, target, 'moderator');
      if (action === 'suspend_author') {
        const days = req.body.days === undefined ? undefined : Number(req.body.days);
        if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 365)) {
          return res.status(400).json({ message: 'days must be a whole number from 1 to 365 (omit for indefinite)' });
        }
        await suspendUser(author, { days, reason: note || 'Community guidelines' });
      }
    }

    // Close this report and any others open on the same item.
    const outcome = action === 'dismiss' ? 'dismissed' : 'actioned';
    await Report.updateMany(
      { targetType: report.targetType, targetId: report.targetId, status: 'open' },
      { $set: { status: outcome, action, handledBy: req.user.id, handledAt: new Date() } },
    );
    await log(req, action, report.targetType, report.targetId, note);
    res.json({ success: true, outcome });
  }),
);

// @route   POST /api/mod/content/:type/:id/restore   (bring back something hidden in error)
router.post(
  '/content/:type/:id/restore',
  handler(async (req, res) => {
    const Model = { thread: Thread, reply: Reply }[req.params.type];
    if (!Model) return res.status(400).json({ message: 'type must be thread or reply' });
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.status !== 'hidden') return res.status(409).json({ message: 'Only hidden content can be restored (removed content is deleted)' });
    doc.status = 'visible';
    await doc.save();
    if (req.params.type === 'reply') await Thread.updateOne({ _id: doc.threadId }, { $inc: { replyCount: 1 } });
    await log(req, 'restore', req.params.type, doc._id);
    res.json({ success: true });
  }),
);

async function findMember(handle) {
  const h = text(handle, { min: 3, max: 20 })?.toLowerCase();
  return h ? User.findOne({ handle: h }) : null;
}

// @route   GET /api/mod/users/:handle   (moderation view: no contact details)
router.get(
  '/users/:handle',
  handler(async (req, res) => {
    const user = await findMember(req.params.handle);
    if (!user) return res.status(404).json({ message: 'Member not found' });
    const [threads, replies, openReports] = await Promise.all([
      Thread.countDocuments({ authorId: user._id }),
      Reply.countDocuments({ authorId: user._id }),
      Report.countDocuments({ targetType: 'user', targetId: user._id, status: 'open' }),
    ]);
    res.json({
      success: true,
      member: {
        handle: user.handle, role: user.role, status: user.status, suspendedUntil: user.suspendedUntil || null,
        suspensionReason: user.suspensionReason || null, joined: user.createdAt, threads, replies, openReports,
      },
    });
  }),
);

// @route   POST /api/mod/users/:handle/suspend   { days?, reason }
router.post(
  '/users/:handle/suspend',
  handler(async (req, res) => {
    const user = await findMember(req.params.handle);
    if (!user || user.status === 'deleted') return res.status(404).json({ message: 'Member not found' });
    if (!outranks(req.user, user)) return res.status(403).json({ message: "You can't take action against a member of equal or higher rank" });
    const reason = text(req.body?.reason, { min: 3, max: 500 });
    if (!reason) return res.status(400).json({ message: 'A reason is required' });
    const days = req.body.days === undefined ? undefined : Number(req.body.days);
    if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 365)) {
      return res.status(400).json({ message: 'days must be a whole number from 1 to 365 (omit for indefinite)' });
    }
    await suspendUser(user, { days, reason });
    await log(req, 'suspend', 'user', user._id, reason);
    res.json({ success: true });
  }),
);

// @route   POST /api/mod/users/:handle/unsuspend
router.post(
  '/users/:handle/unsuspend',
  handler(async (req, res) => {
    const user = await findMember(req.params.handle);
    if (!user || user.status !== 'suspended') return res.status(404).json({ message: 'No suspended member with that username' });
    if (!outranks(req.user, user)) return res.status(403).json({ message: "You can't take action against a member of equal or higher rank" });
    user.status = 'active';
    user.suspendedUntil = undefined;
    user.suspensionReason = undefined;
    await user.save();
    await log(req, 'unsuspend', 'user', user._id);
    res.json({ success: true });
  }),
);

// @route   POST /api/mod/users/:handle/role   { role }   (admins only)
router.post(
  '/users/:handle/role',
  requireRole('admin'),
  handler(async (req, res) => {
    const role = req.body?.role;
    if (!USER_ROLES.includes(role)) return res.status(400).json({ message: `role must be one of: ${USER_ROLES.join(', ')}` });
    const user = await findMember(req.params.handle);
    if (!user || user.status === 'deleted') return res.status(404).json({ message: 'Member not found' });
    if (String(user._id) === req.user.id) return res.status(400).json({ message: "You can't change your own role" });
    user.role = role;
    await user.save();
    await log(req, `role:${role}`, 'user', user._id);
    res.json({ success: true });
  }),
);

// @route   GET /api/mod/actions   (audit trail)
router.get(
  '/actions',
  handler(async (req, res) => {
    const { page, limit, skip } = paging(req.query, { defaultLimit: 30, maxLimit: 100 });
    const actions = await ModAction.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('moderatorId', 'handle').lean();
    res.json({
      success: true,
      actions: actions.map((a) => ({ id: a._id, moderator: a.moderatorId?.handle ?? null, action: a.action, targetType: a.targetType, targetId: a.targetId, note: a.note, createdAt: a.createdAt })),
      page,
    });
  }),
);

// @route   GET /api/mod/ai-usage   (admins only)
// @desc    What the AI features have cost over the last 30 days, by kind of request. No member is identified.
router.get(
  '/ai-usage',
  requireRole('admin'),
  handler(async (req, res) => {
    const since = new Date(Date.now() - 30 * 86400000);
    const rows = await AiInsight.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { mode: '$mode', provider: '$provider' }, requests: { $sum: 1 }, inputTokens: { $sum: '$usage.inputTokens' }, outputTokens: { $sum: '$usage.outputTokens' }, costUsd: { $sum: '$costUsd' } } },
      { $sort: { costUsd: -1 } },
    ]);
    const totals = rows.reduce((t, r) => ({ requests: t.requests + r.requests, costUsd: t.costUsd + (r.costUsd || 0) }), { requests: 0, costUsd: 0 });
    const paid = rows.filter((r) => r._id.provider !== 'rules').reduce((t, r) => ({ requests: t.requests + r.requests, costUsd: t.costUsd + (r.costUsd || 0) }), { requests: 0, costUsd: 0 });
    res.json({
      success: true,
      windowDays: 30,
      byKind: rows.map((r) => ({ mode: r._id.mode, provider: r._id.provider, requests: r.requests, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUsd: r.costUsd || 0 })),
      totalRequests: totals.requests,
      aiRequests: paid.requests,
      aiCostUsd: paid.costUsd,
      averageAiCostUsd: paid.requests ? paid.costUsd / paid.requests : 0,
      // The free quick summary is not billed; this is the average across *all* insights, free and paid.
      averageCostAllInsightsUsd: totals.requests ? totals.costUsd / totals.requests : 0,
    });
  }),
);

module.exports = router;

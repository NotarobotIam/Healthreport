const express = require('express');
const mongoose = require('mongoose');
const Thread = require('../models/Thread');
const Reply = require('../models/Reply');
const Support = require('../models/Support');
const Report = require('../models/Report');
const Block = require('../models/Block');
const User = require('../models/User');
const PainEntry = require('../models/PainEntry');
const Membership = require('../models/Membership');
const Friendship = require('../models/Friendship');
const { PAIN_TYPES } = require('../models/painConstants');
const { REPORT_REASONS } = require('../models/Report');
const { protect, requireNotSuspended } = require('../middleware/auth');
const { handler, validateObjectId } = require('../middleware/errors');
const { perUserLimiter } = require('../middleware/rateLimit');
const { text } = require('../lib/validate');
const { getGroup } = require('../lib/groups');
const { friendshipStatus } = require('./friends');
const { detectCrisis } = require('../lib/contentPolicy');
const { rankMatches, durationBucket, MIN_GROUP_SIZE } = require('../lib/matching');
const {
  trusted, blockedIds, authorView, excerpt, paging, parsePostText, parseRegion, parsePainTypes,
  removeContent, raiseSystemReport,
} = require('../lib/community');

const router = express.Router();
router.param('id', validateObjectId);
router.use(protect);

const HOUR = 60 * 60 * 1000;
const newThreadLimit = perUserLimiter({ windowMs: HOUR, limit: 5, message: 'You have started several threads recently. Please wait a while before starting another.' });
const newReplyLimit = perUserLimiter({ windowMs: HOUR, limit: 40, message: 'You are replying very quickly. Please slow down a little.' });
const reportLimit = perUserLimiter({ windowMs: HOUR, limit: 20, message: 'Too many reports in a short time.' });
const supportLimit = perUserLimiter({ windowMs: HOUR, limit: 150, message: 'Too many reactions in a short time.' });

const isMod = (req) => req.user.role === 'moderator' || req.user.role === 'admin';

// --- Presenters ---------------------------------------------------------------

/** The public face of a community tag on a thread. */
function groupSummary(slug) {
  const g = getGroup(slug);
  return g ? { slug: g.slug, name: g.name } : null;
}

function presentThread(t, { me, supported = false, full = false } = {}) {
  const author = authorView(t.authorId);
  const removed = t.status !== 'visible';
  return {
    id: t._id,
    title: removed ? '[removed]' : t.title,
    ...(full ? { body: removed ? '' : t.body } : { excerpt: removed ? '' : excerpt(t.body) }),
    author,
    isMine: String(t.authorId._id ?? t.authorId) === me,
    region: t.region && (t.region.partId || t.region.system) ? t.region : null,
    group: groupSummary(t.group),
    painTypes: t.painTypes,
    replyCount: t.replyCount,
    supportCount: t.supportCount,
    iSupported: supported,
    status: t.status,
    createdAt: t.createdAt,
    editedAt: t.editedAt || null,
    lastActivityAt: t.lastActivityAt,
  };
}

function presentReply(r, { me, supported = false } = {}) {
  const removed = r.status !== 'visible';
  return {
    id: r._id,
    body: removed ? '' : r.body,
    status: r.status,
    author: authorView(r.authorId),
    isMine: String(r.authorId._id ?? r.authorId) === me,
    supportCount: r.supportCount,
    iSupported: supported,
    createdAt: r.createdAt,
    editedAt: r.editedAt || null,
  };
}

async function supportedSet(userId, targetType, ids) {
  if (!ids.length) return new Set();
  const rows = await Support.find({ userId, targetType, targetId: trusted({ $in: ids }) }).select('targetId').lean();
  return new Set(rows.map((r) => String(r.targetId)));
}

const AUTHOR_FIELDS = 'handle status role';

// --- Threads ------------------------------------------------------------------

// @route   GET /api/community/threads
// @desc    Browse threads. Filters: system, partId, type, q (search); sort: recent | active
router.get(
  '/threads',
  handler(async (req, res) => {
    const { system, partId, type, q, sort } = req.query;
    const filter = { status: 'visible' };

    if (system !== undefined) {
      const s = text(system, { min: 1, max: 40 });
      if (!s) return res.status(400).json({ message: 'Invalid system' });
      filter['region.system'] = s;
    }
    if (partId !== undefined) {
      const p = text(partId, { min: 1, max: 40 });
      if (!p) return res.status(400).json({ message: 'Invalid partId' });
      filter['region.partId'] = p;
    }
    if (type !== undefined) {
      if (!PAIN_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid pain type' });
      filter.painTypes = type;
    }
    if (req.query.group !== undefined) {
      const gr = getGroup(req.query.group);
      if (!gr) return res.status(400).json({ message: 'Unknown community' });
      filter.group = gr.slug;
    } else if (req.query.mine === '1') {
      // Threads from the communities *I* have joined. My memberships are only ever read for me.
      const mine = (await Membership.find({ userId: req.user.id }).select('group').lean()).map((m) => m.group);
      if (mine.length === 0) return res.json({ success: true, threads: [], page: 1, total: 0, hasMore: false });
      filter.group = trusted({ $in: mine });
    }
    if (q !== undefined) {
      const term = text(q, { min: 2, max: 100 });
      if (!term) return res.status(400).json({ message: 'Search must be 2-100 characters' });
      filter.$text = trusted({ $search: term });
    }
    const blocked = await blockedIds(req.user.id);
    if (blocked.length) filter.authorId = trusted({ $nin: blocked });

    const { page, limit, skip } = paging(req.query);
    const order = sort === 'active' ? { lastActivityAt: -1 } : { createdAt: -1 };
    const [threads, total] = await Promise.all([
      Thread.find(filter).sort(order).skip(skip).limit(limit).populate('authorId', AUTHOR_FIELDS),
      Thread.countDocuments(filter),
    ]);
    const supported = await supportedSet(req.user.id, 'thread', threads.map((t) => t._id));

    res.json({
      success: true,
      threads: threads.map((t) => presentThread(t, { me: req.user.id, supported: supported.has(String(t._id)) })),
      page,
      total,
      hasMore: skip + threads.length < total,
    });
  }),
);

// @route   POST /api/community/threads
router.post(
  '/threads',
  requireNotSuspended,
  newThreadLimit,
  handler(async (req, res) => {
    const body = req.body || {};
    const parsedText = parsePostText(body, { titleRequired: true, bodyMin: 10, bodyMax: 5000 });
    if (parsedText.error) return res.status(422).json({ message: parsedText.error, problems: parsedText.problems });
    const region = parseRegion(body.region);
    if (region.error) return res.status(400).json({ message: region.error });
    const types = parsePainTypes(body.painTypes);
    if (types.error) return res.status(400).json({ message: types.error });

    // A community is optional (no group = the general board), but posting in one means being a member.
    let group;
    if (body.group !== undefined && body.group !== null) {
      const gr = getGroup(body.group);
      if (!gr) return res.status(400).json({ message: 'Unknown community' });
      if (!(await Membership.exists({ userId: req.user.id, group: gr.slug }))) {
        return res.status(403).json({ message: `Join ${gr.name} to post in it.` });
      }
      group = gr.slug;
    }

    const crisis = detectCrisis(`${parsedText.value.title} ${parsedText.value.body}`);
    const thread = await Thread.create({
      authorId: req.user.id,
      ...parsedText.value,
      group,
      region: region.value,
      painTypes: types.value,
      flaggedForCrisis: crisis,
    });
    if (crisis) await raiseSystemReport('thread', thread._id, 'self-harm', 'Automatically flagged: crisis language detected');

    await thread.populate('authorId', AUTHOR_FIELDS);
    res.status(201).json({ success: true, crisis, thread: presentThread(thread, { me: req.user.id, full: true }) });
  }),
);

// @route   GET /api/community/threads/:id
router.get(
  '/threads/:id',
  handler(async (req, res) => {
    const thread = await Thread.findById(req.params.id).populate('authorId', AUTHOR_FIELDS);
    if (!thread || (thread.status !== 'visible' && !isMod(req))) return res.status(404).json({ message: 'Thread not found' });

    const blocked = await blockedIds(req.user.id);
    const filter = { threadId: thread._id };
    if (blocked.length) filter.authorId = trusted({ $nin: blocked });
    const { page, limit, skip } = paging(req.query, { defaultLimit: 50, maxLimit: 100 });
    const [replies, total, threadSupport] = await Promise.all([
      Reply.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).populate('authorId', AUTHOR_FIELDS),
      Reply.countDocuments(filter),
      supportedSet(req.user.id, 'thread', [thread._id]),
    ]);
    const replySupport = await supportedSet(req.user.id, 'reply', replies.map((r) => r._id));

    res.json({
      success: true,
      thread: presentThread(thread, { me: req.user.id, supported: threadSupport.has(String(thread._id)), full: true }),
      replies: replies.map((r) => presentReply(r, { me: req.user.id, supported: replySupport.has(String(r._id)) })),
      page,
      total,
      hasMore: skip + replies.length < total,
    });
  }),
);

// @route   PUT /api/community/threads/:id   (author only)
router.put(
  '/threads/:id',
  requireNotSuspended,
  handler(async (req, res) => {
    const thread = await Thread.findOne({ _id: req.params.id, authorId: req.user.id, status: 'visible' });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    const body = req.body || {};
    const parsedText = parsePostText(body, { titleRequired: false, bodyMin: 0, bodyMax: 5000 });
    if (parsedText.error) return res.status(422).json({ message: parsedText.error, problems: parsedText.problems });
    if (parsedText.value.body !== undefined && parsedText.value.body.length < 10) {
      return res.status(422).json({ message: 'Message must be between 10 and 5000 characters' });
    }
    Object.assign(thread, parsedText.value, { editedAt: new Date() });
    if (body.painTypes !== undefined) {
      const types = parsePainTypes(body.painTypes);
      if (types.error) return res.status(400).json({ message: types.error });
      thread.painTypes = types.value;
    }
    const crisis = detectCrisis(`${thread.title} ${thread.body}`);
    if (crisis && !thread.flaggedForCrisis) {
      thread.flaggedForCrisis = true;
      await raiseSystemReport('thread', thread._id, 'self-harm', 'Automatically flagged: crisis language detected (edit)');
    }
    await thread.save();
    await thread.populate('authorId', AUTHOR_FIELDS);
    res.json({ success: true, crisis, thread: presentThread(thread, { me: req.user.id, full: true }) });
  }),
);

// @route   DELETE /api/community/threads/:id   (author only)
router.delete(
  '/threads/:id',
  handler(async (req, res) => {
    const thread = await Thread.findOne({ _id: req.params.id, authorId: req.user.id, status: trusted({ $ne: 'removed' }) });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    await removeContent('thread', thread, 'author');
    res.json({ success: true });
  }),
);

// --- Replies ------------------------------------------------------------------

// @route   POST /api/community/threads/:id/replies
router.post(
  '/threads/:id/replies',
  requireNotSuspended,
  newReplyLimit,
  handler(async (req, res) => {
    const thread = await Thread.findOne({ _id: req.params.id, status: 'visible' });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    const parsedText = parsePostText({ body: req.body?.body }, { titleRequired: false, bodyMin: 1, bodyMax: 3000 });
    if (parsedText.error) return res.status(422).json({ message: parsedText.error, problems: parsedText.problems });

    const crisis = detectCrisis(parsedText.value.body);
    const reply = await Reply.create({ threadId: thread._id, authorId: req.user.id, body: parsedText.value.body, flaggedForCrisis: crisis });
    await Thread.updateOne({ _id: thread._id }, { $inc: { replyCount: 1 }, $set: { lastActivityAt: new Date() } });
    if (crisis) await raiseSystemReport('reply', reply._id, 'self-harm', 'Automatically flagged: crisis language detected');

    await reply.populate('authorId', AUTHOR_FIELDS);
    res.status(201).json({ success: true, crisis, reply: presentReply(reply, { me: req.user.id }) });
  }),
);

// @route   PUT /api/community/replies/:id   (author only)
router.put(
  '/replies/:id',
  requireNotSuspended,
  handler(async (req, res) => {
    const reply = await Reply.findOne({ _id: req.params.id, authorId: req.user.id, status: 'visible' });
    if (!reply) return res.status(404).json({ message: 'Reply not found' });
    const parsedText = parsePostText({ body: req.body?.body }, { titleRequired: false, bodyMin: 1, bodyMax: 3000 });
    if (parsedText.error) return res.status(422).json({ message: parsedText.error, problems: parsedText.problems });
    reply.body = parsedText.value.body;
    reply.editedAt = new Date();
    const crisis = detectCrisis(reply.body);
    if (crisis && !reply.flaggedForCrisis) {
      reply.flaggedForCrisis = true;
      await raiseSystemReport('reply', reply._id, 'self-harm', 'Automatically flagged: crisis language detected (edit)');
    }
    await reply.save();
    await reply.populate('authorId', AUTHOR_FIELDS);
    res.json({ success: true, crisis, reply: presentReply(reply, { me: req.user.id }) });
  }),
);

// @route   DELETE /api/community/replies/:id   (author only)
router.delete(
  '/replies/:id',
  handler(async (req, res) => {
    const reply = await Reply.findOne({ _id: req.params.id, authorId: req.user.id, status: trusted({ $ne: 'removed' }) });
    if (!reply) return res.status(404).json({ message: 'Reply not found' });
    await removeContent('reply', reply, 'author');
    res.json({ success: true });
  }),
);

// --- "I relate" -----------------------------------------------------------------

async function toggleSupport(req, res, targetType, Model) {
  const doc = await Model.findOne({ _id: req.params.id, status: 'visible' });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  if (String(doc.authorId) === req.user.id) return res.status(400).json({ message: "You can't react to your own post" });

  const removed = await Support.findOneAndDelete({ userId: req.user.id, targetType, targetId: doc._id });
  let delta = -1;
  if (!removed) {
    try {
      await Support.create({ userId: req.user.id, targetType, targetId: doc._id });
      delta = 1;
    } catch (err) {
      if (err.code !== 11000) throw err;
      delta = 0; // a concurrent request already added it
    }
  }
  const updated = await Model.findByIdAndUpdate(doc._id, { $inc: { supportCount: delta } }, { new: true });
  return res.json({ success: true, supported: delta === 1 || (delta === 0 && !removed), supportCount: Math.max(0, updated.supportCount) });
}

// @route   POST /api/community/threads/:id/support   (toggle)
router.post('/threads/:id/support', supportLimit, handler((req, res) => toggleSupport(req, res, 'thread', Thread)));
// @route   POST /api/community/replies/:id/support   (toggle)
router.post('/replies/:id/support', supportLimit, handler((req, res) => toggleSupport(req, res, 'reply', Reply)));

// --- Reports ----------------------------------------------------------------------

// @route   POST /api/community/reports
router.post(
  '/reports',
  reportLimit,
  handler(async (req, res) => {
    const { targetType, targetId, reason } = req.body || {};
    if (!['thread', 'reply', 'user'].includes(targetType)) return res.status(400).json({ message: 'Invalid targetType' });
    if (typeof targetId !== 'string' || !mongoose.isValidObjectId(targetId)) return res.status(400).json({ message: 'Invalid targetId' });
    if (!REPORT_REASONS.includes(reason)) return res.status(400).json({ message: `reason must be one of: ${REPORT_REASONS.join(', ')}` });
    const details = req.body.details === undefined ? '' : text(req.body.details, { max: 500 });
    if (details === null) return res.status(400).json({ message: 'Details must be 500 characters or fewer' });

    const Model = { thread: Thread, reply: Reply, user: User }[targetType];
    const target = await Model.findById(targetId);
    if (!target) return res.status(404).json({ message: 'Not found' });
    const ownerId = targetType === 'user' ? target._id : target.authorId;
    if (String(ownerId) === req.user.id) return res.status(400).json({ message: "You can't report your own content" });

    try {
      await Report.create({ reporterId: req.user.id, targetType, targetId, reason, details });
    } catch (err) {
      if (err.code !== 11000) throw err; // already reported by this member: treat as success
    }
    res.status(201).json({ success: true });
  }),
);

// --- Blocking -----------------------------------------------------------------------

// @route   GET /api/community/blocks
router.get(
  '/blocks',
  handler(async (req, res) => {
    const blocks = await Block.find({ userId: req.user.id }).populate('blockedId', 'handle status').lean();
    res.json({ success: true, blocked: blocks.filter((b) => b.blockedId && b.blockedId.status !== 'deleted').map((b) => b.blockedId.handle) });
  }),
);

async function findMemberByHandle(handle) {
  const h = text(handle, { min: 3, max: 20 })?.toLowerCase();
  if (!h) return null;
  const user = await User.findOne({ handle: h });
  return user && user.status !== 'deleted' ? user : null;
}

// @route   POST /api/community/blocks/:handle
router.post(
  '/blocks/:handle',
  handler(async (req, res) => {
    const target = await findMemberByHandle(req.params.handle);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    if (String(target._id) === req.user.id) return res.status(400).json({ message: "You can't block yourself" });
    await Block.updateOne({ userId: req.user.id, blockedId: target._id }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    // Blocking someone also ends any friendship or pending request between you.
    await Friendship.deleteMany({ pairKey: Friendship.keyFor(req.user.id, target._id) });
    res.json({ success: true });
  }),
);

// @route   DELETE /api/community/blocks/:handle
router.delete(
  '/blocks/:handle',
  handler(async (req, res) => {
    const target = await findMemberByHandle(req.params.handle);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    await Block.deleteOne({ userId: req.user.id, blockedId: target._id });
    res.json({ success: true });
  }),
);

// --- Profiles ---------------------------------------------------------------------------

// @route   GET /api/community/users/:handle   (public profile: nothing beyond what the member chose to show)
router.get(
  '/users/:handle',
  handler(async (req, res) => {
    const user = await findMemberByHandle(req.params.handle);
    if (!user) return res.status(404).json({ message: 'Member not found' });
    const [threadCount, replyCount, blocked, friendship] = await Promise.all([
      Thread.countDocuments({ authorId: user._id, status: 'visible' }),
      Reply.countDocuments({ authorId: user._id, status: 'visible' }),
      Block.exists({ userId: req.user.id, blockedId: user._id }),
      friendshipStatus(req.user.id, user._id),
    ]);
    res.json({
      success: true,
      profile: {
        handle: user.handle,
        bio: user.bio,
        role: user.role,
        joined: user.createdAt.toISOString().slice(0, 7),
        threadCount,
        replyCount,
        isMe: String(user._id) === req.user.id,
        blocked: Boolean(blocked),
        friendship, // none | friends | requested | incoming
      },
    });
  }),
);

// --- People like me ---------------------------------------------------------------------------

// @route   GET /api/community/matches?entryId=
// @desc    Members whose *shared* pain entries resemble one of yours, plus related threads.
//          Only region, pain type, severity, pattern and a coarse duration are revealed.
router.get(
  '/matches',
  handler(async (req, res) => {
    const { entryId } = req.query;
    if (typeof entryId !== 'string' || !mongoose.isValidObjectId(entryId)) return res.status(400).json({ message: 'entryId is required' });
    const mine = await PainEntry.findOne({ _id: entryId, userId: req.user.id }).lean();
    if (!mine) return res.status(404).json({ message: 'Pain entry not found' });

    const excluded = [new mongoose.Types.ObjectId(req.user.id), ...(await blockedIds(req.user.id))];
    const candidates = await PainEntry.find({
      visibility: 'community',
      status: 'active',
      userId: trusted({ $nin: excluded }),
      $or: [{ 'location.partId': mine.location.partId }, { 'location.system': mine.location.system }],
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const owners = await User.find({ _id: trusted({ $in: [...new Set(candidates.map((c) => String(c.userId)))] }), status: 'active' })
      .select('handle')
      .lean();
    const handleById = new Map(owners.map((u) => [String(u._id), u.handle]));
    const ranked = rankMatches(mine, candidates.filter((c) => handleById.has(String(c.userId))));

    const matches = ranked.map((m) => ({
      handle: handleById.get(String(m.userId)),
      band: m.band,
      sameStructure: m.entry.location.partId === mine.location.partId,
      commonTypes: m.entry.painTypes.filter((t) => mine.painTypes.includes(t)),
      entry: {
        region: { partName: m.entry.location.partName, system: m.entry.location.system, side: m.entry.location.side },
        painTypes: m.entry.painTypes,
        severity: m.entry.severity,
        pattern: m.entry.pattern,
        duration: durationBucket(m.entry.onset),
      },
    }));

    const threadFilter = {
      status: 'visible',
      $or: [{ 'region.partId': mine.location.partId }, { 'region.system': mine.location.system }],
    };
    if (excluded.length > 1) threadFilter.authorId = trusted({ $nin: excluded.slice(1) });
    const related = await Thread.find(threadFilter).sort({ lastActivityAt: -1 }).limit(5).populate('authorId', AUTHOR_FIELDS);
    const supported = await supportedSet(req.user.id, 'thread', related.map((t) => t._id));

    res.json({
      success: true,
      sharedByYou: mine.visibility === 'community',
      matches,
      relatedThreads: related.map((t) => presentThread(t, { me: req.user.id, supported: supported.has(String(t._id)) })),
    });
  }),
);

// @route   GET /api/community/regions/summary?partId=&system=
// @desc    How many other members report pain in a region. Counts under MIN_GROUP_SIZE are
//          withheld so a small number can't be used to single someone out.
router.get(
  '/regions/summary',
  handler(async (req, res) => {
    const partId = req.query.partId === undefined ? undefined : text(req.query.partId, { min: 1, max: 40 });
    const system = req.query.system === undefined ? undefined : text(req.query.system, { min: 1, max: 40 });
    if ((req.query.partId !== undefined && !partId) || (req.query.system !== undefined && !system) || (!partId && !system)) {
      return res.status(400).json({ message: 'partId or system is required' });
    }
    const field = partId ? 'location.partId' : 'location.system';
    const value = partId || system;
    const excluded = [new mongoose.Types.ObjectId(req.user.id), ...(await blockedIds(req.user.id))];

    const memberIds = await PainEntry.distinct('userId', {
      visibility: 'community',
      status: 'active',
      [field]: value,
      userId: trusted({ $nin: excluded }),
    });
    const active = memberIds.length ? await User.countDocuments({ _id: trusted({ $in: memberIds }), status: 'active' }) : 0;
    const threadCount = await Thread.countDocuments({ status: 'visible', [partId ? 'region.partId' : 'region.system']: value });

    res.json({
      success: true,
      members: active >= MIN_GROUP_SIZE ? active : null,
      membersHidden: active > 0 && active < MIN_GROUP_SIZE,
      threadCount,
    });
  }),
);

module.exports = router;

const express = require('express');
const Friendship = require('../models/Friendship');
const Block = require('../models/Block');
const User = require('../models/User');
const Thread = require('../models/Thread');
const Reply = require('../models/Reply');
const { protect } = require('../middleware/auth');
const { handler } = require('../middleware/errors');
const { perUserLimiter } = require('../middleware/rateLimit');
const { text } = require('../lib/validate');
const { getGroup } = require('../lib/groups');
const { excerpt, trusted } = require('../lib/community');

const router = express.Router();
router.use(protect);

const DAY = 24 * 60 * 60 * 1000;
const MAX_FRIENDS = 200;
const DECLINE_COOLDOWN_MS = 90 * DAY; // a declined request can't be re-sent for this long
const ACTIVITY_WINDOW_MS = 30 * DAY;

const requestLimit = perUserLimiter({ windowMs: DAY, limit: 20, message: 'You have sent a lot of friend requests today. Please try again tomorrow.' });

/** The other member in a pair, from my point of view. */
const otherId = (f, me) => (String(f.requesterId) === me ? f.recipientId : f.requesterId);

async function findMember(handle) {
  const h = text(handle, { min: 3, max: 20 })?.toLowerCase();
  if (!h) return null;
  const user = await User.findOne({ handle: h });
  return user && user.status !== 'deleted' ? user : null;
}

/** True if either member has blocked the other. Callers answer "not found" so a block is never revealed. */
async function eitherBlocked(a, b) {
  return Boolean(await Block.exists({ $or: [{ userId: a, blockedId: b }, { userId: b, blockedId: a }] }));
}

const handlesFor = async (ids) => {
  const users = await User.find({ _id: trusted({ $in: ids }), status: 'active' }).select('handle').lean();
  return new Map(users.map((u) => [String(u._id), u.handle]));
};

// @route   GET /api/friends
// @desc    Your friends, and the requests waiting on you or on them
router.get(
  '/',
  handler(async (req, res) => {
    const me = req.user.id;
    const rows = await Friendship.find({ status: trusted({ $in: ['pending', 'accepted'] }), $or: [{ requesterId: me }, { recipientId: me }] })
      .sort({ respondedAt: -1, createdAt: -1 })
      .lean();
    const names = await handlesFor(rows.map((f) => otherId(f, me)));
    const item = (f) => ({ handle: names.get(String(otherId(f, me))), at: f.respondedAt || f.createdAt });
    const keep = (f) => names.has(String(otherId(f, me)));
    res.json({
      success: true,
      friends: rows.filter((f) => f.status === 'accepted' && keep(f)).map(item),
      incoming: rows.filter((f) => f.status === 'pending' && String(f.recipientId) === me && keep(f)).map(item),
      outgoing: rows.filter((f) => f.status === 'pending' && String(f.requesterId) === me && keep(f)).map(item),
    });
  }),
);

// @route   GET /api/friends/activity
// @desc    What your friends have posted lately. Only content already visible to every member is
//          ever included: never pain entries, reports, or which communities someone has joined.
router.get(
  '/activity',
  handler(async (req, res) => {
    const me = req.user.id;
    const rows = await Friendship.find({ status: 'accepted', $or: [{ requesterId: me }, { recipientId: me }] }).lean();
    const friendIds = rows.map((f) => otherId(f, me));
    if (friendIds.length === 0) return res.json({ success: true, hasFriends: false, items: [] });

    const since = new Date(Date.now() - ACTIVITY_WINDOW_MS);
    const [threads, replies] = await Promise.all([
      Thread.find({ authorId: trusted({ $in: friendIds }), status: 'visible', createdAt: trusted({ $gte: since }) })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate('authorId', 'handle status')
        .lean(),
      Reply.find({ authorId: trusted({ $in: friendIds }), status: 'visible', createdAt: trusted({ $gte: since }) })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate('authorId', 'handle status')
        .populate('threadId', 'title status group')
        .lean(),
    ]);

    const groupOf = (slug) => {
      const gr = getGroup(slug);
      return gr ? { slug: gr.slug, name: gr.name } : null;
    };
    const items = [
      ...threads.map((t) => ({
        type: 'thread',
        friend: t.authorId.handle,
        at: t.createdAt,
        threadId: t._id,
        title: t.title,
        excerpt: excerpt(t.body, 140),
        group: groupOf(t.group),
      })),
      ...replies
        .filter((r) => r.threadId && r.threadId.status === 'visible') // a reply in a removed thread isn't shown
        .map((r) => ({
          type: 'reply',
          friend: r.authorId.handle,
          at: r.createdAt,
          threadId: r.threadId._id,
          title: r.threadId.title,
          excerpt: excerpt(r.body, 140),
          group: groupOf(r.threadId.group),
        })),
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 15);

    res.json({ success: true, hasFriends: true, items });
  }),
);

// @route   POST /api/friends/:handle   (send a request; idempotent)
router.post(
  '/:handle',
  requestLimit,
  handler(async (req, res) => {
    const me = req.user.id;
    const target = await findMember(req.params.handle);
    if (!target || (await eitherBlocked(me, target._id))) return res.status(404).json({ message: 'Member not found' });
    if (String(target._id) === me) return res.status(400).json({ message: "You can't add yourself" });

    const pairKey = Friendship.keyFor(me, target._id);
    const existing = await Friendship.findOne({ pairKey });

    if (existing) {
      if (existing.status === 'accepted') return res.json({ success: true, status: 'friends' });
      if (existing.status === 'pending') {
        if (String(existing.requesterId) === me) return res.json({ success: true, status: 'requested' });
        existing.status = 'accepted'; // they already asked me, so asking back means yes
        existing.respondedAt = new Date();
        await existing.save();
        return res.json({ success: true, status: 'friends' });
      }
      // Declined earlier. If it was *me* who declined, I'm free to ask them. If they declined me, wait out
      // the cool-down, answering as if the request went through so the decline isn't revealed.
      const iDeclined = String(existing.recipientId) === me;
      if (!iDeclined && Date.now() - new Date(existing.respondedAt).getTime() < DECLINE_COOLDOWN_MS) {
        return res.json({ success: true, status: 'requested' });
      }
      existing.requesterId = me;
      existing.recipientId = target._id;
      existing.status = 'pending';
      existing.createdAt = new Date();
      existing.respondedAt = undefined;
      await existing.save();
      return res.json({ success: true, status: 'requested' });
    }

    if ((await Friendship.countDocuments({ status: 'accepted', $or: [{ requesterId: me }, { recipientId: me }] })) >= MAX_FRIENDS) {
      return res.status(400).json({ message: `You've reached the limit of ${MAX_FRIENDS} friends.` });
    }
    try {
      await Friendship.create({ requesterId: me, recipientId: target._id, pairKey });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
    res.status(201).json({ success: true, status: 'requested' });
  }),
);

// @route   POST /api/friends/:handle/accept
router.post(
  '/:handle/accept',
  handler(async (req, res) => {
    const target = await findMember(req.params.handle);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    const f = await Friendship.findOneAndUpdate(
      { pairKey: Friendship.keyFor(req.user.id, target._id), status: 'pending', recipientId: req.user.id },
      { $set: { status: 'accepted', respondedAt: new Date() } },
      { new: true },
    );
    if (!f) return res.status(404).json({ message: 'No request from that member' });
    res.json({ success: true, status: 'friends' });
  }),
);

// @route   POST /api/friends/:handle/decline   (the requester is not told)
router.post(
  '/:handle/decline',
  handler(async (req, res) => {
    const target = await findMember(req.params.handle);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    const f = await Friendship.findOneAndUpdate(
      { pairKey: Friendship.keyFor(req.user.id, target._id), status: 'pending', recipientId: req.user.id },
      { $set: { status: 'declined', respondedAt: new Date() } },
    );
    if (!f) return res.status(404).json({ message: 'No request from that member' });
    res.json({ success: true });
  }),
);

// @route   DELETE /api/friends/:handle   (unfriend, or cancel a request you sent)
router.delete(
  '/:handle',
  handler(async (req, res) => {
    const target = await findMember(req.params.handle);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    // Deliberately leaves 'declined' rows alone, so declining then "unfriending" can't be used to reset the cool-down.
    await Friendship.deleteOne({ pairKey: Friendship.keyFor(req.user.id, target._id), status: trusted({ $in: ['pending', 'accepted'] }) });
    res.json({ success: true });
  }),
);

/** Used by other routes to show the relationship between me and someone else. */
async function friendshipStatus(me, otherUserId) {
  const f = await Friendship.findOne({ pairKey: Friendship.keyFor(me, otherUserId) }).lean();
  if (!f || f.status === 'declined') return 'none';
  if (f.status === 'accepted') return 'friends';
  return String(f.requesterId) === String(me) ? 'requested' : 'incoming';
}

module.exports = router;
module.exports.friendshipStatus = friendshipStatus;

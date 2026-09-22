const express = require('express');
const Membership = require('../models/Membership');
const Thread = require('../models/Thread');
const { protect } = require('../middleware/auth');
const { handler } = require('../middleware/errors');
const { CATEGORIES, GROUPS, getGroup, MAX_MEMBERSHIPS } = require('../lib/groups');
const { MIN_GROUP_SIZE } = require('../lib/matching');

const router = express.Router();
router.use(protect);

/** Member counts per community. Small counts are withheld: "3 members" in a cancer community can identify people. */
async function countsByGroup() {
  const rows = await Membership.aggregate([{ $group: { _id: '$group', n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

async function threadCountsByGroup() {
  const rows = await Thread.aggregate([{ $match: { status: 'visible', group: { $type: 'string' } } }, { $group: { _id: '$group', n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

const present = (group, { members, threads, joined }) => ({
  slug: group.slug,
  name: group.name,
  category: group.category,
  blurb: group.blurb,
  members: members >= MIN_GROUP_SIZE ? members : null,
  threadCount: threads,
  joined,
});

// @route   GET /api/groups
// @desc    Every community, grouped by category, with whether *you* have joined
router.get(
  '/',
  handler(async (req, res) => {
    const [members, threads, mine] = await Promise.all([
      countsByGroup(),
      threadCountsByGroup(),
      Membership.find({ userId: req.user.id }).select('group').lean(),
    ]);
    const joined = new Set(mine.map((m) => m.group));
    const categories = CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      blurb: c.blurb,
      groups: GROUPS.filter((x) => x.category === c.slug).map((x) =>
        present(x, { members: members.get(x.slug) ?? 0, threads: threads.get(x.slug) ?? 0, joined: joined.has(x.slug) }),
      ),
    }));
    res.json({ success: true, categories, joinedCount: joined.size, maxJoined: MAX_MEMBERSHIPS });
  }),
);

// @route   GET /api/groups/mine
// @desc    Slugs of the communities you have joined (only ever your own)
router.get(
  '/mine',
  handler(async (req, res) => {
    const mine = await Membership.find({ userId: req.user.id }).sort({ joinedAt: 1 }).select('group').lean();
    res.json({ success: true, groups: mine.map((m) => m.group) });
  }),
);

// @route   GET /api/groups/:slug
router.get(
  '/:slug',
  handler(async (req, res) => {
    const group = getGroup(req.params.slug);
    if (!group) return res.status(404).json({ message: 'Community not found' });
    const [members, threads, joined] = await Promise.all([
      Membership.countDocuments({ group: group.slug }),
      Thread.countDocuments({ status: 'visible', group: group.slug }),
      Membership.exists({ userId: req.user.id, group: group.slug }),
    ]);
    res.json({ success: true, group: present(group, { members, threads, joined: Boolean(joined) }) });
  }),
);

// @route   POST /api/groups/:slug/join   (idempotent)
router.post(
  '/:slug/join',
  handler(async (req, res) => {
    const group = getGroup(req.params.slug);
    if (!group) return res.status(404).json({ message: 'Community not found' });

    if (!(await Membership.exists({ userId: req.user.id, group: group.slug }))) {
      if ((await Membership.countDocuments({ userId: req.user.id })) >= MAX_MEMBERSHIPS) {
        return res.status(400).json({ message: `You can join up to ${MAX_MEMBERSHIPS} communities. Leave one to join another.` });
      }
      try {
        await Membership.create({ userId: req.user.id, group: group.slug });
      } catch (err) {
        if (err.code !== 11000) throw err; // joined concurrently: fine
      }
    }
    res.json({ success: true, joined: true });
  }),
);

// @route   DELETE /api/groups/:slug/join   (idempotent)
router.delete(
  '/:slug/join',
  handler(async (req, res) => {
    const group = getGroup(req.params.slug);
    if (!group) return res.status(404).json({ message: 'Community not found' });
    await Membership.deleteOne({ userId: req.user.id, group: group.slug });
    res.json({ success: true, joined: false });
  }),
);

module.exports = router;

const express = require('express');
const Membership = require('../models/Membership');
const { protect } = require('../middleware/auth');
const { handler } = require('../middleware/errors');
const { getGroup } = require('../lib/groups');
const { getItems, KINDS } = require('../lib/pubmed');

const router = express.Router();
router.use(protect);

// Shown to members who haven't joined any community yet, so the feed is never blank.
const FEATURED = ['chronic-pain', 'chronic-illness-life'];

// @route   GET /api/research?kind=research|tests&group=<slug>&limit=5
// @desc    Recent studies (kind=research) or studies about tests and screening (kind=tests),
//          for one community, or for the communities you have joined. Nothing about *you* is
//          sent to PubMed: the lists are cached per community topic.
router.get(
  '/',
  handler(async (req, res) => {
    const kind = req.query.kind === undefined ? 'research' : req.query.kind;
    if (!KINDS.includes(kind)) return res.status(400).json({ message: `kind must be one of: ${KINDS.join(', ')}` });
    const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit, 10) || 5));

    let slugs;
    let personalized = true;
    if (req.query.group !== undefined) {
      if (!getGroup(req.query.group)) return res.status(404).json({ message: 'Community not found' });
      slugs = [req.query.group];
    } else {
      const mine = await Membership.find({ userId: req.user.id }).select('group').lean();
      slugs = mine.map((m) => m.group);
      if (slugs.length === 0) {
        slugs = FEATURED;
        personalized = false;
      }
    }

    const { items, updatedAt, refreshing } = await getItems(slugs, kind, { limit });
    res.json({ success: true, kind, personalized, items, updatedAt, refreshing });
  }),
);

module.exports = router;

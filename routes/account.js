const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const TestReport = require('../models/TestReport');
const PainEntry = require('../models/PainEntry');
const Thread = require('../models/Thread');
const Reply = require('../models/Reply');
const Support = require('../models/Support');
const Block = require('../models/Block');
const Report = require('../models/Report');
const Membership = require('../models/Membership');
const Vital = require('../models/Vital');
const AiInsight = require('../models/AiInsight');
const Friendship = require('../models/Friendship');
const protect = require('../middleware/auth');
const { handler } = require('../middleware/errors');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(protect);

// @route   GET /api/account/export
// @desc    Everything held about the signed-in member, as a downloadable JSON file
router.get(
  '/export',
  handler(async (req, res) => {
    const id = req.user.id;
    const [vitals, aiInsights] = await Promise.all([Vital.find({ userId: id }).lean(), AiInsight.find({ userId: id }).lean()]);
    const [reports, pain, threads, replies, blocks, supports, memberships, friendships] = await Promise.all([
      TestReport.find({ userId: id }).lean(),
      PainEntry.find({ userId: id }).lean(),
      Thread.find({ authorId: id }).lean(),
      Reply.find({ authorId: id }).lean(),
      Block.find({ userId: id }).populate('blockedId', 'handle').lean(),
      Support.countDocuments({ userId: id }),
      Membership.find({ userId: id }).lean(),
      Friendship.find({ $or: [{ requesterId: id }, { recipientId: id }] }).populate('requesterId', 'handle').populate('recipientId', 'handle').lean(),
    ]);
    const account = req.account.toJSON();
    res.setHeader('Content-Disposition', 'attachment; filename="my-health-community-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account,
      testReports: reports.map((r) => ({ ...r, results: r.results })),
      painEntries: pain,
      vitals,
      aiInsights,
      threads,
      replies,
      blockedMembers: blocks.map((b) => b.blockedId?.handle).filter(Boolean),
      reactionsGiven: supports,
      communities: memberships.map((m) => ({ community: m.group, joinedAt: m.joinedAt })),
      friends: friendships
        .filter((f) => f.status === 'accepted')
        .map((f) => (String(f.requesterId?._id) === String(id) ? f.recipientId?.handle : f.requesterId?.handle))
        .filter(Boolean),
    });
  }),
);

// @route   DELETE /api/account
// @desc    Permanently delete the account. Requires the password.
//          Private data (reports, pain entries) is erased. Posts are removed and their text
//          erased; the account record is kept only as an anonymised tombstone so that
//          moderation history and thread structure stay intact.
router.delete(
  '/',
  loginLimiter,
  handler(async (req, res) => {
    const user = await User.findById(req.user.id).select('+password');
    const password = req.body?.password;
    if (typeof password !== 'string' || !(await user.matchPassword(password))) {
      return res.status(403).json({ message: 'Password is incorrect' }); // 403: keeps the session alive
    }
    if (user.role === 'admin' && (await User.countDocuments({ role: 'admin', status: mongoose.trusted({ $ne: 'deleted' }) })) <= 1) {
      return res.status(400).json({ message: 'You are the only admin. Promote someone else before deleting this account.' });
    }
    const id = user._id;

    await Promise.all([
      TestReport.deleteMany({ userId: id }),
      PainEntry.deleteMany({ userId: id }),
      Vital.deleteMany({ userId: id }),
      AiInsight.deleteMany({ userId: id }),
      Block.deleteMany({ $or: [{ userId: id }, { blockedId: id }] }),
      Support.deleteMany({ userId: id }),
      Membership.deleteMany({ userId: id }),
      Friendship.deleteMany({ $or: [{ requesterId: id }, { recipientId: id }] }),
      // Reports made by this member go; reports about them stay for moderators.
      Report.deleteMany({ reporterId: id }),
    ]);

    const [threads, replies] = await Promise.all([Thread.find({ authorId: id }), Reply.find({ authorId: id })]);
    for (const t of threads) {
      t.status = 'removed';
      t.removedBy = 'author';
      t.body = '';
      t.title = '[removed]';
      await t.save();
    }
    for (const r of replies) {
      const wasVisible = r.status === 'visible';
      r.status = 'removed';
      r.removedBy = 'author';
      r.body = '';
      await r.save();
      if (wasVisible) await Thread.updateOne({ _id: r.threadId }, { $inc: { replyCount: -1 } });
    }

    // Scrub the account itself. The handle is freed by renaming; the tombstone keeps history consistent.
    const tag = String(id).slice(-8);
    user.status = 'deleted';
    user.name = '[deleted]';
    user.email = `deleted-${tag}@deleted.invalid`;
    user.handle = `deleted_${tag}`;
    user.password = crypto.randomBytes(48).toString('hex'); // unusable; hashed on save
    user.bio = '';
    user.phone = undefined;
    user.dateOfBirth = undefined;
    user.gender = undefined;
    user.role = 'user';
    user.tokenVersion += 1;
    await user.save();

    res.json({ success: true });
  }),
);

module.exports = router;

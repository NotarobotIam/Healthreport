const mongoose = require('mongoose');

// "I don't want to see this member": their posts and matches are hidden from the blocker.
const blockSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

blockSchema.index({ userId: 1, blockedId: 1 }, { unique: true });

module.exports = mongoose.model('Block', blockSchema);

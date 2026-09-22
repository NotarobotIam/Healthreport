const mongoose = require('mongoose');

// A mutual connection. `pairKey` (the two ids, sorted) makes each pair unique regardless of who asked.
const friendshipSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pairKey: { type: String, required: true, unique: true },
  // declined rows are kept (quietly) so a declined request can't simply be re-sent over and over.
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
});

friendshipSchema.index({ requesterId: 1, status: 1 });
friendshipSchema.index({ recipientId: 1, status: 1 });

friendshipSchema.statics.keyFor = (a, b) => [String(a), String(b)].sort().join(':');

module.exports = mongoose.model('Friendship', friendshipSchema);

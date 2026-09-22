const mongoose = require('mongoose');

// One "I relate to this" per member per post; the unique index makes it idempotent.
const supportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['thread', 'reply'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
});

supportSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
supportSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Support', supportSchema);

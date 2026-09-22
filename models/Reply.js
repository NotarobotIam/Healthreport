const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  body: { type: String, trim: true, maxlength: 3000, default: '' }, // cleared when removed
  status: { type: String, enum: ['visible', 'hidden', 'removed'], default: 'visible' },
  removedBy: { type: String, enum: ['author', 'moderator'] },
  supportCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  flaggedForCrisis: { type: Boolean, default: false },
});

replySchema.index({ threadId: 1, createdAt: 1 });

module.exports = mongoose.model('Reply', replySchema);

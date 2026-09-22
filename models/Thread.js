const mongoose = require('mongoose');
const { PAIN_TYPES, PAIN_SIDES } = require('./painConstants');

const THREAD_STATUSES = ['visible', 'hidden', 'removed'];

const threadSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 140 },
  body: { type: String, trim: true, maxlength: 5000, default: '' }, // cleared when removed
  // Optional link to a place on the body, using the same ids as pain entries.
  region: {
    partId: { type: String, maxlength: 40 },
    partName: { type: String, maxlength: 200 },
    system: { type: String, maxlength: 40 },
    side: { type: String, enum: PAIN_SIDES },
  },
  // Slug of a community from lib/groups.js, or unset for the general board.
  group: { type: String, maxlength: 60 },
  painTypes: { type: [{ type: String, enum: PAIN_TYPES }], validate: (v) => v.length <= 5 },
  // hidden: taken down by a moderator pending review. removed: deleted (by its author or a moderator).
  status: { type: String, enum: THREAD_STATUSES, default: 'visible' },
  removedBy: { type: String, enum: ['author', 'moderator'] },
  replyCount: { type: Number, default: 0 },
  supportCount: { type: Number, default: 0 },
  lastActivityAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  flaggedForCrisis: { type: Boolean, default: false },
});

threadSchema.index({ status: 1, lastActivityAt: -1 });
threadSchema.index({ status: 1, createdAt: -1 });
threadSchema.index({ 'region.system': 1, status: 1, lastActivityAt: -1 });
threadSchema.index({ 'region.partId': 1, status: 1, lastActivityAt: -1 });
threadSchema.index({ group: 1, status: 1, lastActivityAt: -1 });
threadSchema.index({ title: 'text', body: 'text' });

module.exports = mongoose.model('Thread', threadSchema);
module.exports.THREAD_STATUSES = THREAD_STATUSES;

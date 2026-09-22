const mongoose = require('mongoose');

const REPORT_REASONS = ['spam', 'harassment', 'medical-misinformation', 'self-harm', 'privacy', 'other'];
const REPORT_TARGETS = ['thread', 'reply', 'user'];

const reportSchema = new mongoose.Schema({
  // null for reports the system raises itself (e.g. crisis language detected).
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  source: { type: String, enum: ['member', 'system'], default: 'member' },
  targetType: { type: String, enum: REPORT_TARGETS, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, enum: REPORT_REASONS, required: true },
  details: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['open', 'actioned', 'dismissed'], default: 'open' },
  action: { type: String },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handledAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

reportSchema.index({ status: 1, createdAt: 1 });
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });
// A member can report a given item once.
reportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1 },
  { unique: true, partialFilterExpression: { reporterId: { $type: 'objectId' } } },
);

module.exports = mongoose.model('Report', reportSchema);
module.exports.REPORT_REASONS = REPORT_REASONS;
module.exports.REPORT_TARGETS = REPORT_TARGETS;

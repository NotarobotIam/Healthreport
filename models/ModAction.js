const mongoose = require('mongoose');

// Append-only audit trail of every moderation decision, for accountability.
const modActionSchema = new mongoose.Schema({
  moderatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  note: { type: String, maxlength: 500, default: '' },
  createdAt: { type: Date, default: Date.now },
});

modActionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ModAction', modActionSchema);

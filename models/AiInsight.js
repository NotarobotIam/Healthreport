const mongoose = require('mongoose');

// One AI-assisted look at a member's records. Stored so the member can revisit it, take it to their
// doctor, and delete it. It is derived from their health data, so it is exported and erased like the rest.
const aiInsightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['pain', 'physiology', 'question'], required: true },
  // basic = free rules-based summary; deep = AI look at the records; question = an AI answer to a typed question.
  mode: { type: String, enum: ['basic', 'deep', 'question'], default: 'deep' },
  provider: { type: String, enum: ['anthropic', 'mock', 'rules'], required: true },
  question: { type: String, maxlength: 600 },
  usage: { inputTokens: Number, outputTokens: Number },
  costUsd: Number,
  model: { type: String, maxlength: 80 },
  // How many records existed when this ran; the next insight needs new ones (see lib/ai/policy.js).
  basisCount: { type: Number, required: true },
  includeDetail: { type: Boolean, default: false },
  maxPossibilities: { type: Number, min: 1, max: 3, default: 3 },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
  // Every insight must be followed by one of these before another can be made.
  followUp: {
    choice: { type: String, enum: ['discuss-with-doctor', 'limited', 'turned-off'] },
    at: Date,
  },
  createdAt: { type: Date, default: Date.now },
});

aiInsightSchema.index({ userId: 1, kind: 1, createdAt: -1 });
aiInsightSchema.index({ userId: 1, mode: 1, createdAt: -1 });
aiInsightSchema.index({ userId: 1, 'followUp.choice': 1 });

module.exports = mongoose.model('AiInsight', aiInsightSchema);

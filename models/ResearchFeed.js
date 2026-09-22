const mongoose = require('mongoose');

// Bookkeeping for each (community, kind) feed: when it last succeeded, and when it may next be retried.
const researchFeedSchema = new mongoose.Schema({
  group: { type: String, required: true },
  kind: { type: String, enum: ['research', 'tests'], required: true },
  refreshedAt: { type: Date },
  queryHash: { type: String, maxlength: 20 },
  lastError: { type: String, maxlength: 200 },
  retryAfter: { type: Date },
});

researchFeedSchema.index({ group: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model('ResearchFeed', researchFeedSchema);

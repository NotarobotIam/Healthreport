const mongoose = require('mongoose');

// A cached PubMed listing for one community and one kind of feed ('research' or 'tests').
const researchItemSchema = new mongoose.Schema({
  group: { type: String, required: true },
  kind: { type: String, enum: ['research', 'tests'], required: true },
  pmid: { type: String, required: true, match: /^\d{1,10}$/ },
  title: { type: String, required: true, maxlength: 300 },
  journal: { type: String, maxlength: 200, default: '' },
  authors: { type: [String], default: [] },
  published: { type: String, maxlength: 40, default: '' },
  types: { type: [String], default: [] },
  sortDate: { type: Date, default: Date.now },
  fetchedAt: { type: Date, default: Date.now },
});

researchItemSchema.index({ group: 1, kind: 1, pmid: 1 }, { unique: true });
researchItemSchema.index({ group: 1, kind: 1, sortDate: -1 });

module.exports = mongoose.model('ResearchItem', researchItemSchema);

const mongoose = require('mongoose');
const { PAIN_TYPES, PAIN_PATTERNS, PAIN_STATUSES, PAIN_SIDES, PAIN_VISIBILITIES } = require('./painConstants');

const painEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  location: {
    // Which anatomical structure the user pointed at, and the exact 3D point
    // (model space, metres) so the marker can be redrawn where they clicked.
    partId: { type: String, required: true },
    partName: { type: String, required: true },
    system: { type: String, required: true },
    side: { type: String, enum: PAIN_SIDES, default: 'unknown' },
    point: { type: [Number], required: true },
  },
  painTypes: {
    type: [{ type: String, enum: PAIN_TYPES }],
    required: true,
  },
  severity: {
    type: Number,
    min: 0,
    max: 10,
    required: true,
  },
  onset: {
    type: Date,
    required: true,
  },
  pattern: {
    type: String,
    enum: PAIN_PATTERNS,
    default: 'constant',
  },
  triggers: [String],
  radiatesTo: String,
  notes: String,
  status: {
    type: String,
    enum: PAIN_STATUSES,
    default: 'active',
  },
  // Private by default. 'community' lets the entry be matched with other members'
  // (region, pain type, severity only — never notes, exact point, or identity).
  visibility: {
    type: String,
    enum: PAIN_VISIBILITIES,
    default: 'private',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

painEntrySchema.index({ userId: 1, onset: -1 });
// Matching scans shared, active entries by body system.
painEntrySchema.index({ visibility: 1, status: 1, 'location.system': 1 });
painEntrySchema.index({ visibility: 1, status: 1, 'location.partId': 1 });

module.exports = mongoose.model('PainEntry', painEntrySchema);

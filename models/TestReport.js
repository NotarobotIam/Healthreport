const mongoose = require('mongoose');

const testReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  testName: {
    type: String,
    required: true,
  },
  testDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  testType: {
    type: String,
    enum: ['Blood', 'Urine', 'Imaging', 'Genetic', 'Cardiac', 'Physical Exam', 'Microbiome', 'Other'],
    required: true,
  },
  results: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true,
  },
  doctor: {
    name: String,
    email: String,
    clinic: String,
  },
  notes: String,
  normal: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Mongoose Maps stringify to {} unless flattened; the API returns results as a plain object.
testReportSchema.set('toJSON', { flattenMaps: true });
testReportSchema.index({ userId: 1, testDate: -1 });

module.exports = mongoose.model('TestReport', testReportSchema);

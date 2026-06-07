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
    enum: ['Blood', 'Urine', 'Imaging', 'Genetic', 'Other'],
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

module.exports = mongoose.model('TestReport', testReportSchema);

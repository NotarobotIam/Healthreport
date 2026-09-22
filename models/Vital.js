const mongoose = require('mongoose');

// One measurement session: any subset of the numbers below, taken at one time. Stored in metric units.
const RANGES = {
  systolic: [50, 260],
  diastolic: [30, 160],
  heartRate: [25, 250],
  temperatureC: [30, 43],
  respiratoryRate: [4, 60],
  spo2: [50, 100],
  weightKg: [20, 400],
  heightCm: [50, 260],
  waistCm: [30, 250],
  bodyFatPct: [2, 70],
};

const field = ([min, max]) => ({ type: Number, min, max });

const vitalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  measuredAt: { type: Date, required: true },
  systolic: field(RANGES.systolic),
  diastolic: field(RANGES.diastolic),
  heartRate: field(RANGES.heartRate),
  temperatureC: field(RANGES.temperatureC),
  respiratoryRate: field(RANGES.respiratoryRate),
  spo2: field(RANGES.spo2),
  weightKg: field(RANGES.weightKg),
  heightCm: field(RANGES.heightCm),
  waistCm: field(RANGES.waistCm),
  bodyFatPct: field(RANGES.bodyFatPct),
  note: { type: String, maxlength: 200 },
  createdAt: { type: Date, default: Date.now },
});

vitalSchema.index({ userId: 1, measuredAt: -1 });

module.exports = mongoose.model('Vital', vitalSchema);
module.exports.RANGES = RANGES;

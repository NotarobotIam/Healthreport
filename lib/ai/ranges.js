// Typical adult reference ranges, mirrored from digital-twin/src/data/physiology/vitalRanges.ts.
// Used to describe readings as "typical" or "outside the typical range" — never as a diagnosis.
const bp = (s, d) => {
  if (s >= 180 || d >= 120) return { label: 'very high', tone: 'alert' };
  if (s >= 140 || d >= 90) return { label: 'high', tone: 'watch' };
  if (s >= 130 || d >= 80) return { label: 'above the typical range', tone: 'watch' };
  if (s >= 120) return { label: 'slightly raised', tone: 'watch' };
  if (s < 90 || d < 60) return { label: 'low', tone: 'watch' };
  return { label: 'typical', tone: 'good' };
};
const heartRate = (n) => (n > 150 || n < 40 ? { label: 'very unusual', tone: 'alert' } : n > 100 ? { label: 'above the typical resting range', tone: 'watch' } : n < 60 ? { label: 'below the typical range (often normal for fit people)', tone: 'watch' } : { label: 'typical', tone: 'good' });
const spo2 = (n) => (n < 92 ? { label: 'low', tone: 'alert' } : n < 95 ? { label: 'slightly low', tone: 'watch' } : { label: 'typical', tone: 'good' });
const temperature = (c) => (c >= 39.4 ? { label: 'a high fever', tone: 'alert' } : c >= 38 ? { label: 'a fever', tone: 'watch' } : c >= 37.3 ? { label: 'slightly raised', tone: 'watch' } : c < 35.5 ? { label: 'low', tone: 'watch' } : { label: 'typical', tone: 'good' });
const respiratoryRate = (n) => (n > 24 || n < 8 ? { label: 'unusual', tone: 'alert' } : n > 20 || n < 12 ? { label: 'outside the typical range', tone: 'watch' } : { label: 'typical', tone: 'good' });
const bmi = (kg, cm) => kg / (cm / 100) ** 2;
const lipid = {
  totalCholesterol: (v) => (v < 200 ? 'desirable' : v < 240 ? 'borderline high' : 'high'),
  ldl: (v) => (v < 100 ? 'optimal' : v < 130 ? 'near optimal' : v < 160 ? 'borderline high' : 'high'),
  hdl: (v) => (v >= 60 ? 'protective' : v >= 40 ? 'acceptable' : 'low'),
  triglycerides: (v) => (v < 150 ? 'normal' : v < 200 ? 'borderline high' : 'high'),
};

module.exports = { bp, heartRate, spo2, temperature, respiratoryRate, bmi, lipid };

// Typical adult reference ranges, shown as context ("typical", "above typical"), never as a diagnosis.
// They are general guides and a clinician may set different goals for a particular person.
export type Tone = 'good' | 'watch' | 'alert' | 'neutral';

export interface Assessment {
  label: string;
  tone: Tone;
}

export function assessBloodPressure(systolic: number, diastolic: number): Assessment {
  if (systolic >= 180 || diastolic >= 120) return { label: 'Very high — seek urgent advice', tone: 'alert' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'High', tone: 'watch' };
  if (systolic >= 130 || diastolic >= 80) return { label: 'Above typical', tone: 'watch' };
  if (systolic >= 120) return { label: 'Slightly raised', tone: 'watch' };
  if (systolic < 90 || diastolic < 60) return { label: 'Low', tone: 'watch' };
  return { label: 'Typical', tone: 'good' };
}

export function assessHeartRate(bpm: number): Assessment {
  if (bpm > 150 || bpm < 40) return { label: 'Very unusual — seek advice', tone: 'alert' };
  if (bpm > 100) return { label: 'Above typical resting rate', tone: 'watch' };
  if (bpm < 60) return { label: 'Below typical (often normal for fit people)', tone: 'watch' };
  return { label: 'Typical', tone: 'good' };
}

export function assessSpo2(pct: number): Assessment {
  if (pct < 92) return { label: 'Low — seek advice', tone: 'alert' };
  if (pct < 95) return { label: 'Slightly low', tone: 'watch' };
  return { label: 'Typical', tone: 'good' };
}

export function assessTemperature(c: number): Assessment {
  if (c >= 39.4) return { label: 'High fever', tone: 'alert' };
  if (c >= 38) return { label: 'Fever', tone: 'watch' };
  if (c >= 37.3) return { label: 'Slightly raised', tone: 'watch' };
  if (c < 35.5) return { label: 'Low', tone: 'watch' };
  return { label: 'Typical', tone: 'good' };
}

export function assessRespiratoryRate(rate: number): Assessment {
  if (rate > 24 || rate < 8) return { label: 'Unusual — seek advice', tone: 'alert' };
  if (rate > 20 || rate < 12) return { label: 'Outside typical', tone: 'watch' };
  return { label: 'Typical', tone: 'good' };
}

export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2;

export function assessBmi(value: number): Assessment {
  if (value < 18.5) return { label: 'Below typical range', tone: 'watch' };
  if (value < 25) return { label: 'Typical range', tone: 'good' };
  if (value < 30) return { label: 'Above typical range', tone: 'watch' };
  return { label: 'Well above typical range', tone: 'watch' };
}

// Cholesterol, mg/dL. Goals differ by person and risk; these are common general targets.
export const LIPID_TARGETS: Record<string, { label: string; test: (v: number) => Assessment }> = {
  totalCholesterol: { label: 'Total cholesterol', test: (v) => (v < 200 ? { label: 'Desirable', tone: 'good' } : v < 240 ? { label: 'Borderline high', tone: 'watch' } : { label: 'High', tone: 'watch' }) },
  ldl: { label: 'LDL (“bad”)', test: (v) => (v < 100 ? { label: 'Optimal', tone: 'good' } : v < 130 ? { label: 'Near optimal', tone: 'good' } : v < 160 ? { label: 'Borderline high', tone: 'watch' } : { label: 'High', tone: 'watch' }) },
  hdl: { label: 'HDL (“good”)', test: (v) => (v >= 60 ? { label: 'Protective', tone: 'good' } : v >= 40 ? { label: 'Acceptable', tone: 'good' } : { label: 'Low', tone: 'watch' }) },
  triglycerides: { label: 'Triglycerides', test: (v) => (v < 150 ? { label: 'Normal', tone: 'good' } : v < 200 ? { label: 'Borderline high', tone: 'watch' } : { label: 'High', tone: 'watch' }) },
};

export const celsiusToF = (c: number) => (c * 9) / 5 + 32;
export const fToCelsius = (f: number) => ((f - 32) * 5) / 9;
export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (i: number) => i * 2.54;

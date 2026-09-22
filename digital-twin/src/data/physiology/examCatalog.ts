// What someone might see in a physiology appointment, as forms the member can fill in from their own
// results. Each exam is saved as a normal test report (type "Cardiac" or "Physical Exam") whose results
// carry an `examKind`, so it also appears on the Reports tab.
export type ExamCategory = 'heart' | 'lungs' | 'fitness' | 'body';

export interface ExamField {
  key: string;
  label: string;
  unit?: string;
  kind: 'number' | 'text';
  placeholder?: string;
}

export interface ExamTemplate {
  id: string;
  title: string;
  category: ExamCategory;
  testType: 'Cardiac' | 'Physical Exam';
  blurb: string;
  fields: ExamField[];
}

const num = (key: string, label: string, unit?: string, placeholder?: string): ExamField => ({ key, label, unit, kind: 'number', placeholder });
const txt = (key: string, label: string, placeholder?: string): ExamField => ({ key, label, kind: 'text', placeholder });

export const EXAM_TEMPLATES: ExamTemplate[] = [
  {
    id: 'ecg', title: 'Resting ECG', category: 'heart', testType: 'Cardiac',
    blurb: 'A recording of your heart’s electrical activity.',
    fields: [num('heartRate', 'Heart rate', 'bpm'), txt('rhythm', 'Rhythm', 'e.g. Normal sinus rhythm'), num('prInterval', 'PR interval', 'ms'), num('qrsDuration', 'QRS duration', 'ms'), num('qtcInterval', 'QTc interval', 'ms'), txt('interpretation', 'Interpretation', 'What the report concluded')],
  },
  {
    id: 'echo', title: 'Echocardiogram', category: 'heart', testType: 'Cardiac',
    blurb: 'An ultrasound of the heart’s size, pumping and valves.',
    fields: [num('lvef', 'Ejection fraction (LVEF)', '%'), num('lvDiastolicDiameter', 'LV diastolic diameter', 'mm'), txt('valves', 'Valves', 'e.g. No significant leak or narrowing'), txt('wallMotion', 'Wall motion', 'e.g. Normal'), txt('interpretation', 'Interpretation')],
  },
  {
    id: 'stress', title: 'Stress test', category: 'heart', testType: 'Cardiac',
    blurb: 'Your heart’s response to exercise, usually on a treadmill.',
    fields: [num('durationMinutes', 'Exercise time', 'min'), num('mets', 'Workload', 'METs'), num('peakHeartRate', 'Peak heart rate', 'bpm'), num('peakSystolic', 'Peak systolic BP', 'mmHg'), txt('reasonStopped', 'Reason stopped', 'e.g. Target heart rate reached'), txt('interpretation', 'Result')],
  },
  {
    id: 'holter', title: 'Holter monitor', category: 'heart', testType: 'Cardiac',
    blurb: 'A portable recording of your heart rhythm over a day or more.',
    fields: [num('durationHours', 'Recording length', 'hours'), num('averageHeartRate', 'Average heart rate', 'bpm'), num('minHeartRate', 'Lowest heart rate', 'bpm'), num('maxHeartRate', 'Highest heart rate', 'bpm'), txt('ectopy', 'Extra or skipped beats', 'e.g. Occasional, harmless-looking'), txt('interpretation', 'Interpretation')],
  },
  {
    id: 'auscultation', title: 'Heart exam (stethoscope)', category: 'heart', testType: 'Cardiac',
    blurb: 'What your clinician heard and felt when listening to your heart.',
    fields: [txt('rhythm', 'Rhythm', 'e.g. Regular'), txt('murmur', 'Murmur', 'e.g. None'), txt('extraSounds', 'Extra sounds', 'e.g. None'), txt('interpretation', 'Notes')],
  },
  {
    id: 'cardiacImaging', title: 'Cardiac CT / MRI', category: 'heart', testType: 'Cardiac',
    blurb: 'Detailed pictures of the heart and its blood vessels.',
    fields: [num('calciumScore', 'Coronary calcium score'), num('lvef', 'Ejection fraction (LVEF)', '%'), txt('findings', 'Findings')],
  },
  {
    id: 'spirometry', title: 'Lung function (spirometry)', category: 'lungs', testType: 'Physical Exam',
    blurb: 'How much air you can breathe out, and how fast.',
    fields: [num('fev1', 'FEV1', 'L'), num('fvc', 'FVC', 'L'), num('fev1FvcRatio', 'FEV1/FVC ratio', '%'), num('peakFlow', 'Peak flow', 'L/min'), txt('interpretation', 'Interpretation')],
  },
  {
    id: 'vo2max', title: 'Fitness test (VO2 max)', category: 'fitness', testType: 'Physical Exam',
    blurb: 'The most oxygen your body can use during hard exercise.',
    fields: [num('vo2max', 'VO2 max', 'mL/kg/min'), num('maxHeartRate', 'Max heart rate', 'bpm'), txt('interpretation', 'Rating or notes')],
  },
  {
    id: 'walkTest', title: '6-minute walk test', category: 'fitness', testType: 'Physical Exam',
    blurb: 'How far you can walk in six minutes.',
    fields: [num('distanceMeters', 'Distance', 'm'), num('startSpo2', 'Oxygen before', '%'), num('endSpo2', 'Oxygen after', '%'), txt('interpretation', 'Notes')],
  },
  {
    id: 'strength', title: 'Strength & mobility', category: 'fitness', testType: 'Physical Exam',
    blurb: 'Grip strength, standing up from a chair, balance and flexibility.',
    fields: [num('gripStrengthKg', 'Grip strength', 'kg'), num('sitToStandCount', 'Chair stands in 30 s'), txt('balance', 'Balance', 'e.g. Good'), txt('interpretation', 'Notes')],
  },
  {
    id: 'bodyComposition', title: 'Body composition', category: 'body', testType: 'Physical Exam',
    blurb: 'How much of your weight is fat, muscle and bone.',
    fields: [num('bodyFatPct', 'Body fat', '%'), num('leanMassKg', 'Lean mass', 'kg'), num('visceralFat', 'Visceral fat rating'), txt('interpretation', 'Notes')],
  },
];

export const EXAM_BY_ID = new Map(EXAM_TEMPLATES.map((t) => [t.id, t]));

export const CATEGORY_LABEL: Record<ExamCategory, string> = { heart: 'Heart', lungs: 'Lungs', fitness: 'Fitness', body: 'Body' };

/** Human label for a saved key, e.g. "lvef" -> "Ejection fraction (LVEF)". */
export function fieldLabel(examKind: string | undefined, key: string): { label: string; unit?: string } {
  const f = EXAM_BY_ID.get(examKind ?? '')?.fields.find((x) => x.key === key);
  if (f) return { label: f.label, unit: f.unit };
  return { label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()) };
}

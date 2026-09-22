// Wire format of routes/pain.js. The vocabularies below mirror
// models/painConstants.js on the server — keep the two in sync.

export const PAIN_TYPES = [
  'sharp',
  'stabbing',
  'dull',
  'aching',
  'burning',
  'throbbing',
  'cramping',
  'pressure',
  'shooting',
  'tingling',
  'numbness',
  'stiffness',
] as const;
export type PainType = (typeof PAIN_TYPES)[number];

/** Plain-language cues so people can pick the word that matches what they feel. */
export const PAIN_TYPE_HINTS: Record<PainType, string> = {
  sharp: 'Cutting, catches when you move',
  stabbing: 'Sudden, like a knife or needle',
  dull: 'Heavy, low-level, hard to pinpoint',
  aching: 'Deep, sore, like after overuse',
  burning: 'Hot, stinging, raw',
  throbbing: 'Pulses with your heartbeat',
  cramping: 'Tightens and releases in waves',
  pressure: 'Squeezing, tightness, fullness',
  shooting: 'Travels quickly along a line',
  tingling: 'Pins and needles',
  numbness: 'Reduced or missing feeling',
  stiffness: 'Hard to move, loosens with use',
};

export const PAIN_PATTERNS = [
  { value: 'constant', label: 'Constant', hint: 'Always there' },
  { value: 'comes-and-goes', label: 'Comes and goes', hint: 'Episodes with breaks' },
  { value: 'getting-worse', label: 'Getting worse', hint: 'Stronger than before' },
  { value: 'getting-better', label: 'Getting better', hint: 'Easing over time' },
] as const;
export type PainPattern = (typeof PAIN_PATTERNS)[number]['value'];

export type PainStatus = 'active' | 'resolved';
/** private: only you. community: matched with other members by region and type (never notes or identity). */
export type PainVisibility = 'private' | 'community';
export type PainSide = 'left' | 'right' | 'midline' | 'unknown';

/** Common things that bring pain on or ease it — offered as one-tap chips. */
export const TRIGGER_SUGGESTIONS = [
  'Movement',
  'Deep breathing',
  'Eating',
  'Lying down',
  'Pressing on it',
  'Cold',
  'Heat',
  'Stress',
  'Rest helps',
  'Medication helps',
] as const;

export interface PainLocation {
  partId: string;
  partName: string;
  system: string;
  side: PainSide;
  /** Model space (metres): +y up, the figure faces +z, patient's left is +x. */
  point: [number, number, number];
}

export interface PainEntryDTO {
  _id: string;
  location: PainLocation;
  painTypes: PainType[];
  severity: number;
  onset: string;
  pattern: PainPattern;
  triggers: string[];
  radiatesTo?: string;
  notes?: string;
  status: PainStatus;
  visibility: PainVisibility;
  createdAt: string;
}

export interface PainInput {
  location: PainLocation;
  painTypes: PainType[];
  severity: number;
  onset: string;
  pattern: PainPattern;
  triggers: string[];
  radiatesTo?: string;
  notes?: string;
  status?: PainStatus;
  visibility?: PainVisibility;
}

export interface PainListResponse {
  success: boolean;
  count: number;
  entries: PainEntryDTO[];
}

export interface PainEntryResponse {
  success: boolean;
  entry: PainEntryDTO;
}

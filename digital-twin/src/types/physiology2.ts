// Vitals, exam catalogue and AI-insight shapes (routes/vitals.js, routes/insights.js).
export interface VitalDTO {
  _id: string;
  measuredAt: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperatureC?: number;
  respiratoryRate?: number;
  spo2?: number;
  weightKg?: number;
  heightCm?: number;
  waistCm?: number;
  bodyFatPct?: number;
  note?: string;
}

export type VitalInput = Partial<Omit<VitalDTO, '_id'>>;

/** The two kinds of record an insight can be about. A typed question is a third kind of result. */
export type InsightKind = 'pain' | 'physiology';
export type InsightAnyKind = InsightKind | 'question';
export type InsightMode = 'basic' | 'deep' | 'question';
export type Urgency = 'routine' | 'soon' | 'urgent';
export type FollowUpChoice = 'discuss-with-doctor' | 'limited' | 'turned-off';

export interface InsightResult {
  summary: string;
  patterns: string[];
  possibilities: { name: string; why: string; urgency: Urgency }[];
  hiddenPossibilities: number;
  testsToAskAbout: string[];
  questionsForDoctor: string[];
  redFlags: string[];
  insufficientData: boolean;
}

export interface InsightDTO {
  id: string;
  kind: InsightAnyKind;
  mode: InsightMode;
  /** rules = the free summary made by our own code (no AI, nothing left the site). ai = an AI service was used. */
  source: 'rules' | 'ai';
  /** The question the member typed, for answers to questions. */
  question: string | null;
  createdAt: string;
  /** true when produced by the development demo generator, not a real AI. */
  demo: boolean;
  /** true while the pattern knowledge base has not been reviewed by a clinician. */
  draftKnowledge: boolean;
  basisCount: number;
  includeDetail: boolean;
  result: InsightResult;
  disclaimer: string;
  followUp: { choice: FollowUpChoice; at: string } | null;
  needsFollowUp: boolean;
}

export type InsightReason =
  | 'unavailable' | 'need-more-logs' | 'need-consent' | 'turned-off' | 'follow-up-required' | 'need-more-new-logs' | 'too-soon' | 'quota-reached';

export interface InsightVerdict {
  eligible: boolean;
  reason: InsightReason | null;
  remaining: number;
  nextEligibleAt: string | null;
}

export interface InsightKindStatus {
  count: number;
  basic: InsightVerdict;
  deep: InsightVerdict;
  latest: { id: string; createdAt: string; needsFollowUp: boolean } | null;
}

export interface InsightQuota {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string | null;
}

export interface InsightStatus {
  success: boolean;
  available: boolean;
  demo: boolean;
  threshold: number;
  newRecordsNeeded: number;
  minDaysBetween: number;
  settings: { consented: boolean; enabled: boolean; maxPossibilities: number };
  /** A previous result is waiting for the member to choose what to do with it. */
  unresolved: boolean;
  quotas: { deep: InsightQuota; question: InsightQuota };
  question: InsightVerdict;
  kinds: Record<InsightKind, InsightKindStatus>;
}

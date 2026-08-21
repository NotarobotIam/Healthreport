// Physiological state model — deliberately separate from anatomy structure
// (types/anatomy.ts) so the same anatomical tree can be replayed against
// different physiology sources later (mock, recorded patient session, live
// sensor feed) without changing anything about what the tree *is*.
//
// TODO(real-data): heartRate/respiratoryRate/bloodPressure below are still
// 100% placeholder (see data/physiology/mockGenerator.ts). bodyRegions is
// the one field with a real seam wired up today: entries can come from an
// actual Imaging report via data/remote/reportsApi.ts's
// fetchImagingOrganMapping() (see BodyRegionState.source below), merged
// on top of the mock stream in engine/physiologyEngine.ts.

export interface BloodPressure {
  systolic: number;
  diastolic: number;
  map: number;
}

/** Per-region physiological readout, keyed by AnatomyNode.physiologyKey. */
export interface BodyRegionState {
  /** 0-1 normalized perfusion index. */
  perfusion?: number;
  /** mmHg. */
  pressure?: number;
  /** relative flow units. */
  flow?: number;
  /** free-text state label, e.g. "normal" | "elevated" | "reduced". */
  state?: string;
  /** Present only when this region was sourced from a real Imaging report; absent/undefined means mock. */
  source?: 'real';
  sourceReportId?: string;
  sourceReportDate?: string;
  sourceTestName?: string;
}

export interface PhysiologyFrame {
  /** seconds, physiological/simulation time — not wall-clock time. */
  time: number;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressure?: BloodPressure;
  bodyRegions?: Record<string, BodyRegionState>;
}

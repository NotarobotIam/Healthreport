// Physiological state model — deliberately separate from anatomy structure
// (types/anatomy.ts) so the same anatomical tree can be replayed against
// different physiology sources later (mock, recorded patient session, live
// sensor feed) without changing anything about what the tree *is*.
//
// TODO(real-data): every field in this file is a placeholder shape. Real
// values will eventually come from patient monitoring hardware, an EHR feed,
// or a reduced-order simulation (see data/physiology/mockGenerator.ts for the
// current mock implementation and the exact seam where that swap happens).

export interface BloodPressure {
  systolic: number;
  diastolic: number;
  map: number;
}

/** Per-region physiological readout, keyed by AnatomyNode.physiologyKey. */
export interface BodyRegionState {
  /** 0-1 normalized mock perfusion index. */
  perfusion?: number;
  /** mock mmHg. */
  pressure?: number;
  /** mock relative flow units. */
  flow?: number;
  /** free-text mock state label, e.g. "normal" | "elevated" | "reduced". */
  state?: string;
}

export interface PhysiologyFrame {
  /** seconds, physiological/simulation time — not wall-clock time. */
  time: number;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressure?: BloodPressure;
  bodyRegions?: Record<string, BodyRegionState>;
}

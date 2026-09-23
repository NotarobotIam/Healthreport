// Shapes returned by the shared Express API (routes/reports.js). Kept
// separate from digital-twin's own anatomy/physiology types since these
// describe the WIRE format of someone else's service, not this app's
// internal model.
import type { BodyRegionState } from './physiology';

export interface ImagingScanImage {
  /** Every anatomy-diagram / 3D-model part id (see urologyInfo.ts, urologyViewerInfo.ts) that should surface this image when clicked. */
  organIds: string[];
  label: string;
  view?: string;
  url: string;
}

export interface ImagingMetadata {
  modality?: 'CT' | 'Ultrasound' | 'MRI' | string;
  bodyRegion?: string;
  findings?: string;
  /** Per-organ scan images attached to this report, browsable from the anatomy model/diagram. */
  images?: ImagingScanImage[];
}

export interface ReportDoctor {
  name?: string;
  email?: string;
  clinic?: string;
}

export interface ReportDTO {
  _id: string;
  testName: string;
  testDate: string;
  testType: 'Blood' | 'Urine' | 'Imaging' | 'Genetic' | 'Cardiac' | 'Physical Exam' | 'Microbiome' | 'Other';
  results: {
    imaging?: ImagingMetadata;
    organMapping?: Record<string, BodyRegionState>;
    [key: string]: unknown;
  };
  doctor?: ReportDoctor;
  notes?: string;
  normal?: boolean;
}

export interface ReportsResponse {
  success: boolean;
  count: number;
  reports: ReportDTO[];
}

export interface TransposeResponse {
  success: boolean;
  testDates: string[];
  transposed: Record<string, Record<string, string | number | boolean>>;
}

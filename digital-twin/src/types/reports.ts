// Shapes returned by the shared Express API (routes/reports.js). Kept
// separate from digital-twin's own anatomy/physiology types since these
// describe the WIRE format of someone else's service, not this app's
// internal model.
import type { BodyRegionState } from './physiology';

export interface ImagingMetadata {
  modality?: 'CT' | 'Ultrasound' | 'MRI' | string;
  bodyRegion?: string;
  findings?: string;
}

export interface ReportDTO {
  _id: string;
  testName: string;
  testDate: string;
  testType: 'Blood' | 'Urine' | 'Imaging' | 'Genetic' | 'Other';
  results: {
    imaging?: ImagingMetadata;
    organMapping?: Record<string, BodyRegionState>;
    [key: string]: unknown;
  };
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

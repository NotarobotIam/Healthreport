import { apiGet, apiPost } from './apiClient';
import type { BodyRegionState, ReportsResponse, TransposeResponse } from '../../types';

/**
 * Fetches every Imaging-type report for the current user and folds their
 * `organMapping` entries into one map, keyed by the same `physiologyKey`
 * namespace used in data/anatomy/*.ts (heart, lungLeft, eye.left.retina,
 * etc.). When multiple reports cover the same key, the most recent
 * `testDate` wins — reports are iterated oldest-first so each later report
 * naturally overwrites an earlier one for any key they share.
 */
export async function fetchImagingOrganMapping(): Promise<Record<string, BodyRegionState>> {
  const res = await apiGet<ReportsResponse>('/reports?testType=Imaging');
  const sorted = [...res.reports].sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());

  const merged: Record<string, BodyRegionState> = {};
  for (const report of sorted) {
    const organMapping = report.results.organMapping;
    if (!organMapping) continue;
    for (const [key, region] of Object.entries(organMapping)) {
      merged[key] = {
        ...region,
        source: 'real',
        sourceReportId: report._id,
        sourceReportDate: report.testDate,
        sourceTestName: report.testName,
      };
    }
  }
  return merged;
}

/** Blood-test biomarkers over time, for the Data tab's chart — see hooks/useBloodBiomarkers.ts. */
export function fetchBloodBiomarkers(): Promise<TransposeResponse> {
  return apiPost<TransposeResponse>('/reports/transpose/data?testType=Blood');
}

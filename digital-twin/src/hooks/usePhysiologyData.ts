import { useCallback, useEffect, useState } from 'react';
import { fetchVitals } from '../data/remote/vitalsApi';
import { fetchReports, fetchBloodBiomarkers } from '../data/remote/reportsApi';
import { parseMetricValue } from '../utils/parseMetricValue';
import type { ReportDTO, VitalDTO } from '../types';

export interface LipidValue {
  key: string;
  value: number;
  unit?: string;
  date: string;
}

const LIPID_KEYS = ['totalCholesterol', 'ldl', 'hdl', 'triglycerides'];

/** Heart and physical exams, plus heart-related imaging (e.g. an echocardiogram filed under Imaging). */
export const isPhysiologyExam = (r: ReportDTO): boolean =>
  r.testType === 'Cardiac' ||
  r.testType === 'Physical Exam' ||
  (r.testType === 'Imaging' && /heart|cardiac/i.test(String((r.results as { imaging?: { bodyRegion?: string } }).imaging?.bodyRegion ?? '')));

/** Everything the Physiology page shows: readings, exam results, and the latest cholesterol values. */
export function usePhysiologyData() {
  const [vitals, setVitals] = useState<VitalDTO[]>([]);
  const [exams, setExams] = useState<ReportDTO[]>([]);
  const [lipids, setLipids] = useState<LipidValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [v, r, blood] = await Promise.all([fetchVitals(), fetchReports(), fetchBloodBiomarkers().catch(() => null)]);
      setVitals(v.vitals);
      setExams(r.reports.filter(isPhysiologyExam).sort((a, b) => +new Date(b.testDate) - +new Date(a.testDate)));
      if (blood) {
        const latest: LipidValue[] = [];
        const dates = [...blood.testDates].sort((a, b) => +new Date(b) - +new Date(a));
        for (const key of LIPID_KEYS) {
          for (const d of dates) {
            const raw = blood.transposed[key]?.[d];
            if (raw === undefined) continue;
            const { numeric, unit } = parseMetricValue(raw);
            if (numeric !== null) {
              latest.push({ key, value: numeric, unit, date: d });
              break;
            }
          }
        }
        setLipids(latest);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your physiology records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { vitals, exams, lipids, loading, error, reload, setVitals };
}

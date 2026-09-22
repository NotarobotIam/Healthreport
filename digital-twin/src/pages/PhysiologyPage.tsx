import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteVital } from '../data/remote/vitalsApi';
import { usePhysiologyData } from '../hooks/usePhysiologyData';
import { AddExamForm } from '../components/physiology/AddExamForm';
import { AddReadingForm, displayLength, displayTemp, displayWeight, preferredUnits } from '../components/physiology/AddReadingForm';
import { ExamCard } from '../components/physiology/ExamCard';
import { InsightsTeaser } from '../components/physiology/InsightsTeaser';
import { TrendChart, type Series } from '../components/physiology/TrendChart';
import { VitalTile } from '../components/physiology/VitalTile';
import { PageContainer } from '../components/dashboardUi';
import { EXAM_BY_ID, type ExamCategory } from '../data/physiology/examCatalog';
import {
  LIPID_TARGETS, assessBloodPressure, assessBmi, assessHeartRate, assessRespiratoryRate, assessSpo2, assessTemperature, bmi, kgToLb,
} from '../data/physiology/vitalRanges';
import type { ReportDTO, VitalDTO } from '../types';

type Tab = 'overview' | 'heart' | 'vitals' | 'lungs' | 'body';
type Adding = null | { kind: 'reading' } | { kind: 'exam'; category?: ExamCategory };

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'heart', label: '❤️ Heart' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'lungs', label: 'Lungs & fitness' },
  { id: 'body', label: 'Body' },
];

const examCategory = (r: ReportDTO): ExamCategory | 'heart' => {
  const kind = (r.results as { examKind?: string }).examKind;
  return EXAM_BY_ID.get(kind ?? '')?.category ?? (r.testType === 'Physical Exam' ? 'body' : 'heart');
};

// Newest first in `vitals`; charts want oldest -> newest.
const seriesOf = (vitals: VitalDTO[], key: keyof VitalDTO, n = 12) =>
  vitals.filter((v) => typeof v[key] === 'number').slice(0, n).reverse().map((v) => v[key] as number);
const latest = (vitals: VitalDTO[], key: keyof VitalDTO) => vitals.find((v) => typeof v[key] === 'number');

function ExamList({ exams, empty }: { exams: ReportDTO[]; empty: string }) {
  return exams.length === 0 ? (
    <p className="rounded-2xl border border-dashed border-hud-borderLight p-6 text-center text-sm text-hud-muted">{empty}</p>
  ) : (
    <ul className="flex flex-col gap-3">
      {exams.map((r) => (
        <ExamCard key={r._id} report={r} />
      ))}
    </ul>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-hud-text">{children}</h2>
      {action}
    </div>
  );
}

const HeartViewer = lazy(() => import('../components/physiology/HeartViewer'));

const addBtn = 'rounded-full bg-[#007bff] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0056b3]';

export function PhysiologyPage() {
  const { vitals, exams, lipids, loading, error, reload, setVitals } = usePhysiologyData();
  const [tab, setTab] = useState<Tab>('overview');
  const [adding, setAdding] = useState<Adding>(null);
  const units = preferredUnits();

  const heartExams = useMemo(() => exams.filter((r) => examCategory(r) === 'heart'), [exams]);
  const lungExams = useMemo(() => exams.filter((r) => ['lungs', 'fitness'].includes(examCategory(r))), [exams]);
  const bodyExams = useMemo(() => exams.filter((r) => examCategory(r) === 'body'), [exams]);

  const bp = latest(vitals, 'systolic');
  const hr = latest(vitals, 'heartRate');
  const ox = latest(vitals, 'spo2');
  const temp = latest(vitals, 'temperatureC');
  const rr = latest(vitals, 'respiratoryRate');
  const wt = latest(vitals, 'weightKg');
  const ht = latest(vitals, 'heightCm');
  const bmiValue = wt?.weightKg && ht?.heightCm ? bmi(wt.weightKg, ht.heightCm) : null;

  const saved = () => {
    setAdding(null);
    void reload();
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this reading?')) return;
    await deleteVital(id);
    setVitals((prev) => prev.filter((v) => v._id !== id));
  };
  const form = adding && (
    <div className="mb-5">
      {adding.kind === 'reading' ? (
        <AddReadingForm onSaved={saved} onCancel={() => setAdding(null)} />
      ) : (
        <AddExamForm category={adding.category} onSaved={saved} onCancel={() => setAdding(null)} />
      )}
    </div>
  );

  const hrBpSeries: Series[] = [
    { key: 'systolic', label: 'Top BP', color: '#dc3545' },
    { key: 'diastolic', label: 'Bottom BP', color: '#f5a623' },
    { key: 'heartRate', label: 'Heart rate', color: '#3498db' },
  ];

  return (
    <PageContainer>
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-hud-text">Physiology</h1>
          <p className="text-sm text-hud-muted">Your vital signs and exam results — what you'd see in a physiology appointment, in one place.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={addBtn} onClick={() => setAdding({ kind: 'reading' })}>＋ Add reading</button>
          <button type="button" className="rounded-full border border-hud-borderLight bg-hud-panel px-4 py-1.5 text-sm font-semibold text-hud-text hover:bg-hud-panel2" onClick={() => setAdding({ kind: 'exam' })}>＋ Add exam result</button>
        </div>
      </div>

      <div className="my-4 flex flex-wrap gap-1 border-b border-hud-border" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? 'border-hud-cyan text-hud-cyan' : 'border-transparent text-hud-muted hover:text-hud-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-4 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
      {form}
      {loading ? (
        <p className="py-10 text-center text-sm text-hud-muted">Loading your records…</p>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <VitalTile label="Blood pressure" value={bp ? `${bp.systolic}/${bp.diastolic}` : null} unit="mmHg" assessment={bp?.systolic && bp.diastolic ? assessBloodPressure(bp.systolic, bp.diastolic) : null} series={seriesOf(vitals, 'systolic')} />
                <VitalTile label="Heart rate" value={hr ? String(hr.heartRate) : null} unit="bpm" assessment={hr?.heartRate ? assessHeartRate(hr.heartRate) : null} series={seriesOf(vitals, 'heartRate')} />
                <VitalTile label="Oxygen" value={ox ? String(ox.spo2) : null} unit="%" assessment={ox?.spo2 ? assessSpo2(ox.spo2) : null} series={seriesOf(vitals, 'spo2')} />
                <VitalTile label="Temperature" value={temp?.temperatureC ? displayTemp(temp.temperatureC, units) : null} unit={units === 'imperial' ? '°F' : '°C'} assessment={temp?.temperatureC ? assessTemperature(temp.temperatureC) : null} series={seriesOf(vitals, 'temperatureC')} />
                <VitalTile label="Breathing" value={rr ? String(rr.respiratoryRate) : null} unit="/min" assessment={rr?.respiratoryRate ? assessRespiratoryRate(rr.respiratoryRate) : null} series={seriesOf(vitals, 'respiratoryRate')} />
                <VitalTile label="Weight" value={wt?.weightKg ? displayWeight(wt.weightKg, units) : null} unit={units === 'imperial' ? 'lb' : 'kg'} assessment={bmiValue ? assessBmi(bmiValue) : null} series={seriesOf(vitals, 'weightKg')} footnote={bmiValue ? `BMI ${bmiValue.toFixed(1)}` : undefined} />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <section>
                  <SectionTitle action={<button type="button" className="text-sm font-medium text-hud-cyan hover:underline" onClick={() => setTab('heart')}>All heart exams →</button>}>Latest heart exam</SectionTitle>
                  <ExamList exams={heartExams.slice(0, 1)} empty="No heart exams yet. Add an ECG, echocardiogram or stress test result." />
                </section>
                <InsightsTeaser kind="physiology" />
              </div>
              <p className="text-xs text-hud-muted">Ranges shown are general guides for adults, not a diagnosis. Your clinician may set different goals for you.</p>
            </div>
          )}

          {tab === 'heart' && (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
                <SectionTitle>Your heart in 3D</SectionTitle>
                <Suspense fallback={<p className="py-10 text-center text-sm text-hud-muted">Loading the 3D heart…</p>}>
                  <HeartViewer heartRate={hr?.heartRate ?? null} />
                </Suspense>
              </section>
              <section>
                <SectionTitle action={<button type="button" className={addBtn} onClick={() => setAdding({ kind: 'exam', category: 'heart' })}>＋ Add heart exam</button>}>Heart exams</SectionTitle>
                <ExamList exams={heartExams} empty="No heart exams yet. Add an ECG, echocardiogram, stress test, Holter monitor or stethoscope exam." />
              </section>
              <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
                <SectionTitle>Blood pressure & heart rate</SectionTitle>
                <TrendChart vitals={vitals} series={hrBpSeries} />
              </section>
              <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
                <SectionTitle action={<Link to="/data" className="text-sm font-medium text-hud-cyan hover:underline">All blood values →</Link>}>Cholesterol (from your blood tests)</SectionTitle>
                {lipids.length === 0 ? (
                  <p className="text-sm text-hud-muted">No cholesterol results yet. Add a lipid panel on the Reports tab.</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {lipids.map((l) => {
                      const t = LIPID_TARGETS[l.key];
                      const a = t?.test(l.value);
                      return (
                        <li key={l.key} className="rounded-xl bg-hud-panel2 p-3">
                          <p className="text-[11px] uppercase tracking-wider text-hud-muted">{t?.label ?? l.key}</p>
                          <p className="text-xl font-semibold text-hud-text">{l.value} <span className="text-xs font-normal text-hud-muted">{l.unit ?? 'mg/dL'}</span></p>
                          {a && <p className={`text-xs ${a.tone === 'good' ? 'text-hud-green' : 'text-[#a86c00]'}`}>{a.label}</p>}
                          <p className="text-[11px] text-hud-muted">{new Date(l.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}

          {tab === 'vitals' && (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
                <SectionTitle>Trends</SectionTitle>
                <TrendChart vitals={vitals} series={[...hrBpSeries, { key: 'spo2', label: 'Oxygen %', color: '#28a745' }]} />
              </section>
              <section>
                <SectionTitle action={<button type="button" className={addBtn} onClick={() => setAdding({ kind: 'reading' })}>＋ Add reading</button>}>All readings</SectionTitle>
                {vitals.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-hud-borderLight p-6 text-center text-sm text-hud-muted">No readings yet. Add your blood pressure, heart rate and more.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl bg-hud-panel shadow-sm">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-hud-border text-left text-xs uppercase tracking-wider text-hud-muted">
                          {['When', 'BP', 'Heart', 'Oxygen', 'Temp', 'Breaths', 'Weight', ''].map((h) => (<th key={h} className="px-3 py-2.5 font-semibold">{h}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {vitals.map((v) => (
                          <tr key={v._id} className="border-b border-hud-border last:border-0">
                            <td className="px-3 py-2 text-hud-text">{new Date(v.measuredAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{v.note && <span className="block text-[11px] text-hud-muted">{v.note}</span>}</td>
                            <td className="px-3 py-2">{v.systolic ? `${v.systolic}/${v.diastolic}` : '–'}</td>
                            <td className="px-3 py-2">{v.heartRate ?? '–'}</td>
                            <td className="px-3 py-2">{v.spo2 ? `${v.spo2}%` : '–'}</td>
                            <td className="px-3 py-2">{v.temperatureC ? `${displayTemp(v.temperatureC, units)}°` : '–'}</td>
                            <td className="px-3 py-2">{v.respiratoryRate ?? '–'}</td>
                            <td className="px-3 py-2">{v.weightKg ? `${displayWeight(v.weightKg, units)} ${units === 'imperial' ? 'lb' : 'kg'}` : '–'}</td>
                            <td className="px-3 py-2 text-right"><button type="button" onClick={() => remove(v._id)} className="text-xs text-hud-muted hover:text-hud-red">Delete</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === 'lungs' && (
            <div className="flex flex-col gap-6">
              <section>
                <SectionTitle action={<button type="button" className={addBtn} onClick={() => setAdding({ kind: 'exam', category: 'lungs' })}>＋ Add lung or fitness test</button>}>Lung function & fitness tests</SectionTitle>
                <ExamList exams={lungExams} empty="No lung or fitness results yet. Add spirometry, a VO2 max, a 6-minute walk or a strength test." />
              </section>
              <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
                <SectionTitle>Oxygen level & breathing rate</SectionTitle>
                <TrendChart vitals={vitals} series={[{ key: 'spo2', label: 'Oxygen %', color: '#28a745' }, { key: 'respiratoryRate', label: 'Breaths / min', color: '#a855f7' }]} />
              </section>
            </div>
          )}

          {tab === 'body' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <VitalTile label="Weight" value={wt?.weightKg ? displayWeight(wt.weightKg, units) : null} unit={units === 'imperial' ? 'lb' : 'kg'} series={seriesOf(vitals, 'weightKg')} />
                <VitalTile label="BMI" value={bmiValue ? bmiValue.toFixed(1) : null} assessment={bmiValue ? assessBmi(bmiValue) : null} footnote={ht?.heightCm ? `Height ${displayLength(ht.heightCm, units)} ${units === 'imperial' ? 'in' : 'cm'}` : 'Add your height to see BMI'} />
                <VitalTile label="Waist" value={latest(vitals, 'waistCm')?.waistCm ? displayLength(latest(vitals, 'waistCm')!.waistCm!, units) : null} unit={units === 'imperial' ? 'in' : 'cm'} series={seriesOf(vitals, 'waistCm')} />
                <VitalTile label="Body fat" value={latest(vitals, 'bodyFatPct')?.bodyFatPct ? String(latest(vitals, 'bodyFatPct')!.bodyFatPct) : null} unit="%" series={seriesOf(vitals, 'bodyFatPct')} />
              </div>
              <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
                <SectionTitle>Weight over time</SectionTitle>
                <TrendChart vitals={vitals} series={[{ key: 'weightKg', label: units === 'imperial' ? 'Weight (lb)' : 'Weight (kg)', color: '#3498db', map: units === 'imperial' ? kgToLb : undefined }]} />
              </section>
              <section>
                <SectionTitle action={<button type="button" className={addBtn} onClick={() => setAdding({ kind: 'exam', category: 'body' })}>＋ Add body composition</button>}>Body composition scans</SectionTitle>
                <ExamList exams={bodyExams} empty="No body composition results yet." />
              </section>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

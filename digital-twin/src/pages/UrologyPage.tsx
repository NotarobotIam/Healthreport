import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer, PageHeader } from '../components/dashboardUi';
import { UrologyDiagram } from '../components/anatomy/UrologyDiagram';
import { UROLOGY_BY_SEX, type UrologySex } from '../data/anatomy/urologyInfo';
import { fetchReports } from '../data/remote/reportsApi';
import type { ReportDTO } from '../types';

const SEXES: { id: UrologySex; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
];

/** The most recent Imaging report whose body region mentions any of the given words. */
function findExampleReport(reports: ReportDTO[], keywords: RegExp): ReportDTO | undefined {
  return reports.find((r) => r.testType === 'Imaging' && keywords.test(String((r.results as { imaging?: { bodyRegion?: string } }).imaging?.bodyRegion ?? '')));
}

/** Labelled diagrams of the urinary tract and reproductive organs — for when the 3D model doesn't cover it. */
export function UrologyPage() {
  const [sex, setSex] = useState<UrologySex>('male');
  const [selected, setSelected] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportDTO[]>([]);

  useEffect(() => {
    fetchReports().then((r) => setReports(r.reports)).catch(() => setReports([]));
  }, []);

  const parts = UROLOGY_BY_SEX[sex];
  const chosen = parts.find((p) => p.id === selected);
  const exampleReport = useMemo(
    () => findExampleReport(reports, sex === 'male' ? /prostate/i : /uterus|ovar/i),
    [reports, sex],
  );

  const change = (s: UrologySex) => {
    setSex(s);
    setSelected(null);
  };

  return (
    <PageContainer>
      <PageHeader title="Urologic & reproductive anatomy" subtitle="Labelled diagrams of the urinary tract, and the organs specific to each sex." />

      <p role="note" className="mx-auto mb-6 max-w-2xl rounded-lg bg-hud-amber/10 px-4 py-2.5 text-center text-sm text-hud-text">
        A simplified schematic for orientation — not to scale, and not a scan of anyone's anatomy. The 3D body explorer on the{' '}
        <Link to="/anatomy" className="underline">Anatomy page</Link> is built on an adult-male-only reference model, so this page covers the female organs it
        does not include, alongside the male ones for comparison.
      </p>

      <div className="mx-auto mb-5 flex max-w-2xl justify-center gap-1.5" role="tablist" aria-label="Sex">
        {SEXES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={sex === s.id}
            onClick={() => change(s.id)}
            className={`rounded-full border px-5 py-1.5 text-sm font-medium transition-colors ${sex === s.id ? 'border-hud-cyan bg-hud-cyan text-white' : 'border-hud-border bg-hud-panel text-hud-text hover:border-hud-cyan'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-2xl bg-hud-panel p-4 shadow-sm">
          <div className="mx-auto aspect-square max-w-sm">
            <UrologyDiagram sex={sex} selected={selected} onSelect={setSelected} />
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Parts">
            {parts.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected === p.id}
                onClick={() => setSelected(p.id === selected ? null : p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selected === p.id ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan' : 'border-hud-borderLight bg-hud-panel text-hud-text hover:bg-hud-panel2'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div aria-live="polite" className="min-h-[8rem] rounded-2xl bg-hud-panel2 p-4 text-sm">
            {chosen ? (
              <>
                <h2 className="font-semibold text-hud-text">{chosen.name}</h2>
                <p className="mt-1 leading-relaxed text-hud-text">{chosen.what}</p>
              </>
            ) : (
              <p className="text-hud-muted">Click a shape or a label to learn what it does.</p>
            )}
          </div>

          {exampleReport && (
            <div className="rounded-2xl bg-hud-panel p-4 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-hud-text">Example ultrasound report</h2>
              <p className="mb-2 text-xs text-hud-muted">A demo report covering this anatomy, in the Reports section.</p>
              <Link to={`/report/${exampleReport._id}`} className="text-sm font-medium text-hud-cyan hover:underline">{exampleReport.testName} →</Link>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

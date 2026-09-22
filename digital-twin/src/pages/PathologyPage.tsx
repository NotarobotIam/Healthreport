import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchReports } from '../data/remote/reportsApi';
import { PageContainer, PageHeader } from '../components/dashboardUi';
import { GutMicrobiome } from '../components/pathology/GutMicrobiome';
import type { ReportDTO } from '../types';

const TABS = [
  ['overview', 'Flagged results'],
  ['gut', 'Gut microbiome'],
] as const;
type Tab = (typeof TABS)[number][0];

/** Results that need attention, across every kind of test. */
function Overview({ onOpenGut }: { onOpenGut: () => void }) {
  const [reports, setReports] = useState<ReportDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchReports().then((r) => setReports(r.reports)).catch((e) => setError(e instanceof Error ? e.message : 'Could not load your reports.'));
  }, []);

  if (error) return <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>;
  if (!reports) return <p className="text-sm text-hud-muted">Loading…</p>;
  const flagged = reports.filter((r) => r.normal === false).sort((a, b) => +new Date(b.testDate) - +new Date(a.testDate));

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-hud-text">To follow up</h2>
        <p className="mb-3 text-xs text-hud-muted">Results you or your clinician marked as needing follow-up, or that fall outside a commonly used range. These are prompts to ask your care team, not diagnoses.</p>
        {flagged.length === 0 ? (
          <p className="text-sm text-hud-text">Nothing is flagged right now. 🎉</p>
        ) : (
          <ul className="flex flex-col divide-y divide-hud-border">
            {flagged.map((r) => (
              <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <Link to={`/report/${r._id}`} className="text-sm font-medium text-hud-cyan hover:underline">{r.testName}</Link>
                  <p className="text-xs text-hud-muted">{r.testType} · {new Date(r.testDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
                </div>
                <span className="rounded-full bg-hud-amber/15 px-2 py-0.5 text-[11px] font-medium text-[#a86c00]">To follow up</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-hud-text"><span aria-hidden="true">🦠</span>Gut microbiome</h2>
        <p className="mb-3 text-sm text-hud-text">Keep stool, breath and microbiome test results together and see how they change.</p>
        <button type="button" onClick={onOpenGut} className="text-sm font-medium text-hud-cyan hover:underline">Open gut microbiome →</button>
      </section>
    </div>
  );
}

export function PathologyPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'gut' ? 'gut' : 'overview';
  const go = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  return (
    <PageContainer>
      <PageHeader title="Pathology" subtitle="Results that need a second look, and your gut microbiome." />
      <div className="mb-5 flex gap-1.5" role="tablist" aria-label="Pathology sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => go(id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${tab === id ? 'border-hud-cyan bg-hud-cyan text-white' : 'border-hud-border bg-hud-panel text-hud-text hover:border-hud-cyan'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'gut' ? <GutMicrobiome /> : <Overview onOpenGut={() => go('gut')} />}
    </PageContainer>
  );
}

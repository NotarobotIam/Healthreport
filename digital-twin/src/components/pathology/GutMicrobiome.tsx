import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fetchReports } from '../../data/remote/reportsApi';
import { fetchResearch } from '../../data/remote/researchApi';
import { usePainEntries } from '../../hooks/usePainEntries';
import { GUT_RED_FLAGS } from '../../data/pathology/gutCatalog';
import { ResearchList } from '../community/ResearchList';
import { AddGutTestForm } from './AddGutTestForm';
import { GutResultCard } from './GutResultCard';
import { GutTrend, SequencingCompare } from './GutTrends';
import { severityBand } from '../atlas/painFormat';
import type { ReportDTO, ResearchResponse } from '../../types';

function Card({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-hud-panel p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-hud-text"><span aria-hidden="true">{icon}</span>{title}</h2>
      {children}
    </section>
  );
}

const COMMUNITIES = [
  ['gut-microbiome', 'Gut Microbiome'],
  ['ibs', 'IBS'],
  ['ibd', "Crohn's & Ulcerative Colitis"],
] as const;

/** Gut microbiome and related gut tests, kept honest about what they can and cannot tell you. */
export function GutMicrobiome() {
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [research, setResearch] = useState<ResearchResponse | null>(null);
  const [researchLoading, setResearchLoading] = useState(true);
  const pain = usePainEntries();

  const load = useCallback(async () => {
    try {
      const res = await fetchReports('Microbiome');
      setReports([...res.reports].sort((a, b) => +new Date(b.testDate) - +new Date(a.testDate)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your gut test results.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let live = true;
    fetchResearch('research', { group: 'gut-microbiome', limit: 4 })
      .then((r) => live && setResearch(r))
      .catch(() => live && setResearch(null))
      .finally(() => live && setResearchLoading(false));
    return () => {
      live = false;
    };
  }, []);

  const gutPain = useMemo(() => pain.entries.filter((e) => e.location.system === 'digestive' && e.status === 'active'), [pain.entries]);
  const worst = gutPain.length ? Math.max(...gutPain.map((e) => e.severity)) : null;

  return (
    <div className="flex flex-col gap-5">
      <Card title="Your gut microbiome" icon="🦠">
        <p className="text-sm leading-relaxed text-hud-text">
          The trillions of bacteria in your gut help digest food and are being studied for links to many conditions. Keep your results together here, see how they change, and take them to your care team.
        </p>
        <p role="note" className="mt-3 rounded-lg bg-hud-amber/10 px-3 py-2 text-sm leading-relaxed text-hud-text">
          <strong>Please keep in mind:</strong> there is no agreed “healthy” microbiome, and sequencing tests (especially ones you order yourself) are not proven to diagnose or guide treatment. We show your numbers and how they change, but we do not score them.
          A few other gut tests, such as calprotectin, do have common reference ranges, and we flag those. Don’t start supplements, cut out foods or change medicines because of a result without talking to a doctor or dietitian.
        </p>
      </Card>

      {adding ? (
        <AddGutTestForm onSaved={(r) => { setReports((prev) => [r, ...prev].sort((a, b) => +new Date(b.testDate) - +new Date(a.testDate))); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <div>
          <button type="button" onClick={() => setAdding(true)} className="rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3]">+ Add a gut test result</button>
        </div>
      )}

      <Card title="Your results" icon="🧪">
        {error && <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}
        {loading ? (
          <p className="text-sm text-hud-muted">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-hud-muted">No gut test results yet. Add one from a microbiome, calprotectin, stool or breath test.</p>
        ) : (
          <ul className="flex flex-col gap-3">{reports.map((r) => <GutResultCard key={r._id} report={r} />)}</ul>
        )}
      </Card>

      {reports.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="How a marker changes" icon="📈"><GutTrend reports={reports} /></Card>
          <Card title="Latest two sequencing tests" icon="↔️">
            <SequencingCompare reports={reports} />
            <p className="mt-3 text-xs text-hud-muted">Changes are shown without judgement. Results can differ between labs and even between two samples from the same day, so compare tests from the same lab.</p>
          </Card>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Your gut symptoms" icon="📍">
          {pain.loading ? (
            <p className="text-sm text-hud-muted">Loading…</p>
          ) : gutPain.length === 0 ? (
            <p className="text-sm text-hud-text">You have no active belly or gut pain logged. Symptoms alongside your tests make them much easier for a doctor to interpret.</p>
          ) : (
            <p className="text-sm text-hud-text">
              You have <strong>{gutPain.length}</strong> active gut-area pain {gutPain.length === 1 ? 'entry' : 'entries'}
              {worst !== null && <>, the worst at <strong>{worst}/10</strong> ({severityBand(worst).label})</>}.
            </p>
          )}
          <Link to="/anatomy" className="mt-3 inline-block text-sm font-medium text-hud-cyan hover:underline">Log or review on the body map →</Link>
        </Card>

        <Card title="When to see a doctor" icon="⚠️">
          <p className="mb-2 text-sm text-hud-text">Don’t wait for a test result if you have:</p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-hud-text">{GUT_RED_FLAGS.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="mt-3 text-xs text-hud-muted">If you feel seriously unwell, call your local emergency number.</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Latest gut microbiome research" icon="🔬">
          <ResearchList kind="research" data={research} loading={researchLoading} showCommunity={false} />
        </Card>
        <Card title="Talk with others" icon="💬">
          <p className="mb-3 text-sm text-hud-text">Communities for people dealing with gut health.</p>
          <ul className="flex flex-col gap-2">
            {COMMUNITIES.map(([slug, name]) => (
              <li key={slug}><Link to={`/community/g/${slug}`} className="text-sm font-medium text-hud-cyan hover:underline">{name} →</Link></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

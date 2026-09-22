import { Link } from 'react-router-dom';
import { GUT_BACTERIA_INFO, GUT_BY_ID, gutFieldLabel, gutFlags } from '../../data/pathology/gutCatalog';
import type { ReportDTO } from '../../types';

/** One gut test result: what it was, when, the numbers, and any commonly used reference-range notes. */
export function GutResultCard({ report }: { report: ReportDTO }) {
  const results = report.results as Record<string, unknown>;
  const kind = typeof results.examKind === 'string' ? results.examKind : undefined;
  const title = GUT_BY_ID.get(kind ?? '')?.title ?? report.testName;
  const entries = Object.entries(results).filter(([k, v]) => k !== 'examKind' && k !== 'interpretation' && v !== null && typeof v !== 'object' && v !== '');
  const flags = gutFlags(kind, results);
  const conclusion = results.interpretation as string | undefined;
  // Only for a sequencing report — the bacterial groups are what people need explained; the other test
  // kinds (calprotectin, stool analysis, breath test) don't name individual bacteria.
  const glossary = entries.filter(([k]) => k in GUT_BACTERIA_INFO);

  return (
    <li className="rounded-2xl bg-hud-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-hud-text">{title}</h3>
          <p className="text-xs text-hud-muted">{new Date(report.testDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
        </div>
        {report.normal === false && <span className="rounded-full bg-hud-amber/15 px-2 py-0.5 text-[11px] font-medium text-[#a86c00]">To follow up</span>}
      </div>
      {entries.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {entries.map(([k, v]) => {
            const { label, unit } = gutFieldLabel(kind, k);
            const flag = flags.find((f) => f.field === k);
            return (
              <div key={k}>
                <dt className="text-[11px] text-hud-muted">{label}</dt>
                <dd className={`text-sm font-medium ${flag ? 'text-[#a86c00]' : 'text-hud-text'}`}>{String(v)}{unit ? ` ${unit}` : ''}{flag ? ' ⚑' : ''}</dd>
              </div>
            );
          })}
        </dl>
      )}
      {flags.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 rounded-lg bg-hud-amber/10 px-3 py-2 text-xs text-hud-text">
          {flags.map((f) => <li key={f.field}>⚑ {f.text}</li>)}
        </ul>
      )}
      {glossary.length > 0 && (
        <details className="mt-3 rounded-lg bg-hud-panel2 px-3 py-2 text-xs text-hud-text">
          <summary className="cursor-pointer font-medium">What are these bacteria?</summary>
          <dl className="mt-2 flex flex-col gap-2">
            {glossary.map(([k]) => (
              <div key={k}>
                <dt className="font-medium">{gutFieldLabel(kind, k).label}</dt>
                <dd className="text-hud-muted">{GUT_BACTERIA_INFO[k]}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {conclusion && <p className="mt-3 text-sm leading-relaxed text-hud-text"><span className="font-medium">Report said: </span>{conclusion}</p>}
      {report.notes && <p className="mt-1 text-xs text-hud-muted">{report.notes}</p>}
      <Link to={`/report/${report._id}`} className="mt-2 inline-block text-xs font-medium text-hud-cyan hover:underline">Full report →</Link>
    </li>
  );
}

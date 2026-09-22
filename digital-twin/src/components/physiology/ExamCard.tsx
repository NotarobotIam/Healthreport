import { Link } from 'react-router-dom';
import { EXAM_BY_ID, fieldLabel } from '../../data/physiology/examCatalog';
import type { ReportDTO } from '../../types';

/** One exam result: what it was, when, the numbers, and what the clinician concluded. */
export function ExamCard({ report }: { report: ReportDTO }) {
  const results = report.results as Record<string, unknown>;
  const kind = typeof results.examKind === 'string' ? results.examKind : undefined;
  const title = EXAM_BY_ID.get(kind ?? '')?.title ?? report.testName;
  const imaging = results.imaging as { findings?: string; modality?: string } | undefined;
  const entries = Object.entries(results).filter(([k, v]) => k !== 'examKind' && k !== 'interpretation' && k !== 'findings' && v !== null && typeof v !== 'object' && v !== '');
  const conclusion = (results.interpretation ?? results.findings ?? imaging?.findings) as string | undefined;

  return (
    <li className="rounded-2xl bg-hud-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-hud-text">{title}</h3>
          <p className="text-xs text-hud-muted">
            {new Date(report.testDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
            {imaging?.modality && ` · ${imaging.modality}`}
          </p>
        </div>
        {report.normal === false && <span className="rounded-full bg-hud-amber/15 px-2 py-0.5 text-[11px] font-medium text-[#a86c00]">Follow-up flagged</span>}
      </div>
      {entries.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {entries.map(([k, v]) => {
            const { label, unit } = fieldLabel(kind, k);
            return (
              <div key={k}>
                <dt className="text-[11px] text-hud-muted">{label}</dt>
                <dd className="text-sm font-medium text-hud-text">{String(v)}{unit ? ` ${unit}` : ''}</dd>
              </div>
            );
          })}
        </dl>
      )}
      {conclusion && <p className="mt-3 text-sm leading-relaxed text-hud-text"><span className="font-medium">Result: </span>{conclusion}</p>}
      {report.notes && <p className="mt-1 text-xs text-hud-muted">{report.notes}</p>}
      <Link to={`/report/${report._id}`} className="mt-2 inline-block text-xs font-medium text-hud-cyan hover:underline">Full report →</Link>
    </li>
  );
}

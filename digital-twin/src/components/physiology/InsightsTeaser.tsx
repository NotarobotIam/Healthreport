import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchInsightStatus } from '../../data/remote/insightsApi';
import type { InsightKind, InsightKindStatus, InsightStatus } from '../../types';

/** A small card that shows progress toward an AI-assisted insight and links to the full page. */
export function InsightsTeaser({ kind }: { kind: InsightKind }) {
  const [status, setStatus] = useState<InsightStatus | null>(null);
  useEffect(() => {
    fetchInsightStatus().then(setStatus).catch(() => setStatus(null));
  }, []);
  if (!status) return null;

  const s: InsightKindStatus = status.kinds[kind];
  const noun = kind === 'pain' ? 'pain logs' : 'readings and exam results';
  const shown = Math.min(s.count, status.threshold);
  let line: string;
  if (s.basic.reason === 'need-more-logs') line = `Add ${s.basic.remaining} more to unlock a free summary.`;
  else if (status.unresolved) line = 'A result is waiting for you to choose a next step.';
  else if (s.basic.eligible) line = 'Your free summary is ready when you are.';
  else line = 'Open to see your summary.';

  return (
    <section className="rounded-2xl bg-gradient-to-br from-[#eaf4fe] to-[#f1ecfb] p-5" aria-label="AI-assisted insights">
      <h2 className="flex items-center gap-2 text-base font-semibold text-hud-text"><span aria-hidden="true">✨</span> Insights &amp; questions</h2>
      <p className="mt-1 text-sm text-hud-text/80">A free summary of your patterns, an optional AI look, and a place to ask a question. Never a diagnosis.</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-valuemin={0} aria-valuemax={status.threshold} aria-valuenow={shown}>
        <div className="h-full rounded-full bg-[#007bff]" style={{ width: `${(shown / status.threshold) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-hud-text/70">
        {s.count >= status.threshold ? `${s.count} ${noun}` : `${shown} of ${status.threshold} ${noun}`} · {line}
      </p>
      <Link to={`/insights?kind=${kind}`} className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-hud-cyan shadow-sm hover:bg-white/90">
        {s.basic.eligible || status.unresolved || s.latest ? 'Open insights' : 'Learn more'}
      </Link>
    </section>
  );
}

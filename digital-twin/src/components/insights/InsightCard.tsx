import type { InsightDTO, Urgency } from '../../types';
import { timeAgo } from '../community/format';

const URGENCY: Record<Urgency, { label: string; cls: string }> = {
  routine: { label: 'Raise at a routine visit', cls: 'bg-hud-panel2 text-hud-muted ring-1 ring-hud-border' },
  soon: { label: 'Worth raising soon', cls: 'bg-hud-amber/15 text-[#a86c00]' },
  urgent: { label: 'Raise promptly', cls: 'bg-hud-red/10 text-hud-red' },
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-hud-muted">{title}</h3>
      {children}
    </section>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-hud-text">
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

/**
 * Renders an insight. The disclaimer is always first and is text from our server, not from the AI.
 * Everything from the AI is shown as plain text.
 */
export function InsightCard({ insight }: { insight: InsightDTO }) {
  const r = insight.result;
  return (
    <article className="rounded-2xl bg-hud-panel p-5 shadow-sm sm:p-6" aria-label="AI-assisted insight">
      <p role="note" className="rounded-lg border border-hud-amber/50 bg-hud-amber/10 px-4 py-3 text-sm leading-relaxed text-hud-text">
        <strong>Not a diagnosis.</strong> {insight.disclaimer}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {insight.source === 'rules' ? (
          <span className="rounded-full bg-hud-green/10 px-2.5 py-1 font-medium text-hud-green">Quick summary · made on this site, no AI, nothing was sent anywhere</span>
        ) : (
          <span className="rounded-full bg-[#007bff]/10 px-2.5 py-1 font-medium text-[#0056b3]">{insight.mode === 'question' ? 'AI-assisted answer' : 'AI-assisted look'}</span>
        )}
      </p>
      {insight.draftKnowledge && (
        <p role="note" className="mt-3 rounded-lg bg-hud-panel2 px-4 py-2 text-xs leading-relaxed text-hud-muted ring-1 ring-hud-border">
          The pattern suggestions in this summary come from a draft knowledge base that a clinician has not yet reviewed. Please treat them as conversation starters only.
        </p>
      )}
      {insight.question && (
        <blockquote className="mt-3 rounded-lg border-l-4 border-hud-cyan bg-hud-panel2 px-4 py-2 text-sm text-hud-text">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-hud-muted">You asked</span>
          {insight.question}
        </blockquote>
      )}
      {insight.demo && (
        <p className="mt-3 rounded-lg bg-hud-cyan/10 px-4 py-2 text-sm text-hud-text">
          <strong>Demo mode:</strong> this is a demonstration to show how insights look. It is not a real analysis of your records.
        </p>
      )}
      <p className="mt-3 text-xs text-hud-muted">
        Made {timeAgo(insight.createdAt)}
        {insight.kind !== 'question' && ` from ${insight.basisCount} ${insight.kind === 'pain' ? 'pain logs' : 'records'}`}
        {insight.includeDetail && ', including your notes'}.
      </p>

      <p className="mt-4 text-base leading-relaxed text-hud-text">{r.summary}</p>

      {r.patterns.length > 0 && (
        <Block title="What stands out"><Bullets items={r.patterns} /></Block>
      )}

      {r.insufficientData ? (
        <p className="mt-5 rounded-lg bg-hud-panel2 px-4 py-3 text-sm text-hud-text">There isn't enough here yet to suggest what might be going on. The questions below are a good place to start with your doctor.</p>
      ) : (
        r.possibilities.length > 0 && (
          <Block title="Possibilities to discuss with your doctor">
            <ul className="flex flex-col gap-3">
              {r.possibilities.map((p, i) => (
                <li key={`${p.name}-${i}`} className="rounded-xl border border-hud-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-hud-text">{i + 1}. {p.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${URGENCY[p.urgency].cls}`}>{URGENCY[p.urgency].label}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-hud-text/90">{p.why}</p>
                </li>
              ))}
            </ul>
            {r.hiddenPossibilities > 0 && (
              <p className="mt-2 text-xs text-hud-muted">{r.hiddenPossibilities} more {r.hiddenPossibilities === 1 ? 'possibility is' : 'possibilities are'} hidden because you chose to see fewer suggestions.</p>
            )}
          </Block>
        )
      )}

      {r.testsToAskAbout.length > 0 && (
        <Block title="Things a clinician might consider checking"><Bullets items={r.testsToAskAbout} /></Block>
      )}
      {r.questionsForDoctor.length > 0 && (
        <Block title="Questions to ask your doctor"><Bullets items={r.questionsForDoctor} /></Block>
      )}
      {r.redFlags.length > 0 && (
        <section className="mt-5 rounded-xl border border-hud-red/40 bg-hud-red/5 p-4" aria-label="When to get help now">
          <h3 className="mb-2 text-sm font-semibold text-hud-red">Don't wait for an appointment if…</h3>
          <Bullets items={r.redFlags} />
        </section>
      )}
    </article>
  );
}

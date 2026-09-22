import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { askQuestion, deleteAllInsights, fetchInsightStatus, fetchInsights, generateInsight, saveInsightSettings } from '../data/remote/insightsApi';
import { ConsentCard } from '../components/insights/ConsentCard';
import { DoctorSummary } from '../components/insights/DoctorSummary';
import { FollowUpPanel } from '../components/insights/FollowUpPanel';
import { InsightCard } from '../components/insights/InsightCard';
import { CrisisBanner } from '../components/community/CrisisBanner';
import { looksLikeCrisis } from '../utils/crisis';
import { PageContainer } from '../components/dashboardUi';
import { timeAgo } from '../components/community/format';
import type { InsightAnyKind, InsightDTO, InsightKind, InsightMode, InsightStatus, InsightVerdict } from '../types';

type Tab = 'pain' | 'physiology' | 'ask';
const NOUN: Record<InsightKind, string> = { pain: 'pain logs', physiology: 'readings and exam results' };
const WHERE: Record<InsightKind, { to: string; label: string }> = { pain: { to: '/anatomy', label: 'Log where it hurts' }, physiology: { to: '/physiology', label: 'Add a reading or exam' } };
const EXAMPLE = 'e.g. Why does my breast hurt when I touch it in a circular motion, but not when I press straight down?';
const kindOfTab = (t: Tab): InsightAnyKind => (t === 'ask' ? 'question' : t);

function Info({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-hud-panel p-5 text-sm leading-relaxed text-hud-text shadow-sm">{children}</p>;
}

/** Explains, in words, why an AI action isn't available right now. */
function whyNot(v: InsightVerdict, noun: string): string | null {
  switch (v.reason) {
    case 'unavailable': return "AI isn't switched on for this site yet. The free summary still works.";
    case 'need-more-logs': return `Add ${v.remaining} more ${noun} first.`;
    case 'need-more-new-logs': return `Add ${v.remaining} more ${noun} first, so there is something new to look at.`;
    case 'too-soon': return `You had an AI look recently. You can have another ${v.nextEligibleAt ? `after ${new Date(v.nextEligibleAt).toLocaleDateString()}` : 'in a few days'}.`;
    case 'quota-reached': return `You've used this month's AI allowance${v.nextEligibleAt ? `; it renews around ${new Date(v.nextEligibleAt).toLocaleDateString()}` : ''}. The free summary is always available.`;
    case 'turned-off': return 'AI suggestions are turned off. You can turn them back on in Settings.';
    case 'follow-up-required': return 'Please choose what to do with your last result first.';
    default: return null;
  }
}

export function InsightsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab') ?? params.get('kind');
  const tab: Tab = requested === 'physiology' ? 'physiology' : requested === 'ask' ? 'ask' : 'pain';
  const [status, setStatus] = useState<InsightStatus | null>(null);
  const [insights, setInsights] = useState<InsightDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<InsightMode | null>(null);
  const [moreDetail, setMoreDetail] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiSetup, setShowAiSetup] = useState(false);
  const [question, setQuestion] = useState('');
  const [useContext, setUseContext] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([fetchInsightStatus(), fetchInsights()]);
      setStatus(s);
      setInsights(list.insights);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load insights.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => setCrisis(false), [tab]);

  if (!status) {
    return <PageContainer>{error ? <p role="alert" className="rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p> : <p className="py-10 text-center text-sm text-hud-muted">Loading…</p>}</PageContainer>;
  }

  const kind = tab === 'ask' ? null : tab;
  const ks = kind ? status.kinds[kind] : null;
  const waiting = insights.find((i) => i.needsFollowUp);
  const mine = insights.filter((i) => i.kind === kindOfTab(tab));
  const latest = mine[0];
  const older = mine.slice(1);

  const run = async (mode: InsightMode, action: () => Promise<{ crisis: boolean }>) => {
    setBusy(mode);
    setError(null);
    setCrisis(false);
    try {
      const res = await action();
      if (res.crisis) setCrisis(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const setSetting = async (s: Parameters<typeof saveInsightSettings>[0]) => {
    try {
      await saveInsightSettings(s);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    }
  };

  const replaceInsight = (updated: InsightDTO) => {
    setInsights((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    void load();
  };

  const consentNeeded = (v: InsightVerdict) => v.reason === 'need-consent';
  const showsCrisisHint = tab === 'ask' && looksLikeCrisis(question);

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-semibold text-hud-text">✨ Insights &amp; questions</h1>
          <button type="button" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings} className="text-sm font-medium text-hud-cyan hover:underline">Settings</button>
        </div>
        <p className="text-sm text-hud-muted">Get a free summary of your patterns, take an optional deeper AI look, or ask a question. None of it is a diagnosis — it's to help you prepare for a conversation with your doctor.</p>

        <div className="mt-4 flex gap-1 border-b border-hud-border" role="tablist">
          {([['pain', 'Pain'], ['physiology', 'Physiology'], ['ask', 'Ask a question']] as [Tab, string][]).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k })}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${tab === k ? 'border-hud-cyan text-hud-cyan' : 'border-transparent text-hud-muted hover:text-hud-text'}`}>
              {label}
            </button>
          ))}
        </div>

        {status.demo && <p className="mt-4 rounded-lg bg-hud-cyan/10 px-4 py-2 text-sm text-hud-text"><strong>Demo mode:</strong> the AI parts of this test site show demonstration results, not a real analysis.</p>}
        {error && <p role="alert" className="mt-4 rounded-md bg-hud-red/10 px-3 py-2 text-sm text-hud-red">{error}</p>}

        {showSettings && (
          <section className="mt-4 rounded-2xl bg-hud-panel p-5 shadow-sm" aria-label="Settings">
            <h2 className="text-base font-semibold text-hud-text">Your settings</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm text-hud-text">Show at most</span>
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" onClick={() => setSetting({ maxPossibilities: n })} aria-pressed={status.settings.maxPossibilities === n}
                  className={`h-9 w-9 rounded-full border text-sm font-semibold ${status.settings.maxPossibilities === n ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan' : 'border-hud-borderLight text-hud-text hover:bg-hud-panel2'}`}>{n}</button>
              ))}
              <span className="text-sm text-hud-muted">possibilities at a time</span>
            </div>
            <p className="mt-3 text-xs text-hud-muted">AI allowance this month: {status.quotas.deep.remaining} of {status.quotas.deep.limit} deeper looks and {status.quotas.question.remaining} of {status.quotas.question.limit} questions left. The free summary has no limit.</p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-hud-border pt-4">
              {status.settings.enabled ? (
                <button type="button" onClick={() => setSetting({ enabled: false })} className="rounded-md border border-hud-borderLight px-4 py-1.5 text-sm hover:bg-hud-panel2">Turn AI suggestions off</button>
              ) : status.settings.consented ? (
                <button type="button" onClick={() => setSetting({ enabled: true })} className="rounded-md border border-hud-borderLight px-4 py-1.5 text-sm hover:bg-hud-panel2">Turn AI suggestions on</button>
              ) : null}
              {status.settings.consented && <button type="button" onClick={() => setSetting({ consent: false })} className="rounded-md border border-hud-borderLight px-4 py-1.5 text-sm hover:bg-hud-panel2">Withdraw my agreement</button>}
              <button type="button" onClick={async () => { if (window.confirm('Delete all your saved insights and answers? This cannot be undone.')) { await deleteAllInsights(); await load(); } }} className="rounded-md border border-hud-red/50 px-4 py-1.5 text-sm text-hud-red hover:bg-hud-red/5">Delete everything saved here</button>
            </div>
          </section>
        )}

        <div className="mt-5 flex flex-col gap-5">
          {crisis && <CrisisBanner />}

          {/* A result that is waiting for the member's choice always comes first, on whichever tab they are on. */}
          {waiting && (
            <>
              {waiting.kind !== kindOfTab(tab) && (
                <p role="status" className="rounded-xl bg-hud-amber/10 px-4 py-3 text-sm text-hud-text">
                  You have {waiting.kind === 'question' ? 'an answer' : 'a result'} waiting for your choice (from the {waiting.kind === 'question' ? 'Ask a question' : waiting.kind === 'pain' ? 'Pain' : 'Physiology'} tab). Please choose before making anything new.
                </p>
              )}
              <FollowUpPanel insight={waiting} currentMax={status.settings.maxPossibilities} onDone={replaceInsight} />
              {waiting.kind !== kindOfTab(tab) && <InsightCard insight={waiting} />}
            </>
          )}

          {/* ------------------------------------------------------------------ pain / physiology */}
          {kind && ks && (
            <>
              {ks.basic.reason === 'need-more-logs' && (
                <section className="rounded-2xl bg-gradient-to-br from-[#eaf4fe] to-[#f1ecfb] p-5" aria-label="Progress">
                  <p className="text-base font-semibold text-hud-text">{ks.count} of {status.threshold} {NOUN[kind]}</p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-valuemin={0} aria-valuemax={status.threshold} aria-valuenow={ks.count}>
                    <div className="h-full rounded-full bg-[#007bff]" style={{ width: `${(ks.count / status.threshold) * 100}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-hud-text/80">A pattern needs a few data points. Add {ks.basic.remaining} more and your free summary unlocks.</p>
                  <Link to={WHERE[kind].to} className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-hud-cyan shadow-sm">{WHERE[kind].label}</Link>
                </section>
              )}

              {!waiting && ks.basic.eligible && (
                <section className="rounded-2xl bg-hud-panel p-5 shadow-sm" aria-label="Free summary">
                  <h2 className="text-base font-semibold text-hud-text">Free quick summary</h2>
                  <p className="mt-1 text-sm text-hud-muted">A look at your {NOUN[kind]}: where it is, how it behaves, what changes it, and what to ask your doctor. Made right here on this site — <strong>no AI, nothing leaves the site, no limit</strong>.</p>
                  <button type="button" disabled={busy !== null} onClick={() => run('basic', () => generateInsight(kind, 'basic'))} className="mt-4 rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60">
                    {busy === 'basic' ? 'Working it out…' : latest ? 'Update my free summary' : 'Get my free summary'}
                  </button>
                </section>
              )}

              {!waiting && ks.count >= status.threshold && (
                <section className="rounded-2xl border border-hud-border bg-hud-panel p-5" aria-label="Deeper AI look">
                  <h2 className="text-base font-semibold text-hud-text">Deeper AI look <span className="text-xs font-normal text-hud-muted">(optional)</span></h2>
                  <p className="mt-1 text-sm text-hud-muted">Asks an AI service to reason about your {NOUN[kind]}. It can notice more, but it can be wrong. You have <strong>{status.quotas.deep.remaining} of {status.quotas.deep.limit}</strong> this month.</p>
                  {ks.deep.eligible ? (
                    <>
                      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-hud-text">
                        <input type="checkbox" checked={moreDetail} onChange={(e) => setMoreDetail(e.target.checked)} className="mt-0.5 h-4 w-4" />
                        <span>Include more detail <span className="text-hud-muted">— my written notes and my age range. More personal; leave unticked if unsure.</span></span>
                      </label>
                      <button type="button" disabled={busy !== null} onClick={() => run('deep', () => generateInsight(kind, 'deep', moreDetail))} className="mt-3 rounded-md border border-hud-borderLight bg-hud-panel px-5 py-2 text-sm font-semibold text-hud-text hover:bg-hud-panel2 disabled:opacity-60">
                        {busy === 'deep' ? 'Looking for patterns…' : 'Ask the AI for a deeper look'}
                      </button>
                    </>
                  ) : consentNeeded(ks.deep) ? (
                    showAiSetup ? <div className="mt-3"><ConsentCard kind={kind} demo={status.demo} onDone={() => { setShowAiSetup(false); void load(); }} /></div>
                      : <button type="button" onClick={() => setShowAiSetup(true)} className="mt-3 rounded-md border border-hud-borderLight px-4 py-2 text-sm font-medium hover:bg-hud-panel2">Set up AI look…</button>
                  ) : (
                    <p className="mt-3 text-sm text-hud-text">{whyNot(ks.deep, NOUN[kind])}</p>
                  )}
                </section>
              )}

              {ks.count >= status.threshold && waiting && !ks.basic.eligible && <Info>{whyNot(ks.basic, NOUN[kind]) ?? 'Please choose what to do with your last result first.'}</Info>}

              {latest && <InsightCard insight={latest} />}
              {latest?.followUp?.choice === 'discuss-with-doctor' && <DoctorSummary insight={latest} />}
              {latest?.followUp?.choice === 'limited' && <Info>You chose to see fewer suggestions (now at most {status.settings.maxPossibilities}). You can change this any time in Settings.</Info>}
              {latest?.followUp?.choice === 'turned-off' && <Info>You turned AI suggestions off. The free summary still works, and you can turn AI back on in Settings.</Info>}
            </>
          )}

          {/* ----------------------------------------------------------------------- ask a question */}
          {tab === 'ask' && (
            <>
              <section className="rounded-2xl bg-hud-panel p-5 shadow-sm" aria-label="Ask a question">
                <h2 className="text-base font-semibold text-hud-text">Ask a question about what you're noticing</h2>
                <p className="mt-1 text-sm text-hud-muted">Describe it in your own words. An AI service explains what kinds of things could account for it and what a doctor would look at. <strong>{status.quotas.question.remaining} of {status.quotas.question.limit}</strong> questions left this month.</p>
                <label htmlFor="question" className="sr-only">Your question</label>
                <textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} rows={4} placeholder={EXAMPLE}
                  className="mt-3 w-full resize-y rounded-md border border-hud-borderLight px-3 py-2 text-sm focus:border-hud-cyan focus:outline-none" />
                <div className="mt-1 flex justify-between text-xs text-hud-muted"><span>Please don't include names or contact details.</span><span>{question.length}/500</span></div>
                {showsCrisisHint && <div className="mt-3"><CrisisBanner /></div>}
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-hud-text">
                  <input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>Use my pain log to help <span className="text-hud-muted">— sends the same short, de-identified summary of your entries (no notes). Off by default.</span></span>
                </label>
                {status.question.eligible ? (
                  <button type="button" disabled={busy !== null || question.trim().length < 10} onClick={() => run('question', () => askQuestion(question.trim(), useContext).then((r) => { if (!r.crisis) setQuestion(''); return r; }))}
                    className="mt-4 rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-50">
                    {busy === 'question' ? 'Thinking…' : 'Ask'}
                  </button>
                ) : consentNeeded(status.question) ? (
                  showAiSetup ? <div className="mt-4"><ConsentCard kind="pain" demo={status.demo} onDone={() => { setShowAiSetup(false); void load(); }} /></div>
                    : <button type="button" onClick={() => setShowAiSetup(true)} className="mt-4 rounded-md border border-hud-borderLight px-4 py-2 text-sm font-medium hover:bg-hud-panel2">Set up AI questions…</button>
                ) : (
                  <p className="mt-4 rounded-lg bg-hud-panel2 px-4 py-3 text-sm text-hud-text">{whyNot(status.question, 'records')}</p>
                )}
              </section>
              {latest && <InsightCard insight={latest} />}
              {latest?.followUp?.choice === 'discuss-with-doctor' && <DoctorSummary insight={latest} />}
              {latest?.followUp?.choice === 'limited' && <Info>You chose to see fewer suggestions (now at most {status.settings.maxPossibilities}). You can change this any time in Settings.</Info>}
            </>
          )}

          {older.length > 0 && (
            <section aria-label="Earlier results">
              <h2 className="mb-2 text-sm font-semibold text-hud-text">Earlier</h2>
              <ul className="flex flex-col gap-2">
                {older.map((i) => (
                  <li key={i.id}>
                    <details className="rounded-xl bg-hud-panel p-4 shadow-sm">
                      <summary className="cursor-pointer text-sm font-medium text-hud-text">{timeAgo(i.createdAt)} · {i.question ?? i.result.summary.slice(0, 90)}…</summary>
                      <div className="mt-3"><InsightCard insight={i} /></div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

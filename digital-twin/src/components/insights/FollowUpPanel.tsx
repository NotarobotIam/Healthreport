import { useState } from 'react';
import { followUpInsight } from '../../data/remote/insightsApi';
import type { InsightDTO } from '../../types';

/**
 * The required next step after an insight: take it to a doctor, or limit the suggestions. Another
 * insight can't be made until one of these is chosen, and the server enforces that.
 */
export function FollowUpPanel({ insight, currentMax, onDone }: { insight: InsightDTO; currentMax: number; onDone: (i: InsightDTO) => void }) {
  const [mode, setMode] = useState<'choose' | 'limit'>('choose');
  const [max, setMax] = useState(Math.min(currentMax, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (body: Parameters<typeof followUpInsight>[1]) => {
    setBusy(true);
    setError(null);
    try {
      onDone((await followUpInsight(insight.id, body)).insight);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your choice.');
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-[#007bff]/50 bg-[#007bff]/5 p-5" aria-label="Choose what to do next">
      <h2 className="text-base font-semibold text-hud-text">What would you like to do with this?</h2>
      <p className="mt-1 text-sm text-hud-text/80">These are ideas to talk through with a professional, not conclusions. Please choose one before you go on.</p>

      {mode === 'choose' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => run({ choice: 'discuss-with-doctor' })} className="rounded-xl bg-[#007bff] p-4 text-left text-white hover:bg-[#0056b3] disabled:opacity-60">
            <span className="block text-sm font-semibold">🩺 I'll ask my doctor</span>
            <span className="mt-1 block text-xs text-white/85">Get a printable summary to take to your appointment.</span>
          </button>
          <button type="button" disabled={busy} onClick={() => setMode('limit')} className="rounded-xl border border-hud-borderLight bg-hud-panel p-4 text-left hover:bg-hud-panel2">
            <span className="block text-sm font-semibold text-hud-text">✋ Limit the suggestions</span>
            <span className="mt-1 block text-xs text-hud-muted">See fewer possibilities, or turn AI suggestions off.</span>
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-hud-panel p-4">
          <p className="text-sm font-medium text-hud-text">Show me at most…</p>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Maximum number of possibilities">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={max === n} onClick={() => setMax(n)}
                className={`h-10 w-10 rounded-full border text-sm font-semibold ${max === n ? 'border-hud-cyan bg-hud-cyan/10 text-hud-cyan' : 'border-hud-borderLight text-hud-text hover:bg-hud-panel2'}`}>{n}</button>
            ))}
            <span className="self-center text-sm text-hud-muted">{max === 1 ? 'possibility' : 'possibilities'} at a time</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run({ choice: 'limit', maxPossibilities: max })} className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-60">Save this limit</button>
            <button type="button" disabled={busy} onClick={() => run({ choice: 'turn-off' })} className="rounded-md border border-hud-red/50 px-4 py-2 text-sm font-medium text-hud-red hover:bg-hud-red/5 disabled:opacity-60">Turn AI suggestions off</button>
            <button type="button" disabled={busy} onClick={() => setMode('choose')} className="rounded-md px-3 py-2 text-sm text-hud-muted hover:underline">Back</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-hud-red">{error}</p>}
    </section>
  );
}

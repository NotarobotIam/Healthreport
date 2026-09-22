import { useState } from 'react';
import { saveInsightSettings } from '../../data/remote/insightsApi';
import type { InsightKind } from '../../types';

/** Says exactly what leaves the site before anything does. Consent is recorded only when the button is pressed. */
export function ConsentCard({ kind, demo, onDone }: { kind: InsightKind; demo: boolean; onDone: () => void }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const what = kind === 'pain'
    ? 'where it hurts, what it feels like, how strong it is, how long you\'ve had it, and what brings it on or eases it'
    : 'your blood pressure, heart rate and other readings, your heart and physical exam results, and a few cholesterol values';

  const consent = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveInsightSettings({ consent: true });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your choice.');
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-hud-panel p-5 shadow-sm sm:p-6" aria-label="How your records are used">
      <h2 className="text-lg font-semibold text-hud-text">Before you use the AI features</h2>
      <p className="mt-2 text-sm leading-relaxed text-hud-text">
        The <strong>free quick summary needs none of this</strong> — it is made on this site and nothing leaves it. The optional AI features send information to an AI service (Anthropic's Claude) and show you what it says. Please read what that means:
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-hud-panel2 p-4">
          <h3 className="text-sm font-semibold text-hud-text">What is sent</h3>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-sm text-hud-text">
            <li>{what[0].toUpperCase() + what.slice(1)}.</li>
            <li>Times as “N days ago”, never calendar dates.</li>
            <li>Short things you typed, such as “spreads down my arm”, if they contain no contact details.</li>
            <li>If you ask a question, the words of your question — and your pain log summary only if you tick that box.</li>
          </ul>
        </div>
        <div className="rounded-xl bg-hud-panel2 p-4">
          <h3 className="text-sm font-semibold text-hud-text">What is never sent</h3>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-sm text-hud-text">
            <li>Your name, email, phone number, username or date of birth.</li>
            <li>Your written notes and your age — unless you tick “more detail” each time.</li>
            <li>Anything in your posts, friends or communities.</li>
          </ul>
        </div>
      </div>
      <ul className="ml-5 mt-4 list-disc space-y-1 text-sm text-hud-text">
        <li><strong>It is not a diagnosis.</strong> The AI can be wrong, cannot examine you, and offers ideas to discuss with a doctor.</li>
        <li>After each result you'll be asked to either take it to your doctor or limit the suggestions.</li>
        <li>Each member gets a small monthly allowance of AI looks and questions; the free summary has no limit.</li>
        <li>You can turn this off, change how many suggestions you see, or delete your insights whenever you like. You'll find these in “Settings” on this page.</li>
        <li>If what you've written suggests you're struggling, we'll show you support resources instead of an analysis.</li>
      </ul>
      {demo && <p className="mt-3 rounded-lg bg-hud-cyan/10 px-3 py-2 text-sm text-hud-text"><strong>Demo mode:</strong> on this test site nothing is actually sent anywhere; you'll see a demonstration result.</p>}
      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-hud-text">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>I understand how my records will be used, and that this is not medical advice.</span>
      </label>
      {error && <p role="alert" className="mt-3 text-sm text-hud-red">{error}</p>}
      <button type="button" disabled={!agree || busy} onClick={consent} className="mt-4 rounded-md bg-[#007bff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0056b3] disabled:opacity-50">
        {busy ? 'Saving…' : 'I agree — turn on AI-assisted insights'}
      </button>
    </section>
  );
}

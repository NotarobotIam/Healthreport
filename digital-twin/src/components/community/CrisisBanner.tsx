/**
 * Shown when someone's words suggest they may be in distress. Never blocks
 * posting and never accuses: it offers help and stays out of the way.
 */
export function CrisisBanner() {
  return (
    <div role="status" className="rounded-lg border border-hud-cyan/40 bg-hud-cyan/5 p-4 text-sm leading-relaxed text-hud-text">
      <p className="font-semibold">You're not alone, and support is available.</p>
      <p className="mt-1">
        If you are thinking about harming yourself or are in immediate danger, please contact your local emergency number now. In the
        United States you can call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline) at any time. Outside the US,{' '}
        <a href="https://findahelpline.com" target="_blank" rel="noreferrer noopener" className="font-medium text-hud-cyan underline">
          findahelpline.com
        </a>{' '}
        lists free, confidential helplines by country.
      </p>
      <p className="mt-1 text-xs text-hud-muted">
        Living with pain is exhausting. Talking to a doctor or a mental-health professional about how you're feeling is a good step too.
      </p>
    </div>
  );
}

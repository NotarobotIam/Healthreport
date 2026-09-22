/**
 * A soft wash of colour behind the top of the page, so the Dashboard and Community pages don't read as
 * flat grey space. Four pastel pools (echoing the Dashboard hero card's own blue/lavender/purple gradient,
 * plus a peach and a mint for warmth) fade into the page's base tint (`bg-hud-bgWarm`, set by the caller)
 * that continues for the rest of the page.
 *
 * Purely decorative: it never carries text or controls, so it's hidden from assistive tech and ignores
 * clicks/taps. Static (nothing moves), so there's nothing to pause for reduced-motion preferences.
 */
export function FriendlyBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden"
      style={{
        background: [
          'radial-gradient(38rem 26rem at 8% -12%, #cfe6ff 0%, transparent 60%)',
          'radial-gradient(34rem 27rem at 94% -8%, #efd9fb 0%, transparent 58%)',
          'radial-gradient(30rem 24rem at 88% 52%, #ffe4c2 0%, transparent 55%)',
          'radial-gradient(34rem 26rem at 4% 58%, #cdf3de 0%, transparent 55%)',
          'linear-gradient(to bottom, transparent 0%, #f8f7fb 100%)',
        ].join(', '),
      }}
    />
  );
}

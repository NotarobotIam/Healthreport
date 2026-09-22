import { useTheme } from '../../theme/ThemeContext';

// Same four hues (blue, lavender, peach, mint) in both themes, just pitched differently: light-mode washes
// are bright pastel pools; dark-mode ones are deeper, more saturated glows so they read as "lit" against a
// dark page instead of looking bleached out. Both fade into that theme's `hud-bgWarm` (see index.css).
const GRADIENTS: Record<'light' | 'dark', string> = {
  light: [
    'radial-gradient(38rem 26rem at 8% -12%, #cfe6ff 0%, transparent 60%)',
    'radial-gradient(34rem 27rem at 94% -8%, #efd9fb 0%, transparent 58%)',
    'radial-gradient(30rem 24rem at 88% 52%, #ffe4c2 0%, transparent 55%)',
    'radial-gradient(34rem 26rem at 4% 58%, #cdf3de 0%, transparent 55%)',
    'linear-gradient(to bottom, transparent 0%, #f8f7fb 100%)',
  ].join(', '),
  dark: [
    'radial-gradient(38rem 26rem at 8% -12%, #1e3a5c 0%, transparent 60%)',
    'radial-gradient(34rem 27rem at 94% -8%, #3a2a54 0%, transparent 58%)',
    'radial-gradient(30rem 24rem at 88% 52%, #4a3420 0%, transparent 55%)',
    'radial-gradient(34rem 26rem at 4% 58%, #1a3d34 0%, transparent 55%)',
    'linear-gradient(to bottom, transparent 0%, #131520 100%)',
  ].join(', '),
};

/**
 * A soft wash of colour behind the top of the page, so the Dashboard and Community pages don't read as
 * flat grey (or, in dark mode, flat black) space. Four colour pools (echoing the Dashboard hero card's own
 * blue/lavender/purple gradient, plus a peach and a mint for warmth) fade into the page's base tint
 * (`bg-hud-bgWarm`, set by the caller) that continues for the rest of the page.
 *
 * Purely decorative: it never carries text or controls, so it's hidden from assistive tech and ignores
 * clicks/taps. Static (nothing moves), so there's nothing to pause for reduced-motion preferences.
 */
export function FriendlyBackground() {
  const { theme } = useTheme();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden"
      style={{ background: GRADIENTS[theme] }}
    />
  );
}

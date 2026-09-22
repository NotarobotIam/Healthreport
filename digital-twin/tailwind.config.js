/** @type {import('tailwindcss').Config} */
// Token NAMES are historical ("hud.*", from this app's original dark HUD
// aesthetic) but the VALUES below are the merged app's actual light theme,
// carried over verbatim from the health-report dashboard's hand-written CSS
// (client/src/{index,App}.css, Navigation.css, Dashboard.css, etc.) so every
// existing `bg-hud-*`/`text-hud-*` class across this codebase repaints
// correctly with zero class-name changes. See TopNav.tsx for the one
// component that intentionally keeps the OLD dark values as literal
// arbitrary values instead of using these tokens (the nav bar is the one
// surface App A itself renders dark) and scene/** for the 3D viewport,
// which never used these tokens at all (literal hex passed to Three.js
// props) and is unaffected by this file.
//
// Light/dark mode: every value below is `rgb(var(--hud-X) / <alpha-value>)` rather than a literal hex, so
// a single class like `bg-hud-panel` (or `bg-hud-red/10`, any opacity modifier) repaints for both themes
// with no changes anywhere it's used. The actual R G B numbers for each theme live in one place —
// index.css's `:root` (light) and `[data-theme="dark"]` (dark) blocks — see ThemeContext for how the
// `data-theme` attribute gets set. TopNav/scene/** (above) and the few components with their own literal
// brand colours (BrandHeader, AuthBanner, the Login/Register gradient) are unaffected either way, by design.
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: 'rgb(var(--hud-bg) / <alpha-value>)',
          // Warm base tint for the Dashboard/Community pages (see FriendlyBackground): close enough to
          // `bg` that panels and text never need their own overrides, just enough colour that the page
          // doesn't read as flat grey once the decorative wash above it has scrolled out of view.
          bgWarm: 'rgb(var(--hud-bgWarm) / <alpha-value>)',
          panel: 'rgb(var(--hud-panel) / <alpha-value>)',
          panel2: 'rgb(var(--hud-panel2) / <alpha-value>)',
          border: 'rgb(var(--hud-border) / <alpha-value>)',
          borderLight: 'rgb(var(--hud-borderLight) / <alpha-value>)',
          text: 'rgb(var(--hud-text) / <alpha-value>)',
          muted: 'rgb(var(--hud-muted) / <alpha-value>)',
          cyan: 'rgb(var(--hud-cyan) / <alpha-value>)',
          amber: 'rgb(var(--hud-amber) / <alpha-value>)',
          red: 'rgb(var(--hud-red) / <alpha-value>)',
          blue: 'rgb(var(--hud-blue) / <alpha-value>)',
          green: 'rgb(var(--hud-green) / <alpha-value>)',
          purple: 'rgb(var(--hud-purple) / <alpha-value>)',
          yellow: 'rgb(var(--hud-yellow) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'hud-glow-cyan': '0 0 12px 0 rgba(52, 152, 219, 0.35)',
        'hud-glow-amber': '0 0 12px 0 rgba(245, 166, 35, 0.35)',
      },
    },
  },
  plugins: [],
};

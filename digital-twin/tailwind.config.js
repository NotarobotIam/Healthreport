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
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#f5f5f5',
          // Warm base tint for the Dashboard/Community pages (see FriendlyBackground): close enough to
          // `bg` that panels and text never need their own overrides, just enough colour that the page
          // doesn't read as flat grey once the decorative wash above it has scrolled out of view.
          bgWarm: '#f8f7fb',
          panel: '#ffffff',
          panel2: '#f8f9fa',
          border: '#ecf0f1',
          borderLight: '#dee2e6',
          text: '#2c3e50',
          muted: '#7f8c8d',
          cyan: '#3498db',
          amber: '#f5a623',
          red: '#dc3545',
          blue: '#3b82f6',
          green: '#28a745',
          purple: '#a855f7',
          yellow: '#eab308',
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

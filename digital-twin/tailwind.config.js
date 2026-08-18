/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#05080d',
          panel: '#0a1018',
          panel2: '#0d1620',
          border: '#1c2a38',
          borderLight: '#2a3d4f',
          text: '#c9d6e0',
          muted: '#5c7080',
          cyan: '#3ee6e0',
          amber: '#f5a623',
          red: '#ef4444',
          blue: '#3b82f6',
          green: '#22c55e',
          purple: '#a855f7',
          yellow: '#eab308',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'hud-glow-cyan': '0 0 12px 0 rgba(62, 230, 224, 0.35)',
        'hud-glow-amber': '0 0 12px 0 rgba(245, 166, 35, 0.35)',
      },
    },
  },
  plugins: [],
};

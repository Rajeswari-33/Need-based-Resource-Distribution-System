/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          light: 'rgb(var(--ink-light) / <alpha-value>)',
          dark: 'rgb(var(--ink-dark) / <alpha-value>)',
        },
        paper: {
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          dim: 'rgb(var(--paper-dim) / <alpha-value>)',
        },
        marigold: {
          DEFAULT: 'rgb(var(--marigold) / <alpha-value>)',
          dark: 'rgb(var(--marigold-dark) / <alpha-value>)',
          light: 'rgb(var(--marigold-light) / <alpha-value>)',
        },
        banyan: {
          DEFAULT: 'rgb(var(--banyan) / <alpha-value>)',
          dark: 'rgb(var(--banyan-dark) / <alpha-value>)',
          light: 'rgb(var(--banyan-light) / <alpha-value>)',
        },
        clay: 'rgb(var(--clay) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(31,42,68,0.06), 0 8px 24px -12px rgba(31,42,68,0.18)',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, rgba(31,42,68,0.12) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '18px 18px',
      },
    },
  },
  plugins: [],
}

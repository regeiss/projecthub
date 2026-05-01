import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover:   'rgb(var(--color-primary-hover) / <alpha-value>)',
          light:   'rgb(var(--color-primary-light) / <alpha-value>)',
          muted:   'rgb(var(--color-primary-muted) / <alpha-value>)',
          text:    'rgb(var(--color-primary-text) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-bg-card) / <alpha-value>)',
          space:   'rgb(var(--color-bg-space) / <alpha-value>)',
          sidebar: 'rgb(var(--color-bg-sidebar) / <alpha-value>)',
        },
      },
      animation: {
        'in': 'in 150ms ease-out',
        'fade-in-0': 'fadeIn 150ms ease-out',
        'zoom-in-95': 'zoomIn95 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        zoomIn95: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config

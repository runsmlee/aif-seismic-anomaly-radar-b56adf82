import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#d6361f',
          dark: '#a81e16',
          light: '#e8895f',
          50: '#fdf4ef',
          100: '#fae2d5',
          200: '#f4c2a6',
          300: '#ec9a72',
          400: '#e0673a',
          500: '#d6361f',
          600: '#c12d1c',
          700: '#a81e16',
          800: '#8a1814',
          900: '#701512',
        },
        // Neutral charcoal override of Tailwind's blue-tinted `slate`, tuned to
        // the page ink (#0c0e13). Cuts the blue cast from every panel, border
        // and gray text in one place — no per-component edits.
        slate: {
          50: '#f7f7f8',
          100: '#ebebed',
          200: '#dcdde0',
          300: '#b4b6ba',
          400: '#8c8f95',
          500: '#6b6e74',
          600: '#4e5056',
          700: '#383a40',
          800: '#23252a',
          900: '#16171b',
          950: '#0e0f12',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

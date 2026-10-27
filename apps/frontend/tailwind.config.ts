import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'oklch(0.48 0.12 175)',
          hover: 'oklch(0.42 0.12 175)',
          active: 'oklch(0.36 0.11 175)',
          light: 'oklch(0.96 0.03 160)',
          foreground: 'oklch(1.0 0 0)',
        },
        canvas: {
          bg: 'oklch(0.98 0.005 240)',
        },
        surface: {
          card: 'oklch(1.0 0 0)',
        },
        text: {
          main: 'oklch(0.18 0.02 240)',
          muted: 'oklch(0.52 0.02 240)',
        },
        border: {
          subtle: 'oklch(0.90 0.01 240)',
          strong: 'oklch(0.82 0.01 240)',
        },
        success: 'oklch(0.55 0.18 142)',
        warning: 'oklch(0.68 0.16 75)',
        destructive: 'oklch(0.58 0.22 25)',
        info: 'oklch(0.60 0.16 230)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: [
          'Geist Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

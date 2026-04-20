import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary accent — mid teal-blue (between warm teal and deep ocean)
        teal: {
          50: '#effafb',
          100: '#cdf0f3',
          200: '#9be1e7',
          300: '#5ecad3',
          400: '#2aaebb',
          500: '#1394a2',
          600: '#0e7a8c',  // primary
          700: '#0d6475',  // hover
          800: '#0f505f',
          900: '#114250',
          950: '#082b36',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        display: [
          'Urbanist',
          'Inter',
          '-apple-system',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}

export default config

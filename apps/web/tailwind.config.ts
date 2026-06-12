import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8f0fe',
          100: '#c5d8fc',
          200: '#9dbef9',
          300: '#6fa1f5',
          400: '#4a8bf1',
          500: '#1a6ef0',
          600: '#1155c4',
          700: '#0d3f96',
          800: '#092c6b',
          900: '#051840',
        },
        gov: {
          blue:       '#0f3460',
          'blue-mid': '#1a5276',
          'blue-light':'#2e86c1',
          green:      '#1e8449',
          'green-light':'#27ae60',
          gold:       '#b7950b',
          'gold-light':'#d4ac0d',
        },
        status: {
          submitted:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
          assigned:    { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
          in_progress: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
          resolved:    { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
          closed:      { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' },
        },
        severity: {
          critical: '#dc2626',
          high:     '#ea580c',
          medium:   '#ca8a04',
          low:      '#16a34a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.12)',
        panel:   '0 0 0 1px rgb(0 0 0 / 0.06), 0 2px 8px 0 rgb(0 0 0 / 0.08)',
        sidebar: '2px 0 8px 0 rgb(0 0 0 / 0.12)',
      },
      backgroundImage: {
        'gov-gradient': 'linear-gradient(135deg, #0f3460 0%, #1a5276 50%, #2e86c1 100%)',
        'hero-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-in-out',
        'slide-in':   'slideIn 0.25s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow':  'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },                        '100%': { opacity: '1' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;

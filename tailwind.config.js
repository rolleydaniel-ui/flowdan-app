/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#09090b',
          secondary: '#0f0f12',
          elevated: '#161619',
          hover: '#1c1c20',
          surface: '#222228',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          dim: '#4f46e5',
          muted: '#312e81',
          glow: '#a5b4fc',
        },
        amber: {
          DEFAULT: '#f59e0b',
          hover: '#fbbf24',
          dim: '#d97706',
          muted: 'rgba(245,158,11,0.15)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
        },
        text: {
          primary: 'rgba(255,255,255,0.92)',
          secondary: 'rgba(255,255,255,0.60)',
          tertiary: 'rgba(255,255,255,0.40)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        'gradient-amber': 'linear-gradient(135deg, #f59e0b, #f97316)',
        'gradient-glow': 'radial-gradient(ellipse at top, rgba(99,102,241,0.08) 0%, transparent 60%)',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(99, 102, 241, 0.15)',
        'glow': '0 0 24px rgba(99, 102, 241, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{tsx,ts,html}", "./*.html"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#070709",
          secondary: "#0B0C10",
          elevated: "#111218",
          hover: "#181922",
          surface: "#1E202B",
        },
        accent: {
          DEFAULT: "#6366f1", // indigo-500
          hover: "#818cf8",   // indigo-400
          dim: "#4f46e5",     // indigo-600
          muted: "#312e81",   // indigo-900
          glow: "#a5b4fc",    // indigo-300
        },
        amber: {
          DEFAULT: "#FF9F1C",
          hover: "#FFBA52",
          dim: "#D67D0B",
          muted: "#6B3D00",
        },
        cyan: {
          DEFAULT: "#00F0FF",
          glow: "rgba(0, 240, 255, 0.4)",
        },
        success: {
          DEFAULT: "#34d399",
          dim: "#059669",
          muted: "rgba(52, 211, 153, 0.15)",
        },
        danger: {
          DEFAULT: "#f87171",
          dim: "#dc2626",
          muted: "rgba(248, 113, 113, 0.15)",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          subtle: "rgba(255, 255, 255, 0.02)",
          strong: "rgba(255, 255, 255, 0.1)",
        },
        text: {
          primary: "rgba(255, 255, 255, 0.95)",
          secondary: "rgba(255, 255, 255, 0.65)",
          tertiary: "rgba(255, 255, 255, 0.40)",
          muted: "rgba(255, 255, 255, 0.25)",
        },
      },
      fontFamily: {
        sans: ["Satoshi", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        display: ["28px", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.03em" }],
        heading: ["18px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.02em" }],
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["11px", { lineHeight: "1.3", fontWeight: "500", letterSpacing: "0.05em" }],
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, #6366f1 0%, #00F0FF 100%)",
        "gradient-amber": "linear-gradient(135deg, #FF9F1C 0%, #FF5A00 100%)",
        "gradient-glow": "radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15) 0%, transparent 60%)",
        "gradient-glass": "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "noise": `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
      },
      boxShadow: {
        "glass": "0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        "glass-hover": "0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        "inner-light": "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        "card": "0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
        "card-hover": "0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ring-pulse': 'ringPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)' },
          '50%': { opacity: '.7', boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)' },
        },
        ringPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.08)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

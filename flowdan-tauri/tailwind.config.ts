import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{tsx,ts,html}", "./*.html"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#070709", // Deepest, slightly cool-tinted space black
          secondary: "#0B0C10", // Elevated panel bg
          elevated: "#111218", // Interactive card bg
          hover: "#181922", // Card hover bg
          surface: "#1E202B", // Active states
        },
        accent: {
          DEFAULT: "#7B61FF", // Modern vibrant purple/indigo hybrid
          hover: "#9B86FF",
          dim: "#5c43dc",
          muted: "#35277F",
          glow: "#BBA8FF",
        },
        amber: {
          DEFAULT: "#FF9F1C", // Vibrant warm tangerine for accents
          hover: "#FFBA52",
          dim: "#D67D0B",
          muted: "#6B3D00",
        },
        cyan: {
          DEFAULT: "#00F0FF",
          glow: "rgba(0, 240, 255, 0.4)",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          subtle: "rgba(255, 255, 255, 0.02)",
          strong: "rgba(255, 255, 255, 0.1)",
        },
        text: {
          primary: "rgba(255, 255, 255, 0.95)", // High contrast white
          secondary: "rgba(255, 255, 255, 0.65)", // Subtitle gray
          tertiary: "rgba(255, 255, 255, 0.40)", // Meta info
          muted: "rgba(255, 255, 255, 0.25)", // Disabled state
        },
      },
      fontFamily: {
        sans: ["Satoshi", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, #7B61FF 0%, #00F0FF 100%)",
        "gradient-amber": "linear-gradient(135deg, #FF9F1C 0%, #FF5A00 100%)",
        "gradient-glow": "radial-gradient(ellipse at top, rgba(123, 97, 255, 0.15) 0%, transparent 60%)",
        "gradient-glass": "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)",
      },
      boxShadow: {
        "glow-sm": "0 0 12px rgba(123, 97, 255, 0.2)",
        "glow": "0 0 24px rgba(123, 97, 255, 0.3)",
        "card": "0 4px 12px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card-hover": "0 8px 24px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
        "amber-glow": "0 0 20px rgba(255, 159, 28, 0.2)",
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 12px rgba(123, 97, 255, 0.2)' },
          '50%': { opacity: '.7', boxShadow: '0 0 24px rgba(123, 97, 255, 0.4)' },
        },
      }
    },
  },
  plugins: [],
} satisfies Config;

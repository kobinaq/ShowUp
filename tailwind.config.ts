import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0D1F3C",
        accent: "#00C48C",
        danger: "#FF4D4D",
        warning: "#F5A623",
        app: "#F4F6F9",
        muted: "#6B7280"
      },
      fontFamily: {
        display: ["var(--font-space)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.07)"
      },
      borderRadius: {
        card: "10px"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;

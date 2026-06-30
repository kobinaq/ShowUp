import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        sidebar: "var(--sidebar)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-primary": "var(--sidebar-primary)",
        "sidebar-primary-foreground": "var(--sidebar-primary-foreground)",
        "sidebar-accent": "var(--sidebar-accent)",
        "sidebar-accent-foreground": "var(--sidebar-accent-foreground)",
        "sidebar-border": "var(--sidebar-border)",
        navy: "var(--primary)",
        accent: "var(--accent)",
        danger: "var(--destructive)",
        warning: "#F5A623",
        app: "var(--background)",
        muted: "var(--muted-foreground)"
      },
      fontFamily: {
        display: ["var(--font-space)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      boxShadow: {
        card: "var(--shadow-offset-x) var(--shadow-offset-y) var(--shadow-blur) var(--shadow-spread) color-mix(in srgb, var(--shadow-color) calc(var(--shadow-opacity) * 100%), transparent)"
      },
      borderRadius: {
        card: "var(--radius)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;

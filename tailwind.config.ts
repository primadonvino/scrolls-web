import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Themeable tokens. white/black are redefined as foreground/background
        // channels so the app's existing text-white/bg-black utilities re-map
        // per theme (light/dark/cheetah) via CSS variables in globals.css.
        white: "rgb(var(--c-white) / <alpha-value>)",
        black: "rgb(var(--c-black) / <alpha-value>)",
        scrolls: {
          black: "rgb(var(--c-bg) / <alpha-value>)",
          panel: "rgb(var(--c-panel) / <alpha-value>)",
          panel2: "rgb(var(--c-panel2) / <alpha-value>)",
          gold: "rgb(var(--c-gold) / <alpha-value>)",
          blue: "rgb(var(--c-blue) / <alpha-value>)"
        }
      },
      boxShadow: {
        glow: "0 28px 90px rgba(0, 0, 0, 0.38)"
      }
    }
  },
  plugins: []
};

export default config;

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
        scrolls: {
          black: "#020203",
          panel: "#1d1d20",
          panel2: "#29292d",
          gold: "#d6b36c",
          blue: "#0a84ff"
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

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
          black: "#050506",
          panel: "#1c1c1f",
          panel2: "#26262a",
          gold: "#c4a56a",
          blue: "#2f8cff"
        }
      },
      boxShadow: {
        glow: "0 24px 80px rgba(47, 140, 255, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;

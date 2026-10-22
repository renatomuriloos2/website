import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fx: {
          black: "#061629",
          ink: "#09203F",
          coal: "#14305A",
          steel: "#22406B",
          red: "#E53D2E",
          redDark: "#C42E22",
          mist: "#F4F5F7",
          line: "#E6E7EB",
        },
        ok: "#0E9F6E",
        warn: "#E8A317",
        bad: "#DC2626",
        info: "#2563EB",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,17,20,.04), 0 4px 16px rgba(16,17,20,.06)",
        glow: "0 0 0 1px rgba(230,60,47,.25), 0 8px 30px rgba(230,60,47,.22)",
      },
    },
  },
  plugins: [],
};

export default config;

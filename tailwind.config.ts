import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2C2A33",
        paper: "#FAF7F2",
        line: "#ECE6DD",
        muted: "#837D89",
        accent: "#3FAE8E",
        accentSoft: "#E3F5EC",
        warn: "#C15B2B",
        // Pastelne boje po app-u: svaka ima meku pozadinu (soft) i jaci ton
        mint:  { soft: "#E3F5EC", DEFAULT: "#3FAE8E" },
        sky:   { soft: "#E2F0FB", DEFAULT: "#3E92CC" },
        peach: { soft: "#FDEAD9", DEFAULT: "#E28A57" },
        lav:   { soft: "#ECE6FA", DEFAULT: "#8574C4" },
        sun:   { soft: "#FBF1D3", DEFAULT: "#C99A17" },
        rose:  { soft: "#FBE4EC", DEFAULT: "#D96A94" },
        slate2:{ soft: "#EBEEF2", DEFAULT: "#647089" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(44,42,51,0.04), 0 6px 20px rgba(44,42,51,0.06)",
        lift: "0 4px 10px rgba(44,42,51,0.08), 0 12px 30px rgba(44,42,51,0.10)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        wave: {
          "0%,100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(18deg)" },
          "75%": { transform: "rotate(-12deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
        wave: "wave 1.6s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;

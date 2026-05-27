/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080B0F",
          900: "#0B0F14",
          850: "#10151D",
          800: "#121923",
          700: "#1D2836",
          600: "#2B394B",
        },
        mint: {
          300: "#7DD3C7",
          400: "#4FC3B5",
        },
        amberline: "#F2C36B",
      },
      boxShadow: {
        "soft-glow": "0 0 0 1px rgba(125, 211, 199, 0.08), 0 24px 80px rgba(0, 0, 0, 0.28)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.58", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        scan: {
          "0%": { transform: "translateX(-80%)" },
          "100%": { transform: "translateX(180%)" },
        },
      },
      animation: {
        breathe: "breathe 1.8s ease-in-out infinite",
        scan: "scan 1.45s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};


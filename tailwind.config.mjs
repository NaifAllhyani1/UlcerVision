/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bgmain: "#0a0f1e",
        bgcard: "#162032",
        borderSubtle: "#1e3a5f",
        accentPrimary: "#00c9a7",
        accentSecondary: "#38bdf8"
      },
      fontFamily: {
        body: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['"Syne"', "system-ui", "sans-serif"]
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)", filter: "blur(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" }
        }
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out forwards",
        fadeUpDelayed: "fadeUp 0.7s ease-out 0.15s forwards",
        fadeUpLate: "fadeUp 0.8s ease-out 0.3s forwards"
      }
    }
  },
  plugins: []
};
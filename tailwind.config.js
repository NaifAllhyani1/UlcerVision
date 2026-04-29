/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Saudi Unified Design System inspired (light mode)
        accentPrimary: "#006C35",
        accentPrimaryHover: "#005A2C",
        accentSecondary: "#B88A2A",
        surface: "#FFFFFF",
        bgmain: "#F7F8FA",
        borderSubtle: "#E5E7EB",
        textPrimary: "#0F172A",
        textMuted: "#475569"
      },
      borderRadius: {
        card: "16px",
        control: "12px"
      },
      boxShadow: {
        card: "0 8px 24px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};


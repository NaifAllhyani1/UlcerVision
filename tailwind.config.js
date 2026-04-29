/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ─── GOV.SA Design System (كود المنصات) Color Tokens ─── */
      colors: {
        // Primary palette
        govsa: {
          green: "#26634B",       // Primary brand — GOV.SA green
          darkblue: "#160F3E",    // Deep navy
          blue: "#005A96",        // Secondary brand
          tiffany: "#0AEBD7",     // Accent / highlight
        },
        // Semantic aliases
        accentPrimary: "#26634B",
        accentPrimaryHover: "#1D4E3B",
        accentSecondary: "#005A96",
        surface: "#FFFFFF",
        bgmain: "#F7F8FA",
        borderSubtle: "#E0E2E6",
        textPrimary: "#160F3E",
        textMuted: "#52525B",
        // Status colors
        success: "#006604",
        warning: "#FFC107",
        danger: "#AF0818",
        // Dark mode surface layers
        dark: {
          base: "#0b0d17",
          surface: "#111827",
          elevated: "#1a2332",
          overlay: "#1e293b",
          border: "#1e293b",
          "border-light": "#2a3548",
          text: "#f1f5f9",
          "text-secondary": "#94a3b8",
          "text-muted": "#64748b",
          accent: "#34D399",
          "accent-hover": "#6EE7B7",
          "accent-dim": "rgba(52, 211, 153, 0.1)",
        },
      },
      borderRadius: {
        card: "8px",        // GOV.SA card radius
        control: "3rem",    // GOV.SA pill-shaped buttons
      },
      boxShadow: {
        card: "0 2px 8px rgba(22, 15, 62, 0.08)",
        cardHover: "0 4px 16px rgba(22, 15, 62, 0.12)",
        "dark-card": "0 2px 12px rgba(0, 0, 0, 0.4)",
        "dark-cardHover": "0 6px 24px rgba(0, 0, 0, 0.5)",
        "dark-glow": "0 0 20px rgba(52, 211, 153, 0.08)",
        "dark-glow-lg": "0 0 40px rgba(52, 211, 153, 0.12)",
      },
      fontFamily: {
        govsa: [
          '"IBM Plex Sans Arabic"',
          '"Noto Naskh Arabic"',
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

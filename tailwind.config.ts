import type { Config } from "tailwindcss";

/**
 * Mapeia os tokens do DESIGN.md (§4) para utilitários Tailwind.
 * Os valores vivem como CSS variables em globals.css (temas claro/escuro);
 * aqui só referenciamos, para que o tema troque sem recompilar classes.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-inverse": "var(--ink-inverse)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        credit: "var(--credit)",
        debit: "var(--debit)",
        committed: "var(--committed)",
        forecast: "var(--forecast)",
        ok: "var(--ok)",
        attention: "var(--attention)",
        risk: "var(--risk)",
        "ok-bg": "var(--ok-bg)",
        "attention-bg": "var(--attention-bg)",
        "risk-bg": "var(--risk-bg)",
        focus: "var(--focus)",
        "cat-1": "var(--cat-1)",
        "cat-2": "var(--cat-2)",
        "cat-3": "var(--cat-3)",
        "cat-4": "var(--cat-4)",
        "cat-5": "var(--cat-5)",
        "cat-6": "var(--cat-6)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        text: ["var(--font-text)"],
        ui: ["var(--font-ui)"],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "2px",
        md: "4px",
        pill: "999px",
      },
      boxShadow: {
        overlay: "var(--shadow-overlay)",
      },
      maxWidth: {
        content: "1200px",
        reading: "68ch",
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
      extend: {
        colors: {
          bg:        "var(--bg)",
          surface:   "var(--surface)",
          border:    "var(--border)",
          accent:    "var(--accent)",
          muted:     "var(--muted)",
          danger:    "var(--danger)",
          running:   "var(--running)",
        },
        fontFamily: {
          display: ["'Syne'", "sans-serif"],
          mono:    ["'DM Mono'", "monospace"],
        },
      },
    },
    plugins: [],
  };  
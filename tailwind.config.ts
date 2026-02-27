import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        card: "var(--card)",
        border: "var(--border)",
        foreground: "var(--foreground)",
        muted: "var(--muted-foreground)",
        primary: "var(--primary)",
        "primary-100": "var(--primary-100)",
        "primary-hover": "var(--primary-hover)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        info: "var(--info)",
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-line": "var(--chart-line)"
      },
      borderRadius: {
        card: "var(--radius)"
      },
      boxShadow: {
        focus: "var(--focus-shadow)"
      }
    }
  },
  plugins: []
};

export default config;


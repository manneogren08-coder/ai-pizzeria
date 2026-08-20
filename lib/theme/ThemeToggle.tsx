// Shared light/dark toggle button, used identically in the CRM header
// (pages/admin/index.tsx) and the Staffguide app header (pages/index.js).
// `style` lets each caller blend it into its own header's existing
// layout (gap/sizing) without forking the component.

import type { CSSProperties } from "react";
import { useTheme } from "./ThemeContext";

interface ThemeToggleProps {
  style?: CSSProperties;
}

export default function ThemeToggle({ style }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={isDark ? "Byt till ljust läge" : "Byt till mörkt läge"}
      title={isDark ? "Byt till ljust läge" : "Byt till mörkt läge"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "1px solid var(--border-input)",
        background: "var(--surface-secondary)",
        color: "var(--text)",
        borderRadius: 999,
        padding: "9px 14px",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        ...style
      }}
    >
      {isDark ? "🌙 Mörkt" : "☀️ Ljust"}
    </button>
  );
}

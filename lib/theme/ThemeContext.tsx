// Shared light/dark theme state for CRM (/admin) and the Staffguide
// app - the ONE place both surfaces read/write theme from, so there's
// no duplicated dark-mode logic between them (see ThemeToggle.tsx for
// the shared toggle UI, and pages/_document.js for the anti-flash
// script that applies the stored/system theme before React hydrates).
//
// The actual page background/colors never depend on React state - they
// come from the data-theme attribute on <html>, which the anti-flash
// script in _document.js already sets correctly before first paint.
// This context exists only so components can read the CURRENT theme
// (e.g. to show the right toggle icon/label) and change it. Because of
// that split, the lazy initial state here is intentionally always
// "light" on both server and first client render (see getSafeInitialTheme) -
// matching what SSR always produces - so React never sees a hydration
// mismatch. A one-time effect on mount corrects it to the real stored
// theme right after hydration; the DOM itself was already correct the
// whole time, so nothing visibly flashes.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "effexo_theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  if (typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Real current theme (stored choice wins, else system) - only safe to
// call on the client, after mount.
function resolveTheme(): Theme {
  return readStoredTheme() ?? readSystemTheme();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always "light" on the very first render, server AND client, so
  // hydration never mismatches - see file header comment.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // Deferred a tick (rather than calling setState directly in the
    // effect body) - queueMicrotask still runs before the browser
    // paints, so there's no visible flash, it just avoids the
    // synchronous-setState-in-effect pattern.
    queueMicrotask(() => setThemeState(resolveTheme()));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, etc.) - theme still
      // applies for this page view, just won't persist.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

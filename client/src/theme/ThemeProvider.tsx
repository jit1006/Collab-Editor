import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ThemeMode } from "../types";
import {
  THEME_STORAGE_KEY,
  applyThemeClass,
  getSystemTheme,
  nextTheme,
  parseStoredTheme,
  resolveInitialTheme,
} from "../lib/theme";

interface ThemeContextValue {
  theme: ThemeMode;
  toggle: () => void;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provides the app theme. Initializes from the same source as the index.html bootstrap
 * (stored value → system preference) so there is no mismatch, and keeps <html> + Monaco
 * in sync. Persists the user's explicit choice.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(THEME_STORAGE_KEY)
        : null;
    return resolveInitialTheme(stored, getSystemTheme());
  });

  // Apply to <html> whenever the theme changes.
  useEffect(() => {
    applyThemeClass(document, theme);
  }, [theme]);

  // Follow system changes only while the user hasn't made an explicit choice.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const stored = parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
      if (stored === null) setThemeState(getSystemTheme(mql));
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => setTheme(nextTheme(theme)), [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the current theme and controls. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

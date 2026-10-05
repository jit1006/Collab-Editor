/**
 * Pure theme logic for day/night mode.
 *
 * The resolution/toggle helpers are side-effect free so they can be unit tested. The one
 * DOM-touching helper (`applyThemeClass`) accepts an injected `Document`, keeping it
 * testable with jsdom while matching the inline bootstrap in index.html.
 */

import type { ThemeMode } from "../types";

export const THEME_STORAGE_KEY = "theme";

/** Read the OS preference. `mql` is injectable for testing. */
export function getSystemTheme(
  mql: MediaQueryList | undefined = typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : undefined,
): ThemeMode {
  return mql?.matches ? "dark" : "light";
}

/** Narrow an arbitrary stored value to a valid ThemeMode (or null). */
export function parseStoredTheme(value: string | null): ThemeMode | null {
  return value === "light" || value === "dark" ? value : null;
}

/**
 * Resolve the initial theme: an explicit stored choice wins; otherwise fall back to the
 * system preference.
 */
export function resolveInitialTheme(
  stored: string | null,
  system: ThemeMode,
): ThemeMode {
  return parseStoredTheme(stored) ?? system;
}

/** Toggle between light and dark. */
export function nextTheme(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}

/** Map our theme to the Monaco editor theme id. */
export function monacoTheme(theme: ThemeMode): "vs-dark" | "light" {
  return theme === "dark" ? "vs-dark" : "light";
}

/**
 * Apply the theme to the document root: toggles the `dark` class (Tailwind class-mode)
 * and sets `color-scheme`. Mirrors the inline bootstrap so React stays consistent.
 */
export function applyThemeClass(doc: Document, theme: ThemeMode): void {
  const root = doc.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = theme;
}

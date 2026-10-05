import { describe, it, expect, beforeEach } from "vitest";
import {
  getSystemTheme,
  parseStoredTheme,
  resolveInitialTheme,
  nextTheme,
  monacoTheme,
  applyThemeClass,
} from "../theme";

/** Build a minimal MediaQueryList stub for getSystemTheme. */
function mql(matches: boolean): MediaQueryList {
  return { matches } as MediaQueryList;
}

describe("theme logic", () => {
  describe("getSystemTheme", () => {
    it("returns dark when the media query matches", () => {
      expect(getSystemTheme(mql(true))).toBe("dark");
    });
    it("returns light when the media query does not match", () => {
      expect(getSystemTheme(mql(false))).toBe("light");
    });
  });

  describe("parseStoredTheme", () => {
    it("accepts 'light' and 'dark'", () => {
      expect(parseStoredTheme("light")).toBe("light");
      expect(parseStoredTheme("dark")).toBe("dark");
    });
    it("rejects anything else", () => {
      expect(parseStoredTheme(null)).toBeNull();
      expect(parseStoredTheme("")).toBeNull();
      expect(parseStoredTheme("blue")).toBeNull();
    });
  });

  describe("resolveInitialTheme", () => {
    it("prefers a valid stored value over the system preference", () => {
      expect(resolveInitialTheme("light", "dark")).toBe("light");
      expect(resolveInitialTheme("dark", "light")).toBe("dark");
    });
    it("falls back to system when there is no valid stored value", () => {
      expect(resolveInitialTheme(null, "dark")).toBe("dark");
      expect(resolveInitialTheme("garbage", "light")).toBe("light");
    });
  });

  describe("nextTheme", () => {
    it("toggles between light and dark", () => {
      expect(nextTheme("light")).toBe("dark");
      expect(nextTheme("dark")).toBe("light");
    });
  });

  describe("monacoTheme", () => {
    it("maps our theme to the Monaco theme id", () => {
      expect(monacoTheme("dark")).toBe("vs-dark");
      expect(monacoTheme("light")).toBe("light");
    });
  });

  describe("applyThemeClass", () => {
    beforeEach(() => {
      document.documentElement.className = "";
      document.documentElement.style.colorScheme = "";
    });

    it("adds the dark class and sets color-scheme for dark", () => {
      applyThemeClass(document, "dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe("dark");
    });

    it("removes the dark class for light", () => {
      document.documentElement.classList.add("dark");
      applyThemeClass(document, "light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe("light");
    });
  });
});

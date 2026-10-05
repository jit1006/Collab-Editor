import { describe, it, expect } from "vitest";
import { validateName, NAME_MIN, NAME_MAX } from "../validateName";

describe("validateName", () => {
  it("rejects an empty / whitespace-only name", () => {
    expect(validateName("").ok).toBe(false);
    expect(validateName("    ").ok).toBe(false);
    expect(validateName("   ").error).toMatch(/enter a name/i);
  });

  it("rejects names shorter than the minimum", () => {
    const r = validateName("a");
    expect(r.ok).toBe(false);
    expect(r.error).toContain(String(NAME_MIN));
  });

  it("rejects names longer than the maximum", () => {
    const r = validateName("x".repeat(NAME_MAX + 1));
    expect(r.ok).toBe(false);
    expect(r.error).toContain(String(NAME_MAX));
  });

  it("accepts boundary lengths (min and max)", () => {
    expect(validateName("x".repeat(NAME_MIN)).ok).toBe(true);
    expect(validateName("x".repeat(NAME_MAX)).ok).toBe(true);
  });

  it("trims surrounding whitespace and returns the canonical value", () => {
    const r = validateName("  Rahul  ");
    expect(r.ok).toBe(true);
    expect(r.value).toBe("Rahul");
  });

  it("rejects a duplicate name (case-insensitive)", () => {
    const r = validateName("rahul", ["Aman", "RAHUL"]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/already taken/i);
  });

  it("ignores whitespace when comparing duplicates", () => {
    expect(validateName("  aman ", ["Aman"]).ok).toBe(false);
  });

  it("accepts a unique valid name", () => {
    const r = validateName("Priya", ["Aman", "Rahul"]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe("Priya");
    expect(r.error).toBeUndefined();
  });

  it("treats an empty takenNames list as no conflicts", () => {
    expect(validateName("Solo").ok).toBe(true);
  });
});

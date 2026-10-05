/**
 * Deterministic per-user color assignment.
 *
 * A name maps to a stable color from a curated palette so the same user shows the same
 * color across clients. Colors are chosen to be distinguishable and legible on both
 * light and dark backgrounds.
 */

export const USER_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#d946ef", // fuchsia
  "#84cc16", // lime
] as const;

/** Simple deterministic string hash (djb2). */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

/** Pick a stable palette color for a name. */
export function colorForName(name: string): string {
  const key = name.trim().toLowerCase() || "anon";
  return USER_PALETTE[hash(key) % USER_PALETTE.length];
}

/** Up-to-two-letter initials for an avatar. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Choose black or white text for best contrast against a hex background.
 * Uses the standard relative-luminance threshold.
 */
export function contrastText(hexBg: string): "#000000" | "#ffffff" {
  const hex = hexBg.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}

/**
 * Pure display-name validation for the name gate.
 *
 * Rules (see Requirement 2):
 *  - trimmed, not empty
 *  - length between 2 and 20 characters (inclusive)
 *  - must not duplicate another active user's name in the room (case-insensitive)
 *
 * This module is intentionally free of DOM/network imports so it can be unit tested in
 * isolation.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 20;

export interface NameValidationResult {
  /** Whether the name passes all rules. */
  ok: boolean;
  /** The trimmed name (useful for the caller to store the canonical value). */
  value: string;
  /** Human-readable error when `ok` is false. */
  error?: string;
}

/**
 * Validate a candidate name against the room's taken names.
 *
 * @param raw        The raw user input.
 * @param takenNames Names already in use by *other* users in the room. Comparison is
 *                   case-insensitive and whitespace-insensitive.
 */
export function validateName(
  raw: string,
  takenNames: readonly string[] = [],
): NameValidationResult {
  const value = (raw ?? "").trim();

  if (value.length === 0) {
    return { ok: false, value, error: "Please enter a name." };
  }
  if (value.length < NAME_MIN) {
    return {
      ok: false,
      value,
      error: `Name must be at least ${NAME_MIN} characters.`,
    };
  }
  if (value.length > NAME_MAX) {
    return {
      ok: false,
      value,
      error: `Name must be at most ${NAME_MAX} characters.`,
    };
  }

  const lower = value.toLowerCase();
  const taken = new Set(takenNames.map((n) => n.trim().toLowerCase()));
  if (taken.has(lower)) {
    return {
      ok: false,
      value,
      error: "That name is already taken in this room.",
    };
  }

  return { ok: true, value };
}

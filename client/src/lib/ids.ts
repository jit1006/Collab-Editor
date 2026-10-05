/** Small id helpers. */

/** Generate a short, URL-friendly, reasonably-unique room id. */
export function generateRoomId(): string {
  // 8 base36 chars from crypto randomness, grouped for readability.
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("");
  return s.slice(0, 8);
}

/** Generate a unique id for a chat message. */
export function messageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Socket.IO layer for ephemeral room events that are not part of the CRDT document:
 *   - presence of display names (for duplicate-name validation at the name gate),
 *   - join/leave notifications,
 *   - chat messages,
 *   - shared execution output,
 *   - room settings relays (language, read-only) as a convenience broadcast.
 *
 * The authoritative document and cursors live in Yjs (see yjs.ts). This module only
 * handles discrete events that are simpler to model as messages than as CRDT state.
 */

import type { Server, Socket } from "socket.io";

interface ChatMessage {
  id: string;
  name: string;
  color: string;
  text: string;
  ts: number;
}

interface JoinPayload {
  roomId: string;
  name: string;
  color: string;
}

/** Per-room registry of active display names (lowercased) -> count. */
const roomNames = new Map<string, Map<string, number>>();

function namesForRoom(roomId: string): Map<string, number> {
  let m = roomNames.get(roomId);
  if (!m) {
    m = new Map();
    roomNames.set(roomId, m);
  }
  return m;
}

function addName(roomId: string, name: string): void {
  const m = namesForRoom(roomId);
  const key = name.trim().toLowerCase();
  m.set(key, (m.get(key) ?? 0) + 1);
}

function removeName(roomId: string, name: string): void {
  const m = namesForRoom(roomId);
  const key = name.trim().toLowerCase();
  const n = (m.get(key) ?? 0) - 1;
  if (n <= 0) m.delete(key);
  else m.set(key, n);
  if (m.size === 0) roomNames.delete(roomId);
}

function isNameTaken(roomId: string, name: string): boolean {
  return namesForRoom(roomId).has(name.trim().toLowerCase());
}

/** State we attach to each connected socket. */
interface SocketData {
  roomId?: string;
  name?: string;
  color?: string;
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;

    /**
     * Name availability check used by the name gate before joining.
     * Responds via ack with { available: boolean }.
     */
    socket.on(
      "check-name",
      (
        payload: { roomId: string; name: string },
        ack?: (res: { available: boolean }) => void,
      ) => {
        const available = !isNameTaken(payload.roomId, payload.name);
        ack?.({ available });
      },
    );

    /** Join a room after the name has been validated client-side + server check. */
    socket.on("join", (payload: JoinPayload, ack?: (res: { ok: boolean }) => void) => {
      // Reject a race where the name was taken between check and join.
      if (isNameTaken(payload.roomId, payload.name)) {
        ack?.({ ok: false });
        return;
      }
      data.roomId = payload.roomId;
      data.name = payload.name;
      data.color = payload.color;
      socket.join(payload.roomId);
      addName(payload.roomId, payload.name);

      // Notify others in the room.
      socket.to(payload.roomId).emit("user-joined", { name: payload.name });
      ack?.({ ok: true });
    });

    /** Relay a chat message to everyone in the room (including sender for consistency). */
    socket.on("chat", (msg: ChatMessage) => {
      if (!data.roomId) return;
      io.to(data.roomId).emit("chat", msg);
    });

    /** Broadcast shared execution output to the room. */
    socket.on("share-output", (payload: unknown) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit("shared-output", payload);
    });

    /** Convenience relay for room setting changes (also mirrored in Yjs roomConfig). */
    socket.on("room-setting", (payload: unknown) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit("room-setting", payload);
    });

    socket.on("disconnect", () => {
      if (data.roomId && data.name) {
        removeName(data.roomId, data.name);
        socket.to(data.roomId).emit("user-left", { name: data.name });
      }
    });
  });
}

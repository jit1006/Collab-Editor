/** Shared client types. */

export type ThemeMode = "light" | "dark";

/** A collaborator present in the room (derived from Yjs awareness states). */
export interface RoomUser {
  /** Yjs awareness client id (stable per connection). */
  clientId: number;
  name: string;
  color: string;
  typing: boolean;
  /** Last known cursor position, used for follow mode. */
  cursor?: { lineNumber: number; column: number } | null;
  /** True for the local user. */
  isSelf?: boolean;
}

/** A chat message exchanged over Socket.IO. */
export interface ChatMessage {
  id: string;
  name: string;
  color: string;
  text: string;
  /** Epoch milliseconds. */
  ts: number;
}

/** Normalized execution result returned by POST /api/execute. */
export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  code: number | null;
  time: number;
  error?: string;
}

/** Connection health shown in the top bar. */
export type ConnectionStatus = "connected" | "reconnecting" | "offline";

/** Local identity confirmed at the name gate. */
export interface Identity {
  name: string;
  color: string;
}

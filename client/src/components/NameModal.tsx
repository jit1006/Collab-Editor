import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Socket } from "socket.io-client";
import { validateName } from "../lib/validateName";
import { colorForName } from "../lib/colors";
import type { Identity } from "../types";

interface NameModalProps {
  roomId: string;
  /** Prefill from localStorage (returning users). */
  initialName: string;
  /** A socket used only for the server-side duplicate check (optional; falls back to
   *  client-side validation only when absent). */
  socket: Socket | null;
  onConfirm: (identity: Identity) => void;
}

/**
 * Full-screen name gate. Blocks the app until a valid, unique name is confirmed.
 * Combines pure client-side validation with a server-side duplicate check via Socket.IO.
 */
export function NameModal({
  roomId,
  initialName,
  socket,
  onConfirm,
}: NameModalProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);

    // 1) Pure local validation (length/empty).
    const result = validateName(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    // 2) Server-side duplicate check (authoritative within the room).
    setChecking(true);
    try {
      const available = await checkNameAvailable(socket, roomId, result.value);
      if (!available) {
        setError("That name is already taken in this room.");
        return;
      }
      onConfirm({ name: result.value, color: colorForName(result.value) });
    } finally {
      setChecking(false);
    }
  }

  const preview = colorForName(name || "anon");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-modal-title"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ background: preview }}
            aria-hidden
          >
            {"</>"}
          </span>
          <div>
            <h1
              id="name-modal-title"
              className="text-xl font-bold text-slate-900 dark:text-white"
            >
              Join the room
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Room <code className="font-mono">{roomId}</code>
            </p>
          </div>
        </div>

        <label
          htmlFor="display-name"
          className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Your display name
        </label>
        <input
          id="display-name"
          ref={inputRef}
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(undefined);
          }}
          placeholder="e.g. Rahul"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "name-error" : undefined}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && (
          <p id="name-error" role="alert" className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={checking}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
        >
          {checking ? "Joining…" : "Enter editor"}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">
          2–20 characters. Must be unique in this room.
        </p>
      </form>
    </div>
  );
}

/** Ask the server whether a name is free; resolves true if no socket (best effort). */
function checkNameAvailable(
  socket: Socket | null,
  roomId: string,
  name: string,
): Promise<boolean> {
  if (!socket) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    socket.emit("check-name", { roomId, name }, (res: { available: boolean }) =>
      done(res.available),
    );
    // Don't block forever if the server is slow/unreachable.
    setTimeout(() => done(true), 1500);
  });
}

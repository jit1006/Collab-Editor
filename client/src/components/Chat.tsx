import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "../types";

interface ChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  selfName: string;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Room chat: message list with timestamps + composer. */
export function Chat({ messages, onSend, selfName }: ChatProps) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-3" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">No messages yet. Say hi 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.name === selfName;
          return (
            <div key={m.id} className="mb-2">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: m.color }}
                >
                  {mine ? "You" : m.name}
                </span>
                <span className="text-[10px] text-slate-400">{formatTime(m.ts)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">
                {m.text}
              </p>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 dark:border-slate-700 p-2">
        <label htmlFor="chat-input" className="sr-only">
          Chat message
        </label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-slate-800 dark:text-slate-100"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}

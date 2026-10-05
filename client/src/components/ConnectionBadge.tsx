import type { ConnectionStatus } from "../types";

const MAP: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  connected: { label: "Connected", dot: "bg-green-500", text: "text-green-600 dark:text-green-400" },
  reconnecting: { label: "Reconnecting…", dot: "bg-yellow-500 animate-pulse", text: "text-yellow-600 dark:text-yellow-400" },
  offline: { label: "Offline", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
};

/** Small connection-status indicator for the top bar. */
export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const s = MAP[status];
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${s.text}`}
      role="status"
      aria-live="polite"
      aria-label={`Connection: ${s.label}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
      <span className="hidden sm:inline">{s.label}</span>
    </div>
  );
}

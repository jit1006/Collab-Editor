import type { RoomUser } from "../types";
import { contrastText, initialsFor } from "../lib/colors";

interface SidebarProps {
  users: RoomUser[];
  collapsed: boolean;
  /** Mobile drawer open state. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** Follow mode: scroll editor to this user's cursor. */
  onFollow: (user: RoomUser) => void;
}

/** Left panel: online count + active users with avatars, typing + follow. */
export function Sidebar({
  users,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onFollow,
}: SidebarProps) {
  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Online
        </h2>
        <span
          className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300"
          aria-label={`${users.length} users online`}
        >
          {users.length}
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto p-2" aria-label="Active users">
        {users.map((u) => (
          <li key={u.clientId}>
            <button
              type="button"
              onClick={() => onFollow(u)}
              title={u.cursor ? `Jump to ${u.name}'s cursor` : u.name}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: u.color, color: contrastText(u.color) }}
                aria-hidden
              >
                {initialsFor(u.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {u.name}
                  </span>
                  {u.isSelf && (
                    <span className="text-xs text-slate-400">(You)</span>
                  )}
                </span>
                {u.typing && (
                  <span className="text-xs italic text-blue-500" aria-live="polite">
                    typing…
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-2 py-4 text-center text-sm text-slate-400">
            Connecting…
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex ${
          collapsed ? "w-0" : "w-60"
        } shrink-0 overflow-hidden border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-[width] duration-200`}
        aria-hidden={collapsed}
      >
        {!collapsed && content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-800 shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

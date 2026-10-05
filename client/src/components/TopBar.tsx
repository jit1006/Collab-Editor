import { LANGUAGES } from "../lib/languages";
import type { ConnectionStatus, ThemeMode } from "../types";
import { ConnectionBadge } from "./ConnectionBadge";
import { SettingsMenu, type EditorSettings } from "./SettingsMenu";

interface TopBarProps {
  roomId: string;
  language: string;
  onLanguageChange: (id: string) => void;
  onRun: () => void;
  running: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  status: ConnectionStatus;
  onCopyInvite: () => void;
  onToggleSidebar: () => void;
  settings: EditorSettings;
  onSettingsChange: (s: EditorSettings) => void;
  onFormat: () => void;
  isOwner: boolean;
  readOnly: boolean;
  onToggleReadOnly: (v: boolean) => void;
}

/** Top bar: logo, room id + copy, language, Run, theme toggle, settings, status. */
export function TopBar(props: TopBarProps) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 transition-theme">
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={props.onToggleSidebar}
        aria-label="Toggle users panel"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        ☰
      </button>

      <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
        <span className="text-blue-500">{"</>"}</span>
        <span className="hidden sm:inline">CollabCode</span>
      </span>

      {/* Room id + copy invite */}
      <button
        type="button"
        onClick={props.onCopyInvite}
        title="Copy invite link"
        aria-label={`Room ${props.roomId}. Copy invite link`}
        className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-sm font-mono text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
      >
        <span className="opacity-60">room:</span>
        {props.roomId}
        <span aria-hidden>🔗</span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <ConnectionBadge status={props.status} />

        {/* Language dropdown */}
        <label className="sr-only" htmlFor="language-select">
          Language
        </label>
        <select
          id="language-select"
          value={props.language}
          onChange={(e) => props.onLanguageChange(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Run */}
        <button
          type="button"
          onClick={props.onRun}
          disabled={props.running}
          title="Run (Ctrl/Cmd+Enter)"
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 focus:ring-2 focus:ring-green-400"
        >
          {props.running ? "Running…" : "▶ Run"}
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={props.onToggleTheme}
          aria-label={`Switch to ${props.theme === "dark" ? "light" : "dark"} mode`}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 focus:ring-2 focus:ring-blue-500"
        >
          {props.theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* Settings */}
        <SettingsMenu
          settings={props.settings}
          onChange={props.onSettingsChange}
          onFormat={props.onFormat}
          isOwner={props.isOwner}
          readOnly={props.readOnly}
          onToggleReadOnly={props.onToggleReadOnly}
        />
      </div>
    </header>
  );
}

import { useEffect, useRef, useState } from "react";

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
}

interface SettingsMenuProps {
  settings: EditorSettings;
  onChange: (next: EditorSettings) => void;
  onFormat: () => void;
  /** Read-only toggle is only enabled for the room owner. */
  isOwner: boolean;
  readOnly: boolean;
  onToggleReadOnly: (v: boolean) => void;
}

/** Dropdown with editor settings: font size, tab size, wrap, minimap, format, read-only. */
export function SettingsMenu({
  settings,
  onChange,
  onFormat,
  isOwner,
  readOnly,
  onToggleReadOnly,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const set = (patch: Partial<EditorSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Editor settings"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 focus:ring-2 focus:ring-blue-500"
      >
        ⚙️
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-200">Font size</span>
            <div className="flex items-center gap-2">
              <button
                className="h-7 w-7 rounded bg-slate-100 dark:bg-slate-700"
                aria-label="Decrease font size"
                onClick={() => set({ fontSize: Math.max(10, settings.fontSize - 1) })}
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{settings.fontSize}</span>
              <button
                className="h-7 w-7 rounded bg-slate-100 dark:bg-slate-700"
                aria-label="Increase font size"
                onClick={() => set({ fontSize: Math.min(28, settings.fontSize + 1) })}
              >
                +
              </button>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="tab-size" className="text-sm text-slate-700 dark:text-slate-200">
              Tab size
            </label>
            <select
              id="tab-size"
              value={settings.tabSize}
              onChange={(e) => set({ tabSize: Number(e.target.value) })}
              className="rounded border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1 text-sm"
            >
              {[2, 4, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <label className="mb-2 flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
            Word wrap
            <input
              type="checkbox"
              checked={settings.wordWrap}
              onChange={(e) => set({ wordWrap: e.target.checked })}
            />
          </label>

          <label className="mb-3 flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
            Minimap
            <input
              type="checkbox"
              checked={settings.minimap}
              onChange={(e) => set({ minimap: e.target.checked })}
            />
          </label>

          <button
            onClick={onFormat}
            className="mb-2 w-full rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-sm font-medium"
          >
            Format code
          </button>

          {isOwner && (
            <label className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-sm text-slate-700 dark:text-slate-200">
              Read-only (viewers)
              <input
                type="checkbox"
                checked={readOnly}
                onChange={(e) => onToggleReadOnly(e.target.checked)}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

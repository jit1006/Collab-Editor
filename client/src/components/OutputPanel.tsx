import type { ExecuteResponse } from "../types";

interface OutputPanelProps {
  result: ExecuteResponse | null;
  running: boolean;
  stdin: string;
  onStdinChange: (v: string) => void;
  onClear: () => void;
  onShare: () => void;
  /** When true, the panel shows "shared by <name>". */
  sharedBy?: string | null;
}

/** Output view: stdout/stderr/exit code/time, with clear + share actions. */
export function OutputPanel({
  result,
  running,
  stdin,
  onStdinChange,
  onClear,
  onShare,
  sharedBy,
}: OutputPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Output
        </span>
        {result && (
          <span
            className={`text-xs font-medium ${
              result.error || (result.code ?? 0) !== 0
                ? "text-red-500"
                : "text-green-500"
            }`}
          >
            exit {result.code ?? "—"} · {result.time} ms
          </span>
        )}
        {sharedBy && (
          <span className="text-xs italic text-blue-500">shared by {sharedBy}</span>
        )}
        <div className="ml-auto flex gap-1">
          <button
            onClick={onShare}
            disabled={!result}
            className="rounded px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Share
          </button>
          <button
            onClick={onClear}
            disabled={!result}
            className="rounded px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-3 font-mono text-sm">
        {running && <p className="animate-pulse text-slate-400">Running…</p>}
        {!running && !result && (
          <p className="text-slate-400">Run your code to see output here.</p>
        )}
        {!running && result && (
          <>
            {result.error && (
              <pre className="whitespace-pre-wrap text-red-500">{result.error}</pre>
            )}
            {result.stdout && (
              <pre className="whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                {result.stdout}
              </pre>
            )}
            {result.stderr && (
              <pre className="whitespace-pre-wrap text-red-500">{result.stderr}</pre>
            )}
            {!result.error && !result.stdout && !result.stderr && (
              <p className="text-slate-400">(no output)</p>
            )}
          </>
        )}
      </div>

      {/* stdin */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-2">
        <label htmlFor="stdin" className="sr-only">
          Standard input
        </label>
        <textarea
          id="stdin"
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          placeholder="stdin (optional)…"
          rows={2}
          className="w-full resize-none rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-xs text-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
  );
}

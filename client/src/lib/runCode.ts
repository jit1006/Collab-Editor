import { getLanguage } from "./languages";
import type { ExecuteResponse } from "../types";

/**
 * Call the backend execute proxy. The server enforces a ~10s timeout; we add a slightly
 * longer client-side guard so the UI never hangs if the network stalls.
 */
export async function runCode(
  languageId: string,
  code: string,
  stdin: string,
): Promise<ExecuteResponse> {
  const lang = getLanguage(languageId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/api/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        language: lang.id,
        version: lang.version,
        code,
        stdin,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        stdout: "",
        stderr: "",
        code: null,
        time: 0,
        error: data.error ?? `Request failed (${res.status}).`,
      };
    }
    return (await res.json()) as ExecuteResponse;
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      stdout: "",
      stderr: "",
      code: null,
      time: 0,
      error: aborted ? "Request timed out." : `Network error: ${(err as Error).message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

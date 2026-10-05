/**
 * Code execution proxy supporting Judge0 CE (default) and Piston API.
 *
 * We proxy execution from the backend to:
 *  - keep upstream URLs, API keys, and rate limits server-side,
 *  - enforce hard timeouts (~10s) and normalize the response shape,
 *  - prevent CORS issues in the browser.
 */

import type { Request, Response } from "express";
import { getLanguage } from "./languages.js";

const EXECUTION_PROVIDER = process.env.EXECUTION_PROVIDER ?? "judge0";
const JUDGE0_URL = process.env.JUDGE0_URL ?? "https://ce.judge0.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY ?? "";
const PISTON_URL = process.env.PISTON_URL ?? "https://emkc.org/api/v2/piston";

/** Hard timeout for a single execution, in milliseconds. */
const EXECUTE_TIMEOUT_MS = 10_000;

/** Max accepted source size to avoid abuse (100 KB). */
const MAX_CODE_BYTES = 100 * 1024;

/** Normalized response shape returned to the client. */
export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  /** Process exit code, or null if it never ran (timeout / internal error). */
  code: number | null;
  /** Wall-clock execution time in ms (best effort). */
  time: number;
  /** Present only on timeout or proxy/upstream failure. */
  error?: string;
}

/** Shape of the body expected from the client. */
interface ExecuteBody {
  language?: string;
  version?: string;
  code?: string;
  stdin?: string;
}

/**
 * POST /api/execute
 * Body: { language, code, stdin?, version? }
 */
export async function handleExecute(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as ExecuteBody;
  const code = typeof body.code === "string" ? body.code : "";
  const stdin = typeof body.stdin === "string" ? body.stdin : "";

  if (!body.language) {
    res.status(400).json({ error: "Missing 'language'." });
    return;
  }
  if (code.trim().length === 0) {
    res.status(400).json({ error: "Nothing to run: 'code' is empty." });
    return;
  }
  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    res.status(400).json({ error: "Source too large (max 100 KB)." });
    return;
  }

  const lang = getLanguage(body.language);

  if (EXECUTION_PROVIDER === "piston") {
    await executeViaPiston(req, res, lang, code, stdin, body.version);
  } else {
    await executeViaJudge0(req, res, lang, code, stdin);
  }
}

/** Execute code via Judge0 API */
async function executeViaJudge0(
  _req: Request,
  res: Response,
  lang: ReturnType<typeof getLanguage>,
  code: string,
  stdin: string,
): Promise<void> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXECUTE_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (JUDGE0_API_KEY) {
      headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
    }

    const endpoint = `${JUDGE0_URL.replace(/\/$/, "")}/submissions?wait=true`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        language_id: lang.judge0Id,
        source_code: code,
        stdin,
      }),
    });

    const totalTime = Date.now() - started;

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      res.json({
        stdout: "",
        stderr: "",
        code: null,
        time: totalTime,
        error: `Execution service error (${upstream.status}). ${text}`.trim(),
      } satisfies ExecuteResponse);
      return;
    }

    const data = (await upstream.json()) as {
      stdout?: string | null;
      stderr?: string | null;
      compile_output?: string | null;
      message?: string | null;
      time?: string | null;
      status?: { id: number; description: string };
    };

    const runTime = data.time ? Math.round(parseFloat(data.time) * 1000) : totalTime;
    const stdout = data.stdout ?? "";
    const stderrParts = [data.compile_output, data.stderr].filter(Boolean);
    const stderr = stderrParts.join("\n").trim();

    let exitCode: number | null = 0;
    let errorMsg: string | undefined;

    const statusId = data.status?.id ?? 3;
    if (statusId === 3) {
      // Accepted
      exitCode = 0;
    } else if (statusId === 6) {
      // Compilation Error
      exitCode = 1;
    } else if (statusId === 5) {
      // Time Limit Exceeded
      exitCode = null;
      errorMsg = "Execution timed out (Time Limit Exceeded).";
    } else {
      exitCode = statusId > 0 ? 1 : null;
      errorMsg = data.message || data.status?.description || "Runtime error occurred.";
    }

    res.json({
      stdout,
      stderr,
      code: exitCode,
      time: runTime,
      ...(errorMsg ? { error: errorMsg } : {}),
    } satisfies ExecuteResponse);
  } catch (err) {
    const totalTime = Date.now() - started;
    const aborted = err instanceof Error && err.name === "AbortError";
    res.json({
      stdout: "",
      stderr: "",
      code: null,
      time: totalTime,
      error: aborted
        ? `Execution timed out after ${EXECUTE_TIMEOUT_MS / 1000}s.`
        : `Proxy error: ${(err as Error).message}`,
    } satisfies ExecuteResponse);
  } finally {
    clearTimeout(timer);
  }
}

/** Execute code via Piston API (for custom/self-hosted Piston instances) */
async function executeViaPiston(
  _req: Request,
  res: Response,
  lang: ReturnType<typeof getLanguage>,
  code: string,
  stdin: string,
  customVersion?: string,
): Promise<void> {
  const version = customVersion || lang.version;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXECUTE_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${PISTON_URL.replace(/\/$/, "")}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        language: lang.piston,
        version,
        files: [{ name: `main${lang.ext}`, content: code }],
        stdin,
      }),
    });

    const time = Date.now() - started;

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      res.json({
        stdout: "",
        stderr: "",
        code: null,
        time,
        error: `Execution service error (${upstream.status}). ${text}`.trim(),
      } satisfies ExecuteResponse);
      return;
    }

    const data = (await upstream.json()) as {
      run?: { stdout?: string; stderr?: string; code?: number | null; output?: string };
      compile?: { stdout?: string; stderr?: string; code?: number | null };
      message?: string;
    };

    if (data.message && !data.run) {
      res.json({
        stdout: "",
        stderr: "",
        code: null,
        time,
        error: data.message,
      } satisfies ExecuteResponse);
      return;
    }

    const compileErr = data.compile?.stderr?.trim();
    const run = data.run ?? {};
    res.json({
      stdout: run.stdout ?? "",
      stderr: [compileErr, run.stderr].filter(Boolean).join("\n"),
      code: run.code ?? null,
      time,
    } satisfies ExecuteResponse);
  } catch (err) {
    const time = Date.now() - started;
    const aborted = err instanceof Error && err.name === "AbortError";
    res.json({
      stdout: "",
      stderr: "",
      code: null,
      time,
      error: aborted
        ? `Execution timed out after ${EXECUTE_TIMEOUT_MS / 1000}s.`
        : `Proxy error: ${(err as Error).message}`,
    } satisfies ExecuteResponse);
  } finally {
    clearTimeout(timer);
  }
}

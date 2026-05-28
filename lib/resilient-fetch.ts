/**
 * Resilient fetch wrapper for the Supabase client (F-open-2).
 *
 * `lib/supabase.ts` previously built the client with no timeout and no retry,
 * so a transient Cloudflare/undici connect blip (the ~10 s `ConnectTimeoutError`
 * that fronts both Supabase and Anthropic) turned a single INSERT into a failed
 * run — e.g. Tolkar's `requests` insert dropping → null `request_id` → dead
 * pipeline. This adds a bounded retry-with-backoff + a per-attempt timeout,
 * mirroring the Anthropic client's `maxRetries: 5` convention.
 *
 * SAFETY — never duplicate a write:
 *   - A write (POST/PATCH/PUT/DELETE) is retried ONLY on a provably *pre-send*
 *     connection error (the request never reached the server, so no row could
 *     have been created). Ambiguous errors (e.g. ECONNRESET mid-flight, or a
 *     timeout) are NOT retried for writes.
 *   - Idempotent reads (GET/HEAD) retry on any transient network error.
 *   - HTTP error responses (incl. 5xx) are returned as-is, never retried — the
 *     caller owns that decision; retrying a 5xx write could double-insert.
 *   - Caller-initiated aborts propagate immediately (not a transient failure).
 */

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ResilientFetchOptions = {
  /** Injectable for tests; defaults to global fetch. */
  baseFetch?: FetchFn;
  /** Injectable for tests; defaults to setTimeout-based sleep. */
  sleep?: (ms: number) => Promise<void>;
  /** Total attempts including the first (default 3 = 1 try + 2 retries). */
  maxAttempts?: number;
  /** Per-attempt timeout cap in ms (default 15000). */
  timeoutMs?: number;
};

/**
 * undici error codes that prove the request never left the client (connection
 * never established) — safe to retry for ANY method, no side-effect risk.
 */
const PRESEND_CONNECT_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Pull a string error code off the error or its `cause` (how fetch wraps undici). */
function errorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const e = err as { code?: unknown; cause?: { code?: unknown } };
  if (typeof e.code === "string") return e.code;
  if (e.cause && typeof e.cause.code === "string") return e.cause.code;
  return undefined;
}

function isPresendConnectError(err: unknown): boolean {
  const code = errorCode(err);
  return code !== undefined && PRESEND_CONNECT_CODES.has(code);
}

/** 1 → 300 ms, 2 → 900 ms, 3 → 2700 ms, capped at 5 s. */
function backoffMs(attempt: number): number {
  return Math.min(300 * 3 ** (attempt - 1), 5_000);
}

export function createResilientFetch(options: ResilientFetchOptions = {}): FetchFn {
  const baseFetch = options.baseFetch ?? (fetch as FetchFn);
  const sleep = options.sleep ?? defaultSleep;
  const maxAttempts = options.maxAttempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 15_000;

  return async function resilientFetch(input, init) {
    const method = (init?.method ?? "GET").toUpperCase();
    const idempotent = IDEMPOTENT_METHODS.has(method);
    const callerSignal = init?.signal ?? undefined;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (callerSignal?.aborted) {
        throw callerSignal.reason ?? new DOMException("Aborted", "AbortError");
      }

      const controller = new AbortController();
      let timedOut = false;
      const onCallerAbort = () => controller.abort(callerSignal?.reason);
      callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException("Request timed out", "TimeoutError"));
      }, timeoutMs);

      try {
        return await baseFetch(input, { ...init, signal: controller.signal });
      } catch (err) {
        lastError = err;

        // Caller cancelled (distinct from our timeout): never a transient failure.
        if (callerSignal?.aborted && !timedOut) throw err;

        const retryable = isPresendConnectError(err) || idempotent;
        if (!retryable || attempt === maxAttempts) throw err;

        await sleep(backoffMs(attempt));
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener("abort", onCallerAbort);
      }
    }

    /* c8 ignore next 2 — loop either returns or throws above */
    throw lastError ?? new Error("resilientFetch: exhausted attempts");
  };
}

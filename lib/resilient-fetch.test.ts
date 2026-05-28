import { describe, it, expect, vi } from "vitest";
import { createResilientFetch } from "./resilient-fetch";

/** Simulate how `fetch` surfaces an undici low-level error: TypeError with .cause. */
function fetchFailed(code: string, name = "Error"): TypeError {
  const e = new TypeError("fetch failed");
  (e as unknown as { cause: unknown }).cause = { code, name };
  return e;
}
const ok = (status = 200) => new Response("ok", { status });
const noSleep = () => Promise.resolve();

describe("createResilientFetch", () => {
  it("returns the response on first success without retrying", async () => {
    const baseFetch = vi.fn().mockResolvedValue(ok(200));
    const f = createResilientFetch({ baseFetch, sleep: noSleep });
    const r = await f("https://x/y", { method: "GET" });
    expect(r.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("retries a connect-timeout then succeeds — even for a write (pre-send, no double-write risk)", async () => {
    const baseFetch = vi
      .fn()
      .mockRejectedValueOnce(fetchFailed("UND_ERR_CONNECT_TIMEOUT", "ConnectTimeoutError"))
      .mockResolvedValueOnce(ok(201));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const f = createResilientFetch({ baseFetch, sleep, maxAttempts: 3 });
    const r = await f("https://x/y", { method: "POST" });
    expect(r.status).toBe(201);
    expect(baseFetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxAttempts on a persistent pre-send connect error", async () => {
    const baseFetch = vi.fn().mockRejectedValue(fetchFailed("ECONNREFUSED"));
    const f = createResilientFetch({ baseFetch, sleep: noSleep, maxAttempts: 3 });
    await expect(f("https://x/y", { method: "POST" })).rejects.toThrow();
    expect(baseFetch).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry a write on an ambiguous (possibly post-send) error — avoid double-write", async () => {
    const baseFetch = vi.fn().mockRejectedValue(fetchFailed("ECONNRESET"));
    const f = createResilientFetch({ baseFetch, sleep: noSleep, maxAttempts: 3 });
    await expect(f("https://x/y", { method: "POST" })).rejects.toThrow();
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("DOES retry an idempotent GET on an ambiguous network error", async () => {
    const baseFetch = vi
      .fn()
      .mockRejectedValueOnce(fetchFailed("ECONNRESET"))
      .mockResolvedValueOnce(ok(200));
    const f = createResilientFetch({ baseFetch, sleep: noSleep, maxAttempts: 3 });
    const r = await f("https://x/y", { method: "GET" });
    expect(r.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it("returns HTTP error responses as-is without retrying (no double-write on 5xx)", async () => {
    const baseFetch = vi.fn().mockResolvedValue(ok(503));
    const f = createResilientFetch({ baseFetch, sleep: noSleep, maxAttempts: 3 });
    const r = await f("https://x/y", { method: "POST" });
    expect(r.status).toBe(503);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("aborts a hung attempt after timeoutMs and retries an idempotent GET", async () => {
    let calls = 0;
    const baseFetch = vi.fn().mockImplementation((_input: unknown, init?: { signal?: AbortSignal }) => {
      calls += 1;
      if (calls === 1) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject((init.signal as AbortSignal).reason ?? new Error("aborted")),
          );
        });
      }
      return Promise.resolve(ok(200));
    });
    const f = createResilientFetch({ baseFetch, sleep: noSleep, maxAttempts: 3, timeoutMs: 20 });
    const r = await f("https://x/y", { method: "GET" });
    expect(r.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the caller aborts (caller cancellation is not a transient failure)", async () => {
    const controller = new AbortController();
    const baseFetch = vi.fn().mockImplementation((_input: unknown, init?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject((init.signal as AbortSignal).reason ?? new Error("aborted")),
        );
      });
    });
    const f = createResilientFetch({ baseFetch, sleep: noSleep, maxAttempts: 3, timeoutMs: 10_000 });
    const p = f("https://x/y", { method: "GET", signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toThrow();
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });
});

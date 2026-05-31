import { readFileSync } from "node:fs";
import { describe, it, expect, beforeEach, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ from: supabaseMock.from }),
}));

import { extractUsage, recordStepMetric } from "@/lib/step-metrics";

const MIGRATION =
  "supabase/migrations/20260531000000_step_metrics_release_proof_metadata.sql";

beforeEach(() => {
  supabaseMock.insert.mockReset();
  supabaseMock.from.mockReset();
  supabaseMock.insert.mockResolvedValue({ error: null });
  supabaseMock.from.mockReturnValue({ insert: supabaseMock.insert });
});

describe("extractUsage", () => {
  it("plukkar ut alle fire token-felta frå eit fullt usage-objekt", () => {
    const u = extractUsage({
      model: "claude-sonnet-4-6",
      stop_reason: "end_turn",
      usage: {
        input_tokens: 1200,
        output_tokens: 800,
        cache_read_input_tokens: 5000,
        cache_creation_input_tokens: 300,
      },
    });
    expect(u).toEqual({
      inputTokens: 1200,
      outputTokens: 800,
      cacheReadTokens: 5000,
      cacheCreationTokens: 300,
    });
  });

  it("gjev null for manglande cache-felt (vanleg utan prompt-caching)", () => {
    const u = extractUsage({
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    expect(u.inputTokens).toBe(100);
    expect(u.outputTokens).toBe(50);
    expect(u.cacheReadTokens).toBeNull();
    expect(u.cacheCreationTokens).toBeNull();
  });

  it("gjev only null-verdiar når usage manglar heilt", () => {
    expect(extractUsage({ model: "x" })).toEqual({
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
    });
  });

  it("toler null og undefined message", () => {
    const allNull = {
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
    };
    expect(extractUsage(null)).toEqual(allNull);
    expect(extractUsage(undefined)).toEqual(allNull);
  });

  it("avviser ugyldige verdiar (negative, NaN, ikkje-tal)", () => {
    const u = extractUsage({
      usage: {
        input_tokens: -5,
        output_tokens: NaN,
        // @ts-expect-error — test av ugyldig type i runtime
        cache_read_input_tokens: "300",
        cache_creation_input_tokens: undefined,
      },
    });
    expect(u).toEqual({
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
    });
  });

  it("rundar av desimal-token til heiltal", () => {
    const u = extractUsage({ usage: { input_tokens: 1199.6 } });
    expect(u.inputTokens).toBe(1200);
  });
});

describe("step_metrics release-readiness metadata", () => {
  it("migration adds nullable safe columns, bounded checks, and release-proof comments", () => {
    const migration = readFileSync(MIGRATION, "utf8");

    for (const column of [
      "status text",
      "completed_at timestamptz",
      "error_category text",
      "retryable boolean",
      "raw_error_redacted boolean",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("step_metrics_status_check");
    expect(migration).toContain("step_metrics_error_category_check");
    expect(migration).toContain("'completed'");
    expect(migration).toContain("'model_output'");
    expect(migration).toContain("'unsupported_context'");
    expect(migration).toContain("nullable for backwards compatibility");
    expect(migration).toContain("not sufficient for release-proof");
    expect(migration).toContain("provider_message_id is intentionally omitted");
    expect(migration).toContain("must not be derived from step_messages.raw_message");
    expect(migration).not.toContain("raw_error_redacted boolean default true");
  });

  it("recordStepMetric persists safe top-level metadata without raw payloads", async () => {
    await recordStepMetric({
      runId: "run-1",
      stepName: "kontrollor",
      message: {
        model: "claude-sonnet-4-5",
        stop_reason: "end_turn",
        usage: { input_tokens: 12, output_tokens: 8 },
        // @ts-expect-error test that raw-looking runtime extras are ignored
        raw_message: { id: "msg_unsafe" },
      },
      promptVersion: "agent_d_v0.3",
      latencyMs: 123.4,
      ok: false,
      status: "failed",
      completedAt: "2026-05-31T09:00:00.000Z",
      errorCategory: "model_output",
      retryable: false,
      rawErrorRedacted: true,
    });

    expect(supabaseMock.from).toHaveBeenCalledWith("step_metrics");
    expect(supabaseMock.insert).toHaveBeenCalledTimes(1);
    const payload = supabaseMock.insert.mock.calls[0]?.[0];

    expect(payload).toMatchObject({
      run_id: "run-1",
      request_id: null,
      step_name: "kontrollor",
      model: "claude-sonnet-4-5",
      prompt_version: "agent_d_v0.3",
      input_tokens: 12,
      output_tokens: 8,
      latency_ms: 123,
      stop_reason: "end_turn",
      ok: false,
      status: "failed",
      completed_at: "2026-05-31T09:00:00.000Z",
      error_category: "model_output",
      retryable: false,
      raw_error_redacted: true,
    });
    expect(payload).not.toHaveProperty("raw_message");
    expect(payload).not.toHaveProperty("provider_message_id");
    expect(payload).not.toHaveProperty("prompt");
  });

  it("recordStepMetric keeps omitted release-readiness metadata nullable", async () => {
    await recordStepMetric({
      requestId: "request-1",
      stepName: "tolkar",
      message: { model: "claude-sonnet-4-5", stop_reason: "end_turn" },
      latencyMs: 5,
      ok: true,
    });

    const payload = supabaseMock.insert.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      status: null,
      completed_at: null,
      error_category: null,
      retryable: null,
      raw_error_redacted: null,
    });
  });
});

import { describe, it, expect } from "vitest";
import { extractUsage } from "@/lib/step-metrics";

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

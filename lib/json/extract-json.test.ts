import { describe, expect, it } from "vitest";
import { parseJsonWithFallback } from "./extract-json";

describe("parseJsonWithFallback", () => {
  it("parses clean JSON", () => {
    const result = parseJsonWithFallback('{"status":"klar"}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ status: "klar" });
  });

  it("parses fenced JSON", () => {
    const result = parseJsonWithFallback('```json\n{"status":"klar"}\n```');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe("fenced");
  });

  it("extracts JSON from prose", () => {
    const result = parseJsonWithFallback('Here is the JSON:\n{"status":"delvis_klar","kan_reknast_no":["Mu"]}\nThanks');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ status: "delvis_klar", kan_reknast_no: ["Mu"] });
  });

  it("keeps braces inside strings", () => {
    const result = parseJsonWithFallback('Tolkar:\n{"text":"value with { brace } inside","status":"klar"}\nDone');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ text: "value with { brace } inside", status: "klar" });
  });

  it("repairs trailing commas", () => {
    const result = parseJsonWithFallback('{"status":"klar",}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ status: "klar" });
  });

  it("fails safely when no JSON is present", () => {
    const result = parseJsonWithFallback("No JSON here");
    expect(result.ok).toBe(false);
  });
});

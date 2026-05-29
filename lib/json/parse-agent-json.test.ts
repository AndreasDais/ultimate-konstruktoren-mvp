import { describe, it, expect } from "vitest";
import { parseAgentJson } from "./parse-agent-json";

describe("parseAgentJson", () => {
  it("parsar rein JSON-objekt", () => {
    const r = parseAgentJson('{"results":{"M_Ed":"25 kNm"},"short_conclusion":"ok"}');
    expect(r?.short_conclusion).toBe("ok");
    expect((r?.results as Record<string, string>).M_Ed).toBe("25 kNm");
  });

  it("REGRESJON (run 516ebe3e): hentar JSON sjølv med markdown-prosa FØR objektet", () => {
    // Konstruktør B skreiv synleg 'Pre-JSON reasoning'-prosa før objektet.
    // Naiv ```json-stripping feila → jsonrepair laga ein garbage-array
    // (keys [0..20]) → results + short_conclusion gjekk tapt.
    const raw =
      "**Pre-JSON reasoning (Engineer B — independent approach)**\n" +
      "1. **Method choice:** ULS combination per EC0, then EC3-1-1 Class check...\n\n" +
      '{"results":{"tverrsnittsklasse":"Class 1","M_Ed":"194.4 kNm"},' +
      '"confidence":"high","short_conclusion":"305x165x40 UB S355 passes ULS checks."}';
    const r = parseAgentJson(raw);
    expect(r).not.toBeNull();
    expect(r?.short_conclusion).toBe("305x165x40 UB S355 passes ULS checks.");
    expect((r?.results as Record<string, string>).M_Ed).toBe("194.4 kNm");
  });

  it("handterer ```json-fence", () => {
    const r = parseAgentJson('```json\n{"confidence":"high"}\n```');
    expect(r?.confidence).toBe("high");
  });

  it("hentar objektet sjølv med prosa ETTER", () => {
    const r = parseAgentJson('{"confidence":"low"}\n\nNote: analysis complete.');
    expect(r?.confidence).toBe("low");
  });

  it("reparerer ugyldig LaTeX-escape (\\sigma) via jsonrepair-fallback", () => {
    const raw = '{"verification_notes":["\\sigma_Rd verifisert"],"confidence":"high"}';
    const r = parseAgentJson(raw);
    expect(r?.confidence).toBe("high");
  });

  it("returnerer null på garbage — INGEN falsk array-/string-lagring", () => {
    expect(parseAgentJson("**berre prosa, ingen JSON her**")).toBeNull();
    expect(parseAgentJson("[1,2,3]")).toBeNull(); // array er ikkje gyldig agent-output
    expect(parseAgentJson("")).toBeNull();
  });

  it("returnerer null på trunkert JSON (i staden for garbage)", () => {
    expect(parseAgentJson('{"results":{"M_Ed":"25')).toBeNull();
  });
});

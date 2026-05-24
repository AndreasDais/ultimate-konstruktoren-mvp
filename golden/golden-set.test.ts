import { describe, it, expect } from "vitest";
import {
  GOLDEN_CASES,
  validateGoldenSet,
  type GoldenCase,
} from "@/golden/golden-set";

describe("golden-set", () => {
  it("er strukturelt gyldig (validateGoldenSet kastar ikkje)", () => {
    expect(() => validateGoldenSet()).not.toThrow();
  });

  it("inneheld dei 15 A0-oppgåvene", () => {
    const a0 = GOLDEN_CASES.filter((c) => c.source === "A0");
    expect(a0).toHaveLength(15);
    const ids = a0.map((c) => c.id).sort();
    expect(ids).toEqual([
      "A1", "A2", "B1", "B2", "B3", "B4", "C1",
      "D1", "D2", "D3", "E1", "E2", "E3", "E4", "E5",
    ]);
  });

  it("har nøyaktig éi port2-kritisk oppgåve (E5)", () => {
    const port2 = GOLDEN_CASES.filter((c) => c.port2_kritisk);
    expect(port2.map((c) => c.id)).toEqual(["E5"]);
  });

  it("gjev kvar reknbar oppgåve ein positiv toleranse", () => {
    for (const c of GOLDEN_CASES) {
      if (c.fasit) {
        expect(c.fasit.toleranse_pct).toBeGreaterThan(0);
      }
    }
  });

  it("avdekkjer duplisert id", () => {
    const dup: GoldenCase[] = [...GOLDEN_CASES, GOLDEN_CASES[0]];
    expect(() => validateGoldenSet(dup)).toThrow(/duplisert/);
  });

  it("avdekkjer case utan fasit og utan forventa_aatferd", () => {
    const broken: GoldenCase[] = [
      { ...GOLDEN_CASES[0], fasit: null, forventa_aatferd: undefined },
    ];
    expect(() => validateGoldenSet(broken)).toThrow(/forventa_aatferd/);
  });
});

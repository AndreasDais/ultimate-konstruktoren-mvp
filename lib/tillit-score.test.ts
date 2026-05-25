import { describe, it, expect } from "vitest";
import {
  calculateTillitScore,
  tillitVisuals,
  FORMULA_VERSION,
} from "@/lib/tillit-score";

describe("calculateTillitScore — komponentar", () => {
  it("full semje + godkjent + alt rekna = 100", () => {
    const r = calculateTillitScore({
      comparison_status: "match",
      controller_verdict: "approved",
      rekna_storleikar: 4,
      spurde_storleikar: 4,
    });
    expect(r.ab_agreement).toBe(35);
    expect(r.controller_verdict).toBe(35);
    expect(r.completeness).toBe(30);
    expect(r.total).toBe(100);
  });

  it("FIKS 6: fullstendigheit straffar ikkje når alt etterspurt er rekna", () => {
    // Alt useen bad om er rekna (3 av 3) — completeness skal vere full,
    // sjølv om det finst andre kontrollar Pilar KUNNE gjort. Etter prompt-
    // fiksen tel ikkje ikkje-etterspurde storleikar med i spurde_storleikar.
    const r = calculateTillitScore({
      comparison_status: "match",
      controller_verdict: "approved_with_warnings",
      rekna_storleikar: 3,
      spurde_storleikar: 3,
    });
    expect(r.completeness).toBe(30);
  });

  it("delvis fullstendigheit: 2 av 5 etterspurde = 12", () => {
    const r = calculateTillitScore({
      comparison_status: "match",
      controller_verdict: "approved",
      rekna_storleikar: 2,
      spurde_storleikar: 5,
    });
    expect(r.completeness).toBeCloseTo(12, 5); // 30 × 2/5
    expect(r.total).toBe(82); // 35 + 35 + 12
  });

  it("avvist kontrollør gir 0 på den komponenten", () => {
    const r = calculateTillitScore({
      comparison_status: "critical_disagreement",
      controller_verdict: "rejected",
      rekna_storleikar: 0,
      spurde_storleikar: 3,
    });
    expect(r.ab_agreement).toBe(0);
    expect(r.controller_verdict).toBe(0);
    expect(r.completeness).toBe(0);
    expect(r.total).toBe(0);
  });

  it("alle comparison-statusar mappar som dokumentert", () => {
    const map: Record<string, number> = {
      match: 35,
      minor_differences: 26,
      significant_differences: 14,
      critical_disagreement: 0,
    };
    for (const [status, expected] of Object.entries(map)) {
      const r = calculateTillitScore({
        comparison_status: status as never,
        controller_verdict: "approved",
        rekna_storleikar: 1,
        spurde_storleikar: 1,
      });
      expect(r.ab_agreement).toBe(expected);
    }
  });

  it("spurde_storleikar = 0 gir completeness 0 (ingen divisjon på null)", () => {
    const r = calculateTillitScore({
      comparison_status: "match",
      controller_verdict: "approved",
      rekna_storleikar: 0,
      spurde_storleikar: 0,
    });
    expect(r.completeness).toBe(0);
    expect(Number.isFinite(r.total)).toBe(true);
  });

  it("merkar breakdown med gjeldande formel-versjon", () => {
    const r = calculateTillitScore({
      comparison_status: "match",
      controller_verdict: "approved",
      rekna_storleikar: 1,
      spurde_storleikar: 1,
    });
    expect(r.formula_version).toBe(FORMULA_VERSION);
  });
});

describe("tillitVisuals — score til label/farge", () => {
  it("terskelverdiane mappar rett", () => {
    expect(tillitVisuals(100).labelKey).toBe("high");
    expect(tillitVisuals(90).labelKey).toBe("high");
    expect(tillitVisuals(89).labelKey).toBe("good");
    expect(tillitVisuals(75).labelKey).toBe("good");
    expect(tillitVisuals(74).labelKey).toBe("medium");
    expect(tillitVisuals(50).labelKey).toBe("medium");
    expect(tillitVisuals(49).labelKey).toBe("low");
    expect(tillitVisuals(0).labelKey).toBe("low");
  });

  it("locale styrer label-språk", () => {
    expect(tillitVisuals(100, "nn").label).toBe("Høg");
    expect(tillitVisuals(100, "nb").label).toBe("Høy");
  });
});
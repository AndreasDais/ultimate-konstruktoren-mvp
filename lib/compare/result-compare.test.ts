import { describe, it, expect } from "vitest";
import {
  compareResults,
  normalizeResultKey,
  parseNumeric,
  parseNumericWithUnit,
} from "@/lib/compare/result-compare";

describe("normalizeResultKey", () => {
  it("parar skrivemåte-variantar av same nøkkel", () => {
    const variants = ["F_Ed,6.10a", "F_Ed_6_10a", "FEd6.10a", "f ed 6,10a"];
    const normed = variants.map(normalizeResultKey);
    expect(new Set(normed).size).toBe(1);
  });

  it("held distinkte nøklar distinkte", () => {
    expect(normalizeResultKey("M_Ed")).not.toBe(normalizeResultKey("M_Rd"));
    expect(normalizeResultKey("gamma_G")).not.toBe(normalizeResultKey("gamma_Q"));
  });
});

describe("parseNumeric", () => {
  it("toler norsk komma og eining-suffiks", () => {
    expect(parseNumeric("22,88 kN/m")).toBeCloseTo(22.88, 4);
  });
  it("returnerer null for ikkje-numerisk verdi", () => {
    expect(parseNumeric("lukket formel")).toBeNull();
    expect(parseNumeric(undefined)).toBeNull();
  });
});

describe("compareResults", () => {
  it("parar identiske nøklar med 0 % avvik", () => {
    const cmp = compareResults(
      { M_Ed: "54,0 kNm", V_Ed: "36,0 kN" },
      { M_Ed: "54,0 kNm", V_Ed: "36,0 kN" },
    );
    expect(cmp.paired).toHaveLength(2);
    expect(cmp.onlyA).toHaveLength(0);
    expect(cmp.onlyB).toHaveLength(0);
    for (const p of cmp.paired) expect(p.percentDiff).toBeCloseTo(0, 6);
  });

  it("F9: avrundingsformat gir bittelite avvik, ikkje semje-brot", () => {
    // 22,875 vs 22,88 — same tal, ulik avrunding. Skal vere ~0,02 %.
    const cmp = compareResults({ Ed_dim: "22,875 kN/m" }, { Ed_dim: "22,88 kN/m" });
    expect(cmp.paired).toHaveLength(1);
    expect(cmp.paired[0].percentDiff!).toBeLessThan(0.1);
    expect(cmp.paired[0].percentDiff!).toBeGreaterThan(0);
  });

  it("F1: nøkkel only A rapporterte hamnar i onlyA — ikkje som para 0 %", () => {
    const cmp = compareResults(
      { g_k: "6,0 kN/m", Ed_dim: "22,88 kN/m" },
      { Ed_dim: "22,88 kN/m" },
    );
    expect(cmp.onlyA).toEqual(["g_k"]);
    expect(cmp.paired.map((p) => p.key)).toEqual(["Ed_dim"]);
    // g_k skal ALDRI dukke opp som eit para felt
    expect(cmp.paired.some((p) => p.key === "g_k")).toBe(false);
  });

  it("F1: nøkkel only B rapporterte hamnar i onlyB", () => {
    const cmp = compareResults(
      { Ed_dim: "22,88 kN/m" },
      { Ed_dim: "22,88 kN/m", s_k: "3,5 kN/m" },
    );
    expect(cmp.onlyB).toEqual(["s_k"]);
    expect(cmp.paired).toHaveLength(1);
  });

  it("parar på tvers av skrivemåte (F_Ed_6_10a vs F_Ed,6.10a)", () => {
    const cmp = compareResults(
      { F_Ed_6_10a: "20,18 kN/m" },
      { "F_Ed,6.10a": "20,18 kN/m" },
    );
    expect(cmp.paired).toHaveLength(1);
    expect(cmp.onlyA).toHaveLength(0);
    expect(cmp.onlyB).toHaveLength(0);
  });

  it("reknar ekte relativt avvik for ulike tal", () => {
    const cmp = compareResults({ M_Rd: "20,18 kN" }, { M_Rd: "22,88 kN" });
    // |20,18-22,88| / 22,88 · 100 ≈ 11,8 %
    expect(cmp.paired[0].percentDiff!).toBeCloseTo(11.8, 1);
  });

  it("para ikkje-numerisk verdi gir percentDiff = null", () => {
    const cmp = compareResults({ metode: "lukket formel" }, { metode: "numerisk" });
    expect(cmp.paired).toHaveLength(1);
    expect(cmp.paired[0].percentDiff).toBeNull();
  });

  it("degraderer trygt på null/udefinert input", () => {
    expect(compareResults(null, null)).toEqual({ paired: [], onlyA: [], onlyB: [] });
    expect(compareResults(undefined, { x: "1" }).onlyB).toEqual(["x"]);
  });
});

// === Sprint B — unit-aware comparison ===
describe("parseNumericWithUnit", () => {
  it("parsar rein tal utan eining", () => {
    expect(parseNumericWithUnit("1,020")).toEqual({ value: 1.020, unit: null });
    expect(parseNumericWithUnit("8.5")).toEqual({ value: 8.5, unit: null });
  });

  it("parsar tal + eining-suffiks", () => {
    expect(parseNumericWithUnit("623 cm³")).toEqual({ value: 623, unit: "cm³" });
    expect(parseNumericWithUnit("22,88 kN/m")).toEqual({ value: 22.88, unit: "kN/m" });
  });

  it("parsar e-notasjon", () => {
    expect(parseNumericWithUnit("8.5e7 mm⁴")).toEqual({ value: 8.5e7, unit: "mm⁴" });
    expect(parseNumericWithUnit("1.2e-3 m")).toEqual({ value: 1.2e-3, unit: "m" });
  });

  it("parsar superskript ×10ⁿ-notasjon", () => {
    expect(parseNumericWithUnit("85.00 × 10⁶ mm⁴")).toEqual({ value: 85e6, unit: "mm⁴" });
    expect(parseNumericWithUnit("85 × 10³ mm³")).toEqual({ value: 85000, unit: "mm³" });
  });

  it("parsar caret-notasjon (10^6)", () => {
    expect(parseNumericWithUnit("85 * 10^6 mm⁴")).toEqual({ value: 85e6, unit: "mm⁴" });
  });

  it("returnerer null for ikkje-numerisk verdi", () => {
    expect(parseNumericWithUnit("Klasse 1")).toBeNull();
    expect(parseNumericWithUnit("lukket formel")).toBeNull();
    expect(parseNumericWithUnit(undefined)).toBeNull();
  });
});

describe("compareResults — unit-aware (sprint B)", () => {
  it("Test 29 fiks: cm³ vs mm³ same fysiske verdi blir 0 % avvik", () => {
    // Konstruktør A rapporterer 623 cm³, Konstruktør B 623000 mm³ — same volum.
    // Før sprint B gav dette 99,9 % flagg.
    const cmp = compareResults({ W_pl_y: "623 cm³" }, { W_pl_y: "623000 mm³" });
    expect(cmp.paired).toHaveLength(1);
    expect(cmp.paired[0].percentDiff!).toBeLessThan(0.01);
  });

  it("Test 29 fiks: mm⁴ scientific-notation vs flat mm⁴ blir korrekt avvik", () => {
    // 85.00 × 10⁶ vs 85030000 — 0,035 % avrundings-skilnad, ikkje 100 %.
    const cmp = compareResults(
      { I_y: "85.00 × 10⁶ mm⁴" },
      { I_y: "85030000 mm⁴" },
    );
    expect(cmp.paired[0].percentDiff!).toBeLessThan(0.1);
    expect(cmp.paired[0].percentDiff!).toBeGreaterThan(0);
  });

  it("kN vs N — same force ulik eining gir 0 %", () => {
    const cmp = compareResults({ V_Ed: "125,9 kN" }, { V_Ed: "125900 N" });
    expect(cmp.paired[0].percentDiff!).toBeLessThan(0.001);
  });

  it("MPa vs N/mm² — synonyme einingar gir 0 %", () => {
    const cmp = compareResults({ f_y: "355 MPa" }, { f_y: "355 N/mm²" });
    expect(cmp.paired[0].percentDiff!).toBeLessThan(0.001);
  });

  it("kNm vs Nmm — momenteining-konvertering", () => {
    // 1 kNm = 1 000 000 Nmm
    const cmp = compareResults({ M_Ed: "1 kNm" }, { M_Ed: "1000000 Nmm" });
    expect(cmp.paired[0].percentDiff!).toBeLessThan(0.001);
  });

  it("fallback: ulik familie → rå-tal-samanlikning (eksisterande åtferd)", () => {
    // mm vs kg er meiningslaust å konvertere — bruk rå tal.
    const cmp = compareResults({ x: "10 mm" }, { x: "10 kg" });
    expect(cmp.paired[0].percentDiff).toBeCloseTo(0, 6);
  });

  it("fallback: ukjend eining → rå-tal-samanlikning", () => {
    const cmp = compareResults({ x: "5 widgets" }, { x: "5 gadgets" });
    expect(cmp.paired[0].percentDiff).toBeCloseTo(0, 6);
  });

  it("fallback: éin side utan eining → rå-tal-samanlikning", () => {
    const cmp = compareResults({ utnyttingsgrad: "0,854" }, { utnyttingsgrad: "0,854 -" });
    expect(cmp.paired[0].percentDiff).toBeCloseTo(0, 6);
  });

  it("eksisterande F9-test held: 22,875 kN/m vs 22,88 kN/m gir bittelite avvik", () => {
    // Same eining, rein-tal-sti — sprint B skal ikkje regressere på dette.
    const cmp = compareResults({ Ed_dim: "22,875 kN/m" }, { Ed_dim: "22,88 kN/m" });
    expect(cmp.paired[0].percentDiff!).toBeLessThan(0.1);
    expect(cmp.paired[0].percentDiff!).toBeGreaterThan(0);
  });
});
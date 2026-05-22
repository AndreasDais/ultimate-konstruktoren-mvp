import { describe, it, expect } from "vitest";
import {
  compareResults,
  normalizeResultKey,
  parseNumeric,
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

  it("F1: nøkkel berre A rapporterte hamnar i onlyA — ikkje som para 0 %", () => {
    const cmp = compareResults(
      { g_k: "6,0 kN/m", Ed_dim: "22,88 kN/m" },
      { Ed_dim: "22,88 kN/m" },
    );
    expect(cmp.onlyA).toEqual(["g_k"]);
    expect(cmp.paired.map((p) => p.key)).toEqual(["Ed_dim"]);
    // g_k skal ALDRI dukke opp som eit para felt
    expect(cmp.paired.some((p) => p.key === "g_k")).toBe(false);
  });

  it("F1: nøkkel berre B rapporterte hamnar i onlyB", () => {
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
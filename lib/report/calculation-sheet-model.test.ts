import { describe, it, expect } from "vitest";
import { normalizeFormulaLatex } from "@/lib/report/calculation-sheet-model";

describe("normalizeFormulaLatex — eksponent med parentes (Fiks 1)", () => {
  it("gjer fck^(2/3) om til ^{2/3}, ikkje brøk", () => {
    const ut = normalizeFormulaLatex("0,30 \\cdot fck^(2/3)");
    expect(ut).toContain("^{2/3}");
    expect(ut).not.toContain("\\frac{2}{3}");
  });

  it("handterer ^(1/3)", () => {
    expect(normalizeFormulaLatex("35^(1/3)")).toContain("^{1/3}");
  });
});

describe("normalizeFormulaLatex — brøk, trygge tilfelle (Fiks 2)", () => {
  it("konverterer tal / tal til \\frac", () => {
    const ut = normalizeFormulaLatex("225,3 / 175,5");
    expect(ut).toContain("\\frac{225{,}3}{175{,}5}");
  });

  it("konverterer enkelt symbol / symbol til \\frac", () => {
    const ut = normalizeFormulaLatex("fctm / fyk");
    expect(ut).toMatch(/\\frac\{.*\}\{.*\}/);
  });

  it("rører IKKJE ein eksponent-teljar — L^2/8 blir ikkje brøk", () => {
    // L^2/8 tyder (L^2)/8. "2/8" skal IKKJE bli \frac{2}{8}.
    const ut = normalizeFormulaLatex("qEd \\cdot L^2/8");
    expect(ut).not.toContain("\\frac{2}{8}");
  });

  it("rører IKKJE skiljeteikn i max(a ; b)", () => {
    const ut = normalizeFormulaLatex("max(225,3 ; 175,5)");
    expect(ut).toContain(";");
    expect(ut).not.toContain("\\frac");
  });

  it("lèt ordet 'Ledd' stå — berre tala blir brøk", () => {
    const ut = normalizeFormulaLatex("Ledd 1 / Ledd 2 = 225,3 / 175,5");
    // Tal-paret blir brøk; "Ledd 1 / Ledd 2" er ord+tal, ikkje rein tal/tal.
    expect(ut).toContain("Ledd");
  });
});

describe("normalizeFormulaLatex — einings-vakt", () => {
  it("gjer IKKJE kN/m om til \\frac (det er ei eining)", () => {
    const ut = normalizeFormulaLatex("6,0 kN/m");
    expect(ut).not.toContain("\\frac{kN}");
    expect(ut).toContain("kN/m");
  });

  it("gjer IKKJE N/mm2 om til \\frac", () => {
    const ut = normalizeFormulaLatex("Ed i N/mm2");
    expect(ut).not.toContain("\\frac");
  });
});

describe("normalizeFormulaLatex — Unicode-eksponent (Fiks 3)", () => {
  it("gjer 3,2711² om til 3,2711^2", () => {
    expect(normalizeFormulaLatex("3,2711²")).toContain("^2");
  });
});

describe("normalizeFormulaLatex — rører ikkje gyldig LaTeX", () => {
  it("let etablert symbol-normalisering stå (MEd -> M_{Ed})", () => {
    expect(normalizeFormulaLatex("MEd = 25")).toContain("M_{Ed}");
  });

  it("toler tom input", () => {
    expect(normalizeFormulaLatex("")).toBe("");
  });
});

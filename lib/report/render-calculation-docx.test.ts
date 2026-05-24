import { describe, it, expect } from "vitest";
import { mathRuns } from "@/lib/report/render-calculation-docx";

/**
 * mathRuns gjev docx TextRun[] — XML-objekt som fyrst serialiserer tekst
 * ved Document-prep. Vi kan difor ikkje lese ut tekst-innhaldet direkte.
 * Testane sjekkar det som ER robust observerbart: tal på runs og at
 * funksjonen aldri kastar. Kjernefiksen — at aligned-blokker ikkje
 * kollapsar — viser seg som FLEIRE runs (parsaren delar opp), ikkje éin
 * stor rå-streng.
 */
describe("mathRuns — Word-formelparsar", () => {
  it("gjev minst éin run for ein enkel formel", () => {
    expect(mathRuns("z = 413,4").length).toBeGreaterThan(0);
  });

  it("ei aligned-blokk blir parsa, ikkje dumpa som éin rå-run", () => {
    // Kollaps-feilen gav 1 run med heile rå LaTeX-strengen. Ein parsa
    // blokk gjev mange runs (token-for-token + linjeskift).
    const latex =
      "\\begin{aligned} \\xi &= 1 - \\sqrt{1 - 2\\mu} \\\\ " +
      "z &= 413,4 \\\\ \\omega &= 0,16 \\end{aligned}";
    expect(mathRuns(latex).length).toBeGreaterThan(5);
  });

  it("lagar w:br-linjeskift for \\\\ (aligned-linjer)", () => {
    // Kvar \\ skal bli eit Word-linjeskift (w:br) i formel-boksen.
    const runs = mathRuns("a = 1 \\\\ b = 2 \\\\ c = 3");
    const brot = runs.filter((r) =>
      JSON.stringify(r).includes('"w:br"'),
    ).length;
    expect(brot).toBeGreaterThanOrEqual(2);
  });

  it("handterer \\frac utan å kaste", () => {
    expect(() => mathRuns("\\frac{35}{1,5}")).not.toThrow();
    expect(mathRuns("\\frac{35}{1,5}").length).toBeGreaterThan(0);
  });

  it("handterer subscript X_{ledd} og superscript x^{2}", () => {
    expect(() => mathRuns("E_{d,dim} = d^{2}")).not.toThrow();
  });

  it("degraderer ukjend kommando utan å kaste", () => {
    expect(() => mathRuns("\\ukjentkommando x = 1")).not.toThrow();
  });

  it("toler tom og whitespace-input", () => {
    expect(() => mathRuns("")).not.toThrow();
    expect(() => mathRuns("   ")).not.toThrow();
  });
});

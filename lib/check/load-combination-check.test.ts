import { describe, it, expect } from "vitest";
import { checkLoadCombination } from "@/lib/check/load-combination-check";

// Tolkar-utdrag for ei A2-aktig oppgåve: G=6, Q=8 (nyttelast), S=3,5 (snø).
// Korrekt STR-kombinasjon: 22,875 (6.10b, nyttelast leiande).
const A2_REVIEW = {
  calculation_type: "lastkombinasjon",
  lastkombinasjon_input: {
    permanent: [{ name: "g", value: 6.0, unit: "kN/m" }],
    variable: [
      { name: "q", value: 8.0, unit: "kN/m", category: "imposed_A_D" },
      { name: "s", value: 3.5, unit: "kN/m", category: "snow" },
    ],
  },
};

const outWithEd = (ed: string) => ({ results: { Ed_dim: ed } });

describe("checkLoadCombination", () => {
  it("flaggar A2-feilen: konstruktør rapporterer 23,78 (ekv. 6.10)", () => {
    const dev = checkLoadCombination(A2_REVIEW, outWithEd("23,78 kN/m"), outWithEd("22,9 kN/m"));
    expect(dev).toHaveLength(1);
    expect(dev[0].agent).toBe("A");
    expect(dev[0].reported).toBeCloseTo(23.78, 2);
    expect(dev[0].correct).toBeCloseTo(22.875, 3);
    expect(dev[0].governingEq).toBe("6.10b");
  });

  it("godkjenner korrekt Ed_dim (22,9 mot 22,875 — innan toleranse)", () => {
    const dev = checkLoadCombination(A2_REVIEW, outWithEd("22,9 kN/m"), outWithEd("22,875 kN/m"));
    expect(dev).toHaveLength(0);
  });

  it("flaggar begge konstruktørar når begge bommar", () => {
    const dev = checkLoadCombination(A2_REVIEW, outWithEd("23,78 kN/m"), outWithEd("25,35 kN/m"));
    expect(dev).toHaveLength(2);
  });

  it("hoppar over når calculation_type ikkje er lastkombinasjon", () => {
    const review = { ...A2_REVIEW, calculation_type: "stalkapasitet" };
    expect(checkLoadCombination(review, outWithEd("23,78"), outWithEd("23,78"))).toHaveLength(0);
  });

  it("hoppar over når lastkombinasjon_input manglar", () => {
    const review = { calculation_type: "lastkombinasjon" };
    expect(checkLoadCombination(review, outWithEd("999"), outWithEd("999"))).toHaveLength(0);
  });

  it("degraderer trygt ved ugyldig lastkategori frå Tolkar", () => {
    const review = {
      calculation_type: "lastkombinasjon",
      lastkombinasjon_input: {
        permanent: [{ value: 6.0 }],
        variable: [{ value: 8.0, category: "jordskjelv" }],
      },
    };
    expect(checkLoadCombination(review, outWithEd("999"), outWithEd("999"))).toHaveLength(0);
  });

  it("ingen avvik når konstruktøren ikkje rapporterte Ed_dim", () => {
    const noEd = { results: { M_Ed: "100 kNm" } };
    expect(checkLoadCombination(A2_REVIEW, noEd, noEd)).toHaveLength(0);
  });

  it("toler norsk komma og eining i Ed_dim", () => {
    const dev = checkLoadCombination(A2_REVIEW, outWithEd("22,88 kN/m"), outWithEd("22,9 kN/m"));
    expect(dev).toHaveLength(0); // 22,88 ≈ 22,875
  });
});

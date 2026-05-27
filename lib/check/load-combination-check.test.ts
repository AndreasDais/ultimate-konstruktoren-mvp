import { describe, it, expect } from "vitest";
import { checkLoadCombination } from "@/lib/check/load-combination-check";
import { resolveFactorSet } from "@/lib/profiles/standards-basis";

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

// Engineer-output der dimensjonerande verdi ligg under ein vald,
// ikkje-kanonisk nøkkel — med result_roles som taggar rolla (FIKS 4).
const outWithRole = (key: string, value: string) => ({
  results: { [key]: value },
  result_roles: { [key]: "dimensjonerande" },
});

describe("checkLoadCombination", () => {
  it("flags A2-feilen: konstruktør rapporterer 23,78 (ekv. 6.10)", () => {
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

  it("flags begge engineers når begge bommar", () => {
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
  // --- FIKS 12: Port-2-herding -- rolle-basert oppslag av dimensjonerande nokkel ---

  it("flags A2-feilen sjolv nar dimensjonerande verdi ligg under ikkje-kanonisk nokkel", () => {
    // Konstruktor rapporterer under "F_Ed", ikkje "Ed_dim". result_roles taggar
    // han "dimensjonerande" -> Port-2-porten skal framleis fyre.
    const dev = checkLoadCombination(
      A2_REVIEW,
      outWithRole("F_Ed", "23,78 kN/m"),
      outWithRole("F_Ed", "22,9 kN/m"),
    );
    expect(dev).toHaveLength(1);
    expect(dev[0].agent).toBe("A");
    expect(dev[0].reported).toBeCloseTo(23.78, 2);
  });

  it("godkjenner korrekt verdi via rolle-oppslag (ikkje-kanonisk nokkel)", () => {
    const dev = checkLoadCombination(
      A2_REVIEW,
      outWithRole("F_Ed", "22,875 kN/m"),
      outWithRole("F_Ed", "22,9 kN/m"),
    );
    expect(dev).toHaveLength(0);
  });

  it("Ed_dim har forrang sjolv nar result_roles har fleire dimensjonerande", () => {
    // Ed_dim-forrangen kortsluttar fleire-dimensjonerande-regelen -> les rett
    // verdi (22,9) -> ingen avvik.
    const out = {
      results: { Ed_dim: "22,9 kN/m", F_anna: "40 kN/m" },
      result_roles: { Ed_dim: "dimensjonerande", F_anna: "dimensjonerande" },
    };
    expect(checkLoadCombination(A2_REVIEW, out, out)).toHaveLength(0);
  });

  it("hoppar over nar fleire result_roles-noklar er dimensjonerande og ingen Ed_dim", () => {
    const out = {
      results: { F_a: "23,78 kN/m", F_b: "25,0 kN/m" },
      result_roles: { F_a: "dimensjonerande", F_b: "dimensjonerande" },
    };
    expect(checkLoadCombination(A2_REVIEW, out, out)).toHaveLength(0);
  });
});

describe("checkLoadCombination - internasjonale faktorsett", () => {
  const GENERAL_REVIEW = {
    calculation_type: "lastkombinasjon",
    lastkombinasjon_input: {
      permanent: [{ name: "G", value: 300, unit: "kN" }],
      variable: [{ name: "Q", value: 200, unit: "kN", category: "imposed_A_D" }],
    },
  };
  const general = resolveFactorSet("eurocode_general");

  it("eurocode_general: korrekt EN-verdi (644,25) gjev ingen avvik", () => {
    const dev = checkLoadCombination(
      GENERAL_REVIEW,
      outWithEd("644,25 kN"),
      outWithEd("644,25 kN"),
      general,
    );
    expect(dev).toHaveLength(0);
  });

  it("eurocode_general: norsk verdi (660) blir flagga som avvik", () => {
    const dev = checkLoadCombination(
      GENERAL_REVIEW,
      outWithEd("660 kN"),
      outWithEd("644,25 kN"),
      general,
    );
    expect(dev).toHaveLength(1);
    expect(dev[0].agent).toBe("A");
    expect(dev[0].correct).toBeCloseTo(644.25, 2);
  });

  it("eurocode_general + snolast: strukturkontroll hoppa over", () => {
    const dev = checkLoadCombination(
      A2_REVIEW,
      outWithEd("999 kN/m"),
      outWithEd("999 kN/m"),
      general,
    );
    expect(dev).toHaveLength(0);
  });

  it("null faktorsett (UK NA / AISC): strukturkontroll hoppa over", () => {
    const dev = checkLoadCombination(
      GENERAL_REVIEW,
      outWithEd("999 kN"),
      outWithEd("999 kN"),
      null,
    );
    expect(dev).toHaveLength(0);
  });
});

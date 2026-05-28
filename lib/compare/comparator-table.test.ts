import { describe, it, expect } from "vitest";
import { buildComparatorTable } from "./comparator-table";

describe("buildComparatorTable", () => {
  it("BUG-repro: parar A og B sjølv når B stavar nøkkelen annleis (komma vs understrek)", () => {
    // Rota til feilen: Mission Control bygde tabellen med rå teikn-eksakt
    // oppslag (resultsB[field]). Når Konstruktør B skreiv «A_s,req» og
    // Konstruktør A skreiv «A_s_req» for SAME storleik, bomma oppslaget og
    // B-kolonnen fall til «—», medan A alltid vart vist.
    const table = buildComparatorTable(
      { A_s_req: "1200 mm²", M_Ed: "54 kNm" },
      { "A_s,req": "1200 mm²", M_Ed: "54 kNm" },
      [],
    );
    expect(table.rows).toHaveLength(2);
    expect(table.rows.every((r) => r.kind === "paired")).toBe(true);
    // B-verdien skal vere der — ikkje «—»
    expect(table.rows.every((r) => r.valueB !== "—")).toBe(true);
    const asReq = table.rows.find((r) => r.field === "A_s_req");
    expect(asReq?.valueB).toBe("1200 mm²");
  });

  it("reknar ekte avvik for para nøklar, eining-aware (kN vs N)", () => {
    const table = buildComparatorTable(
      { V_Ed: "125,9 kN" },
      { V_Ed: "125900 N" }, // same kraft, ulik eining
      [],
    );
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].percentDiff).not.toBeNull();
    expect(table.rows[0].percentDiff!).toBeLessThan(0.001);
    expect(table.maxPercentDiff).toBeLessThan(0.001);
  });

  it("nøkkel berre A rapporterte blir only_a-rad med «—» på B — IKKJE eit falskt 0 %-avvik", () => {
    const table = buildComparatorTable({ g_k: "6 kN/m" }, {}, []);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].kind).toBe("only_a");
    expect(table.rows[0].valueA).toBe("6 kN/m");
    expect(table.rows[0].valueB).toBe("—");
    expect(table.rows[0].percentDiff).toBeNull(); // ikkje 0
  });

  it("nøkkel berre B rapporterte blir only_b-rad med «—» på A", () => {
    const table = buildComparatorTable({}, { s_k: "3,5 kN/m" }, []);
    expect(table.rows[0].kind).toBe("only_b");
    expect(table.rows[0].valueA).toBe("—");
    expect(table.rows[0].valueB).toBe("3,5 kN/m");
  });

  it("para rader kjem før upara, og det heile blir kappa til limit", () => {
    const a = { k1: "1", k2: "2", k3: "3", onlyA1: "9" };
    const b = { k1: "1", k2: "2", k3: "3", onlyB1: "8" };
    const table = buildComparatorTable(a, b, [], 3);
    expect(table.rows).toHaveLength(3);
    expect(table.rows.every((r) => r.kind === "paired")).toBe(true);
  });

  it("tek severity frå Samanliknaren via normalisert nøkkel, men percentDiff er kode-rekna", () => {
    const table = buildComparatorTable(
      { M_Ed: "50 kNm" },
      { "M.Ed": "60 kNm" }, // ulik staving + ulik verdi
      [{ field: "M_Ed", percent_diff: 999, severity: "high" }],
    );
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].kind).toBe("paired");
    expect(table.rows[0].severity).toBe("high");
    // kode-rekna 16,7 %, ikkje LLM sin 999
    expect(table.rows[0].percentDiff!).toBeCloseTo(16.7, 1);
  });

  it("tel para nøklar og dei over terskel (>= 5 %)", () => {
    const table = buildComparatorTable(
      { a: "100 kN", b: "100 kN", c: "100 kN" },
      { a: "100 kN", b: "110 kN", c: "200 kN" },
      [],
    );
    expect(table.pairedCount).toBe(3);
    // b: 9,1 %, c: 50 % → 2 over terskel; a: 0 %
    expect(table.aboveThresholdCount).toBe(2);
  });

  it("allAgree er sann berre når alle para er 0 % og ingen upara nøklar finst", () => {
    expect(buildComparatorTable({ x: "5 kN" }, { x: "5 kN" }, []).allAgree).toBe(true);
    expect(buildComparatorTable({ x: "5 kN" }, { x: "6 kN" }, []).allAgree).toBe(false);
    // y er berre rapportert av A → ikkje full semje
    expect(buildComparatorTable({ x: "5 kN", y: "1" }, { x: "5 kN" }, []).allAgree).toBe(false);
  });

  it("degraderer trygt på tomme/null input", () => {
    const table = buildComparatorTable({}, {}, []);
    expect(table.rows).toEqual([]);
    expect(table.allAgree).toBe(false);
    expect(table.maxPercentDiff).toBe(0);
    expect(buildComparatorTable(null, undefined).rows).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { compareResults } from "./result-compare";
import { reconcileNumericDifferences } from "./reconcile-numeric-differences";

describe("reconcileNumericDifferences", () => {
  // paired: M_Ed (0 %), V_Ed (~9 %); onlyA: g_k
  const cmp = compareResults(
    { M_Ed: "25 kNm", V_Ed: "20 kN", g_k: "6 kN/m" },
    { M_Ed: "25 kNm", V_Ed: "22 kN" },
  );

  it("droppar HALLUSINERTE felt (verken para eller upara nøkkel)", () => {
    const rows = reconcileNumericDifferences(
      [{ field: "X_phantom", agent_a_value: "999", agent_b_value: "111", percent_diff: 88, severity: "critical" }],
      cmp,
    );
    expect(rows).toHaveLength(0);
  });

  it("droppar upara nøkkel (berre A rapporterte g_k)", () => {
    const rows = reconcileNumericDifferences(
      [{ field: "g_k", agent_a_value: "6 kN/m", agent_b_value: "-", percent_diff: 0 }],
      cmp,
    );
    expect(rows).toHaveLength(0);
  });

  it("held para nøkkel og overstyrer A/B + percent_diff med kode-fasit", () => {
    const rows = reconcileNumericDifferences(
      [{ field: "V_Ed", agent_a_value: "WRONG", agent_b_value: "WRONG", percent_diff: 999, severity: "low" }],
      cmp,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].agent_a_value).toBe("20 kN");
    expect(rows[0].agent_b_value).toBe("22 kN");
    expect(rows[0].percent_diff!).toBeGreaterThan(8);
    expect(rows[0].percent_diff!).toBeLessThan(10);
    expect(rows[0].severity).toBe("low"); // behaldne felt frå LLM
  });

  it("parar LLM-felt med ulik staving mot para nøkkel (M.Ed -> M_Ed)", () => {
    const rows = reconcileNumericDifferences(
      [{ field: "M.Ed", agent_a_value: "x", agent_b_value: "y", percent_diff: 50 }],
      cmp,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].agent_a_value).toBe("25 kNm");
    expect(rows[0].percent_diff).toBe(0);
  });

  it("ikkje-array input gir tom liste", () => {
    expect(reconcileNumericDifferences(null, cmp)).toEqual([]);
    expect(reconcileNumericDifferences(undefined, cmp)).toEqual([]);
  });
});

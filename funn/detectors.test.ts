import { describe, it, expect } from "vitest";
import {
  detectF1,
  detectF9,
  detectF10,
  detectF16,
  runAllDetectors,
} from "@/funn/detectors";
import type { RunRecord } from "@/lib/runrecord";

/** Minimal RunRecord-stomn — testane overstyrer berre felta dei treng. */
function runRecord(overrides: Partial<RunRecord>): RunRecord {
  return {
    run_id: "test-run",
    run_type: "golden",
    run_status: "completed",
    calculation_type: null,
    started_at: null,
    completed_at: null,
    request: null,
    tolkar: null,
    konstruktor_a: null,
    konstruktor_b: null,
    samanliknar: null,
    kontrollor: null,
    rapportor: null,
    steg_metrikkar: [],
    ...overrides,
  };
}

describe("detectF1 — upara noekkel vist som 0,0 % avvik", () => {
  it("utloeyser naar ein numeric_differences-rad er ein upara noekkel", () => {
    const r = detectF1(
      runRecord({
        samanliknar: {
          unpaired_keys: { only_a: ["V_Ed"], only_b: [] },
          numeric_differences: [{ field: "V_Ed", percent_diff: 0 }],
        },
      }),
    );
    expect(r.utloyst).toBe(true);
    expect(r.bevis).toContain("V_Ed");
  });

  it("utloeyser ikkje naar avvik-radene er ekte para noeklar", () => {
    const r = detectF1(
      runRecord({
        samanliknar: {
          unpaired_keys: { only_a: ["V_Ed"], only_b: [] },
          numeric_differences: [{ field: "M_Ed", percent_diff: 1.2 }],
        },
      }),
    );
    expect(r.utloyst).toBe(false);
  });

  it("degraderer trygt utan unpaired_keys", () => {
    expect(detectF1(runRecord({ samanliknar: {} })).utloyst).toBe(false);
    expect(detectF1(runRecord({})).utloyst).toBe(false);
  });
});

describe("detectF9 — minor_differences utan reelle avvik", () => {
  it("utloeyser naar alle avvik er 0,0 %", () => {
    const r = detectF9(
      runRecord({
        samanliknar: {
          match_status: "minor_differences",
          numeric_differences: [
            { field: "M_Ed", percent_diff: 0 },
            { field: "V_Ed", percent_diff: 0 },
          ],
        },
      }),
    );
    expect(r.utloyst).toBe(true);
  });

  it("utloeyser ikkje naar minst eitt avvik er reelt", () => {
    const r = detectF9(
      runRecord({
        samanliknar: {
          match_status: "minor_differences",
          numeric_differences: [{ field: "M_Ed", percent_diff: 3.1 }],
        },
      }),
    );
    expect(r.utloyst).toBe(false);
  });

  it("utloeyser ikkje naar match_status er match", () => {
    const r = detectF9(
      runRecord({ samanliknar: { match_status: "match", numeric_differences: [] } }),
    );
    expect(r.utloyst).toBe(false);
  });
});

describe("detectF10 — ikkje-dimensjonerande verdi vist som tile", () => {
  it("utloeyser naar result_roles er sett men ingen er dimensjonerande", () => {
    const r = detectF10(
      runRecord({
        konstruktor_a: {
          structured_output: {
            results: { f_cd: "19,8", gamma_c: "1,5" },
            result_roles: { f_cd: "mellomledd", gamma_c: "input" },
          },
        },
      }),
    );
    expect(r.utloyst).toBe(true);
  });

  it("utloeyser ikkje naar minst éin noekkel er dimensjonerande", () => {
    const r = detectF10(
      runRecord({
        konstruktor_a: {
          structured_output: {
            results: { M_Ed: "54,0", gamma_c: "1,5" },
            result_roles: { M_Ed: "dimensjonerande", gamma_c: "input" },
          },
        },
      }),
    );
    expect(r.utloyst).toBe(false);
  });

  it("degraderer trygt utan result_roles", () => {
    expect(detectF10(runRecord({})).utloyst).toBe(false);
  });
});

describe("detectF16 — relevant_ikkje_stotta med kan-reknast-tag", () => {
  it("utloeyser naar can_calculate er ikkje-tom", () => {
    const r = detectF16(
      runRecord({
        tolkar: {
          input_status: "relevant_ikkje_stotta",
          can_calculate: ["paelekapasitet"],
        },
      }),
    );
    expect(r.utloyst).toBe(true);
  });

  it("utloeyser ikkje naar can_calculate er tom (konsistent)", () => {
    const r = detectF16(
      runRecord({
        tolkar: { input_status: "relevant_ikkje_stotta", can_calculate: [] },
      }),
    );
    expect(r.utloyst).toBe(false);
  });

  it("utloeyser ikkje for andre Tolkar-statusar", () => {
    const r = detectF16(
      runRecord({
        tolkar: { input_status: "klar", can_calculate: ["M_Ed"] },
      }),
    );
    expect(r.utloyst).toBe(false);
  });
});

describe("runAllDetectors", () => {
  it("koeyrer alle fire detektorane og gjev funn-id-ar", () => {
    const res = runAllDetectors(runRecord({}));
    expect(res.map((r) => r.funn_id).sort()).toEqual([
      "F1", "F10", "F16", "F9",
    ]);
  });

  it("ein frisk koeyring utloeyser ingen detektor", () => {
    const frisk = runRecord({
      tolkar: { input_status: "klar", can_calculate: ["M_Ed"] },
      samanliknar: {
        match_status: "match",
        numeric_differences: [],
        unpaired_keys: { only_a: [], only_b: [] },
      },
      konstruktor_a: {
        structured_output: {
          results: { M_Ed: "54,0" },
          result_roles: { M_Ed: "dimensjonerande" },
        },
      },
    });
    expect(runAllDetectors(frisk).every((r) => !r.utloyst)).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import {
  byggSignalSummary,
  byggKlynger,
  finnAnomaliar,
  byggMistenkteFarlegFeil,
  byggDailyReport,
} from "@/daily/aggregate";
import type { RunRecord } from "@/lib/runrecord";
import type { ShadowCheckRad, SignalSummary } from "@/daily/types";

// --- fixturar ---------------------------------------------------------

function runRecord(overrides: Partial<RunRecord>): RunRecord {
  return {
    run_id: "r",
    run_type: "live",
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

function run(verdikt: string, matchStatus: string, type = "lastkombinasjon"): RunRecord {
  return runRecord({
    calculation_type: type,
    kontrollor: { decision_status: verdikt },
    samanliknar: { match_status: matchStatus },
  });
}

function shadow(kandidat: boolean, deviation = kandidat): ShadowCheckRad {
  return {
    run_id: "r",
    check_id: "load_combination",
    deviation_found: deviation,
    expected: kandidat ? 22.88 : null,
    got: kandidat ? 23.78 : null,
    agent: kandidat ? "A" : null,
    verdikt_da_sjekken_kjorte: kandidat ? "approved" : "uncertain",
    er_farleg_feil_kandidat: kandidat,
  };
}

// --- byggSignalSummary -----------------------------------------------

describe("byggSignalSummary", () => {
  it("tel verdikt-fordeling", () => {
    const s = byggSignalSummary(
      [run("approved", "match"), run("approved", "match"), run("uncertain", "match")],
      [],
    );
    expect(s.verdikt_fordeling).toEqual({ approved: 2, uncertain: 1 });
  });

  it("reknar samanliknar-usemje-rate", () => {
    const s = byggSignalSummary(
      [run("approved", "match"), run("approved", "minor_differences")],
      [],
    );
    expect(s.samanliknar_usemje_rate).toBe(0.5);
  });

  it("reknar shadow-check-treff-rate og kandidatar", () => {
    const s = byggSignalSummary(
      [run("approved", "match")],
      [shadow(true), shadow(false), shadow(false)],
    );
    expect(s.shadow_check_treff_rate).toBeCloseTo(1 / 3, 5);
    expect(s.farleg_feil_kandidatar).toBe(1);
  });

  it("gjev 0-rater for tom dag", () => {
    const s = byggSignalSummary([], []);
    expect(s.samanliknar_usemje_rate).toBe(0);
    expect(s.shadow_check_treff_rate).toBe(0);
  });
});

// --- byggKlynger ------------------------------------------------------

describe("byggKlynger", () => {
  it("grupperer etter berekningstype, største først", () => {
    const k = byggKlynger([
      run("approved", "match", "lastkombinasjon"),
      run("approved", "match", "lastkombinasjon"),
      run("approved", "match", "bjelke"),
    ]);
    expect(k[0].berekningstype).toBe("lastkombinasjon");
    expect(k[0].n).toBe(2);
    expect(k[1].n).toBe(1);
  });

  it("noterer usikre verdikt i klynga", () => {
    const k = byggKlynger([run("uncertain", "match", "bjelke")]);
    expect(k[0].signal_notat).toContain("1 av 1");
  });
});

// --- finnAnomaliar ----------------------------------------------------

describe("finnAnomaliar", () => {
  const baseline: SignalSummary = {
    verdikt_fordeling: {},
    samanliknar_usemje_rate: 0.1,
    shadow_check_treff_rate: 0.05,
    farleg_feil_kandidatar: 0,
  };

  it("gjev ingen anomaliar utan baseline (fyrste køyring)", () => {
    const i_dag: SignalSummary = { ...baseline, samanliknar_usemje_rate: 0.9 };
    expect(finnAnomaliar(i_dag, null)).toEqual([]);
  });

  it("flaggar ein dobla usemje-rate", () => {
    const i_dag: SignalSummary = { ...baseline, samanliknar_usemje_rate: 0.3 };
    const a = finnAnomaliar(i_dag, baseline);
    expect(a.some((x) => x.signal === "samanliknar_usemje_rate")).toBe(true);
  });

  it("ignorerer rater under absolutt-terskelen sjølv om dei doblar seg", () => {
    // 0.02 -> 0.04: dobla, men under 5 %-terskelen.
    const i_dag: SignalSummary = {
      ...baseline,
      samanliknar_usemje_rate: 0.04,
      shadow_check_treff_rate: 0.04,
    };
    expect(finnAnomaliar(i_dag, baseline)).toEqual([]);
  });

  it("flaggar alltid ein ny FARLEG-FEIL-kandidat som hog", () => {
    const i_dag: SignalSummary = { ...baseline, farleg_feil_kandidatar: 1 };
    const a = finnAnomaliar(i_dag, baseline);
    const ff = a.find((x) => x.signal === "farleg_feil_kandidatar");
    expect(ff?.alvor).toBe("hog");
  });
});

// --- byggMistenkteFarlegFeil -----------------------------------------

describe("byggMistenkteFarlegFeil", () => {
  it("plukkar berre kandidat-rader frå shadow_checks", () => {
    const m = byggMistenkteFarlegFeil([shadow(true), shadow(false)]);
    expect(m).toHaveLength(1);
    expect(m[0].expected).toBe(22.88);
    expect(m[0].got).toBe(23.78);
  });
});

// --- byggDailyReport --------------------------------------------------

describe("byggDailyReport", () => {
  it("byggjer komplett rapport for ein dag", () => {
    const r = byggDailyReport(
      "2026-05-24",
      [run("approved", "match"), run("uncertain", "match")],
      [shadow(true)],
      null,
    );
    expect(r.report_id).toBe("daily-2026-05-24");
    expect(r.n_runs).toBe(2);
    expect(r.mistenkte_farleg_feil).toHaveLength(1);
    expect(r.anomaliar).toEqual([]); // inga baseline
  });
});

import { describe, it, expect } from "vitest";
import {
  parseTal,
  avvikProsent,
  finnResultatVerdi,
  statusErRett,
  gradeRun,
  aggregateCase,
  vurderPortar,
} from "@/qa/grade";
import type { RunRecord } from "@/lib/runrecord";
import type { GoldenCase } from "@/golden/golden-set";
import type { CaseRunVerdict } from "@/qa/types";

// --- fixturar ---------------------------------------------------------

function runRecord(overrides: Partial<RunRecord>): RunRecord {
  return {
    run_id: "r1",
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

/** RunRecord for ei reknbar oppgåve med eitt resultat. */
function reknbarRun(opts: {
  status?: string;
  storleik: string;
  verdi: string;
  verdikt?: string;
}): RunRecord {
  return runRecord({
    tolkar: { input_status: opts.status ?? "klar" },
    konstruktor_a: {
      structured_output: { results: { [opts.storleik]: opts.verdi } },
    },
    kontrollor: { decision_status: opts.verdikt ?? "approved" },
  });
}

const goldenB1: GoldenCase = {
  id: "B1",
  source: "A0",
  gruppe: "Stålbjelke (EC3)",
  tittel: "Lastverknad",
  input: "...",
  forventa_status: "klar",
  fasit: { storleik: "M_Ed", verdi: 54.0, eining: "kNm", toleranse_pct: 2 },
  metode_krav: "M_Ed = q*L^2/8",
  port2_kritisk: false,
};

const goldenE3: GoldenCase = {
  id: "E3",
  source: "A0",
  gruppe: "Klassifisering",
  tittel: "For vagt",
  input: "...",
  forventa_status: "uklart",
  fasit: null,
  forventa_aatferd: "Tolkar ber om presisering.",
  metode_krav: "status = uklart",
  port2_kritisk: false,
};

// --- talparsing -------------------------------------------------------

describe("parseTal / avvikProsent", () => {
  it("parsar komma-desimal med eining", () => {
    expect(parseTal("54,0 kNm")).toBe(54);
    expect(parseTal("1375 kN")).toBe(1375);
    expect(parseTal("ikkje eit tal")).toBeNull();
  });
  it("reknar relativt avvik", () => {
    expect(avvikProsent(100, 100)).toBe(0);
    expect(avvikProsent(102, 100)).toBeCloseTo(1.96, 1);
    expect(avvikProsent(0, 0)).toBe(0);
  });
});

describe("finnResultatVerdi", () => {
  it("finn verdi via romsleg nøkkelmatch", () => {
    const rr = reknbarRun({ storleik: "M_Ed", verdi: "54,0 kNm" });
    expect(finnResultatVerdi(rr, "M_Ed")).toBe(54);
  });
  it("matchar trass skiljeteikn-skilnad — golden M_pl,Rd mot nøkkel M_pl_Rd", () => {
    const rr = runRecord({
      konstruktor_a: {
        structured_output: { results: { M_pl_Rd: "212,3 kNm" } },
      },
    });
    expect(finnResultatVerdi(rr, "M_pl,Rd")).toBe(212.3);
  });

  it("matchar IKKJE på prefiks — golden A_s plukkar ikkje A_s_min", () => {
    const rr = runRecord({
      konstruktor_a: {
        structured_output: {
          results: { A_s_min: "226 mm2", A_s_req: "1001 mm2" },
        },
      },
    });
    expect(finnResultatVerdi(rr, "A_s")).toBeNull();
    expect(finnResultatVerdi(rr, "A_s_req")).toBe(1001);
  });

  it("fell tilbake til Konstruktør B", () => {
    const rr = runRecord({
      konstruktor_b: {
        structured_output: { results: { V_Ed: "36,0 kN" } },
      },
    });
    expect(finnResultatVerdi(rr, "V_Ed")).toBe(36);
  });
});

describe("statusErRett", () => {
  it("matchar eksakt status", () => {
    expect(statusErRett("klar", "klar")).toBe(true);
    expect(statusErRett("klar", "mangelfull")).toBe(false);
  });
  it("godtek både klar og delvis_klar for E5-statusen", () => {
    expect(statusErRett("klar_eller_delvis_klar", "klar")).toBe(true);
    expect(statusErRett("klar_eller_delvis_klar", "delvis_klar")).toBe(true);
    expect(statusErRett("klar_eller_delvis_klar", "mangelfull")).toBe(false);
  });
});

// --- gradeRun: kvar rubrikk-utgang -----------------------------------

describe("gradeRun — rubrikk", () => {
  it("KORREKT når resultat er innanfor toleranse", () => {
    const v = gradeRun(reknbarRun({ storleik: "M_Ed", verdi: "54,3 kNm" }), goldenB1);
    expect(v.rubrikk).toBe("KORREKT");
    expect(v.innanfor_toleranse).toBe(true);
  });

  it("KLASSIFISERINGSFEIL når Tolkar-status er feil", () => {
    const v = gradeRun(
      reknbarRun({ status: "mangelfull", storleik: "M_Ed", verdi: "54,0 kNm" }),
      goldenB1,
    );
    expect(v.rubrikk).toBe("KLASSIFISERINGSFEIL");
  });

  it("TRYGT_FEIL når resultat er gale men Kontrollør flaggar", () => {
    const v = gradeRun(
      reknbarRun({ storleik: "M_Ed", verdi: "70,0 kNm", verdikt: "uncertain" }),
      goldenB1,
    );
    expect(v.rubrikk).toBe("TRYGT_FEIL");
    expect(v.innanfor_toleranse).toBe(false);
  });

  it("FARLEG_FEIL når resultat er gale og verdikt er approved", () => {
    const v = gradeRun(
      reknbarRun({ storleik: "M_Ed", verdi: "70,0 kNm", verdikt: "approved" }),
      goldenB1,
    );
    expect(v.rubrikk).toBe("FARLEG_FEIL");
  });

  it("KORREKT for E-oppgåve når Tolkar-status er rett", () => {
    const v = gradeRun(
      runRecord({ tolkar: { input_status: "uklart" } }),
      goldenE3,
    );
    expect(v.rubrikk).toBe("KORREKT");
  });

  it("FARLEG_FEIL når resultatet ikkje finst og verdikt ikkje flaggar", () => {
    const rr = runRecord({
      tolkar: { input_status: "klar" },
      kontrollor: { decision_status: "approved" },
      konstruktor_a: { structured_output: { results: {} } },
    });
    expect(gradeRun(rr, goldenB1).rubrikk).toBe("FARLEG_FEIL");
  });
});

// --- aggregateCase + vurderPortar ------------------------------------

function verdikt(rubrikk: CaseRunVerdict["rubrikk"]): CaseRunVerdict {
  return {
    case_id: "X", run_id: "r", rubrikk,
    faktisk_status: "klar", status_ok: true,
    avvik_pct: 0, innanfor_toleranse: true,
    verdikt: "approved", utloyste_detektorar: [], grunngiving: "",
  };
}

describe("aggregateCase", () => {
  it("bestått berre når alle N er KORREKT", () => {
    const alle = aggregateCase("X", [verdikt("KORREKT"), verdikt("KORREKT")]);
    expect(alle.bestatt).toBe(true);

    const ein = aggregateCase("X", [verdikt("KORREKT"), verdikt("TRYGT_FEIL")]);
    expect(ein.bestatt).toBe(false);
    expect(ein.korrekt_av_n).toBe(1);
  });

  it("verdikt_verst er verste rubrikk over alle N", () => {
    const agg = aggregateCase("X", [
      verdikt("KORREKT"),
      verdikt("FARLEG_FEIL"),
      verdikt("KORREKT"),
    ]);
    expect(agg.verdikt_verst).toBe("FARLEG_FEIL");
  });
});

describe("vurderPortar", () => {
  it("Port 1 krev >= 80 % bestått", () => {
    const cases = Array.from({ length: 10 }, (_, i) =>
      aggregateCase(`C${i}`, [verdikt(i < 8 ? "KORREKT" : "TRYGT_FEIL")]),
    );
    const p = vurderPortar(cases);
    expect(p.port1_pct).toBe(80);
    expect(p.port1_pass).toBe(true);
  });

  it("Port 2 fell ved éin einaste FARLEG_FEIL", () => {
    const p = vurderPortar([
      aggregateCase("A", [verdikt("KORREKT")]),
      aggregateCase("B", [verdikt("FARLEG_FEIL")]),
    ]);
    expect(p.port2_count).toBe(1);
    expect(p.port2_pass).toBe(false);
  });
});

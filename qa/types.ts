/**
 * Test-agent — typar (QA-spec kap. 8, Fase 1 steg 4).
 *
 * CaseRunVerdict  — utfallet av éi enkelt køyring av eitt golden-case.
 * CaseAggregate   — dei N køyringane av eitt case, slått saman.
 * TestReport      — heile Modus-A-rapporten (QA-spec 8.3).
 *
 * Rein typedeklarasjon. Graderings-logikken er i qa/grade.ts.
 */
import type { DetectorResult } from "@/funn/detectors";

/**
 * A0-rubrikken — fire moglege utfall for éi køyring.
 *  KORREKT            rett resultat (innan toleranse), rett status, verdikt OK.
 *  TRYGT_FEIL         resultatet er gale, MEN Kontrollør flagga det.
 *  FARLEG_FEIL        gale resultat presentert som godkjent — bryt Port 2.
 *  KLASSIFISERINGSFEIL Tolkar gav feil status.
 */
export type Rubrikk =
  | "KORREKT"
  | "TRYGT_FEIL"
  | "FARLEG_FEIL"
  | "KLASSIFISERINGSFEIL";

/** Utfallet av éi enkelt køyring av eitt golden-case. */
export type CaseRunVerdict = {
  case_id: string;
  run_id: string;
  rubrikk: Rubrikk;
  /** Tolkar-status pipelinen gav (mot golden.forventa_status). */
  faktisk_status: string | null;
  status_ok: boolean;
  /** Største relative avvik mot fasit, i prosent. null for E-oppgåver. */
  avvik_pct: number | null;
  /** Innanfor toleranse? null når det ikkje finst reknbar fasit. */
  innanfor_toleranse: boolean | null;
  /** Kontrollør sitt decision_status. */
  verdikt: string | null;
  /** Detektorar som vart utløyste i denne køyringa. */
  utloyste_detektorar: DetectorResult[];
  /** Lesbar grunngiving for rubrikk-valet. */
  grunngiving: string;
};

/** Dei N køyringane av eitt case, aggregert (QA-spec varianshandtering). */
export type CaseAggregate = {
  case_id: string;
  /** Tal på køyringar som vart KORREKT, av N. */
  korrekt_av_n: number;
  runs_total: number;
  /** consist = alle N KORREKT. QA-spec: eit case består berre då. */
  bestatt: boolean;
  /** Verste rubrikk over alle N — styrer Port 2. */
  verdikt_verst: Rubrikk;
  per_run: CaseRunVerdict[];
};

/** Eitt funn slik test-agenten observerte det over heile køyringa. */
export type FunnObservasjon = {
  id: string;
  /** Status i funn-registeret før denne testkøyringa. */
  registrert_status: string;
  /** ny | regressert | fiksa | uendra */
  delta: "ny" | "regressert" | "fiksa" | "uendra";
  /** Tal på køyringar der funnet vart observert. */
  count: number;
};

/** Heile Modus-A-rapporten (QA-spec 8.3). */
export type TestReport = {
  report_id: string;
  ts: string;
  pipeline_build: string;
  mode: "A";
  runs_per_case: number;
  rubric_tally: {
    korrekt: number;
    trygt_feil: number;
    farleg_feil: number;
    klassifiseringsfeil: number;
  };
  /** Port 1 — fagleg korrektheit. */
  port1_pct: number;
  port1_pass: boolean;
  /** Port 2 — tryggleik (hard). */
  port2_count: number;
  port2_pass: boolean;
  per_case: CaseAggregate[];
  findings_observed: FunnObservasjon[];
};

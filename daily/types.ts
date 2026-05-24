/**
 * Dagleg sjølvforbetrings-agent — typar (QA-spec kap. 9, Fase 1 steg 6).
 *
 * DailyReport (9.5) er triage-rapporten den daglege agenten emitterer:
 * signal-samandrag, klynger, funn-aktivitet, anomaliar og mistenkte
 * FARLEG-FEIL-kandidatar.
 *
 * HARD GRENSE (QA-spec 9.1): den daglege agenten les SIGNAL, ikkje
 * korrektheit. Live-køyringar har ingen fasit — typane her ber difor
 * aldri eit "rett/feil"-felt. Korrektheit er test-agentens jobb.
 *
 * Rein typedeklarasjon. Aggregerings-logikken er i daily/aggregate.ts.
 */

/** Éi rad shadow_checks-data aggregatoren treng (delmengd av tabellen). */
export type ShadowCheckRad = {
  run_id: string | null;
  check_id: string;
  deviation_found: boolean;
  expected: number | null;
  got: number | null;
  agent: string | null;
  verdikt_da_sjekken_kjorte: string | null;
  er_farleg_feil_kandidat: boolean;
};

/** Signal-samandraget (QA-spec 9.5 signal_summary). */
export type SignalSummary = {
  /** Fordeling av Kontrollør-verdikt: { approved: n, uncertain: n, ... }. */
  verdikt_fordeling: Record<string, number>;
  /** Andel køyringar der Samanliknar ikkje gav "match" (0–1). */
  samanliknar_usemje_rate: number;
  /** Andel shadow-checks som fann avvik (0–1). */
  shadow_check_treff_rate: number;
  /** Tal på shadow-checks merkt FARLEG-FEIL-kandidat. */
  farleg_feil_kandidatar: number;
};

/** Ei klynge køyringar gruppert etter berekningstype (QA-spec 9.2). */
export type Klynge = {
  /** calculation_type, eller "ukjend". */
  berekningstype: string;
  n: number;
  /** Kort signal-notat for klynga. */
  signal_notat: string;
};

/** Kor mykje eit kjent funn fyrte i dag (QA-spec known_finding_activity). */
export type FunnAktivitet = {
  id: string;
  fyringar: number;
  /** Status i funn-registeret. */
  registrert_status: string;
};

/** Eit signal som spikar mot baseline (QA-spec anomalies). */
export type Anomali = {
  signal: string;
  i_dag: number;
  baseline: number;
  /** lag | middels | hog — kor stort spranget er. */
  alvor: "lag" | "middels" | "hog";
};

/** Ein mistenkt FARLEG FEIL — frå shadow-check (QA-spec suspected_farleg_feil). */
export type MistenktFarlegFeil = {
  run_id: string | null;
  shadow_check_id: string;
  expected: number | null;
  got: number | null;
  agent: string | null;
};

/** Heile den daglege rapporten (QA-spec 9.5). */
export type DailyReport = {
  report_id: string;
  dato: string;
  n_runs: number;
  signal_summary: SignalSummary;
  klynger: Klynge[];
  funn_aktivitet: FunnAktivitet[];
  anomaliar: Anomali[];
  mistenkte_farleg_feil: MistenktFarlegFeil[];
};

/**
 * Baseline aggregatoren samanliknar dagens signal mot. Fyrste køyring har
 * inga baseline (null) → ingen anomaliar. Seinare køyringar matar inn
 * gårsdagens signal_summary.
 */
export type Baseline = SignalSummary | null;

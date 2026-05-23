/**
 * RunRecord — TypeScript-typen for `runrecord`-VIEW-en (db/runrecord.sql).
 *
 * Éin RunRecord = alt om éi pipeline-køyring, samla frå dei sju tabellane
 * + step_metrics. Dette er den kanoniske kjelda test-agenten (Fase 1,
 * steg 4) les for å gradere ei køyring.
 *
 * Dette er rein typedeklarasjon — inga logikk. jsonb-felta er typa
 * `unknown` med vilje: forma deira eig dei respektive agentane og kan
 * endre seg med promptversjonar. Konsumentar som treng eit bestemt felt
 * skal narrow-e det sjølv (helst via ein parser/validator), slik at ei
 * skjemaendring oppstraums blir fanga der og ikkje stille forplantar seg.
 */

/** Kva slags køyring — styrer korleis test-agenten behandlar henne. */
export type RunType = "live" | "golden" | "discovery";

/** Éi rad i step_metrics (sjå db/step_metrics.sql). */
export type StepMetric = {
  id: string;
  run_id: string | null;
  request_id: string | null;
  step_name: string;
  model: string | null;
  prompt_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_creation_tokens: number | null;
  latency_ms: number | null;
  stop_reason: string | null;
  ok: boolean;
  created_at: string;
};

/**
 * Éi rad frå `runrecord`-VIEW-en.
 *
 * Pipeline-stega er `unknown` fordi VIEW-en hentar dei via to_jsonb(t.*)
 * og forma eig agentane. Eit steg er `null` når køyringa ikkje nådde dit
 * (alle joins i VIEW-en er LEFT JOIN).
 */
export type RunRecord = {
  run_id: string;
  run_type: RunType;
  run_status: string | null;
  calculation_type: string | null;
  started_at: string | null;
  completed_at: string | null;

  request: unknown | null;
  tolkar: unknown | null;
  konstruktor_a: unknown | null;
  konstruktor_b: unknown | null;
  samanliknar: unknown | null;
  kontrollor: unknown | null;
  rapportor: unknown | null;

  /** Alltid ein array — tom når ingen metrikk er registrert. */
  steg_metrikkar: StepMetric[];
};

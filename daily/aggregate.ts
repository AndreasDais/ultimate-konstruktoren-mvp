/**
 * Dagleg sjølvforbetrings-agent — signal-aggregator (QA-spec 9, steg 6a).
 *
 * Reine funksjonar som tek ein dags live-RunRecords + shadow_checks og
 * byggjer ein DailyReport. Ingen I/O, ingen LLM, ingen fasit.
 *
 * HARD GRENSE (QA-spec 9.1): aggregatoren les SIGNAL, ikkje korrektheit.
 * Han seier aldri "dette svaret er feil" — berre "dette signalet spikar".
 * Korrektheits-verifisering er test-agentens jobb på golden-settet.
 */
import type { RunRecord } from "@/lib/runrecord";
import { FINDINGS } from "@/funn/funn-register";
import { runAllDetectors } from "@/funn/detectors";
import type {
  ShadowCheckRad,
  SignalSummary,
  Klynge,
  FunnAktivitet,
  Anomali,
  MistenktFarlegFeil,
  DailyReport,
  Baseline,
} from "@/daily/types";

// --- defensiv narrowing ----------------------------------------------

function asRecord(x: unknown): Record<string, unknown> | null {
  return x !== null && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
}

function asString(x: unknown): string | null {
  return typeof x === "string" ? x : null;
}

// --- signal-aggregering ----------------------------------------------

/**
 * Byggjer signal-samandraget frå ein dags RunRecords + shadow_checks.
 * Alle ratane er 0 når det ikkje finst køyringar å rekne over.
 */
export function byggSignalSummary(
  runs: RunRecord[],
  shadowChecks: ShadowCheckRad[],
): SignalSummary {
  // Verdikt-fordeling frå kontrollor.decision_status.
  const verdiktFordeling: Record<string, number> = {};
  let usemje = 0;
  let medSamanliknar = 0;

  for (const rr of runs) {
    const kontrollor = asRecord(rr.kontrollor);
    const verdikt = kontrollor
      ? (asString(kontrollor.decision_status) ?? "ukjend")
      : "ingen_kontrollor";
    verdiktFordeling[verdikt] = (verdiktFordeling[verdikt] ?? 0) + 1;

    const samanliknar = asRecord(rr.samanliknar);
    if (samanliknar) {
      medSamanliknar++;
      // Usemje = match_status er noko anna enn "match".
      if (samanliknar.match_status !== "match") usemje++;
    }
  }

  const medAvvik = shadowChecks.filter((s) => s.deviation_found).length;
  const kandidatar = shadowChecks.filter(
    (s) => s.er_farleg_feil_kandidat,
  ).length;

  return {
    verdikt_fordeling: verdiktFordeling,
    samanliknar_usemje_rate:
      medSamanliknar === 0 ? 0 : usemje / medSamanliknar,
    shadow_check_treff_rate:
      shadowChecks.length === 0 ? 0 : medAvvik / shadowChecks.length,
    farleg_feil_kandidatar: kandidatar,
  };
}

/**
 * Klyngjar køyringane etter calculation_type (QA-spec 9.2).
 */
export function byggKlynger(runs: RunRecord[]): Klynge[] {
  const grupper = new Map<string, RunRecord[]>();
  for (const rr of runs) {
    const type = rr.calculation_type ?? "ukjend";
    const liste = grupper.get(type) ?? [];
    liste.push(rr);
    grupper.set(type, liste);
  }

  return [...grupper.entries()]
    .map(([type, liste]) => {
      const usikre = liste.filter((rr) => {
        const k = asRecord(rr.kontrollor);
        return (
          k?.decision_status === "uncertain" ||
          k?.decision_status === "rejected"
        );
      }).length;
      return {
        berekningstype: type,
        n: liste.length,
        signal_notat:
          usikre > 0
            ? `${usikre} av ${liste.length} fekk usikker/avvist verdikt.`
            : "Ingen usikre/avviste verdikt.",
      };
    })
    .sort((a, b) => b.n - a.n);
}

/**
 * Tel kor mykje kvart kjente funn fyrte i dag — detektorane (steg 3)
 * køyrt over kvar RunRecord.
 */
export function byggFunnAktivitet(runs: RunRecord[]): FunnAktivitet[] {
  const tellingar = new Map<string, number>();
  for (const rr of runs) {
    for (const d of runAllDetectors(rr)) {
      if (d.utloyst) {
        tellingar.set(d.funn_id, (tellingar.get(d.funn_id) ?? 0) + 1);
      }
    }
  }
  return FINDINGS.filter((f) => f.detector !== null).map((f) => ({
    id: f.id,
    fyringar: tellingar.get(f.id) ?? 0,
    registrert_status: f.status,
  }));
}

/**
 * Flaggar signal som spikar mot baseline. Inga baseline (fyrste køyring)
 * → ingen anomaliar — agenten finn ikkje på avvik han ikkje har grunnlag
 * for. Eit signal må minst doble seg (og passere ein absolutt terskel)
 * for å teljast.
 */
export function finnAnomaliar(
  i_dag: SignalSummary,
  baseline: Baseline,
): Anomali[] {
  if (baseline === null) return [];
  const anomaliar: Anomali[] = [];

  const sjekkRate = (
    namn: string,
    no: number,
    foer: number,
  ): void => {
    // Absolutt terskel: rater under 5 % er for små til å vere signal.
    if (no < 0.05) return;
    const auke = foer === 0 ? Infinity : no / foer;
    if (auke >= 2) {
      anomaliar.push({
        signal: namn,
        i_dag: no,
        baseline: foer,
        alvor: auke >= 4 ? "hog" : auke >= 3 ? "middels" : "lag",
      });
    }
  };

  sjekkRate(
    "samanliknar_usemje_rate",
    i_dag.samanliknar_usemje_rate,
    baseline.samanliknar_usemje_rate,
  );
  sjekkRate(
    "shadow_check_treff_rate",
    i_dag.shadow_check_treff_rate,
    baseline.shadow_check_treff_rate,
  );

  // FARLEG-FEIL-kandidatar: kvar einaste er alvorleg. Auke frå 0 → >0
  // er alltid ein anomali, uavhengig av rate.
  if (i_dag.farleg_feil_kandidatar > baseline.farleg_feil_kandidatar) {
    anomaliar.push({
      signal: "farleg_feil_kandidatar",
      i_dag: i_dag.farleg_feil_kandidatar,
      baseline: baseline.farleg_feil_kandidatar,
      alvor: "hog",
    });
  }

  return anomaliar;
}

/**
 * Hentar mistenkte FARLEG FEIL rett frå shadow_checks — rader merkt
 * kandidat av steg 5. Dette er den einaste live FARLEG-FEIL-kjelda.
 */
export function byggMistenkteFarlegFeil(
  shadowChecks: ShadowCheckRad[],
): MistenktFarlegFeil[] {
  return shadowChecks
    .filter((s) => s.er_farleg_feil_kandidat)
    .map((s) => ({
      run_id: s.run_id,
      shadow_check_id: s.check_id,
      expected: s.expected,
      got: s.got,
      agent: s.agent,
    }));
}

/**
 * Byggjer heile DailyReport-en. Rein funksjon — gjev same rapport for
 * same input. `dato` og `baseline` er parameter; runnaren (6b) skaffar
 * dataa og gårsdagens baseline.
 */
export function byggDailyReport(
  dato: string,
  runs: RunRecord[],
  shadowChecks: ShadowCheckRad[],
  baseline: Baseline,
): DailyReport {
  const signalSummary = byggSignalSummary(runs, shadowChecks);
  return {
    report_id: `daily-${dato}`,
    dato,
    n_runs: runs.length,
    signal_summary: signalSummary,
    klynger: byggKlynger(runs),
    funn_aktivitet: byggFunnAktivitet(runs),
    anomaliar: finnAnomaliar(signalSummary, baseline),
    mistenkte_farleg_feil: byggMistenkteFarlegFeil(shadowChecks),
  };
}

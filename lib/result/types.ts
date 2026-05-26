/**
 * Typer for Resultat-sida (calculation_result-fase).
 *
 * Dekker datastrukturane som kjem frå AI-pipeline (Engineer A/B,
 * Comparator, Controller) samt utleia UI-typer som `Profile` og
 * `KontrollorChip`.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 1.
 */

// === AGENT-OUTPUT-TYPER ====================================================

/** Output frå Engineer Engineer A and Engineer B */
export type CalculationStep = {
  title: string;
  text: string;
};

export type CalculationResult = {
  short_conclusion: string;
  assumptions: string[];
  calculation_steps: CalculationStep[];
  results: Record<string, string>;
  /**
   * Rolle per result-nøkkel, sett av konstruktøren (FIKS 4):
   *  - "dimensjonerande": eit dimensjonerande sluttresultat / styrande verdi
   *  - "intermediate value": delsteg, faktor, geometri eller kapasitet brukt undervegs
   *  - "input": ein gitt inngangsverdi som only er ekko-a
   * Valfri — eldre køyringar manglar feltet, og tile-heuristikken fell
   * då tilbake til den regelbaserte gjettinga.
   */
  result_roles?: Record<string, "dimensjonerande" | "intermediate value" | "input">;
  limitations: string[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
};

/** Konsistens-issue frå Comparator (intern sjekk per agent) */
export type ConsistencyIssue = {
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
};

/** Talavvik mellom Engineer A and Engineer B for samme felt */
export type NumericDifference = {
  field: string;
  agent_a_value: string;
  agent_b_value: string;
  percent_diff: number;
  severity: "low" | "medium" | "high" | "critical";
  likely_cause: string;
};

/** Output frå Comparator */
export type ComparisonResult = {
  match_status:
    | "match"
    | "minor_differences"
    | "significant_differences"
    | "critical_disagreement";
  numeric_differences: NumericDifference[];
  method_differences: string[];
  assumption_differences: string[];
  internal_consistency_issues: {
    agent_a: ConsistencyIssue[];
    agent_b: ConsistencyIssue[];
  };
  recommended_status: "approved_preliminary" | "uncertain" | "rejected_needs_review";
  summary: string;
  /**
   * Nøklar rapportert av only éin konstruktør. Sett deterministisk av
   * Comparator-routen (kode, ikkje LLM). Slike nøklar er IKKJE avvik og
   * skal aldri visast som para «0,0 %»-rad. Valfri — eldre køyringar
   * manglar feltet, og konsumentar skal degradere trygt.
   */
  unpaired_keys?: {
    only_a: string[];
    only_b: string[];
  };
};

/** Output frå Controller — siste sikkerheitslag */
export type ControllerDecision = {
  decision_status: "approved" | "approved_with_warnings" | "uncertain" | "rejected";
  risk_level: "low" | "medium" | "high";
  reason: string;
  user_message: string;
  blocked_outputs: string[];
  allowed_outputs: string[];
  manual_review_required: boolean;
  controller_notes: string;
};

// === UI-UTLEIA TYPER =======================================================

/**
 * Visningsprofil (#03) — styrer kva blokker som er utvida/kollapsa
 * default på Resultat-sida.
 *
 * - "trygg": Engineer A and Engineer B fullt einige, ingen advarsler, kort utrekning →
 *   minimal visning, use kan utvide manuelt for å sjå detaljar.
 * - "standard": vanleg visning. Default.
 * - "krev_gjennomgang": Controller har funne avvik/uncertainty → utvida
 *   visning med avvik-rader auto-opna.
 */
export type Profile = "trygg" | "standard" | "krev_gjennomgang";

/**
 * Chip i Controller-kortet sin "Faglig merknad"-rad.
 *
 * - text: kort overskrift (synleg når kollapsa)
 * - body: lang forklaring (synleg når utvida som prosa)
 * - tone: visuell klassifisering
 * - prefix: visuell prefix-symbol ("+", "⚠", "✓")
 */
export type KontrollorChip = {
  text: string;
  body?: string;
  tone: "info" | "warn" | "neutral";
  prefix?: string;
  /**
   * Strukturell chip-kategori. Lèt render-laget skilje konfidens-chips
   * frå fag-flagg-chips utan å regex-matche språkavhengig tekst.
   */
  kind?: "confidence";
};
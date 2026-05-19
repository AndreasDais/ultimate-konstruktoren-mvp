/**
 * Typer for Resultat-sida (calculation_result-fase).
 *
 * Dekker datastrukturane som kjem frå AI-pipeline (Konstruktør A/B,
 * Samanliknar, Kontrollør) samt utleia UI-typer som `Profile` og
 * `KontrollorChip`.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 1.
 */

// === AGENT-OUTPUT-TYPER ====================================================

/** Output frå Konstruktør A og B */
export type CalculationStep = {
    title: string;
    text: string;
  };
  
  export type CalculationResult = {
    short_conclusion: string;
    assumptions: string[];
    calculation_steps: CalculationStep[];
    results: Record<string, string>;
    limitations: string[];
    warnings: string[];
    confidence: "high" | "medium" | "low";
  };
  
  /** Konsistens-issue frå Samanliknar (intern sjekk per agent) */
  export type ConsistencyIssue = {
    issue: string;
    severity: "low" | "medium" | "high" | "critical";
  };
  
  /** Talavvik mellom A og B for samme felt */
  export type NumericDifference = {
    field: string;
    agent_a_value: string;
    agent_b_value: string;
    percent_diff: number;
    severity: "low" | "medium" | "high" | "critical";
    likely_cause: string;
  };
  
  /** Output frå Samanliknar */
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
  };
  
  /** Output frå Kontrollør — siste sikkerheitslag */
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
   * - "trygg": A og B fullt einige, ingen advarsler, kort utrekning →
   *   minimal visning, brukar kan utvide manuelt for å sjå detaljar.
   * - "standard": vanleg visning. Default.
   * - "krev_gjennomgang": Kontrollør har funne avvik/uncertainty → utvida
   *   visning med avvik-rader auto-opna.
   */
  export type Profile = "trygg" | "standard" | "krev_gjennomgang";
  
  /**
   * Chip i Kontrollør-kortet sin "Faglig merknad"-rad.
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
  };
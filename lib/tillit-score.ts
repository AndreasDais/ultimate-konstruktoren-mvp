import type { Locale } from "./locale";

/**
 * Tillit-score-kalkulator for Pilar.
 *
 * Score-formelen måler AI-PIPELINE-TILLIT — kor mykje vi kan stole på
 * AI-agentane sitt arbeid. Fagperson-signering er ein separat dimensjon
 * (vises i Kontrollstatus-panelet, ikkje i gauge'n).
 *
 * Total = ab_agreement + controller_verdict + completeness
 *         (0-35)        (0-35)               (0-30)
 *
 * Formelen er pilot-hypotese og kalibrerast mot 20-30 reelle rapportar
 * i v0.2.
 *
 * Brukargrenseflate-mapping:
 *   90-100  Høg      mørk grøn (#1F5945)
 *   75-89   God      grøn      (#4F8B6E)
 *   50-74   Middels  okrer     (#B0822E)
 *   0-49    Låg      raud      (#8B2331)
 */

export const FORMULA_VERSION = "v0.2-no-fagperson";

export type ComparisonStatus =
  | "match"
  | "minor_differences"
  | "significant_differences"
  | "critical_disagreement";

export type ControllerStatus =
  | "approved"
  | "approved_with_warnings"
  | "uncertain"
  | "rejected";

export type TillitLabelKey = "high" | "good" | "medium" | "low";
export type TillitLabel = "Høg" | "God" | "Middels" | "Låg" | "Høy" | "God" | "Middels" | "Lav";
export type TillitColor = "#1F5945" | "#4F8B6E" | "#B0822E" | "#8B2331";

export interface TillitInput {
  comparison_status: ComparisonStatus;
  controller_verdict: ControllerStatus;
  /** Antal storleikar agenten faktisk rekna ut (frå Tolkar can_calculate). */
  rekna_storleikar: number;
  /** Antal storleikar som var spurt om totalt (rekna + ikkje_rekna). */
  spurde_storleikar: number;
}

export interface TillitBreakdown {
  /** Komponent 1 — Engineer-semje, 0-35 */
  ab_agreement: number;
  /** Komponent 2 — Controller-verdict, 0-35 */
  controller_verdict: number;
  /** Komponent 3 — Fullstendigheit, 0-30 (kan vere desimal) */
  completeness: number;
  /** Sum av dei tre, runda til heiltal 0-100 */
  total: number;
  /** Versjons-tag for å oppdage gamle breakdowns ved lazy backfill */
  formula_version: string;
  /** Rådata for sporbarheit og UI-detaljvisning */
  components: {
    comparison_status: ComparisonStatus;
    controller_verdict_raw: ControllerStatus;
    rekna_storleikar: number;
    spurde_storleikar: number;
    completeness_ratio: number;
  };
}

const AB_AGREEMENT_MAP: Record<ComparisonStatus, number> = {
  match: 35,
  minor_differences: 26,
  significant_differences: 14,
  critical_disagreement: 0,
};

const CONTROLLER_VERDICT_MAP: Record<ControllerStatus, number> = {
  approved: 35,
  approved_with_warnings: 26,
  uncertain: 12,
  rejected: 0,
};

/**
 * Reknar tillit-score frå pipeline-output. Determinisk og rein matematikk —
 * ingen LLM-kall. Trygt å køyre i ein loop for backfill av historiske rapportar.
 */
export function calculateTillitScore(input: TillitInput): TillitBreakdown {
  const ab_agreement = AB_AGREEMENT_MAP[input.comparison_status] ?? 0;
  const controller_verdict =
    CONTROLLER_VERDICT_MAP[input.controller_verdict] ?? 0;

  const ratio =
    input.spurde_storleikar > 0
      ? input.rekna_storleikar / input.spurde_storleikar
      : 0;
  // 30 × ratio, runda til éin desimal (slik at 2/5 → 12.0, 4/4 → 30.0).
  const completeness = Math.round(30 * ratio * 10) / 10;

  const total = Math.round(ab_agreement + controller_verdict + completeness);

  return {
    ab_agreement,
    controller_verdict,
    completeness,
    total,
    formula_version: FORMULA_VERSION,
    components: {
      comparison_status: input.comparison_status,
      controller_verdict_raw: input.controller_verdict,
      rekna_storleikar: input.rekna_storleikar,
      spurde_storleikar: input.spurde_storleikar,
      completeness_ratio: Math.round(ratio * 1000) / 1000,
    },
  };
}

/**
 * Mapping frå score til visuell label + farge for gauge-rendering.
 */
const TILLIT_LABELS_BY_LOCALE: Record<Locale, Record<TillitLabelKey, string>> = {
  nb: { high: "Høy", good: "God", medium: "Middels", low: "Lav" },
  nn: { high: "Høg", good: "God", medium: "Middels", low: "Låg" },
};

export function tillitVisuals(
  score: number,
  locale: Locale = "nb"
): {
  label: string;
  color: TillitColor;
  labelKey: TillitLabelKey;
} {
  const labels = TILLIT_LABELS_BY_LOCALE[locale];
  if (score >= 90) return { label: labels.high, color: "#1F5945", labelKey: "high" };
  if (score >= 75) return { label: labels.good, color: "#4F8B6E", labelKey: "good" };
  if (score >= 50) return { label: labels.medium, color: "#B0822E", labelKey: "medium" };
  return { label: labels.low, color: "#8B2331", labelKey: "low" };
}

/**
 * Eksempel-utrekning for sanity-check.
 *
 * Armering-runet du køyrde tidlegare:
 *   comparison_status: 'minor_differences'    → 26
 *   controller_verdict: 'approved_with_warnings'  → 26
 *   rekna: 4 av 4 spurde                       → 30
 *   ─────────────────────────────────────────────
 *   total: 82 → "God" (grøn)
 *
 * Stål-runet (test 4):
 *   comparison_status: 'match'                 → 35
 *   controller_verdict: 'approved'             → 35
 *   rekna: 2 av 5 spurde                       → 12
 *   ─────────────────────────────────────────────
 *   total: 82 → "God" (grøn)
 */
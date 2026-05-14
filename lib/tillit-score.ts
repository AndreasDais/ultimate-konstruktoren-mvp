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
 * v0.3-rekalibrering (dag 16): begge kart speglar kvarandre med
 * verdiar 35 / 28 / 22 / 0. Tidlegare brukte vi 35/26/14/0 og
 * 35/26/12/0, som var for punitivt for mellomverdiane —
 * "significant_differences" og "uncertain" trekte 60-65 % av max
 * sjølv når avviket var lokalisert til eitt delresultat. Den nye
 * skalaen er framleis monoton men mindre brutal i mellomrommet.
 *
 * Brukargrenseflate-mapping:
 *   90-100  Høg      mørk grøn (#1F5945)
 *   75-89   God      grøn      (#4F8B6E)
 *   50-74   Middels  okrer     (#B0822E)
 *   0-49    Låg      raud      (#8B2331)
 */

export const FORMULA_VERSION = "v0.3-recalibrated";

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

export type TillitLabel = "Høg" | "God" | "Middels" | "Låg";
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
  /** Komponent 1 — Konstruktør-semje, 0-35 */
  ab_agreement: number;
  /** Komponent 2 — Kontrollør-verdict, 0-35 */
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
  minor_differences: 28,
  significant_differences: 22,
  critical_disagreement: 0,
};

const CONTROLLER_VERDICT_MAP: Record<ControllerStatus, number> = {
  approved: 35,
  approved_with_warnings: 28,
  uncertain: 22,
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
export function tillitVisuals(score: number): {
  label: TillitLabel;
  color: TillitColor;
} {
  if (score >= 90) return { label: "Høg", color: "#1F5945" };
  if (score >= 75) return { label: "God", color: "#4F8B6E" };
  if (score >= 50) return { label: "Middels", color: "#B0822E" };
  return { label: "Låg", color: "#8B2331" };
}

/**
 * Eksempel-utrekningar (v0.3) for sanity-check.
 *
 *   match + approved + 4/4              → 35 + 35 + 30 = 100 ("Høg")
 *   minor + approved_with_warnings + 4/4 → 28 + 28 + 30 = 86  ("God")
 *   match + approved + 2/5               → 35 + 35 + 12 = 82  ("God")
 *   significant + uncertain + 4/4        → 22 + 22 + 30 = 74  ("Middels")
 *   significant + uncertain + 2/5        → 22 + 22 + 12 = 56  ("Middels")
 *   critical + rejected + 0/5            →  0 +  0 +  0 = 0   ("Låg")
 */
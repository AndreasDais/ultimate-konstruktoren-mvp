/**
 * Visningsprofil (#03) — beregnar profilen for Resultat-sida basert
 * på Controller si avgjerd, Comparator sin match_status, og Engineer
 * sine warnings + tal-steg.
 *
 * Profilen styrer kva blokker som er utvida/kollapsa default når studenten
 * landar på sida:
 * - "trygg": Engineer A and Engineer B fullt einige + ingen advarsler + ≤4 steg → minimal
 *   visning, use kan utvide manuelt
 * - "standard": vanleg visning (default for det meste)
 * - "krev_gjennomgang": avvik eller usikkerheit → utvida visning med
 *   avvik-rader auto-opna
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 2.
 */

import type {
    CalculationResult,
    ComparisonResult,
    ControllerDecision,
    Profile,
  } from "@/lib/result/types";
  
  export function computeProfile(
    controllerDecision: ControllerDecision | null,
    comparison: ComparisonResult | null,
    calculationA: CalculationResult | null,
  ): Profile {
    // Krev gjennomgang — uakseptabelt risiko-nivå eller usemje mellom Engineer A and Engineer B
    if (
      comparison?.match_status === "significant_differences" ||
      comparison?.match_status === "critical_disagreement" ||
      controllerDecision?.decision_status === "uncertain" ||
      controllerDecision?.decision_status === "rejected" ||
      controllerDecision?.risk_level === "high"
    ) {
      return "krev_gjennomgang";
    }
  
    // Trygg — alt går smerteFritt, oppgåva er enkel
    const warningsCount = calculationA?.warnings?.length ?? 0;
    const stepsCount = calculationA?.calculation_steps?.length ?? 0;
    if (
      comparison?.match_status === "match" &&
      warningsCount === 0 &&
      stepsCount <= 4 &&
      controllerDecision?.decision_status === "approved" &&
      controllerDecision?.risk_level !== "medium"
    ) {
      return "trygg";
    }
  
    // Standard — alt anna (vanlegaste tilfellet)
    return "standard";
  }
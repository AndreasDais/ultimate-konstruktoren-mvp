/**
 * Hjelpefunksjonar for Kontrollør-kortet på Resultat-sida.
 *
 * Inkluderer:
 * - getVerdiktForMatchStatus: 1-linjers verdikt frå Samanliknar sin match_status
 * - getFirstSentence: pluk første setning av lang prosa (til chip-summary)
 * - splitChipText: del kolon-separert tekst i overskrift + body
 * - buildKontrollorChips: bygger chip-arrayet frå agent-output (klient-side)
 *
 * Backend leverer ikkje chips direkte i pilot-skjema — vi byggjer dei klient-
 * side frå method_differences, assumption_differences, warnings og manual_
 * review_required-flagget.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 2.
 */

import type { Locale } from "@/lib/locale";
import type {
  CalculationResult,
  ComparisonResult,
  ControllerDecision,
  KontrollorChip,
} from "@/lib/result/types";
import { WB_LABELS } from "@/lib/result/labels";

export function getVerdiktForMatchStatus(
  matchStatus: "match" | "minor_differences" | "significant_differences" | "critical_disagreement",
  locale: Locale,
): string {
  if (matchStatus === "match") return WB_LABELS.verdiktMatch[locale];
  if (matchStatus === "minor_differences") return WB_LABELS.verdiktMinor[locale];
  if (matchStatus === "significant_differences") return WB_LABELS.verdiktSignificant[locale];
  return WB_LABELS.verdiktCritical[locale];
}

// Hentar første setning frå ein prosa-blokk. Splittar på første ., !, ?.
// Fallback: første 140 teikn om ingen setningsavslutning finst.
export function getFirstSentence(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  const m = trimmed.match(/^[^.!?]+[.!?]/);
  return m ? m[0].trim() : trimmed.slice(0, 140);
}

// Strukturen for chips frontend genererer frå strukturert agent-output.
// Backend leverer ikkje chips direkte i pilot-skjema — vi byggjer dei
// klient-side frå method_differences, assumption_differences, warnings
// og manual_review_required-flagget.
// Type-definisjon flytta til @/lib/result/types — importert øvst.

// Splitt rå chip-tekst på første kolon. Det som står før blir til overskrift
// (synleg når kollapsa), det som står etter blir til prosa-body (synleg når
// utvida). Om ingen kolon finst, eller om kolonen kjem for seint i strengen
// (>80 teikn — sannsynlegvis ikkje ein faktisk overskrift), behaldast heile
// som body og overskrifta vert ein truncate av starten.
export function splitChipText(raw: string): { text: string; body?: string } {
  const s = raw.trim();
  if (!s) return { text: "" };
  // Sjå etter ": " (kolon + mellomrom — typisk for "Tittel: forklaring").
  // Tillat opp til 80 teikn for tittel-delen.
  const colonIdx = s.indexOf(": ");
  if (colonIdx > 0 && colonIdx <= 80) {
    const title = s.slice(0, colonIdx).trim();
    const body = s.slice(colonIdx + 2).trim();
    if (title && body) return { text: title, body };
  }
  // Ingen brukbar kolon. Truncate til kort overskrift, behald heile som body.
  if (s.length > 70) {
    return { text: s.slice(0, 69) + "…", body: s };
  }
  return { text: s };
}

export function buildKontrollorChips(
  comparison: ComparisonResult | null,
  calculationA: CalculationResult | null,
  calculationB: CalculationResult | null,
  decision: ControllerDecision | null,
  locale: Locale,
  maxChars: number = 60,
): KontrollorChip[] {
  const chips: KontrollorChip[] = [];

  // 0) Konfidens-chips (#09) — agent-metadata først i chip-rada.
  // Tone-mapping: high → info (grøn), medium → warn, low → warn.
  // Per-nivå tooltip (klikk for å utvide) forklarer kva konfidens-verdien tyder.
  const confidenceTone = (c: "high" | "medium" | "low"): "info" | "warn" | "neutral" => {
    if (c === "high") return "info";
    return "warn"; // medium og low begge warn-tona
  };
  const confidenceTooltip = (
    agent: "A" | "B",
    c: "high" | "medium" | "low",
  ): string => {
    if (agent === "A") {
      if (c === "high") return WB_LABELS.konfidensHighA[locale];
      if (c === "medium") return WB_LABELS.konfidensMediumA[locale];
      return WB_LABELS.konfidensLowA[locale];
    }
    if (c === "high") return WB_LABELS.konfidensHighB[locale];
    if (c === "medium") return WB_LABELS.konfidensMediumB[locale];
    return WB_LABELS.konfidensLowB[locale];
  };
  if (calculationA?.confidence) {
    chips.push({
      text: `A · ${calculationA.confidence.toUpperCase()}`,
      body: confidenceTooltip("A", calculationA.confidence),
      tone: confidenceTone(calculationA.confidence),
    });
  }
  if (calculationB?.confidence) {
    chips.push({
      text: `B · ${calculationB.confidence.toUpperCase()}`,
      body: confidenceTooltip("B", calculationB.confidence),
      tone: confidenceTone(calculationB.confidence),
    });
  }

  // 1) Method differences → info-chip med tittel + body splitta på kolon
  if (comparison?.method_differences?.length) {
    for (const md of comparison.method_differences) {
      const split = splitChipText(md);
      if (!split.text) continue;
      chips.push({
        ...split,
        tone: "info",
        prefix: "+",
      });
    }
  }

  // 2) Assumption differences → warn-chip med tittel + body
  if (comparison?.assumption_differences?.length) {
    for (const ad of comparison.assumption_differences) {
      const split = splitChipText(ad);
      if (!split.text) continue;
      chips.push({
        ...split,
        tone: "warn",
        prefix: "⚠",
      });
    }
  }

  // 3) Warnings frå begge konstruktørar → warn-chip
  // Dedupe på trim+lowercase for å fange "Bør verifiserast" / "bør verifiserast".
  const seenWarnings = new Set<string>();
  const allWarnings = [...(calculationA?.warnings ?? []), ...(calculationB?.warnings ?? [])];
  for (const w of allWarnings) {
    const t = w.trim();
    if (!t) continue;
    const norm = t.toLowerCase().replace(/\s+/g, " ");
    if (seenWarnings.has(norm)) continue;
    seenWarnings.add(norm);
    const split = splitChipText(w);
    if (!split.text) continue;
    chips.push({
      ...split,
      tone: "warn",
      prefix: "⚠",
    });
  }

  // 4) Manual review required → neutral-chip
  if (decision?.manual_review_required) {
    chips.push({
      text: WB_LABELS.krevFagligGjennomgang[locale],
      body: decision.controller_notes || undefined,
      tone: "neutral",
    });
  }

  return chips;
}
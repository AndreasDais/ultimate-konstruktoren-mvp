/**
 * Hjelpefunksjonar for Controller-kortet på Resultat-sida.
 *
 * Inkluderer:
 * - getVerdiktForMatchStatus: 1-linjers verdikt frå Comparator sin match_status
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

// === FIKS 11 (F15): kryss-konstruktør nær-dedup av advarsler ================
//
// Verbatim-dedupen i steg 3 fangar only identisk ordlyd. Når Engineer A
// og B uavhengig reiser SAME åtvaring med ulik formulering (same faktum, ulik
// setningsbygnad), slepp begge gjennom og same åtvaring blir vist to gonger i
// «Antakingar & åtvaringar»-gruppa på Resultat-sida (observert i A2-køyringa).
//
// Vi måler token-overlapp (Jaccard) mellom ein B-advarsel og kvar alt-behalden
// A-advarsel. Ligg overlappen >= WARNING_NEAR_DUP_THRESHOLD, blir B-varianten
// hoppa over og A si formulering står att (A blir iterert først → konsistent
// med at den kanoniske rapporten alt er A-only).
//
// Heuristikken er medvite konservativ og deterministisk:
//  - only kryss A↔B. To liknande advarsler frå SAME konstruktør er truleg
//    meint og blir aldri fuzzy-kollapsa — only verbatim.
//  - korte advarsler (< WARNING_NEAR_DUP_MIN_TOKENS token) blir aldri fuzzy-
//    matcha; for lite tekst til trygt signal. Verbatim-dedupen dekkjer dei.
//  - terskelen er kalibrert mot A2-køyringa og pinna i kontrollor-chips.test.ts.
const WARNING_NEAR_DUP_THRESHOLD = 0.5;
const WARNING_NEAR_DUP_MIN_TOKENS = 6;

// Korte norske funksjonsord utan fagleg signal. Negasjon ("ikke"/"ikkje") er
// MEDVITE halden — ho ber meining i ein åtvaring.
const WARNING_STOPWORDS = new Set<string>([
  "er", "i", "med", "som", "at", "og", "det", "å", "for", "av", "her",
  "den", "ein", "eit", "en", "et", "skal", "blir", "vart", "har",
]);

// Normaliser ein advarsel til eit sett av meiningsberande token: NFC, små
// bokstavar, alt som ikkje er bokstav/tal blir skiljeteikn, stoppord vekk.
export function warningTokenSet(raw: string): Set<string> {
  return new Set(
    raw
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0 && !WARNING_STOPWORDS.has(t)),
  );
}

// Jaccard-likskap mellom to token-sett: |snitt| / |union|, i [0, 1].
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Er kandidat-advarselen ein nær-duplikat av ein alt-behalden advarsel?
// Begge må ha nok token til trygt signal før Jaccard-terskelen gjeld.
function isNearDuplicateWarning(candidate: Set<string>, kept: Set<string>): boolean {
  if (
    candidate.size < WARNING_NEAR_DUP_MIN_TOKENS ||
    kept.size < WARNING_NEAR_DUP_MIN_TOKENS
  ) {
    return false;
  }
  return jaccardSimilarity(candidate, kept) >= WARNING_NEAR_DUP_THRESHOLD;
}

export function buildKontrollorChips(
  comparison: ComparisonResult | null,
  calculationA: CalculationResult | null,
  calculationB: CalculationResult | null,
  decision: ControllerDecision | null,
  locale: Locale,
  maxChars: number = 60,
  displayLanguage: Locale | "en" = locale,
): KontrollorChip[] {
  const chips: KontrollorChip[] = [];

  // 0) Konfidens-chips (#09) — agent-metadata først i chip-rada.
  // Tone-mapping: high → info (grøn), medium → warn, low → warn.
  // Per-nivå tooltip (klikk for å utvide) forklarer kva konfidens-verdien tyder.
  const confidenceTone = (c: "high" | "medium" | "low"): "info" | "warn" | "neutral" => {
    if (c === "high") return "info";
    return "warn";
  };

  const confidenceTooltip = (
    agent: "A" | "B",
    c: "high" | "medium" | "low",
  ): string => {
    if (displayLanguage === "en") {
      if (agent === "A") {
        if (c === "high") {
          return "Engineer A reports HIGH confidence: the method is established, all required input is available, and the result is consistent throughout the calculation. Self-assessment — not an independent verification.";
        }
        if (c === "medium") {
          return "Engineer A reports MEDIUM confidence: the method is mostly established, but at least one assumption or input should be reviewed.";
        }
        return "Engineer A reports LOW confidence: the method or input basis is uncertain and requires review.";
      }

      if (c === "high") {
        return "Engineer B reports HIGH confidence in its independent solution. Engineer B solved the task without seeing Engineer A's answer. HIGH means Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check.";
      }
      if (c === "medium") {
        return "Engineer B reports MEDIUM confidence: Engineer B solved the task independently, but at least one assumption is uncertain. Review Engineer B's assumptions.";
      }
      return "Engineer B reports LOW confidence: Engineer B's independent solution is uncertain and requires review.";
    }

    if (agent === "A") {
      if (c === "high") return WB_LABELS.konfidensHighA[locale];
      if (c === "medium") return WB_LABELS.konfidensMediumA[locale];
      return WB_LABELS.konfidensLowA[locale];
    }

    if (c === "high") return WB_LABELS.konfidensHighB[locale];
    if (c === "medium") return WB_LABELS.konfidensMediumB[locale];
    return WB_LABELS.konfidensLowB[locale];
  };

  const confidenceLabel = (c: "high" | "medium" | "low"): string => {
    if (displayLanguage === "en") return c.toUpperCase();

    if (c === "high") return locale === "nn" ? "HØG" : "HØY";
    if (c === "medium") return "MIDDELS";
    return "LAV";
  };

if (calculationA?.confidence) {
    chips.push({
      text: `A · ${confidenceLabel(calculationA.confidence)}`,
      body: confidenceTooltip("A", calculationA.confidence),
      tone: confidenceTone(calculationA.confidence),
    });
  }
  if (calculationB?.confidence) {
    chips.push({
      text: `B · ${confidenceLabel(calculationB.confidence)}`,
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

  // 3) Warnings frå begge engineers → warn-chip.
  //    Verbatim-dedup (trim+lowercase) fangar identisk ordlyd. FIKS 11 (F15)
  //    legg til kryss-A/B nær-dedup for ulikt formulerte, men like advarsler.
  const seenWarnings = new Set<string>();
  const keptATokenSets: Set<string>[] = [];

  const pushWarningChip = (w: string) => {
    const split = splitChipText(w);
    if (!split.text) return;
    chips.push({
      ...split,
      tone: "warn",
      prefix: "⚠",
    });
  };

  // 3a) Engineer A — verbatim-dedup. Hugs token-sett for nær-dedup i 3b.
  for (const w of calculationA?.warnings ?? []) {
    const t = w.trim();
    if (!t) continue;
    const norm = t.toLowerCase().replace(/\s+/g, " ");
    if (seenWarnings.has(norm)) continue;
    seenWarnings.add(norm);
    keptATokenSets.push(warningTokenSet(t));
    pushWarningChip(w);
  }

  // 3b) Engineer B — verbatim-dedup + nær-dedup mot behaldne A-advarsler.
  //     Nær-dedup gjeld only kryss A↔B; B mot B er framleis verbatim-only.
  for (const w of calculationB?.warnings ?? []) {
    const t = w.trim();
    if (!t) continue;
    const norm = t.toLowerCase().replace(/\s+/g, " ");
    if (seenWarnings.has(norm)) continue;
    const tokens = warningTokenSet(t);
    if (keptATokenSets.some((aTokens) => isNearDuplicateWarning(tokens, aTokens))) {
      continue;
    }
    seenWarnings.add(norm);
    pushWarningChip(w);
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
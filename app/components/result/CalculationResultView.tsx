"use client";

/**
 * CalculationResultView (#refaktor-fase-7) — heile resultat-side-blokka.
 *
 * Inneheld:
 * - Visningsprofil-indikator (#03)
 * - Comparator-tabell (#05)
 * - Controller-kort med chips, sjølvkontroll, "Les hele vurderingen" (#02, #09)
 * - Engineer A: short_conclusion, tiles, results-tabell, stegvis, advarsler
 * - Engineer B som disclosure (#04)
 * - Action bar med "Tilbake" og "Generer rapport"
 * - Sticky decision-bar (#07) når studenten har scrolla forbi Controller
 *
 * Komponenten tek alle data + state-setters som props (props-passing pattern).
 * Splitta ut frå app/page.tsx i refaktor-fase 7.
 */

import { Fragment } from "react";
import type { Locale } from "@/lib/locale";
import {
  matchStatusLabel, MATCH_STATUS_TONES, decisionStatusLabel, DECISION_STATUS_TONES, CONFIDENCE_TONES, SEVERITY_TONES, } from "@/lib/format";
import { InfoPopover } from "@/app/components/InfoPopover";
import type {
  CalculationResult, ComparisonResult, ControllerDecision, KontrollorChip, Profile, } from "@/lib/result/types";
import type { AgentResult } from "@/lib/workbench/types";
import { WB_LABELS as BASE_WB_LABELS } from "@/lib/result/labels";
import { isRealIssue } from "@/lib/compare/consistency-issues";
import type { EngineeringContext } from "@/lib/engineering-context";
import { buildLocalizedLabelProxy, displayLanguageForContext, polishEnglishGeneratedText, localizeResultLabel,
  sanitizeAiscGuardedOutputText,
} from "@/lib/international/display";
import { computeProfile } from "@/lib/result/profile";
import {
  isInputKey,
  getDimensjonerandeKeys,
  tileLabel,
  splitNumberUnit,
  KEY_TILE_DESCRIPTIONS,
} from "@/lib/result/tile-heuristics";
import {
  buildKontrollorChips,
  getVerdiktForMatchStatus,
  getFirstSentence,
} from "@/lib/result/kontrollor-chips";
import {
  extractFormulaLines,
  renderMathKey,
} from "@/lib/result/formula-extract";
import { Badge } from "@/app/components/Badge";
import { StatusStripe } from "@/app/components/StatusStripe";
import { KontrollorChipPill } from "./KontrollorChipPill";
import { DimensjonerandeTiles } from "./DimensjonerandeTile";

function sprint339FinalNorwegianResidueText(value: string): string {
  return String(value ?? "")
    .replace(/FORELØPIG GODKJENT/g, "PRELIMINARILY APPROVED")
    .replace(/MINDRE FORSKJELLER/g, "MINOR DIFFERENCES")
    .replace(/BEGGE KONSTRUKTØRER ER ENIGE/g, "BOTH ENGINEERS AGREE")
    .replace(/ØVRIG/g, "OTHER")
    .replace(/GOD/g, "GOOD")
    .replace(/Beregningen er godkjent for visning. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering./g, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/De kom frem til samme resultat./g, "They reached the same result.")
    .replace(/Engineer A and B er fullstendig enige om alle dimensjonerande verdier./g, "Engineer A and Engineer B fully agree on all design values.")
    .replace(/Engineer A og B har minor differences/g, "Engineer A and Engineer B have minor differences")
    .replace(/Engineer B reports HIGH confidence på sin uavhengige løsning./g, "Engineer B reports HIGH confidence in its independent solution.")
    .replace(/HIGH her betyr at B er trygg på egen metode — at A and B er enige er en separat sjekk (se verdikt over)./g, "HIGH means that Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check (see verdict above).")
    .replace(/Self-assessment — ikke en uavhengig verifikasjon./g, "Self-assessment — not an independent verification.")
    .replace(/Engineer A og Engineer B/g, "Engineer A and Engineer B")
    .replace(/Engineer A og B/g, "Engineer A and Engineer B")
    .replace(/A og B/g, "Engineer A and Engineer B")
    .replace(/er fullstendig enige/g, "fully agree")
    .replace(/dimensjonerande verdier/g, "design values")
    .replace(/på sin uavhengige løsning/g, "in its independent solution")
    .replace(/HIGH her betyr/g, "HIGH means")
    .replace(/egen metode/g, "its own method")
    .replace(/se verdikt over/g, "see verdict above")
    .replace(/same grunnleggjande metode/g, "the same basic method")
    .replace(/brukar/g, "use")
    .replace(/bruker/g, "use")
    .replace(/medan/g, "while")
    .replace(/berre/g, "only")
    .replace(/hovudformelen/g, "the main formula")
    .replace(/utrekningsrute/g, "calculation route")
    .replace(/ein alternativ/g, "an alternative")
    .replace(/som ein intern kryssjekk/g, "as an internal cross-check")
    .replace(/Dette er ei forskjell i presentasjonsform, ikkje i metode./g, "This is a presentation difference, not a methodological difference.")
    .replace(/lastfaktorane/g, "load factors")
    .replace(/som eigne resultatfelt/g, "as separate result fields")
    .replace(/tekstbeskrivinga/g, "the text description")
    .replace(/Innhaldet er likeverdig men strukturen er ulik./g, "The content is equivalent, but the structure differs.")
    .replace(/Begge konstruktørar/g, "Both engineers")
    .replace(/Begge konstruktører/g, "Both engineers")
    .replace(/konstruktørar/g, "engineers")
    .replace(/konstruktører/g, "engineers")
    .replace(/Konstruktør A/g, "Engineer A")
    .replace(/Konstruktør B/g, "Engineer B")
    .replace(/Konstruktør/g, "Engineer")
    .replace(/Cb-antaginga/g, "The Cb assumption")
    .replace(/antaginga/g, "assumption")
    .replace(/føresetnad/g, "assumption")
    .replace(/føresetnader/g, "assumptions")
    .replace(/sjølve/g, "itself")
    .replace(/Ingen forskjell/g, "No difference")
    .replace(/ingen forskjell/g, "no difference")
    .replace(/mellomledd/g, "intermediate value");
}


function sprint338ResultUiText(value: string): string {
  return String(value ?? "")
    .replace(/\bSTEG 3 AV 3\s*·\s*RESULTAT\b/g, "STEP 3 OF 3 · RESULT")
    .replace(/\bCalculation note\b/g, "Calculation note")
    .replace(/\bBerekningsnotat\b/g, "Calculation note")
    .replace(/Fortsetter fra tidligere beregning\. Endringer oppretter en ny beregning — originalen forblir uendret\./g, "Continuing from a previous calculation. Changes create a new calculation — the original remains unchanged.")
    .replace(/Foreløpig resultat med agentkontroll\. Må kontrolleres av fagperson før bruk\./g, "Preliminary result with agent control. Must be checked by a qualified professional before use.")
    .replace(/Beregningen er godkjent for visning\. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering\./g, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/Beregningen er foreløpig godkjent\. Resultatet skal kontrolleres av ansvarlig fagperson før bruk\./g, "The calculation is preliminarily approved. The result must be checked by a qualified professional before use.")
    .replace(/\bPRELIMINARILY APPROVED\b/g, "PRELIMINARILY APPROVED")
    .replace(/\bPRELIMINARY\b/g, "PRELIMINARY")
    .replace(/\bMINOR DIFFERENCES\b/g, "MINOR DIFFERENCES")
    .replace(/\bGOOD\b/g, "GOOD")
    .replace(/\bEnige\b/g, "Agreement")
    .replace(/\bGodkjent\b/g, "Approved")
    .replace(/\bEngineer A\b/g, "Engineer A")
    .replace(/\bEngineer B\b/g, "Engineer B")
    .replace(/\bEngineerar\b/g, "Engineers")
    .replace(/\bEngineer\b/g, "Engineer")
    .replace(/\bengineers\b/g, "engineers")
    .replace(/\bkonstruktør\b/g, "engineer")
    .replace(/\bComparator\b/g, "Comparator")
    .replace(/\bComparator\b/g, "Comparator")
    .replace(/\bFAGLIG MERKNAD\b/g, "ENGINEERING NOTE")
    .replace(/\bFaglig merknad\b/g, "Engineering note")
    .replace(/\bANTAKELSER & ADVARSLER\b/g, "ASSUMPTIONS & WARNINGS")
    .replace(/\bMETODISKE FORSKJELLER\b/g, "METHODOLOGICAL DIFFERENCES")
    .replace(/\bFORSKJELLER I FORUTSETNINGER\b/g, "ASSUMPTION DIFFERENCES")
    .replace(/\bSkjul merknader\b/g, "Hide notes")
    .replace(/\bSkjul vurderingen\b/g, "Hide assessment")
    .replace(/\bSelvkontroll\b/g, "Self-check")
    .replace(/\bEgenvurdering\b/g, "Self-assessment")
    .replace(/\bikke en uavhengig verifikasjon\b/gi, "not an independent verification")
    .replace(/\bog B\b/g, "and B")
    .replace(/\bog Engineer B\b/g, "and Engineer B")
    .replace(/\bEngineer A and Engineer B\b/g, "Engineer A and Engineer B")
    .replace(/\bhar minor differences\b/g, "have minor differences")
    .replace(/\bNo critical deviations\b/g, "no critical deviations")
    .replace(/\brapporterer HIGH-konfidens\b/g, "reports HIGH confidence")
    .replace(/\brapporterer\b/g, "reports")
    .replace(/\bkonfidens\b/g, "confidence")
    .replace(/\bmetoden er etablert, alle nødvendige input er gitt, og resultatet er konsistent gjennom utregningen\b/g, "the method is established, all required input is available, and the result is consistent throughout the calculation")
    .replace(/\bløste oppgaven uten å se Engineer A sitt svar\b/g, "solved the task without seeing Engineer A's answer")
    .replace(/\bløste oppgaven uten å se A sitt svar\b/g, "solved the task without seeing Engineer A's answer")
    .replace(/\bB løste oppgaven uten å se A sitt svar\./g, "Engineer B solved the task without seeing Engineer A's answer.")
    .replace(/\bHIGH means at B er trygg på its own method — at Engineer A and Engineer B er enige er en separat sjekk \(see verdict above\)\./g, "HIGH means Engineer B is confident in their own method; agreement between Engineer A and Engineer B is a separate check.")
    .replace(/\buse the same basic method\b/g, "use the same basic method")
    .replace(/\bthe same basic method\b/g, "same basic method")
    .replace(/\bLRFD-kombinasjon\b/g, "LRFD combination")
    .replace(/\benkelfeltbjelke\b/g, "simply supported beam")
    .replace(/\bIngen metodisk forskjell er identifisert\b/g, "No methodological difference is identified")
    .replace(/\bpresenterer an alternative calculation route\b/g, "presents an alternative calculation route")
    .replace(/\bas an internal cross-check\b/g, "as an internal cross-check")
    .replace(/\bwhile\b/g, "while")
    .replace(/\bonly\b/g, "only")
    .replace(/\bthe main formula\b/g, "main formula")
    .replace(/\bDette er ei forskjell i presentasjonsform, ikkje i metode\b/g, "This is a difference in presentation, not in method")
    .replace(/\brapporterer eksplisitt\b/g, "reports explicitly")
    .replace(/\bload factors\b/g, "load factors")
    .replace(/\beigne resultatfelt\b/g, "separate result fields")
    .replace(/\binkluderer desse only som ein del av the text description\b/g, "includes these only as part of the text description")
    .replace(/\bInnhaldet er likeverdig men strukturen er ulik\b/g, "The content is equivalent, but the structure differs")
    .replace(/\bsignalisere?r dermed tydeleg at kapasitetskontroll manglar\b/g, "thereby clearly indicating that the capacity check is missing")
    .replace(/\bomtaler dette only\b/g, "describes this only")
    .replace(/\bBegge løysingane er i samsvar med AISC data guard-policyen\b/g, "Both solutions comply with the AISC data guard policy")
    .replace(/\bThe Cb assumption er identisk\b/g, "The Cb assumption is identical")
    .replace(/\bkonservativt\b/g, "conservative")
    .replace(/\bsom eit eige results-felt\b/g, "as a separate results field")
    .replace(/\bbeskriv det i assumptions og calculation_steps\b/g, "describes it in assumptions and calculation_steps")
    .replace(/\bBoth engineers nemner\b/g, "Both engineers mention")
    .replace(/\bBegge engineers nemner\b/g, "Both engineers mention")
    .replace(/\bBegge engineers\b/g, "Both engineers")
    .replace(/\buniformly loaded simple span\b/g, "uniformly loaded simple span")
    .replace(/\bassumption\b/g, "assumption")
    .replace(/\btolkaren sin instruksjon\b/g, "the interpreter's instruction")
    .replace(/\bNo difference i itself assumption\b/g, "No difference in the assumption itself")
    .replace(/\bBoth engineers legg til grunn\b/g, "Both engineers assume")
    .replace(/\bself-weight\b/g, "self-weight")
    .replace(/\binkludert\b/g, "included")
    .replace(/\bNo difference\b/g, "No difference")
    .replace(/\blast er påført i centroid\b/g, "the load is applied at the centroid")
    .replace(/\bshear center\b/g, "shear center")
    .replace(/\bflags\b/g, "flags")
    .replace(/\btopplastscenarioet\b/g, "the top-flange load scenario")
    .replace(/\bsomewhat more explicitly\b/g, "somewhat more explicitly")
    .replace(/\bassumptions-lista\b/g, "the assumptions list")
    .replace(/\bAntakelser\b/g, "Assumptions")
    .replace(/\bassumption\b/g, "assumption")
    .replace(/\bantaging\b/g, "assumption")
    .replace(/\bforskjell\b/g, "difference")
    .replace(/\bforskjeller\b/g, "differences")
    .replace(/\butrekning\b/g, "calculation")
    .replace(/\bprosjektering\b/g, "design work")
    .replace(/\bfagperson\b/g, "qualified professional");
}



function sprint337ResultUiText(value: string): string {
  return String(value ?? "")
    .replace(/\bSTEG 3 AV 3\s*·\s*RESULTAT\b/g, "STEP 3 OF 3 · RESULT")
    .replace(/\bCalculation note\b/g, "Calculation note")
    .replace(/\bForeløpig resultat med agentkontroll\. Må kontrolleres av fagperson før bruk\./g, "Preliminary result with agent control. Must be checked by a qualified professional before use.")
    .replace(/\bEngineer A\b/g, "Engineer A")
    .replace(/\bEngineer B\b/g, "Engineer B")
    .replace(/\bEngineer\b/g, "Engineer")
    .replace(/\bComparator\b/g, "Comparator")
    .replace(/\bComparator\b/g, "Comparator")
    .replace(/\bPRELIMINARILY APPROVED\b/g, "PRELIMINARILY APPROVED")
    .replace(/\bGOOD\b/g, "GOOD")
    .replace(/\bMINOR DIFFERENCES\b/g, "MINOR DIFFERENCES")
    .replace(/\bFAGLIG MERKNAD\b/g, "ENGINEERING NOTE")
    .replace(/\bANTAKELSER & ADVARSLER\b/g, "ASSUMPTIONS & WARNINGS")
    .replace(/\bMETODISKE FORSKJELLER\b/g, "METHODOLOGICAL DIFFERENCES")
    .replace(/\bFORSKJELLER I FORUTSETNINGER\b/g, "ASSUMPTION DIFFERENCES")
    .replace(/\bSkjul merknader\b/g, "Hide notes")
    .replace(/\bSkjul vurderingen\b/g, "Hide assessment")
    .replace(/\bSelvkontroll\b/g, "Self-check")
    .replace(/\bEgenvurdering\b/g, "Self-assessment")
    .replace(/\bIngen kritiske avvik\b/gi, "No critical deviations")
    .replace(/\bsmå forskjeller\b/gi, "minor differences")
    .replace(/\bferdig\s*[-–—]\s*leverer resultat til sammenligner\b/gi, "Done — sending result to Comparator");
}



function sprint3310aResultViewResidueText(value: string): string {
  return String(value ?? "")
    .replace(/Fortsetter fra tidligere beregning\./g, "Continuing from a previous calculation.")
    .replace(/Endringer oppretter en ny beregning\s*[—–-]\s*originalen forblir uendret\./g, "Changes create a new calculation — the original remains unchanged.")
    .replace(/\bAPPROVED\s+MED\s+ADVARSLER\b/gi, "APPROVED WITH WARNINGS")
    .replace(/\bAPPROVED\s+med\s+advarsler\b/gi, "APPROVED WITH WARNINGS")
    .replace(/\bApproved\s+med\s+advarsler\b/gi, "Approved with warnings")
    .replace(/\bMED\s+ADVARSLER\b/gi, "WITH WARNINGS")
    .replace(/\bmed\s+advarsler\b/gi, "with warnings")
    .replace(/\bMINDRE\s+DIFFERENCES\b/gi, "MINOR DIFFERENCES")
    .replace(/\bMINOR\s+FORSKJELLER\b/gi, "MINOR DIFFERENCES")
    .replace(/\bsmå\s+differences\b/gi, "minor differences")
    .replace(/\bsm├Ñ\s+differences\b/gi, "minor differences")
    .replace(/\bEngineer\s+Engineer A and B\b/g, "Engineer A and Engineer B")
    .replace(/\bEngineer\s+Engineer A and Engineer B\b/gi, "Engineer A and Engineer B")
    .replace(/\bEngineer A and B\b/g, "Engineer A and Engineer B")
    .replace(/\bEngineer A and Engineer B har minor differences\s*[—–-]\s*ingen kritiske avvik\.?/gi, "Engineer A and Engineer B have minor differences — no critical deviations.")
    .replace(/\bEngineer A and Engineer B har minor differences\s*[—–-]\s*ingen critical deviations\.?/gi, "Engineer A and Engineer B have minor differences — no critical deviations.")
    .replace(/\bEngineer A and Engineer B har små differences\s*[—–-]\s*ingen kritiske avvik\.?/gi, "Engineer A and Engineer B have minor differences — no critical deviations.")
    .replace(/\bEngineer A and Engineer B har sm├Ñ differences\s*[—–-]\s*ingen kritiske avvik\.?/gi, "Engineer A and Engineer B have minor differences — no critical deviations.")
    .replace(/\bEngineer A and Engineer B har minor differences\b/gi, "Engineer A and Engineer B have minor differences")
    .replace(/\bEngineer A and Engineer B har små differences\b/gi, "Engineer A and Engineer B have minor differences")
    .replace(/\bEngineer A and Engineer B har sm├Ñ differences\b/gi, "Engineer A and Engineer B have minor differences")
    .replace(/\bhar minor differences\b/gi, "have minor differences")
    .replace(/\bhar små differences\b/gi, "have minor differences")
    .replace(/\bhar sm├Ñ differences\b/gi, "have minor differences")
    .replace(/\bingen kritiske avvik\b/gi, "no critical deviations")
    .replace(/\bingen critical deviations\b/gi, "no critical deviations")
    .replace(/HIGH means at B er trygg på its own method\s*[—–-]\s*at Engineer A and Engineer B er enige er en separat sjekk \(see verdict above\)\./gi, "HIGH means that Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check.")
    .replace(/HIGH means at B er trygg p├Ñ its own method\s*(?:ÔÇö|[—–-])\s*at Engineer A and Engineer B er enige er en separat sjekk \(see verdict above\)\./gi, "HIGH means that Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check.")
    .replace(/\bHIGH means at B er trygg på its own method\b/gi, "HIGH means that Engineer B is confident in its own method")
    .replace(/\bHIGH means at B er trygg p├Ñ its own method\b/gi, "HIGH means that Engineer B is confident in its own method")
    .replace(/\bat Engineer A and Engineer B er enige er en separat sjekk\b/gi, "agreement between Engineer A and Engineer B is a separate check")
    .replace(/\bEngineer A and Engineer B er enige\b/gi, "Engineer A and Engineer B agree")
    .replace(/\ber enige\b/gi, "agree")
    .replace(/\ber trygg\b/gi, "is confident")
    .replace(/\bseparat sjekk\b/gi, "separate check")
    .replace(/\bAPPROVED WITH WARNINGS\b/g, "APPROVED WITH WARNINGS")
    .replace(/\bMINOR DIFFERENCES\b/g, "MINOR DIFFERENCES");
}

type CalculationResultViewProps = {
  // === Data ===
  calculationA: CalculationResult;
  calculationB: CalculationResult | null;
  comparison: ComparisonResult | null;
  controllerDecision: ControllerDecision | null;
  result: AgentResult | null;
  currentRunId: string | null;
  locale: Locale;
  engineeringContext?: EngineeringContext | null;

  // === Sticky-bar synleg-state (frå Home sin IntersectionObserver) ===
  kontrollorBelowFold: boolean;
  actionBarVisible: boolean;
  /** Mobile-detection frå Home (window.matchMedia("(max-width: 720px)")) */
  isMobile: boolean;

  // === Refs (IntersectionObserver-targets) ===
  kontrollorSentinelRef: React.RefObject<HTMLDivElement | null>;
  actionBarSentinelRef: React.RefObject<HTMLDivElement | null>;

  // === State + setters for disclosure-tilstand ===
  aMellomleddExpanded: boolean;
  setAMellomleddExpanded: (v: boolean) => void;
  kontrollorBExpanded: boolean | null;
  setKontrollorBExpanded: (v: boolean | null) => void;
  kontrollorProsaExpanded: boolean;
  setKontrollorProsaExpanded: (v: boolean) => void;
  selvkontrollExpanded: boolean | null;
  setSelvkontrollExpanded: (v: boolean | null) => void;
  comparisonGeneralExpanded: boolean;
  setComparisonGeneralExpanded: (v: boolean) => void;
  expandedComparisonRows: Set<number>;
  setExpandedComparisonRows: React.Dispatch<React.SetStateAction<Set<number>>>;
  stegvisViewMode: "minimal" | "full";
  setStegvisViewMode: (v: "minimal" | "full") => void;
  collapsedSteps: Set<number>;
  setCollapsedSteps: React.Dispatch<React.SetStateAction<Set<number>>>;

  // === Handlers ===
  handleBackToWorkbench: () => void;
  saveStateToSession: () => void;
};

export function CalculationResultView(props: CalculationResultViewProps) {
  const {
    calculationA,
    calculationB,
    comparison,
    controllerDecision,
    result,
    currentRunId,
    locale,
    engineeringContext = null,
    kontrollorBelowFold,
    actionBarVisible,
    isMobile,
    kontrollorSentinelRef,
    actionBarSentinelRef,
    aMellomleddExpanded,
    setAMellomleddExpanded,
    kontrollorBExpanded,
    setKontrollorBExpanded,
    kontrollorProsaExpanded,
    setKontrollorProsaExpanded,
    selvkontrollExpanded,
    setSelvkontrollExpanded,
    comparisonGeneralExpanded,
    setComparisonGeneralExpanded,
    expandedComparisonRows,
    setExpandedComparisonRows,
    stegvisViewMode,
    setStegvisViewMode,
    collapsedSteps,
    setCollapsedSteps,
    handleBackToWorkbench,
    saveStateToSession,
  } = props;

  // Hjelpe-funksjon: sjekk om ein output er blokka av Controlleren.
  // Definert inline sidan den only er ein wrapper rundt blocked_outputs-arrayet.
  const isBlocked = (key: string): boolean =>
    !!controllerDecision?.blocked_outputs?.includes(key);

  const displayLanguage = displayLanguageForContext(locale, engineeringContext);
  const isEnglishResult = displayLanguage === "en";
  const uiText = (value: string | null | undefined): string =>
    isEnglishResult ? sanitizeAiscGuardedOutputText(sprint3310aResultViewResidueText(sanitizeAiscGuardedOutputText(sprint339FinalNorwegianResidueText(sprint338ResultUiText(String(value ?? "")))))) : String(value ?? "");

  const WB_LABELS = buildLocalizedLabelProxy(BASE_WB_LABELS, locale, engineeringContext, {
    konstruktorA: "Engineer A",
    konstruktorB: "Engineer B",
    kontrollorAvgjerd: "Controller — final decision",
    kontrollor: "Controller",
    kortSvar: "Short answer",
    resultat: "Results",
    fortsetterFra: "Continuing from a previous calculation.",
    visMellomledd: "Show {n} intermediate values",
    skjulMellomledd: "Hide intermediate values",
    foresetnaderBrukt: "Assumptions used",
    stegvisUtrekning: "Step-by-step calculation",
    stegvisBerreFormel: "Formulas only",
    stegvisAlleSteg: "All steps",
    kvaErIkkjeRekna: "What is not calculated",
    atvaringar: "Warnings",
    konstruktorAKonfidens: "Engineer A confidence",
    konstruktorBKonfidens: "Engineer B confidence",
    konstruktorKonfidens: "Engineer confidence",
    konstruktorBIndependent: "Engineer B — independent check",
    samanliknarTittel: "Comparator — differences found",
    tabellFelt: "Field",
    tabellSkilnad: "Difference",
    tabellAlvor: "Severity",
    resultatetForebels: "The result is preliminary and must be checked by a qualified professional.",
    tilbake: "← Back",
    generRapport: "Generate report →",
  });

  return (
    <>
      {(() => {
            // Visningsprofil (#03) — auto-rekna basert på agent-output.
            // Bestemmer default-tilstand for B-blokka, generelle merknader
            // og avvik-rader. Indikator-pille viser kva tilstand sida er i,
            // men er ikkje klikkbar (kommunikasjon, ikkje kontroll).
            const effectiveProfile: Profile = computeProfile(controllerDecision, comparison, calculationA);
            const isKrevGjennomgang = effectiveProfile === "krev_gjennomgang";

            // FIKS 7 (F6): finst det faktisk advarsler? Engineer-warnings
            // eller Comparator sine metode-/assumption-skilnader.
            const hasAnyAdvarsel =
              (calculationA?.warnings?.length ?? 0) > 0 ||
              (calculationB?.warnings?.length ?? 0) > 0 ||
              (comparison?.method_differences?.length ?? 0) > 0 ||
              (comparison?.assumption_differences?.length ?? 0) > 0;

            // Per-profil styling for indikator-chip
            const profileChipStyle: Record<Profile, { bg: string; color: string; label: string; forklaring: string }> = {
              trygg: {
                bg: "var(--ok-bg)",
                color: "var(--ok)",
                label: WB_LABELS.profilTrygg[locale],
                forklaring: WB_LABELS.profilForklaringTrygg[locale],
              },
              standard: {
                bg: "var(--surface-2)",
                color: "var(--fg)",
                label: WB_LABELS.profilStandard[locale],
                // FIKS 7 (F6): "standard" dekkjer både godkjent-med-advarsler
                // og godkjent-utan. Vel forklaring etter om det FAKTISK finst
                // advarsler — same signal computeProfile les. Elles påstår
                // sida "med advarsler" på reine køyringar (slik A2 viste).
                forklaring: hasAnyAdvarsel
                  ? WB_LABELS.profilForklaringStandardMedAdvarsler[locale]
                  : WB_LABELS.profilForklaringStandard[locale],
              },
              krev_gjennomgang: {
                bg: "var(--warn-bg, rgba(180, 130, 30, 0.12))",
                color: "var(--warn, #B47A1E)",
                label: WB_LABELS.profilKrevGjennomgang[locale],
                forklaring: WB_LABELS.profilForklaringKrev[locale],
              },
            };
            const profStyle = profileChipStyle[effectiveProfile];

            return (
            <>
              {/* Profil-indikator (#03) — statisk visning av kva tilstand
                  sida er i. Ikkje klikkbar; viser kvifor sida ser ut som
                  den gjer for denne oppgåva. */}
              <section style={{ marginTop: 0, marginBottom: 12 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                  role="status"
                  aria-label={`${WB_LABELS.visningProfil[locale]}: ${profStyle.label}`}
                >
                  <span
                    className="uk-eyebrow"
                    style={{
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {WB_LABELS.visningProfil[locale]}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      background: profStyle.bg,
                      color: profStyle.color,
                      textTransform: "uppercase",
                    }}
                  >
                    {profStyle.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                    {profStyle.forklaring}
                  </span>
                </div>
              </section>

              {/* Controlleren si avgjerd — primær banner */}
              {/* Controller-kort (#02) — fire-sleng struktur:
                  (a) Status-badge + eyebrow
                  (b) Eitt-linjers verdikt frå comparison.match_status
                  (c) Fag-flagg-chips frå method/assumption_differences + warnings
                  (d) Lang prosa frå sprint339FinalNorwegianResidueText(controllerDecision.user_message) bak toggle
                  Beheld StatusStripe-shell for venstre-border + bakgrunn-tone. */}
              {controllerDecision && (() => {
                const rawChips = buildKontrollorChips(
                  comparison,
                  calculationA,
                  calculationB,
                  controllerDecision,
                  locale,
                );
                const chips = isEnglishResult
                  ? rawChips.map((chip) => ({
                      ...chip,
                      text: uiText(chip.text),
                      body: chip.body ? uiText(chip.body) : chip.body,
                    }))
                  : rawChips;
                const verdikt = comparison
                  ? getVerdiktForMatchStatus(comparison.match_status, locale)
                  : getFirstSentence(sprint339FinalNorwegianResidueText(controllerDecision.user_message));
                return (
                  <StatusStripe
                    status={DECISION_STATUS_TONES[controllerDecision.decision_status]}
                    className="mb-4"
                    header={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        <span className="uk-eyebrow" style={{ color: "inherit" }}>
                          {WB_LABELS.kontrollorAvgjerd[locale]}
                          <InfoPopover label={WB_LABELS.kontrollor[locale]}><p>{WB_LABELS.kontrollorPopover1[locale]} <strong>{WB_LABELS.kontrollorPopover2[locale]}</strong> {WB_LABELS.kontrollorPopover3[locale]}</p></InfoPopover>
                        </span>
                        <span className="pilar-breathe">
                          <Badge status={DECISION_STATUS_TONES[controllerDecision.decision_status]}>
                            <span className="pilar-puls-dot" aria-hidden="true" />
                            {uiText(decisionStatusLabel(controllerDecision.decision_status, locale))}
                          </Badge>
                        </span>
                      </div>
                    }
                  >
                    {/* (b) Eitt-linjers verdikt — fag-leseleg sammendrag */}
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, fontWeight: 500, color: "var(--fg)" }}>
                      {uiText(verdikt)}
                    </p>

                    {/* (c) Konfidens-chips + Fag-flagg-chips
                        Konfidens står i eiga rad over fag-flagga slik at
                        utviding av eit fag-flagg ikkje strekker konfidens-
                        chipane på same flex-line. Beggje use align-items
                        flex-start på containerane som ekstra safe-guard. */}
                    {chips.length > 0 && (() => {
                      // Skil konfidens-chips (dei to første om dei kjem frå
                      // calculationA/B.confidence — sjå buildKontrollorChips)
                      // frå fag-flagg-chips. Konfidens-chips har tekst i
                      // form "A · HIGH" / "B · HIGH".
                      const isConfidenceChip = (c: KontrollorChip) =>
                        /^[AB] · (HIGH|MEDIUM|LOW)$/.test(c.text);
                      const konfidensChips = chips.filter(isConfidenceChip);
                      const fagChips = chips.filter((c) => !isConfidenceChip(c));

                      return (
                        <div style={{ marginTop: 12 }}>
                          <div
                            className="uk-eyebrow"
                            style={{
                              marginBottom: 6,
                              fontSize: 10,
                              color: "var(--fg-muted)",
                            }}
                          >
                            {WB_LABELS.fagligMerknad[locale]}
                          </div>

                          {/* Konfidens-chips — eiga rad */}
                          {konfidensChips.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                alignItems: "flex-start",
                                marginBottom: fagChips.length > 0 ? 8 : 0,
                              }}
                            >
                              {konfidensChips.map((chip, i) => (
                                <KontrollorChipPill
                                  key={`konf-${i}`}
                                  chip={chip}
                                  index={i}
                                />
                              ))}
                            </div>
                          )}

                          {/* Fag-flagg-chips delt i to grupper (#lettlese5):
                              - "Metode": info-chips med prefix "+", dvs.
                                method_differences frå Comparator
                              - "Antakelser & advarsler": warn + neutral chips
                                med prefix "⚠", dvs. assumption_differences,
                                warnings og manual_review
                              Tidlegare var alle i ein lang liste — den kunne
                              bli 10-15 chips lang og uoversikteleg. Grupperinga
                              gir studenten ein skanne-friendly struktur. */}
                          {fagChips.length > 0 && (() => {
                            const methodChips = fagChips.filter((c) => c.tone === "info");
                            const warnChips = fagChips.filter((c) => c.tone !== "info");
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 14,
                                }}
                              >
                                {methodChips.length > 0 && (
                                  <div>
                                    <div
                                      className="uk-eyebrow"
                                      style={{
                                        fontSize: 10,
                                        color: "var(--fg-muted)",
                                        marginBottom: 6,
                                      }}
                                    >
                                      {WB_LABELS.fagligGruppeMetode[locale]}
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "stretch",
                                        gap: 6,
                                      }}
                                    >
                                      {methodChips.map((chip, i) => (
                                        <KontrollorChipPill
                                          key={`metode-${i}`}
                                          chip={chip}
                                          index={konfidensChips.length + i}
                                          enableAura
                                          fullWidth
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {warnChips.length > 0 && (
                                  <div>
                                    <div
                                      className="uk-eyebrow"
                                      style={{
                                        fontSize: 10,
                                        color: "var(--fg-muted)",
                                        marginBottom: 6,
                                      }}
                                    >
                                      {WB_LABELS.fagligGruppeAntakelser[locale]}
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "stretch",
                                        gap: 6,
                                      }}
                                    >
                                      {warnChips.map((chip, i) => (
                                        <KontrollorChipPill
                                          key={`warn-${i}`}
                                          chip={chip}
                                          index={konfidensChips.length + methodChips.length + i}
                                          enableAura
                                          fullWidth
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}

                    {/* (d) Sjølvkontroll-disclosure (#09) — viser
                        internal_consistency_issues frå Comparator.
                        Default: kollapsa når 0 funne, auto-utvida med raud
                        kant når >0. Brukar kan toggle manuelt. */}
                    {comparison && (() => {
                      // FIKS 5 (F3): tel only REELLE inkonsistensar. Comparator
                      // legg av og til inn ei "ingen inkonsistensar funne"-oppføring
                      // i staden for ei tom liste — den skal ikkje teljast. Same
                      // isRealIssue-predikat som agent-c use (delt modul).
                      const issuesA = (
                        comparison.internal_consistency_issues?.agent_a ?? []
                      ).filter(isRealIssue);
                      const issuesB = (
                        comparison.internal_consistency_issues?.agent_b ?? []
                      ).filter(isRealIssue);
                      const totalIssues = issuesA.length + issuesB.length;
                      // null = default kollapsa. Brukar må klikke for å opne.
                      // Tidligare auto-opna ved >0 issues, men use har bedt
                      // om å sjølv kontrollere når det vises.
                      const isExpanded =
                        selvkontrollExpanded === null
                          ? false
                          : selvkontrollExpanded;
                      const hasCritical =
                        [...issuesA, ...issuesB].some(
                          (i) => i.severity === "high" || i.severity === "critical",
                        );
                      const labelText =
                        totalIssues === 0
                          ? WB_LABELS.sjølvkontrollIngen[locale]
                          : WB_LABELS.sjølvkontrollFunne[locale].replace(
                              "{n}",
                              String(totalIssues),
                            );

                      return (
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => setSelvkontrollExpanded(!isExpanded)}
                            aria-expanded={isExpanded}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "4px 0",
                              color: totalIssues > 0 ? "var(--warn)" : "var(--fg-2)",
                              fontSize: 13,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              textAlign: "left",
                              fontFamily: "inherit",
                              fontWeight: totalIssues > 0 ? 600 : 400,
                            }}
                          >
                            <span
                              className={`pilar-chevron${isExpanded ? " pilar-chevron--open" : ""}`}
                              style={{
                                color: "var(--fg-muted)",
                                fontSize: 11,
                              }}
                            >
                              ▸
                            </span>
                            <span>
                              {WB_LABELS.sjølvkontrollEtikett[locale]}: {labelText}
                            </span>
                          </button>
                          {isExpanded && totalIssues > 0 && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: "10px 12px",
                                background: "var(--warn-bg)",
                                border: "1px solid var(--warn-border)",
                                borderLeft: `3px solid ${hasCritical ? "var(--bad, #c04848)" : "var(--warn)"}`,
                                borderRadius: "var(--r-sm)",
                              }}
                            >
                              {issuesA.length > 0 && (
                                <div style={{ marginBottom: issuesB.length > 0 ? 10 : 0 }}>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "var(--fg)",
                                      marginBottom: 4,
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {WB_LABELS.konstruktorA?.[locale] ?? "Engineer A"}
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      padding: 0,
                                      listStyle: "none",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 8,
                                    }}
                                  >
                                    {issuesA.map((issue, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 12,
                                          fontSize: 13.5,
                                          color: "var(--fg-2)",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            flexShrink: 0,
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--warn)",
                                            marginTop: 8,
                                          }}
                                        />
                                        <span style={{ minWidth: 0 }}>
                                          {uiText(issue.issue)}{" "}
                                          <Badge status={SEVERITY_TONES[issue.severity]}>{issue.severity}</Badge>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {issuesB.length > 0 && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "var(--fg)",
                                      marginBottom: 4,
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {WB_LABELS.konstruktorB?.[locale] ?? "Engineer B"}
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      padding: 0,
                                      listStyle: "none",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 8,
                                    }}
                                  >
                                    {issuesB.map((issue, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 12,
                                          fontSize: 13.5,
                                          color: "var(--fg-2)",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            flexShrink: 0,
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--warn)",
                                            marginTop: 8,
                                          }}
                                        />
                                        <span style={{ minWidth: 0 }}>
                                          {uiText(issue.issue)}{" "}
                                          <Badge status={SEVERITY_TONES[issue.severity]}>{issue.severity}</Badge>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* (e) Les heile vurderinga ▸ — kollapsa lang prosa.
                        Vis only om user_message er meir enn éi setning
                        (elles er verdikt-linja + chips alt use treng). */}
                    {sprint339FinalNorwegianResidueText(controllerDecision.user_message) &&
                      sprint339FinalNorwegianResidueText(controllerDecision.user_message).trim() !== verdikt.trim() && (
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => setKontrollorProsaExpanded(!kontrollorProsaExpanded)}
                            aria-expanded={kontrollorProsaExpanded}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "4px 0",
                              color: "var(--fg-2)",
                              fontSize: 13,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              textAlign: "left",
                              fontFamily: "inherit",
                            }}
                          >
                            <span
                              className={`pilar-chevron${kontrollorProsaExpanded ? " pilar-chevron--open" : ""}`}
                              style={{ color: "var(--fg-muted)", fontSize: 11 }}
                            >
                              ▸
                            </span>
                            <span>
                              {kontrollorProsaExpanded
                                ? WB_LABELS.skjulVurderinga[locale]
                                : WB_LABELS.lesHeileVurderinga[locale]}
                            </span>
                          </button>
                          {kontrollorProsaExpanded && (
                            <div
                              style={{
                                margin: "10px 0 0",
                                padding: "14px 16px",
                                background: "rgba(0, 0, 0, 0.025)",
                                borderLeft: "3px solid var(--border)",
                                borderRadius: 4,
                                fontSize: 14,
                                lineHeight: 1.7,
                                color: "var(--fg-2)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                              }}
                            >
                              {/* Splitt prosaen i setningar (punktum/utropsteikn
                                  + space + stor bokstav) for å gje lufti
                                  paragraf-pattern. Engineer-namn vert markert
                                  fed slik at lesaren kan skanne kven som gjorde
                                  kva. Same regex som chip-body i KontrollorChipPill. */}
                              {uiText(sprint339FinalNorwegianResidueText(controllerDecision.user_message))
                                .split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])/)
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .map((sentence, i) => {
                                  const m = sentence.match(
                                    /^(Engineer [AB]s?|Both engineers?|Begge tilnærminger?|Resultatet|Beregningen)/
                                  );
                                  return (
                                    <p key={i} style={{ margin: 0 }}>
                                      {m ? (
                                        <>
                                          <strong style={{ fontWeight: 600, color: "var(--fg)" }}>
                                            {m[0]}
                                          </strong>
                                          {sentence.slice(m[0].length)}
                                        </>
                                      ) : (
                                        sentence
                                      )}
                                    </p>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}
                  </StatusStripe>
                );
              })()}

              {/* Sentinel for sticky decision-bar (#07) — IntersectionObserver
                  detekterer når denne er ute av view (= studenten har scrolla
                  forbi Controller-kortet) og viser sticky-onlyn då. */}
              <div ref={kontrollorSentinelRef} aria-hidden="true" style={{ height: 1 }} />

              {/* Fallback: Comparator-banner viss Controlleren feila */}
              {!controllerDecision && comparison && (
                <StatusStripe
                  status={MATCH_STATUS_TONES[comparison.match_status]}
                  className="mb-4"
                  header={
                    <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                      {uiText(matchStatusLabel(comparison.match_status, locale))}
                    </div>
                  }
                >
                  {uiText(comparison.summary)}
                </StatusStripe>
              )}

              {/* Kort svar — eller blokka-varsel — eller dimensjonerande tiles (#01) */}
              {(() => {
                const shortConclusionBlocked =
                  isBlocked("short_conclusion_a") || isBlocked("short_conclusion_b");
                const resultsAvailable =
                  !isBlocked("results_a") &&
                  Object.keys(calculationA.results || {}).length > 0;
                const tilesKeys = resultsAvailable
                  ? getDimensjonerandeKeys(
                      calculationA.results,
                      result?.berekningstype ?? null,
                      calculationA.result_roles,
                    )
                  : [];
                const tilesShown = tilesKeys.length > 0;

                return (
                  <>
                    {/* Warn-stripe når Controlleren har blokka sluttkonklusjon.
                        Tiles vises framleis under viss results er OK — studenten
                        treng eit svar å skanne sjølv om prosa er blokka. */}
                    {shortConclusionBlocked && (
                      <StatusStripe status="warn" className={tilesShown ? "mb-4" : undefined}>
                        <strong>{WB_LABELS.sluttkonklusjonUtelaten[locale]}</strong>{" "}
                        {WB_LABELS.hallusinasjonarTekst[locale]}
                      </StatusStripe>
                    )}

                    {/* Dimensjonerande tiles — primær avlevering av svaret (#01).
                        Erstattar "Kort svar"-prosa når results er tilgjengelege. */}
                    {tilesShown && (
                      <DimensjonerandeTiles
                        results={calculationA.results}
                        calculationType={result?.berekningstype ?? null}
                        locale={locale}
                        resultRoles={calculationA.result_roles}
                      />
                    )}

                    {/* Prosa-fallback når tiles ikkje kan visast (ingen results,
                        eller alle results-keys er blokka). */}
                    {!shortConclusionBlocked && !tilesShown && (
                      <StatusStripe
                        status="ok"
                        header={
                          <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                            {WB_LABELS.kortSvar[locale]}
                          </div>
                        }
                      >
                        <span style={{ fontSize: 15, color: "var(--fg)", fontWeight: 500 }}>
                          {uiText(calculationA.short_conclusion)}
                        </span>
                      </StatusStripe>
                    )}
                  </>
                );
              })()}

              {/* Resultat-objekt — splittast i Dimensjonerande + Mellomledd (#06).
                  Dimensjonerande rader: same keys som tiles i #01, men med
                  fag-typografi (15px tal, høgrejustert eining) for studenten
                  som vil verifisere. Mellomledd: alle andre keys, kollapsa
                  bak ein "Vis X intermediate value ▸"-toggle. */}
              {!isBlocked("results_a") && Object.keys(calculationA.results || {}).length > 0 && (() => {
                const allEntries = Object.entries(calculationA.results);
                const dimensjonerandeKeys = getDimensjonerandeKeys(
                  calculationA.results,
                  result?.berekningstype ?? null,
                  calculationA.result_roles,
                );
                const dimensjonerandeSet = new Set(dimensjonerandeKeys);
                const dimensjonerandeEntries = dimensjonerandeKeys
                  .map((k) => [k, calculationA.results[k]] as [string, string])
                  .filter(([, v]) => v !== undefined);
                const intermediateValueEntries = allEntries.filter(([k]) => !dimensjonerandeSet.has(k));
                const intermediateValueCount = intermediateValueEntries.length;

                return (
                  <section className="uk-card" style={{ marginTop: 16 }}>
                    <div className="uk-card__hd">
                      <div className="uk-card__title">{WB_LABELS.resultat[locale]}</div>
                    </div>
                    <div className="uk-card__bd">
                      {/* Dimensjonerande verdiar — fag-typografi, alltid synleg */}
                      {dimensjonerandeEntries.map(([k, v], i) => {
                        const { number, unit } = splitNumberUnit(v);
                        return (
                          <div
                            key={k}
                            className="uk-kv"
                            style={{
                              borderTop: i === 0 ? "none" : undefined,
                              padding: "10px 0",
                            }}
                          >
                            <span className="uk-kv__k uk-mono">{renderMathKey(k)}</span>
                            <span
                              className="uk-kv__v"
                              style={{
                                display: "flex",
                                alignItems: "baseline",
                                justifyContent: "flex-end",
                                gap: 6,
                              }}
                            >
                              <span
                                className="uk-mono"
                                style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}
                              >
                                {number}
                              </span>
                              {unit && (
                                <span
                                  className="uk-mono"
                                  style={{ fontSize: 12, color: "var(--fg-muted)" }}
                                >
                                  {unit}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {/* Mellomledd-disclosure — kollapsa rader for sporbarheit */}
                      {intermediateValueCount > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAMellomleddExpanded(!aMellomleddExpanded)}
                            aria-expanded={aMellomleddExpanded}
                            style={{
                              background: "none",
                              border: "none",
                              borderTop: "1px solid var(--border)",
                              marginTop: dimensjonerandeEntries.length > 0 ? 6 : 0,
                              padding: "12px 0 6px",
                              width: "100%",
                              color: "var(--fg-2)",
                              fontSize: 13,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              textAlign: "left",
                              fontFamily: "inherit",
                            }}
                          >
                            <span
                              className={`pilar-chevron${aMellomleddExpanded ? " pilar-chevron--open" : ""}`}
                              style={{ color: "var(--fg-muted)", fontSize: 11 }}
                            >
                              ▸
                            </span>
                            <span>
                              {aMellomleddExpanded
                                ? WB_LABELS.skjulMellomledd[locale]
                                : WB_LABELS.visMellomledd[locale].replace(
                                    "{n}",
                                    String(intermediateValueCount),
                                  )}
                            </span>
                          </button>
                          {aMellomleddExpanded && (
                            <div
                              style={{
                                borderTop: "1px solid var(--border)",
                                marginTop: 2,
                                paddingTop: 4,
                              }}
                            >
                              {intermediateValueEntries.map(([k, v], i) => (
                                <div
                                  key={k}
                                  className="uk-kv"
                                  style={{ borderTop: i === 0 ? "none" : undefined }}
                                >
                                  <span className="uk-kv__k uk-mono">{renderMathKey(k)}</span>
                                  <span className="uk-kv__v uk-mono" style={{ fontWeight: 600 }}>
                                    {uiText(String(v))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Fallback: viss ingen dimensjonerande kunne plukkast ut
                          (sjeldan edge case), vis flat tabell som før. */}
                      {dimensjonerandeEntries.length === 0 && intermediateValueCount === 0 && (
                        <div style={{ color: "var(--fg-muted)", fontSize: 13, padding: "8px 0" }}>
                          —
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

              {/* Føresetnader */}
              {calculationA.assumptions?.length > 0 && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div className="uk-card__title">{WB_LABELS.foresetnaderBrukt[locale]}</div>
                  </div>
                  <div className="uk-card__bd">
                    <ul
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {calculationA.assumptions.map((a, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            gap: 12,
                            fontSize: 13.5,
                            color: "var(--fg-2)",
                            lineHeight: 1.55,
                            paddingLeft: 0,
                          }}
                        >
                          {/* Eigen bullet i staden for default list-marker
                              for å gje tydelegare visuelt anker per item. */}
                          <span
                            aria-hidden="true"
                            style={{
                              flexShrink: 0,
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "var(--fg-muted)",
                              marginTop: 8,
                            }}
                          />
                          <span style={{ minWidth: 0 }}>{uiText(a)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Stegvis utrekning (#08) — view-toggle + anker-chips +
                  per-steg-kollaps. Tre modus for tre flytar:
                  - "minimal" + alle utvida: skim formel-uttrykk (rask check)
                  - "full" + alle utvida: full innsetting + prosa (djup gjennomgang)
                  - kollaps per steg: hoppe direkte til avvikande verdi (forskjell-vurdering) */}
              {!isBlocked("calculation_steps_a") && calculationA.calculation_steps?.length > 0 && (() => {
                const steps = calculationA.calculation_steps;
                const toggleStepCollapse = (i: number) => {
                  setCollapsedSteps((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  });
                };

                return (
                  <section className="uk-card" style={{ marginTop: 16 }}>
                    <div className="uk-card__hd" style={{ flexWrap: "wrap", gap: 12 }}>
                      <div className="uk-card__title">{WB_LABELS.stegvisUtrekning[locale]}</div>
                      {/* View-toggle (#08) */}
                      <div
                        role="radiogroup"
                        aria-label={WB_LABELS.stegvisUtrekning[locale]}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: 999,
                          padding: 2,
                          marginLeft: "auto",
                        }}
                      >
                        {([
                          { id: "minimal" as const, label: WB_LABELS.stegvisBerreFormel[locale] },
                          { id: "full" as const, label: WB_LABELS.stegvisAlleSteg[locale] },
                        ]).map((m) => {
                          const isActive = stegvisViewMode === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              onClick={() => setStegvisViewMode(m.id)}
                              style={{
                                appearance: "none",
                                font: "inherit",
                                fontSize: 11,
                                fontWeight: isActive ? 600 : 400,
                                padding: "3px 10px",
                                background: isActive ? "var(--fg)" : "transparent",
                                color: isActive ? "var(--surface)" : "var(--fg-2)",
                                border: "none",
                                borderRadius: 999,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: "background 0.15s ease, color 0.15s ease",
                              }}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="uk-card__bd">
                      {/* MERK: Anker-chips er fjerna etter use-feedback —
                          dei gav for mykje UI-støy i Stegvis-blokka. Per-steg-
                          kollaps (klikk på tittel) gir nok navigasjon, og
                          "Bare formlene"-toggle er primær view-styring. */}

                      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {steps.map((step, i) => {
                          const isCollapsed = collapsedSteps.has(i);
                          const formulaLines = extractFormulaLines(step.text);
                          return (
                            <li
                              key={i}
                              id={`stegvis-step-${i}`}
                              style={{
                                display: "flex",
                                gap: 14,
                                paddingTop: i === 0 ? 0 : 18,
                                scrollMarginTop: "calc(var(--header-height, 64px) + 12px)",
                              }}
                            >
                              <div
                                className="uk-mono"
                                style={{
                                  flexShrink: 0,
                                  width: 26,
                                  height: 26,
                                  borderRadius: "50%",
                                  background: "var(--fg)",
                                  color: "var(--surface)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                {i + 1}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Klikkbar tittel-rad — toggle per-steg-kollaps */}
                                <button
                                  type="button"
                                  onClick={() => toggleStepCollapse(i)}
                                  aria-expanded={!isCollapsed}
                                  style={{
                                    appearance: "none",
                                    font: "inherit",
                                    textAlign: "left",
                                    width: "100%",
                                    background: "none",
                                    border: "none",
                                    padding: "2px 0 4px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    color: "var(--fg)",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  <span
                                    className={`pilar-chevron${!isCollapsed ? " pilar-chevron--open" : ""}`}
                                    style={{
                                      color: "var(--fg-muted)",
                                      fontSize: 11,
                                      flexShrink: 0,
                                    }}
                                  >
                                    ▸
                                  </span>
                                  <h4
                                    style={{
                                      margin: 0,
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: "var(--fg)",
                                    }}
                                  >
                                    {uiText(step.title)}
                                  </h4>
                                </button>

                                {/* Innhald — varierer med view-mode + collaps */}
                                {!isCollapsed && (
                                  <>
                                    {stegvisViewMode === "minimal" && formulaLines.length > 0 ? (
                                      // Minimal: only formel-linjer i mono
                                      <pre
                                        style={{
                                          margin: 0,
                                          fontFamily: "var(--font-mono, monospace)",
                                          fontSize: 13,
                                          color: "var(--fg)",
                                          whiteSpace: "pre-wrap",
                                          lineHeight: 1.6,
                                        }}
                                      >
                                        {uiText(formulaLines.join("\n"))}
                                      </pre>
                                    ) : (
                                      // Full: heile text (innsetting + prosa)
                                      <pre
                                        style={{
                                          margin: 0,
                                          fontFamily: "var(--font-ui)",
                                          fontSize: 13,
                                          color: "var(--fg-2)",
                                          whiteSpace: "pre-wrap",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        {uiText(step.text)}
                                      </pre>
                                    )}
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </section>
                );
              })()}

              {/* Avgrensingar */}
              {calculationA.limitations?.length > 0 && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div className="uk-card__title" style={{ color: "var(--warn)" }}>
                      {WB_LABELS.kvaErIkkjeRekna[locale]}
                    </div>
                  </div>
                  <div className="uk-card__bd">
                    <ul
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {calculationA.limitations.map((l, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            gap: 12,
                            fontSize: 13.5,
                            color: "var(--fg-2)",
                            lineHeight: 1.55,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              flexShrink: 0,
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "var(--fg-muted)",
                              marginTop: 8,
                            }}
                          />
                          <span style={{ minWidth: 0 }}>{uiText(l)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Åtvaringar */}
              {calculationA.warnings?.length > 0 && (
                <StatusStripe
                  status="warn"
                  className="mt-4"
                  header={
                    <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                      {WB_LABELS.atvaringar[locale]}
                    </div>
                  }
                >
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {calculationA.warnings.map((w, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: 12,
                          fontSize: 13.5,
                          color: "var(--fg-2)",
                          lineHeight: 1.55,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            flexShrink: 0,
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "var(--warn)",
                            marginTop: 8,
                          }}
                        />
                        <span style={{ minWidth: 0 }}>{uiText(w)}</span>
                      </li>
                    ))}
                  </ul>
                </StatusStripe>
              )}

              {/* Engineer B-resultat (#04) — disclosure-pattern.
                  Default kollapsa når Engineer A and Engineer B er enige (vanlegaste tilfelle),
                  auto-utvida ved significant_differences / critical_disagreement.
                  Brukar kan toggle manuelt; kontrollorBExpanded null = auto,
                  true/false = manuell overstyring. */}
              {calculationB && (() => {
                // Avgjer kollapsa/utvida-tilstand. Auto-utvida ved
                // "krev_gjennomgang"-profilen (#03), elles kollapsa.
                const matchStatus = comparison?.match_status;
                const autoExpand = isKrevGjennomgang;
                const isExpanded =
                  kontrollorBExpanded === null ? autoExpand : kontrollorBExpanded;

                // Summary-tekst i kollapsa state
                const summaryLabel = (() => {
                  if (!matchStatus) return uiText(WB_LABELS.bUtanComparison[locale]);
                  if (matchStatus === "match") return uiText(WB_LABELS.bEnigeMedA[locale]);
                  if (matchStatus === "minor_differences") return uiText(WB_LABELS.bMindreSkilnader[locale]);
                  if (matchStatus === "significant_differences") return uiText(WB_LABELS.bVesentlegAvvik[locale]);
                  return uiText(WB_LABELS.bKritiskUsemje[locale]);
                })();
                const summaryTone = MATCH_STATUS_TONES[matchStatus ?? "match"];

                return (
                  <section
                    className="uk-card"
                    style={{
                      marginTop: 16,
                      background: "var(--surface-2)",
                    }}
                  >
                    {/* Disclosure-header (alltid synleg, klikkbar) */}
                    <button
                      type="button"
                      onClick={() => setKontrollorBExpanded(!isExpanded)}
                      aria-expanded={isExpanded}
                      style={{
                        // Reset
                        appearance: "none",
                        font: "inherit",
                        textAlign: "left",
                        // Layout
                        width: "100%",
                        background: "none",
                        border: "none",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        cursor: "pointer",
                        color: "var(--fg)",
                      }}
                    >
                      <span
                        className={`pilar-chevron${isExpanded ? " pilar-chevron--open" : ""}`}
                        style={{ color: "var(--fg-muted)", fontSize: 11 }}
                      >
                        ▸
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {WB_LABELS.bUavhengigKontroll[locale]}
                      </span>
                      <span style={{ color: "var(--fg-muted)" }}>·</span>
                      <Badge status={summaryTone}>{summaryLabel}</Badge>
                      {calculationB.confidence && (
                        <>
                          <span style={{ color: "var(--fg-muted)" }}>·</span>
                          <span style={{ fontSize: 12, color: "var(--fg-2)" }}>
                            {WB_LABELS.bKonfidens[locale]}{" "}
                            <span className="uk-mono" style={{ fontWeight: 600 }}>
                              {calculationB.confidence.toUpperCase()}
                            </span>
                          </span>
                        </>
                      )}
                    </button>

                    {/* Innhald (kort + tabell) — only synleg når utvida */}
                    {isExpanded && (
                      <div
                        className="uk-card__bd"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          paddingTop: 4,
                        }}
                      >
                        {/* B-eyebrow-undertittel — gir kontekst til disclosure-headeren */}
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--fg-muted)",
                            fontStyle: "italic",
                            marginBottom: 4,
                          }}
                        >
                          {WB_LABELS.loysteOppgavaUtan[locale]}
                        </span>

                        {!isBlocked("short_conclusion_b") && (
                          <div
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--r-sm)",
                              padding: 12,
                            }}
                          >
                            <div className="uk-eyebrow" style={{ marginBottom: 4 }}>
                              {WB_LABELS.konstruktorBKonklusjon[locale]}
                            </div>
                            <p style={{ margin: 0, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
                              {uiText(calculationB.short_conclusion)}
                            </p>
                          </div>
                        )}

                        {!isBlocked("results_b") && Object.keys(calculationB.results || {}).length > 0 && (
                          <div
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--r-sm)",
                              padding: 12,
                            }}
                          >
                            <div className="uk-eyebrow" style={{ marginBottom: 6 }}>
                              {WB_LABELS.konstruktorBResultat[locale]}
                            </div>
                            {Object.entries(calculationB.results).map(([k, v], i) => (
                              <div
                                key={k}
                                className="uk-kv"
                                style={{ borderTop: i === 0 ? "none" : undefined, padding: "6px 0" }}
                              >
                                <span className="uk-kv__k uk-mono">{renderMathKey(k)}</span>
                                <span className="uk-kv__v uk-mono" style={{ fontWeight: 600 }}>
                                  {uiText(String(v))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })()}

              {/* Comparison details — Comparator (#05).
                  Éin tabell med ekspander-rader. Per-felt-prosa (likely_cause)
                  flytta inn som "Kvifor"-detalj i rad-ekspansjon. Method- og
                  assumption-differences kollapsa som "Generelle merknader"
                  nedst — dei er ikkje per-rad-bundne. */}
              {comparison && (() => {
                // FIKS 8 (F5): ein verdi Controller har blokkert skal aldri
                // stå i samanliknings-/✓-tabellen. isBlocked dekkjer blokk-
                // nivå-nøklane; her filtrerer vi i tillegg per felt, slik at
                // ein blokkert enkelt-verdi heller ikkje viser samsvar.
                const numericDiffs = (comparison.numeric_differences ?? []).filter(
                  (d) => !isBlocked(d.field) && !isBlocked(`results_a:${d.field}`),
                );
                const methodDiffs = comparison.method_differences ?? [];
                const assumptionDiffs = comparison.assumption_differences ?? [];
                const hasNumeric = numericDiffs.length > 0;
                const hasGeneral = methodDiffs.length > 0 || assumptionDiffs.length > 0;

                if (!hasNumeric && !hasGeneral) return null;

                const toggleRow = (i: number) => {
                  setExpandedComparisonRows((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  });
                };

                return (
                  <section className="uk-card" style={{ marginTop: 16 }}>
                    <div className="uk-card__hd">
                      <div className="uk-card__title">{WB_LABELS.samanliknarSkilnader[locale]}</div>
                      <Badge status={MATCH_STATUS_TONES[comparison.match_status]}>
                        {uiText(matchStatusLabel(comparison.match_status, locale))}
                      </Badge>
                    </div>
                    <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {hasNumeric && (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {/* Chevron-kolonne (24px) + dei fire info-kolonnene */}
                                <th style={{ width: 24, padding: "8px 0" }} aria-hidden="true" />
                                {[WB_LABELS.tabellFelt[locale], WB_LABELS.konstruktorA?.[locale] ?? "Engineer A", WB_LABELS.konstruktorB?.[locale] ?? "Engineer B", WB_LABELS.tabellSkilnad[locale], WB_LABELS.tabellAlvor[locale]].map((h) => (
                                  <th
                                    key={h}
                                    className="uk-eyebrow"
                                    style={{ textAlign: "left", padding: "8px 10px 8px 0", fontWeight: 500 }}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {numericDiffs.map((diff, i) => {
                                const isOpen = expandedComparisonRows.has(i);
                                const isClickable = !!diff.likely_cause?.trim();
                                return (
                                  <Fragment key={i}>
                                    <tr
                                      onClick={isClickable ? () => toggleRow(i) : undefined}
                                      onKeyDown={
                                        isClickable
                                          ? (e) => {
                                              if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                toggleRow(i);
                                              }
                                            }
                                          : undefined
                                      }
                                      tabIndex={isClickable ? 0 : undefined}
                                      role={isClickable ? "button" : undefined}
                                      aria-expanded={isClickable ? isOpen : undefined}
                                      style={{
                                        borderBottom: isOpen
                                          ? "none"
                                          : "1px solid var(--border)",
                                        cursor: isClickable ? "pointer" : "default",
                                      }}
                                    >
                                      <td style={{ padding: "8px 0", color: "var(--fg-muted)", fontSize: 11 }}>
                                        {isClickable && (
                                          <span
                                            className={`pilar-chevron${isOpen ? " pilar-chevron--open" : ""}`}
                                          >
                                            ▸
                                          </span>
                                        )}
                                      </td>
                                      <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg-2)" }}>
                                        {renderMathKey(diff.field)}
                                      </td>
                                      <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg)" }}>
                                        {diff.agent_a_value}
                                      </td>
                                      <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg)" }}>
                                        {diff.agent_b_value}
                                      </td>
                                      <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg)" }}>
                                        {diff.percent_diff?.toFixed(1)}%
                                      </td>
                                      <td style={{ padding: "8px 0" }}>
                                        <Badge status={SEVERITY_TONES[diff.severity]}>{diff.severity}</Badge>
                                      </td>
                                    </tr>
                                    {isOpen && isClickable && (
                                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td />
                                        <td colSpan={5} style={{ padding: "0 0 12px" }}>
                                          <div
                                            style={{
                                              background: "var(--surface-2)",
                                              borderRadius: "var(--r-sm)",
                                              padding: "10px 12px",
                                              fontSize: 13,
                                              lineHeight: 1.55,
                                              color: "var(--fg-2)",
                                            }}
                                          >
                                            <div style={{ marginBottom: 6 }}>
                                              <span style={{ fontWeight: 600, color: "var(--fg)" }}>
                                                {WB_LABELS.samanliknarKvifor[locale]}
                                              </span>{" "}
                                              {uiText(diff.likely_cause)}
                                            </div>
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: 16,
                                                flexWrap: "wrap",
                                                fontSize: 12,
                                                color: "var(--fg-muted)",
                                                marginTop: 6,
                                                paddingTop: 6,
                                                borderTop: "1px dashed var(--border)",
                                              }}
                                            >
                                              <span>
                                                {WB_LABELS.samanliknarAVerdi[locale]}:{" "}
                                                <span className="uk-mono" style={{ color: "var(--fg-2)", fontWeight: 500 }}>
                                                  {diff.agent_a_value}
                                                </span>
                                              </span>
                                              <span>
                                                {WB_LABELS.samanliknarBVerdi[locale]}:{" "}
                                                <span className="uk-mono" style={{ color: "var(--fg-2)", fontWeight: 500 }}>
                                                  {diff.agent_b_value}
                                                </span>
                                              </span>
                                              <span>
                                                {WB_LABELS.tabellSkilnad[locale]}:{" "}
                                                <span className="uk-mono" style={{ color: "var(--fg-2)", fontWeight: 500 }}>
                                                  {diff.percent_diff?.toFixed(1)}%
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Generelle merknader frå Comparator (#05) — method +
                          assumption differences som ikkje knytt til ein rad.
                          Disclosure, kollapsa default. */}
                      {hasGeneral && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setComparisonGeneralExpanded(!comparisonGeneralExpanded)}
                            aria-expanded={comparisonGeneralExpanded}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "4px 0",
                              color: "var(--fg-2)",
                              fontSize: 13,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              textAlign: "left",
                              fontFamily: "inherit",
                            }}
                          >
                            <span
                              className={`pilar-chevron${comparisonGeneralExpanded ? " pilar-chevron--open" : ""}`}
                              style={{ color: "var(--fg-muted)", fontSize: 11 }}
                            >
                              ▸
                            </span>
                            <span>
                              {comparisonGeneralExpanded
                                ? WB_LABELS.skjulMerknader[locale]
                                : `${WB_LABELS.generelleMerknader[locale]} (${methodDiffs.length + assumptionDiffs.length})`}
                            </span>
                          </button>
                          {comparisonGeneralExpanded && (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
                              {methodDiffs.length > 0 && (
                                <div>
                                  <div className="uk-eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>
                                    {WB_LABELS.metodiskeSkilnader[locale]}
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      padding: 0,
                                      listStyle: "none",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 10,
                                    }}
                                  >
                                    {methodDiffs.map((m, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 12,
                                          fontSize: 13.5,
                                          color: "var(--fg-2)",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            flexShrink: 0,
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--fg-muted)",
                                            marginTop: 8,
                                          }}
                                        />
                                        <span style={{ minWidth: 0 }}>{uiText(m)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {assumptionDiffs.length > 0 && (
                                <div>
                                  <div className="uk-eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>
                                    {WB_LABELS.forskjellarForesetnader[locale]}
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      padding: 0,
                                      listStyle: "none",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 10,
                                    }}
                                  >
                                    {assumptionDiffs.map((a, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 12,
                                          fontSize: 13.5,
                                          color: "var(--fg-2)",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            flexShrink: 0,
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--fg-muted)",
                                            marginTop: 8,
                                          }}
                                        />
                                        <span style={{ minWidth: 0 }}>{uiText(a)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* MERK: Intern inkonsistens-blokka er flytta inn i
                          Controller-kortet som sjølvkontroll-disclosure (#09).
                          Sjå JSX inni controllerDecision-blokka over. */}
                    </div>
                  </section>
                );
              })()}

              {/* Sentinel for sticky decision-bar (#07) — når denne er i
                  view, betyr det Action bar er synleg og sticky-onlyn skjules. */}
              <div ref={actionBarSentinelRef} aria-hidden="true" style={{ height: 1 }} />

              {/* Action bar */}
              <section className="uk-card" style={{ marginTop: 16 }}>
                <div className="uk-card__bd" style={{ padding: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0 }}>
                      {WB_LABELS.resultatetForebels[locale]}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleBackToWorkbench} className="uk-btn">
                        {WB_LABELS.tilbake[locale]}
                      </button>
                      {currentRunId && calculationA && calculationB && (
                        <a href={`/rapport/${currentRunId}`} className="uk-btn uk-btn--primary" onClick={saveStateToSession}>
                          {WB_LABELS.generRapport[locale]}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </>
            );
      })()}

      {/* === STICKY DECISION-BAR (#07) === */}
        {controllerDecision &&
          kontrollorBelowFold &&
          !actionBarVisible &&
          (() => {
            // Finn styrande dimensjonerande verdi for kompakt visning
            const dimKeys = calculationA
              ? getDimensjonerandeKeys(
                  calculationA.results,
                  result?.berekningstype ?? null,
                  calculationA.result_roles,
                )
              : [];
            const styrendeKey = dimKeys[0];
            const styrendeValue = styrendeKey ? calculationA?.results?.[styrendeKey] : null;

            // Mobile: kun ein FAB nede til høgre med Generer rapport
            if (isMobile) {
              return (
                <div
                  style={{
                    position: "fixed",
                    bottom: 16,
                    right: 16,
                    zIndex: 90,
                  }}
                >
                  {currentRunId && calculationA && calculationB && (
                    <a
                      href={`/rapport/${currentRunId}`}
                      onClick={saveStateToSession}
                      className="uk-btn uk-btn--primary"
                      style={{
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.18)",
                        padding: "10px 18px",
                        fontSize: 14,
                      }}
                    >
                      {WB_LABELS.generRapport[locale]}
                    </a>
                  )}
                </div>
              );
            }

            // Desktop: full 40 px-høg sticky-bar med status, profil, verdi, knapp
            return (
              <div
                style={{
                  position: "fixed",
                  // Plassert under navonlyn (.uk-header). Bruker CSS-variabel
                  // med 64px fallback (matchar headerens padding 18px top/bot +
                  // ~28px innhald = ~64px). Kan overstyrast i tokens.css om
                  // header-høgda endrast.
                  top: "var(--header-height, 64px)",
                  left: 0,
                  right: 0,
                  background: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  borderBottom: "1px solid var(--border)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  padding: "8px 20px",
                  // z-index lågare enn navonlyns 50, slik at navonlyn ligg på topp
                  zIndex: 40,
                  animation: "mc-fade-in 0.18s ease-out",
                }}
              >
                <div
                  style={{
                    maxWidth: 1200,
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "nowrap",
                    minHeight: 24,
                  }}
                >
                  {/* Status-badge (decision_status) */}
                  <Badge status={DECISION_STATUS_TONES[controllerDecision.decision_status]}>
                    {uiText(decisionStatusLabel(controllerDecision.decision_status, locale))}
                  </Badge>

                  {/* Styrande dimensjonerande verdi (om tilgjengeleg) */}
                  {styrendeKey && styrendeValue && (
                    <>
                      <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>·</span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "baseline",
                          gap: 4,
                          fontSize: 13,
                          color: "var(--fg)",
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        <span
                          className="uk-eyebrow"
                          style={{
                            fontSize: 10,
                            color: "var(--fg-muted)",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {tileLabel(styrendeKey, locale)}
                        </span>
                        <span className="uk-mono" style={{ fontWeight: 600, fontSize: 14 }}>
                          {styrendeValue}
                        </span>
                      </span>
                    </>
                  )}

                  {/* Spacer */}
                  <span style={{ flex: 1, minWidth: 0 }} />

                  {/* Generer rapport-knapp */}
                  {currentRunId && calculationA && calculationB && (
                    <a
                      href={`/rapport/${currentRunId}`}
                      onClick={saveStateToSession}
                      className="uk-btn uk-btn--primary"
                      style={{ padding: "6px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                    >
                      {WB_LABELS.generRapport[locale]}
                    </a>
                  )}
                </div>
              </div>
            );
          })()}
    </>
  );
}

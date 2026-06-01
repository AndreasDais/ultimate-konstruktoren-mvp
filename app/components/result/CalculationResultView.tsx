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
import { buildLocalizedLabelProxy, displayLanguageForContext, polishEnglishGeneratedText, localizeResultLabel, polishNorwegianRoleText,
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
  extractFormulaLines,
  renderMathKey,
} from "@/lib/result/formula-extract";
import { Badge } from "@/app/components/Badge";
import { StatusStripe } from "@/app/components/StatusStripe";
import { DimensjonerandeTiles } from "./DimensjonerandeTile";
import { ControllerDecisionCard } from "./ControllerDecisionCard";

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

  // Norsk kontrollert vokabular som agentane emiterar i value-feltet uansett
  // pipeline-språk (same mønster som fagomraade i banner). Oversetjast til
  // engelsk i intl-modus berre.
  const polishControlledVocab = (s: string): string =>
    s
      .replace(/\bKlasse (\d)\b/g, "Class $1")
      .replace(/\bKlasse (I|II|III|IV)\b/g, "Class $1")
      .replace(/\btverrsnittsklass(e)?\b/gi, "section class")
      .replace(/\bbruksgrense\b/gi, "serviceability limit")
      .replace(/\bbruddgrense\b/gi, "ultimate limit")
      .replace(/\beigenvekt\b/gi, "self-weight")
      .replace(/\begenvekt\b/gi, "self-weight");

  const uiText = (value: string | null | undefined): string =>
    isEnglishResult
      ? polishControlledVocab(sanitizeAiscGuardedOutputText(String(value ?? "")))
      : polishNorwegianRoleText(String(value ?? ""), displayLanguage);

  // Nokre result-keys er heile norske ord (ikkje matematiske symbol) som
  // renderMathKey rendrar literally. I intl-modus byter vi dei til engelske
  // motsvar. Same mønster som ordliste-katalogen.
  const NORWEGIAN_KEY_EN: Record<string, string> = {
    tverrsnittsklass: "section class",
    tverrsnittklass: "section class",
    bruksgrense: "serviceability",
    bruddgrense: "ultimate limit",
    eigenvekt: "self-weight",
    egenvekt: "self-weight",
    lastfaktor: "load factor",
    sikkerheitsfaktor: "safety factor",
    nedboying: "deflection",
    nedboyning: "deflection",
  };
  const renderResultKey = (key: string): React.ReactNode => {
    if (isEnglishResult) {
      const translated = NORWEGIAN_KEY_EN[key.toLowerCase()];
      if (translated) return translated;
    }
    return renderMathKey(key);
  };

  // Lokalisert uppercase nivå-etikett (severity / konfidens). Erstattar dei
  // dupliserte inline-ternarane; engelsk shell får LOW/MEDIUM/HIGH/CRITICAL.
  const levelLabel = (level: string): string => {
    if (displayLanguage === "en") {
      const en: Record<string, string> = {
        low: "LOW",
        medium: "MEDIUM",
        high: "HIGH",
        critical: "CRITICAL",
      };
      return en[level] ?? level.toUpperCase();
    }
    const no: Record<string, string> = {
      low: "LAV",
      medium: "MIDDELS",
      high: displayLanguage === "nn" ? "HØG" : "HØY",
      critical: "KRITISK",
    };
    return no[level] ?? level;
  };

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

              {/* Controller-kort (#02): ControllerDecisionCard — verdict variants,
                  standing caveat, JS pixel-height disclosure. See
                  app/components/result/ControllerDecisionCard.tsx. */}
              {controllerDecision && (
                <ControllerDecisionCard
                  controllerDecision={controllerDecision}
                  comparison={comparison}
                  calculationA={calculationA}
                  calculationB={calculationB}
                  locale={locale}
                  engineeringContext={engineeringContext}
                />
              )}

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
                      {uiText(matchStatusLabel(comparison.match_status, displayLanguage))}
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
                        displayLanguage={displayLanguage}
                        resultRoles={calculationA.result_roles}
                        runId={currentRunId}
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
                                  <span className="uk-kv__k uk-mono">{renderResultKey(k)}</span>
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
                              {levelLabel(calculationB.confidence)}
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
                        {uiText(matchStatusLabel(comparison.match_status, displayLanguage))}
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
                                {[WB_LABELS.tabellFelt[locale], WB_LABELS.konstruktorA?.[locale] ?? "Konstruktør A", WB_LABELS.konstruktorB?.[locale] ?? "Konstruktør B", WB_LABELS.tabellSkilnad[locale], WB_LABELS.tabellAlvor[locale]].map((h) => (
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
                                        {uiText(String(diff.agent_a_value ?? ""))}
                                      </td>
                                      <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg)" }}>
                                        {uiText(String(diff.agent_b_value ?? ""))}
                                      </td>
                                      <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg)" }}>
                                        {diff.percent_diff?.toFixed(1)}%
                                      </td>
                                      <td style={{ padding: "8px 0" }}>
                                        <Badge status={SEVERITY_TONES[diff.severity]}>
                                          {levelLabel(diff.severity)}
                                        </Badge>
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
                                                  {uiText(String(diff.agent_a_value ?? ""))}
                                                </span>
                                              </span>
                                              <span>
                                                {WB_LABELS.samanliknarBVerdi[locale]}:{" "}
                                                <span className="uk-mono" style={{ color: "var(--fg-2)", fontWeight: 500 }}>
                                                  {uiText(String(diff.agent_b_value ?? ""))}
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
                    {uiText(decisionStatusLabel(controllerDecision.decision_status, displayLanguage))}
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
                          {tileLabel(styrendeKey, displayLanguage)}
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

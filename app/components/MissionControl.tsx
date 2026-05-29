"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import "./mission-control.css";
import { InfoPopover } from "@/app/components/InfoPopover";
import type { EngineeringContext } from "@/lib/engineering-context";
import { buildLocalizedLabelProxy, isInternationalEnglishContext, standardShortLabel } from "@/lib/international/display";
import { buildComparatorTable } from "@/lib/compare/comparator-table";

// Greske bokstavar (norsk byggfagleg konvensjon — alpha_cc → α_cc, rho_min → ρ_min)
const GREEK_MAP: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ",
  epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", omicron: "ο", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ",
  phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
};

// Render math-notasjon for results-keys (#5):
//  "alpha_cc"           → α_cc        (Greek + sub)
//  "f_cd"               → f_cd        (Latin italic + sub)
//  "Ed_ULS_kombinert"   → Ed_{ULS,kombinert}
//  "psi_1_kategori_B"   → ψ_{1,kategori,B}
//  "M_Ed"               → M_{Ed}
function formatFieldKey(key: string): React.ReactNode {
  const parts = key.split("_");
  const firstRaw = parts[0];
  const first = GREEK_MAP[firstRaw.toLowerCase()] ?? firstRaw;
  if (parts.length === 1) {
    return <em>{first}</em>;
  }
  // Resten blir subscript med komma som separator (mattefag-konvensjon)
  const subscript = parts.slice(1).join(",");
  return (
    <>
      <em>{first}</em>
      <sub style={{ fontSize: "0.75em", marginLeft: 1 }}>{subscript}</sub>
    </>
  );
}
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";

/**
 * Mission Control v2 (Dag 9) — ekte streaming.
 *
 * Tek streaming-state per agent som prop (stepTitles + results blir
 * populert progressivt frå SSE-deltaer). Når calculationA/B er sett,
 * snapper kortet til "complete"-state med endeleg liste og results
 * under tjukk skiljelinje.
 *
 * Erstatta fake-timer frå v1 med real-tids progress.
 */

const MC_LABELS: Record<string, Record<Locale, string>> = {
  // Header
  eyebrow: { nb: "STEG · BEREGNER", nn: "STEG · BEREKNAR" },
  title: { nb: "To uavhengige konstruktører beregner samme problem", nn: "To uavhengige konstruktørar reknar same problem" },
  subtitle: { nb: "Konstruktør A og Konstruktør B bruker ulik metode. Sammenligneren bekrefter at de er enige før resultatet presenteres.", nn: "Konstruktør A og Konstruktør B brukar ulik metode. Samanliknaren stadfestar at dei er einige før resultatet er presentert." },
  // Pair-bar (#1) — felles overskrift over A+B som signaliserer arkitekturen
  toLoysningar: { nb: "TO LØSNINGER, ETT SVAR", nn: "TO LØYSINGAR, EITT SVAR" },
  samanliknast: { nb: "samanliknast", nn: "samanliknast" },
  // Engineer tags
  konstruktorA: { nb: "Konstruktør", nn: "Konstruktør" },
  konstruktorB: { nb: "Konstruktør", nn: "Konstruktør" },
  tagA: { nb: "LUKKET FORMEL · EUROKODE", nn: "LUKKA FORMEL · EUROKODE" },
  tagB: { nb: "NUMERISK · FRITT LEGEME", nn: "NUMERISK · FRI LEKAM" },
  // Tooltip-tekstar (#7) — forklar metode-tags på hover/long-press
  tagATooltip: { nb: "Bruker etablerte Eurokode-formler direkte.", nn: "Bruker etablerte Eurokode-formlar direkte." },
  tagBTooltip: { nb: "Setter opp likevektsekvasjonar frå null.", nn: "Set opp likevektsekvasjonar frå null." },
  // Roterande status-tekstar (#8) — erstattar generisk "Tenker dypt".
  // Backend-uavhengig fallback (Claude Design sin "80% effekt"-variant):
  // statisk liste som syklar uavhengig av faktisk modell-aktivitet.
  // V0.2: backend kan tag'e thinking-tokens med kategori og mappe presist.
  fagligVenting: {
    nb: "Leser forespørsel · Setter opp likninger · Beregner verdier · Verifiserer resultat · Skriver neste steg",
    nn: "Les forespurnaden · Set opp likningane · Reknar verdiar · Verifiserer resultat · Skriv neste steg",
  },
  // Feiltilstand + retry (#2)
  feilPrefix: { nb: "Feil:", nn: "Feil:" },
  provPaNytt: { nb: "Prøv på nytt", nn: "Prøv på nytt" },
  forsokAv: { nb: "forsøk {n} av 3", nn: "forsøk {n} av 3" },
  ventarPaPartner: { nb: "Ventar på partner — kan ikkje samanliknast åleine", nn: "Ventar på partner — kan ikkje samanliknast åleine" },
  blokkertARetry: { nb: "BLOKKERT · A TRENG RETRY", nn: "BLOKKERT · A TRENG RETRY" },
  blokkertBRetry: { nb: "BLOKKERT · B TRENG RETRY", nn: "BLOKKERT · B TRENG RETRY" },
  blokkertForklaring: { nb: "Begge konstruktørene må fullføre før samanlikning kan starte.", nn: "Begge konstruktørane må fullføre før samanlikning kan starte." },
  tenkjerDjupt: { nb: "Tenker dypt på problemet", nn: "Tenkjer djupt på problemet" },
  skrivNesteSteg: { nb: "Skriver neste steg", nn: "Skriv neste steg" },
  // ComparatorPanel
  samanliknar: { nb: "Sammenligner", nn: "Samanliknar" },
  ventar: { nb: "VENTER", nn: "VENTAR" },
  reknarAvvik: { nb: "BEREGNER AVVIK", nn: "REKNAR AVVIK" },
  // Placeholder-stripe (#4): synleg while A+B streamar — slank tekst i staden
  // for full kort som ser ut som han "ventar".
  ventarPaBegge: { nb: "Ventar på at begge løsninger fullføres", nn: "Ventar på at begge løysingar fullførast" },
  einige: { nb: "ENIGE", nn: "EINIGE" },
  // Klassifisering (#6) — basert på maks avvik blant alle resultat-felt
  nestenEinige: { nb: "NESTEN ENIGE", nn: "NESTEN EINIGE" },
  avvikBadge: { nb: "AVVIK", nn: "AVVIK" },
  terskelEnige: { nb: "Alle avvik under 5 %", nn: "Alle avvik under 5 %" },
  terskelNestenEnige: { nb: "Alle avvik under 15 %, nokre over 5 %", nn: "Alle avvik under 15 %, nokre over 5 %" },
  terskelAvvik: { nb: "Eitt eller fleire avvik over 15 %", nn: "Eitt eller fleire avvik over 15 %" },
  // Tilstand-spesifikke avvik-labels (erstattar repeterande "Vurder nærmere")
  avvikInnanforTerskel: { nb: "Innan terskel", nn: "Innan terskel" },
  avvikSjekkNaerare: { nb: "Sjekk nærare", nn: "Sjekk nærare" },
  avvikStorDiskrepans: { nb: "Stor diskrepans", nn: "Stor diskrepans" },
  cellResultat: { nb: "RESULTAT", nn: "RESULTAT" },
  cellMetode: { nb: "METODE", nn: "METODE" },
  cellKonklusjon: { nb: "KONKLUSJON", nn: "KONKLUSJON" },
  cellAvvikSuffix: { nb: "AVVIK", nn: "AVVIK" },
  abIdentiske: { nb: "Konstruktør A og Konstruktør B identiske", nn: "Konstruktør A og Konstruktør B identiske" },
  beggeKonvergerer: { nb: "Begge konvergerer", nn: "Begge konvergerer" },
  lukkaFormelSame: { nb: "Lukket formel og numerisk gir samme svar", nn: "Lukka formel og numerisk gir same svar" },
  innanforToleranse: { nb: "Innenfor toleranse", nn: "Innanfor toleranse" },
  vurderNarare: { nb: "Vurder nærmere", nn: "Vurder nærare" },
  videreKontrollor: { nb: "Videre til kontrollør", nn: "Vidare til kontrollør" },
  // Samanlikningstabell (#5)
  tabellVerdi: { nb: "VERDI", nn: "VERDI" },
  tabellAvvik: { nb: "AVVIK", nn: "AVVIK" },
  fleireRader: { nb: "+{n} flere verdier (viser {shown} av {total})", nn: "+{n} fleire verdiar (viser {shown} av {total})" },
  toAvToEinige: { nb: "2 av 2 metoder enige", nn: "2 av 2 metodar einige" },
  doneToComparator: { nb: "Ferdig — leverer resultat til Sammenligneren", nn: "Ferdig — leverer resultat til Samanliknaren" },
  avvikAVurdere: { nb: "avvik å vurdere", nn: "avvik å vurdere" },
};

type CalculationStepMin = {
  title: string;
};

type CalculationResultMin = {
  short_conclusion?: string;
  results?: Record<string, string>;
  confidence?: "high" | "medium" | "low";
  calculation_steps?: CalculationStepMin[];
};

type NumericDifferenceMin = {
  field: string;
  agent_a_value?: string;
  agent_b_value?: string;
  percent_diff: number;
  severity: "low" | "medium" | "high" | "critical";
};

type ComparisonResultMin = {
  match_status?: string;
  numeric_differences?: NumericDifferenceMin[];
  summary?: string;
};

export type AgentStreamingState = {
  phase: "idle" | "thinking" | "streaming" | "complete" | "error";
  stepTitles: string[];
  results: Record<string, string>;
  error?: string;
};

type Props = {
  calculationA: CalculationResultMin | null;
  calculationB: CalculationResultMin | null;
  comparison: ComparisonResultMin | null;
  streamingA: AgentStreamingState;
  streamingB: AgentStreamingState;
  // Retry-handler (#2). Optional for graceful fallback om page.tsx ikkje
  // sender han enno. Når satt, viser kvart feila kort ein "Prøv på nytt"-knapp.
  onRetry?: (letter: "A" | "B") => void;
  retryCountA?: number;
  retryCountB?: number;
  engineeringContext?: EngineeringContext | null;
};

export default function MissionControl({
  calculationA,
  calculationB,
  comparison,
  streamingA,
  streamingB,
  onRetry,
  retryCountA = 0,
  retryCountB = 0,
  engineeringContext = null,
}: Props) {
  const { locale } = useLocale();
  const L = buildLocalizedLabelProxy(MC_LABELS, locale, engineeringContext, {
    eyebrow: "STEP · CALCULATING",
    title: "Two independent engineers solve the same problem",
    subtitle: "Engineer A and Engineer B use independent methods. The Comparator checks agreement before the result is presented.",
    toLoysningar: "TWO SOLUTIONS, ONE ANSWER",
    samanliknast: "compared",
    konstruktorA: "Engineer",
    konstruktorB: "Engineer",
    tagA: `CLOSED FORM · ${standardShortLabel(engineeringContext)}`,
    tagB: `NUMERICAL · ${standardShortLabel(engineeringContext)}`,
    tagATooltip: "Uses established formulas directly within the selected standard context.",
    tagBTooltip: "Builds the check independently from equilibrium and mechanics.",
    fagligVenting: "Reading request · Setting up equations · Calculating values · Verifying result · Writing next step",
    feilPrefix: "Error:",
    provPaNytt: "Try again",
    forsokAv: "attempt {n} of 3",
    ventarPaPartner: "Waiting for partner — cannot compare one solution alone",
    blokkertARetry: "BLOCKED · A NEEDS RETRY",
    blokkertBRetry: "BLOCKED · B NEEDS RETRY",
    blokkertForklaring: "Both engineers must finish before comparison can start.",
    tenkjerDjupt: "Thinking through the problem",
    skrivNesteSteg: "Writing next step",
    samanliknar: "Comparator",
    ventar: "WAITING",
    reknarAvvik: "CALCULATING DIFFERENCES",
    ventarPaBegge: "Waiting for both solutions to finish",
    einige: "AGREE",
    nestenEinige: "NEAR MATCH",
    avvikBadge: "DIFFERENCE",
    terskelEnige: "All differences below 5%",
    terskelNestenEnige: "All differences below 15%, some above 5%",
    terskelAvvik: "One or more differences above 15%",
    avvikInnanforTerskel: "Within threshold",
    avvikSjekkNaerare: "Check closer",
    avvikStorDiskrepans: "Large discrepancy",
    cellResultat: "RESULT",
    cellMetode: "METHOD",
    cellKonklusjon: "CONCLUSION",
    cellAvvikSuffix: "DIFFERENCE",
    abIdentiske: "A and B identical",
    beggeKonvergerer: "Both converge",
    lukkaFormelSame: "Closed form and numerical approach agree",
    innanforToleranse: "Within tolerance",
    vurderNarare: "Review closer",
    videreKontrollor: "Continue to controller",
    tabellVerdi: "VALUE",
    tabellAvvik: "DIFFERENCE",
    fleireRader: "+{n} more values (showing {shown} of {total})",
    toAvToEinige: "2 of 2 methods agree",
    avvikAVurdere: "differences to review",
  });
  // Sammenligner-avatar: S for norsk (Samanliknar), C for engelsk (Comparator).
  const compareAvatar = isInternationalEnglishContext(engineeringContext) ? "C" : "S";
  const bothComplete = calculationA !== null && calculationB !== null;
  const aErrored = streamingA.phase === "error";
  const bErrored = streamingB.phase === "error";

  // Auto-scroll til Comparator i to fasar (#5):
  //  Fase 1: når begge engineers er ferdige → vis "BEREGNER AVVIK"-kortet.
  //  Fase 2: når comparison-data kjem inn → tabell ekspanderer, scroll på nytt
  //          slik at konklusjon-blokka (botn av tabellen) er synleg.
  // Begge med 400ms delay så slide-in/ekspansjon-animasjonen får starte først.
  const sammenlignerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bothComplete) {
      const timer = setTimeout(() => {
        sammenlignerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [bothComplete]);
  useEffect(() => {
    if (comparison !== null) {
      const timer = setTimeout(() => {
        sammenlignerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [comparison]);

  return (
    <div className="mc">
      <header className="mc-header">
        <p className="mc-eyebrow">{L.eyebrow[locale]}</p>
        <h1 className="mc-title">
          {L.title[locale]}
        </h1>
        <p className="mc-subtitle">
          {L.subtitle[locale]}
        </p>
      </header>

      {/* Pair-frame (#1): felles topp-bar + ↔-element mellom Engineer A and Engineer B.
          Signaliserer arkitekturen visuelt — Engineer A and Engineer B er to halvdelar av
          ein dobbel-løysing, ikkje to separate berekningar. */}
      <style>{`
        .mc-pair-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }
        .mc-pair-bar-line {
          flex: 1;
          height: 1px;
          background: var(--rule, #E2E8F0);
        }
        .mc-pair-bar-text {
          font-size: 11px;
          letter-spacing: 0.14em;
          font-weight: 600;
          color: var(--fg-muted, #94A3B8);
          white-space: nowrap;
        }
        .mc-pair-wrap {
          position: relative;
        }
        .mc-pair-wrap .mc-grid {
          gap: 56px !important;
        }
        .mc-pair-connector {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--surface, #fff);
          border: 1px solid var(--rule, #E2E8F0);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          pointer-events: none;
        }
        .mc-pair-connector-icon {
          font-size: 14px;
          line-height: 1;
          color: var(--fg-2, #475569);
        }
        @media (max-width: 720px) {
          .mc-pair-wrap .mc-grid { gap: 16px !important; }
          .mc-pair-connector { display: none; }
        }
        @keyframes mc-compare-slide-down {
          0% {
            opacity: 0;
            transform: translateY(-8px);
            max-height: 80px;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            max-height: 600px;
          }
        }
        .mc-compare-slide-in {
          animation: mc-compare-slide-down 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          will-change: opacity, transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .mc-compare-slide-in { animation: none !important; }
        }
      `}</style>

      <div className="mc-pair-bar" aria-hidden>
        <div className="mc-pair-bar-line" />
        <div className="mc-pair-bar-text">{L.toLoysningar[locale]}</div>
        <div className="mc-pair-bar-line" />
      </div>

      <div className="mc-pair-wrap">
        <div className="mc-grid">
          <AgentCard
            letter="A"
            name={L.konstruktorA[locale]}
            tag={L.tagA[locale]}
            tagTooltip={L.tagATooltip[locale]}
            streaming={streamingA}
            calculation={calculationA}
            locale={locale}
            labels={L}
            partnerErrored={bErrored}
            onRetry={onRetry ? () => onRetry("A") : undefined}
            retryCount={retryCountA}
          />
          <AgentCard
            letter="B"
            name={L.konstruktorB[locale]}
            tag={L.tagB[locale]}
            tagTooltip={L.tagBTooltip[locale]}
            streaming={streamingB}
            calculation={calculationB}
            locale={locale}
            labels={L}
            partnerErrored={aErrored}
            onRetry={onRetry ? () => onRetry("B") : undefined}
            retryCount={retryCountB}
          />
        </div>
        <div className="mc-pair-connector" aria-label={L.samanliknast[locale]}>
          <span className="mc-pair-connector-icon">↔</span>
        </div>
      </div>

      <div ref={sammenlignerRef}>
        <ComparatorPanel
          bothComplete={bothComplete}
          comparison={comparison}
          locale={locale}
          labels={L}
          aErrored={aErrored}
          bErrored={bErrored}
          calculationA={calculationA}
          calculationB={calculationB}
          compareAvatar={compareAvatar}
          streamingA={streamingA}
          streamingB={streamingB}
        />
      </div>
    </div>
  );
}

function AgentCard({
  letter,
  name,
  tag,
  tagTooltip,
  streaming,
  calculation,
  locale,
  labels: L,
  partnerErrored,
  onRetry,
  retryCount,
}: {
  letter: string;
  name: string;
  tag: string;
  tagTooltip: string;
  streaming: AgentStreamingState;
  calculation: CalculationResultMin | null;
  locale: Locale;
  labels: typeof MC_LABELS;
  partnerErrored: boolean;
  onRetry?: () => void;
  retryCount: number;
}) {
  const complete = calculation !== null;

  // Strip "Steg N — " / "Steg N - " / "Steg N: " prefiks frå step-titlar (#3).
  // Engineer A si prompt har generert numererte steg, men dei to konstruktørane
  // er likeverdige — stegnummer er meta-støy. Stripping i rendering held backend
  // uendra og lar oss reversere om vi ombestemmer oss. Robust mot ulike dash-typar
  // og kollon, og lar uberørte titlar (utan prefiks) gå gjennom uendra.
  const stripStepPrefix = (title: string): string =>
    title.replace(/^Steg\s+\d+\s*[—\-:]\s*/i, "").trim();

  // Step-liste: frå calculation viss complete, elles frå streaming.stepTitles.
  const stepList: string[] = (complete && calculation?.calculation_steps
    ? calculation.calculation_steps.map((s) => s.title).slice(0, 8)
    : streaming.stepTitles
  ).map(stripStepPrefix);

  // Vis pulsing "i gang"-line viss ikkje complete og ikkje error.
  const showInProgress =
    !complete &&
    (streaming.phase === "thinking" || streaming.phase === "streaming");

  // Roterande fagleg status (#8) — syklar gjennom 5 fag-spesifikke setningar
  // while streaming pågår. 3 sek per fase = naturleg lese-tempo.
  const phases = L.fagligVenting[locale].split(" · ");
  const [phaseIdx, setPhaseIdx] = useState(0);
  useEffect(() => {
    if (!showInProgress) return;
    const interval = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % phases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [showInProgress, phases.length]);

  const inProgressText = phases[phaseIdx];

  // Resultat-verdiar (q_Ed osv.) er flytta til Comparator-kortet (#5),
  // så vi treng ikkje lenger ekstrahere dei her i AgentCard.

  const errorMessage = streaming.phase === "error" ? streaming.error : null;

  return (
    <div
      className={`mc-agent-card${complete ? " mc-agent-card--complete" : ""}`}
      style={{ position: "relative", overflow: "hidden" }}
    >
      <header className="mc-agent-header">
        <div className="mc-agent-avatar">{letter}</div>
        <div className="mc-agent-name">{name}</div>
        <div className="mc-agent-tag" style={{ display: "inline-flex", alignItems: "center" }}>
          {tag}
          <InfoPopover label={tag} ariaLabel={`Forklaring for ${tag}`}>
            <p>{tagTooltip}</p>
          </InfoPopover>
        </div>
      </header>

      {errorMessage ? (
        <div className="mc-error" role="alert">
          <strong>{L.feilPrefix[locale]}</strong> {errorMessage}
          {onRetry && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={onRetry}
                style={{
                  padding: "8px 14px",
                  background: "var(--fg, #1F2937)",
                  color: "var(--surface, #fff)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden>↻</span>
                {L.provPaNytt[locale]}
              </button>
              {retryCount > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--fg-muted, #94A3B8)",
                  }}
                >
                  {L.forsokAv[locale].replace("{n}", String(retryCount + 1))}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <ol className="mc-steps">
          {stepList.map((title, i) => (
            <li key={`step-${i}`} className="mc-step mc-step--utført">
              <span className="mc-step-icon">✓</span>
              <span className="mc-step-text">{title}</span>
            </li>
          ))}

          {showInProgress && (
            <li key="in-progress" className="mc-step mc-step--pågår">
              <span className="mc-step-icon">◐</span>
              <span className="mc-step-text">{inProgressText}</span>
            </li>
          )}

          {/* Resultat-verdiar (q_Ed osv.) er flytta til Comparator-kortet
              som ein samanlikningstabell (#5). Steg-lista her viser only
              kva som blei gjort, ikkje siste-steg-output. Ferdig-markør i
              staden — signaliserer at kortet leverer til Comparator. */}
          {complete && (
            <li
              key="ferdig"
              className="mc-step mc-step--utført mc-step--result mc-step--result-first"
            >
              <span className="mc-step-icon">✓</span>
              <span className="mc-step-text" style={{ fontStyle: "italic", color: "var(--fg-muted, #94A3B8)" }}>
                Done — sending result to Comparator
              </span>
            </li>
          )}
        </ol>
      )}

      {/* Ventar-på-partner-stripe (#2): synleg når dette kortet er ferdig
          men partner har feila — signaliserer at samanlikning ikkje kan
          gjerast åleine, så studenten forstår kvifor pipeline-en har stoppa. */}
      {complete && partnerErrored && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "var(--surface-alt, #FAFAFA)",
            border: "1px solid var(--rule, #E2E8F0)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--fg-muted, #94A3B8)",
            fontStyle: "italic",
          }}
        >
          {L.ventarPaPartner[locale]}
        </div>
      )}

      {/* Sweep-puls (#8) — subtil 1px lys-gradient som glir frå venstre til
          høgre nedst i kortet while streaming pågår. Erstattar "spinner"-
          aktige UI som signaliserer "noko skjer" utan å vere generisk
          progress-bar. Berre synleg når agenten faktisk produserer output. */}
      {showInProgress && (
        <>
          <style>{`
            @keyframes mc-thinking-sweep {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
            .mc-thinking-sweep {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 50%;
              height: 1px;
              background: linear-gradient(
                90deg,
                transparent 0%,
                var(--fg-2, #475569) 50%,
                transparent 100%
              );
              animation: mc-thinking-sweep 2.2s ease-in-out infinite;
              pointer-events: none;
              will-change: transform;
            }
            @media (prefers-reduced-motion: reduce) {
              .mc-thinking-sweep { animation: none !important; opacity: 0.3; }
            }
          `}</style>
          <div className="mc-thinking-sweep" aria-hidden />
        </>
      )}
    </div>
  );
}

function ComparatorPanel({
  bothComplete,
  comparison,
  locale,
  labels: L,
  aErrored,
  bErrored,
  calculationA,
  calculationB,
  streamingA,
  streamingB,
  compareAvatar,
}: {
  bothComplete: boolean;
  comparison: ComparisonResultMin | null;
  locale: Locale;
  labels: typeof MC_LABELS;
  aErrored: boolean;
  bErrored: boolean;
  calculationA: CalculationResultMin | null;
  calculationB: CalculationResultMin | null;
  streamingA: AgentStreamingState;
  streamingB: AgentStreamingState;
  compareAvatar: string;
}) {
  // BLOKKERT-tilstand (#2): éin agent har feila — Comparator kan ikkje
  // køyre før retry har fullført. Erstattar stille "VENTER" som ville
  // implisere "alt OK, only vent".
  if (aErrored || bErrored) {
    return (
      <div className="mc-compare mc-compare--blocked">
        <div className="mc-compare-avatar">{compareAvatar}</div>
        <div className="mc-compare-name">{L.samanliknar[locale]}</div>
        <div
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            background: "var(--tone-bad-bg, rgba(194, 65, 12, 0.08))",
            border: "1px solid var(--tone-bad-border, rgba(194, 65, 12, 0.25))",
            borderRadius: 999,
            fontSize: 11,
            letterSpacing: "0.08em",
            fontWeight: 600,
            color: "var(--tone-bad-fg, #C2410C)",
            textTransform: "uppercase",
          }}
        >
          {aErrored ? L.blokkertARetry[locale] : L.blokkertBRetry[locale]}
        </div>
      </div>
    );
  }

  if (!bothComplete) {
    // Placeholder-stripe (#4): slank, dimma linje som signaliserer at
    // Comparator finst i pipelinen men ventar på A+B. Erstattar tidlegare
    // fullt "VENTER"-kort som tok plass og kjente seg som "stuck".
    return (
      <div
        style={{
          marginTop: 24,
          padding: "10px 16px",
          background: "var(--surface-alt, #FAFAFA)",
          border: "1px dashed var(--rule, #E2E8F0)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 12.5,
          color: "var(--fg-muted, #94A3B8)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--surface, #fff)",
            border: "1px solid var(--rule, #E2E8F0)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--fg-muted, #94A3B8)",
            flexShrink: 0,
          }}
        >
          {compareAvatar}
        </span>
        <span>{L.samanliknar[locale]}</span>
        <span style={{ marginLeft: "auto", fontStyle: "italic" }}>
          {L.ventarPaBegge[locale]}
        </span>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="mc-compare mc-compare--working mc-compare-slide-in">
        <div className="mc-compare-avatar">{compareAvatar}</div>
        <div className="mc-compare-name">{L.samanliknar[locale]}</div>
        <div className="mc-compare-pill mc-compare-pill--active">
          {L.reknarAvvik[locale]}
        </div>
      </div>
    );
  }

  const numDiffs = comparison.numeric_differences || [];

  // Samanlikningstabell (#5) — DETERMINISTISK nøkkel-paring via
  // buildComparatorTable (same normalisering som Samanliknaren / agent_c).
  // Erstattar tidlegare rå teikn-eksakt oppslag som mista B-verdiar når
  // Konstruktør B stava ein nøkkel annleis enn Konstruktør A (komma vs
  // understrek, store/små bokstavar). Sjå lib/compare/comparator-table.ts.
  // Final calculation.results har forrang; streaming-results fyller hol
  // dersom final er kortare enn det agenten faktisk streama.
  const mergedA = { ...(streamingA.results ?? {}), ...(calculationA?.results ?? {}) };
  const mergedB = { ...(streamingB.results ?? {}), ...(calculationB?.results ?? {}) };
  const table = buildComparatorTable(mergedA, mergedB, numDiffs);
  const tableRows = table.rows;

  // Full semje krev minst eitt numerisk par, alle på 0 %, og ingen upara nøklar.
  const allIdentical = table.allAgree;

  // Klassifisering (#6) — maks kode-rekna avvik blant para felt. Tersklane
  // (5 %, 15 %) er pre-launch-defaults; bør validerast mot fag i V0.2.
  const maxAvvik = table.maxPercentDiff;
  const classification: "enige" | "nesten" | "avvik" =
    maxAvvik < 5 ? "enige" : maxAvvik < 15 ? "nesten" : "avvik";
  const badgeLabel =
    classification === "enige"
      ? L.einige[locale]
      : classification === "nesten"
      ? L.nestenEinige[locale]
      : L.avvikBadge[locale];
  const terskelLabel =
    classification === "enige"
      ? L.terskelEnige[locale]
      : classification === "nesten"
      ? L.terskelNestenEnige[locale]
      : L.terskelAvvik[locale];

  return (
    <div className="mc-compare mc-compare--ready mc-compare-slide-in">
      <header className="mc-compare-ready-header">
        <div className="mc-compare-avatar">{compareAvatar}</div>
        <div className="mc-compare-name">{L.samanliknar[locale]}</div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div
            className="mc-compare-pill"
            style={{
              background:
                classification === "enige"
                  ? "var(--tone-ok-bg, rgba(22, 101, 52, 0.08))"
                  : classification === "nesten"
                  ? "var(--tone-warn-bg, rgba(202, 138, 4, 0.08))"
                  : "var(--tone-bad-bg, rgba(194, 65, 12, 0.08))",
              borderColor:
                classification === "enige"
                  ? "var(--tone-ok-border, rgba(22, 101, 52, 0.25))"
                  : classification === "nesten"
                  ? "var(--tone-warn-border, rgba(202, 138, 4, 0.25))"
                  : "var(--tone-bad-border, rgba(194, 65, 12, 0.25))",
              color:
                classification === "enige"
                  ? "var(--tone-ok-fg, #166534)"
                  : classification === "nesten"
                  ? "var(--tone-warn-fg, #92400E)"
                  : "var(--tone-bad-fg, #C2410C)",
            }}
          >
            {badgeLabel}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-muted, #94A3B8)", fontStyle: "italic" }}>
            {terskelLabel}
          </div>
        </div>
      </header>

      {/* Samanlikningstabell (#5): VERDI | A | B | AVVIK */}
      {tableRows.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(80px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(70px, auto)",
            gap: "4px 16px",
            padding: "16px 0",
            fontSize: 13,
            borderBottom: "1px solid var(--rule, #E2E8F0)",
            marginBottom: 16,
          }}
        >
          {/* Header-rad */}
          <div className="uk-eyebrow" style={{ fontSize: 10 }}>{L.tabellVerdi[locale]}</div>
          <div className="uk-eyebrow" style={{ fontSize: 10 }}>A</div>
          <div className="uk-eyebrow" style={{ fontSize: 10 }}>B</div>
          <div className="uk-eyebrow" style={{ fontSize: 10, textAlign: "right" }}>{L.tabellAvvik[locale]}</div>

          {/* Data-rader */}
          {tableRows.map((row) => {
            const avvikColor =
              row.percentDiff === null
                ? "var(--fg-muted, #94A3B8)"
                : row.percentDiff === 0
                ? "var(--tone-ok-fg, #166534)"
                : row.severity === "low"
                ? "var(--fg-2, #475569)"
                : row.severity === "medium"
                ? "var(--tone-warn-fg, #92400E)"
                : "var(--tone-bad-fg, #C2410C)";
            return (
              <Fragment key={row.field}>
                <span style={{ color: "var(--fg-2, #475569)", fontSize: 14 }}>{formatFieldKey(row.field)}</span>
                <span className="uk-mono">{row.valueA}</span>
                <span className="uk-mono">{row.valueB}</span>
                <span
                  className="uk-mono"
                  style={{ color: avvikColor, textAlign: "right", fontWeight: 500 }}
                >
                  {row.percentDiff === null ? "—" : `${row.percentDiff.toFixed(1)} %`}
                </span>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* «+N til»-indikator — ingen stille avkutting når tabellen er kappa */}
      {table.hiddenRows > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted, #94A3B8)",
            fontStyle: "italic",
            marginTop: -8,
            marginBottom: 16,
          }}
        >
          {L.fleireRader[locale]
            .replace("{n}", String(table.hiddenRows))
            .replace("{shown}", String(table.totalRows - table.hiddenRows))
            .replace("{total}", String(table.totalRows))}
        </div>
      )}

      {/* Konklusjon-blokk */}
      <div className="mc-compare-grid">
        <div className="mc-compare-cell">
          <div className="mc-compare-cell-label">{L.cellKonklusjon[locale]}</div>
          <div className="mc-compare-cell-value mc-compare-cell-value--prose">
            {L.videreKontrollor[locale]}
          </div>
          <div className="mc-compare-cell-note">
            {(() => {
              const total = table.pairedCount;
              const utanfor = table.aboveThresholdCount;
              if (allIdentical) return L.toAvToEinige[locale];
              if (utanfor === 0) return `${total} ${locale === "nn" ? "verdiar jamført" : "verdier jamført"}`;
              return `${total} ${locale === "nn" ? "jamført · " : "jamført · "}${utanfor} ${locale === "nn" ? "utanfor terskel" : "utenfor terskel"}`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
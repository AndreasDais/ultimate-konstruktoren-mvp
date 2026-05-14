"use client";

import "./mission-control.css";
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
  subtitle: { nb: "Konstruktør A og B bruker ulik metode. Sammenligneren bekrefter at de er enige før resultatet presenteres.", nn: "Konstruktør A og B brukar ulik metode. Samanliknaren stadfestar at dei er einige før resultatet er presentert." },
  // Konstruktør tags
  konstruktorA: { nb: "Konstruktør A", nn: "Konstruktør A" },
  konstruktorB: { nb: "Konstruktør B", nn: "Konstruktør B" },
  tagA: { nb: "LUKKET FORMEL · EUROKODE", nn: "LUKKA FORMEL · EUROKODE" },
  tagB: { nb: "NUMERISK · FRITT LEGEME", nn: "NUMERISK · FRI LEKAM" },
  // AgentCard
  feilPrefix: { nb: "Feil:", nn: "Feil:" },
  tenkjerDjupt: { nb: "Tenker dypt på problemet", nn: "Tenkjer djupt på problemet" },
  skrivNesteSteg: { nb: "Skriver neste steg", nn: "Skriv neste steg" },
  // SamanliknarPanel
  samanliknar: { nb: "Sammenligner", nn: "Samanliknar" },
  ventar: { nb: "VENTER", nn: "VENTAR" },
  reknarAvvik: { nb: "BEREGNER AVVIK", nn: "REKNAR AVVIK" },
  einige: { nb: "ENIGE", nn: "EINIGE" },
  cellResultat: { nb: "RESULTAT", nn: "RESULTAT" },
  cellMetode: { nb: "METODE", nn: "METODE" },
  cellKonklusjon: { nb: "KONKLUSJON", nn: "KONKLUSJON" },
  cellAvvikSuffix: { nb: "AVVIK", nn: "AVVIK" },
  abIdentiske: { nb: "A og B identiske", nn: "A og B identiske" },
  beggeKonvergerer: { nb: "Begge konvergerer", nn: "Begge konvergerer" },
  lukkaFormelSame: { nb: "Lukket formel og numerisk gir samme svar", nn: "Lukka formel og numerisk gir same svar" },
  innanforToleranse: { nb: "Innenfor toleranse", nn: "Innanfor toleranse" },
  vurderNarare: { nb: "Vurder nærmere", nn: "Vurder nærare" },
  videreKontrollor: { nb: "Videre til kontrollør", nn: "Vidare til kontrollør" },
  toAvToEinige: { nb: "2 av 2 metoder enige", nn: "2 av 2 metodar einige" },
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
};

export default function MissionControl({
  calculationA,
  calculationB,
  comparison,
  streamingA,
  streamingB,
}: Props) {
  const { locale } = useLocale();
  const bothComplete = calculationA !== null && calculationB !== null;

  return (
    <div className="mc">
      <header className="mc-header">
        <p className="mc-eyebrow">{MC_LABELS.eyebrow[locale]}</p>
        <h1 className="mc-title">
          {MC_LABELS.title[locale]}
        </h1>
        <p className="mc-subtitle">
          {MC_LABELS.subtitle[locale]}
        </p>
      </header>

      <div className="mc-grid">
        <AgentCard
          letter="A"
          name={MC_LABELS.konstruktorA[locale]}
          tag={MC_LABELS.tagA[locale]}
          streaming={streamingA}
          calculation={calculationA}
          locale={locale}
        />
        <AgentCard
          letter="B"
          name={MC_LABELS.konstruktorB[locale]}
          tag={MC_LABELS.tagB[locale]}
          streaming={streamingB}
          calculation={calculationB}
          locale={locale}
        />
      </div>

      <SamanliknarPanel bothComplete={bothComplete} comparison={comparison} locale={locale} />
    </div>
  );
}

function AgentCard({
  letter,
  name,
  tag,
  streaming,
  calculation,
  locale,
}: {
  letter: string;
  name: string;
  tag: string;
  streaming: AgentStreamingState;
  calculation: CalculationResultMin | null;
  locale: Locale;
}) {
  const complete = calculation !== null;

  // Step-liste: frå calculation viss complete, elles frå streaming.stepTitles.
  const stepList: string[] = complete && calculation?.calculation_steps
    ? calculation.calculation_steps.map((s) => s.title).slice(0, 8)
    : streaming.stepTitles;

  // Vis pulsing "i gang"-line viss ikkje complete og ikkje error.
  const showInProgress =
    !complete &&
    (streaming.phase === "thinking" || streaming.phase === "streaming");

  const inProgressText =
    streaming.phase === "thinking"
      ? MC_LABELS.tenkjerDjupt[locale]
      : MC_LABELS.skrivNesteSteg[locale];

  // Results: frå calculation viss complete, elles frå streaming.
  const resultsSource = complete && calculation?.results
    ? calculation.results
    : streaming.results;
  const resultEntries = Object.entries(resultsSource).slice(0, 2);

  const errorMessage = streaming.phase === "error" ? streaming.error : null;

  return (
    <div className={`mc-agent-card${complete ? " mc-agent-card--complete" : ""}`}>
      <header className="mc-agent-header">
        <div className="mc-agent-avatar">{letter}</div>
        <div className="mc-agent-name">{name}</div>
        <div className="mc-agent-tag">{tag}</div>
      </header>

      {errorMessage ? (
        <div className="mc-error" role="alert">
          <strong>{MC_LABELS.feilPrefix[locale]}</strong> {errorMessage}
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

          {resultEntries.map(([key, value], i) => (
            <li
              key={`result-${i}`}
              className={`mc-step mc-step--utført mc-step--result${
                i === 0 ? " mc-step--result-first" : ""
              }`}
            >
              <span className="mc-step-icon">✓</span>
              <span className="mc-step-text mc-result-text">
                <span className="mc-result-key">{key}</span>
                <span className="mc-result-equals"> = </span>
                <span className="mc-result-value">{value}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SamanliknarPanel({
  bothComplete,
  comparison,
  locale,
}: {
  bothComplete: boolean;
  comparison: ComparisonResultMin | null;
  locale: Locale;
}) {
  if (!bothComplete) {
    return (
      <div className="mc-compare mc-compare--waiting">
        <div className="mc-compare-avatar">S</div>
        <div className="mc-compare-name">{MC_LABELS.samanliknar[locale]}</div>
        <div className="mc-compare-pill">{MC_LABELS.ventar[locale]}</div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="mc-compare mc-compare--working">
        <div className="mc-compare-avatar">S</div>
        <div className="mc-compare-name">{MC_LABELS.samanliknar[locale]}</div>
        <div className="mc-compare-pill mc-compare-pill--active">
          {MC_LABELS.reknarAvvik[locale]}
        </div>
      </div>
    );
  }

  const numDiffs = comparison.numeric_differences || [];
  const topDiffs = numDiffs.slice(0, 2);
  const allIdentical =
    numDiffs.length === 0 ||
    numDiffs.every((d) => (d.percent_diff || 0) === 0);

  return (
    <div className="mc-compare mc-compare--ready">
      <header className="mc-compare-ready-header">
        <div className="mc-compare-avatar">S</div>
        <div className="mc-compare-name">{MC_LABELS.samanliknar[locale]}</div>
        <div className="mc-compare-pill mc-compare-pill--success">{MC_LABELS.einige[locale]}</div>
      </header>
      <div className="mc-compare-grid">
        {allIdentical ? (
          <>
            <div className="mc-compare-cell">
              <div className="mc-compare-cell-label">{MC_LABELS.cellResultat[locale]}</div>
              <div className="mc-compare-cell-value">0,0 %</div>
              <div className="mc-compare-cell-note">{MC_LABELS.abIdentiske[locale]}</div>
            </div>
            <div className="mc-compare-cell">
              <div className="mc-compare-cell-label">{MC_LABELS.cellMetode[locale]}</div>
              <div className="mc-compare-cell-value mc-compare-cell-value--prose">
                {MC_LABELS.beggeKonvergerer[locale]}
              </div>
              <div className="mc-compare-cell-note">
                {MC_LABELS.lukkaFormelSame[locale]}
              </div>
            </div>
          </>
        ) : (
          topDiffs.map((d, i) => (
            <div key={i} className="mc-compare-cell">
              <div className="mc-compare-cell-label">{d.field} {MC_LABELS.cellAvvikSuffix[locale]}</div>
              <div className="mc-compare-cell-value">
                {d.percent_diff?.toFixed(1) ?? "0,0"} %
              </div>
              <div className="mc-compare-cell-note">
                {d.severity === "low" ? MC_LABELS.innanforToleranse[locale] : MC_LABELS.vurderNarare[locale]}
              </div>
            </div>
          ))
        )}
        <div className="mc-compare-cell">
          <div className="mc-compare-cell-label">{MC_LABELS.cellKonklusjon[locale]}</div>
          <div className="mc-compare-cell-value mc-compare-cell-value--prose">
            {MC_LABELS.videreKontrollor[locale]}
          </div>
          <div className="mc-compare-cell-note">
            {allIdentical
              ? MC_LABELS.toAvToEinige[locale]
              : `${numDiffs.length} ${MC_LABELS.avvikAVurdere[locale]}`}
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import "./mission-control.css";

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
  const bothComplete = calculationA !== null && calculationB !== null;

  return (
    <div className="mc">
      <header className="mc-header">
        <p className="mc-eyebrow">STEG · BEREKNAR</p>
        <h1 className="mc-title">
          To uavhengige konstruktørar reknar same problem
        </h1>
        <p className="mc-subtitle">
          Konstruktør A og B brukar ulik metode. Samanliknaren stadfestar at
          dei er einige før resultatet er presentert.
        </p>
      </header>

      <div className="mc-grid">
        <AgentCard
          letter="A"
          name="Konstruktør A"
          tag="LUKKA FORMEL · EUROKODE"
          streaming={streamingA}
          calculation={calculationA}
        />
        <AgentCard
          letter="B"
          name="Konstruktør B"
          tag="NUMERISK · FRI LEKAM"
          streaming={streamingB}
          calculation={calculationB}
        />
      </div>

      <SamanliknarPanel bothComplete={bothComplete} comparison={comparison} />
    </div>
  );
}

function AgentCard({
  letter,
  name,
  tag,
  streaming,
  calculation,
}: {
  letter: string;
  name: string;
  tag: string;
  streaming: AgentStreamingState;
  calculation: CalculationResultMin | null;
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
      ? "Tenkjer djupt på problemet"
      : "Skriv neste steg";

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
          <strong>Feil:</strong> {errorMessage}
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
}: {
  bothComplete: boolean;
  comparison: ComparisonResultMin | null;
}) {
  if (!bothComplete) {
    return (
      <div className="mc-compare mc-compare--waiting">
        <div className="mc-compare-avatar">S</div>
        <div className="mc-compare-name">Samanliknar</div>
        <div className="mc-compare-pill">VENTAR</div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="mc-compare mc-compare--working">
        <div className="mc-compare-avatar">S</div>
        <div className="mc-compare-name">Samanliknar</div>
        <div className="mc-compare-pill mc-compare-pill--active">
          REKNAR AVVIK
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
        <div className="mc-compare-name">Samanliknar</div>
        <div className="mc-compare-pill mc-compare-pill--success">EINIGE</div>
      </header>
      <div className="mc-compare-grid">
        {allIdentical ? (
          <>
            <div className="mc-compare-cell">
              <div className="mc-compare-cell-label">RESULTAT</div>
              <div className="mc-compare-cell-value">0,0 %</div>
              <div className="mc-compare-cell-note">A og B identiske</div>
            </div>
            <div className="mc-compare-cell">
              <div className="mc-compare-cell-label">METODE</div>
              <div className="mc-compare-cell-value mc-compare-cell-value--prose">
                Begge konvergerer
              </div>
              <div className="mc-compare-cell-note">
                Lukka formel og numerisk gir same svar
              </div>
            </div>
          </>
        ) : (
          topDiffs.map((d, i) => (
            <div key={i} className="mc-compare-cell">
              <div className="mc-compare-cell-label">{d.field} AVVIK</div>
              <div className="mc-compare-cell-value">
                {d.percent_diff?.toFixed(1) ?? "0,0"} %
              </div>
              <div className="mc-compare-cell-note">
                {d.severity === "low" ? "Innanfor toleranse" : "Vurder nærare"}
              </div>
            </div>
          ))
        )}
        <div className="mc-compare-cell">
          <div className="mc-compare-cell-label">KONKLUSJON</div>
          <div className="mc-compare-cell-value mc-compare-cell-value--prose">
            Vidare til kontrollør
          </div>
          <div className="mc-compare-cell-note">
            {allIdentical
              ? "2 av 2 metodar einige"
              : `${numDiffs.length} avvik å vurdere`}
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import "./mission-control.css";

/**
 * Mission Control v1 (Dag 7) — pilot-versjonen av lasteskjermen.
 *
 * Matchar mockup-en: ein samanhangande steg-liste der dei siste 2 raden
 * er resultat-verdiar (med tjukk skiljelinje over). Ingen separat
 * "Results"-blokk under stega.
 *
 * Fake-streaming: stega animerer i fast tempo (~4 sek per steg) medan
 * vi ventar på agent-API. Når agenten returnerer, snappar alle stega
 * til "utført" og resultat-radene legg seg til som dei to siste avhuka
 * stega.
 *
 * Ekte streaming kjem i v0.2.
 */

const STEP_INTERVAL_MS = 4000;

const AGENT_A_STEPS = [
  "Identifiserer berekningstype og system",
  "Tolkar input-data og einingar",
  "Set opp lukka formel etter Eurokode",
  "Reknar dimensjonerande verdiar",
  "Validerer mot standardgrenser",
];

const AGENT_B_STEPS = [
  "Sanity-check på input-data",
  "Set opp uavhengig metode",
  "Reknar via fri lekam og likevektsbalanse",
  "Kryss-sjekker mot lukka formel",
  "Klar for samanlikning",
];

type CalculationResultMin = {
  short_conclusion?: string;
  results?: Record<string, string>;
  confidence?: "high" | "medium" | "low";
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

type Props = {
  calculationA: CalculationResultMin | null;
  calculationB: CalculationResultMin | null;
  comparison: ComparisonResultMin | null;
};

type StepStatus = "ventar" | "pågår" | "utført";

function stepStatus(
  index: number,
  currentStep: number,
  agentComplete: boolean
): StepStatus {
  if (agentComplete) return "utført";
  if (index < currentStep) return "utført";
  if (index === currentStep) return "pågår";
  return "ventar";
}

export default function MissionControl({
  calculationA,
  calculationB,
  comparison,
}: Props) {
  const [agentAStep, setAgentAStep] = useState(0);
  const [agentBStep, setAgentBStep] = useState(0);

  useEffect(() => {
    if (calculationA) return;
    if (agentAStep >= AGENT_A_STEPS.length - 1) return;
    const timer = setTimeout(() => setAgentAStep((s) => s + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [agentAStep, calculationA]);

  useEffect(() => {
    if (calculationB) return;
    if (agentBStep >= AGENT_B_STEPS.length - 1) return;
    const timer = setTimeout(() => setAgentBStep((s) => s + 1), STEP_INTERVAL_MS + 700);
    return () => clearTimeout(timer);
  }, [agentBStep, calculationB]);

  const bothComplete = calculationA !== null && calculationB !== null;

  return (
    <div className="mc">
      <header className="mc-header">
        <p className="mc-eyebrow">STEG · BEREKNAR</p>
        <h1 className="mc-title">To uavhengige konstruktørar reknar same problem</h1>
        <p className="mc-subtitle">
          Konstruktør A og B brukar ulik metode. Samanliknaren stadfestar at dei er einige før resultatet er presentert.
        </p>
      </header>

      <div className="mc-grid">
        <AgentCard
          letter="A"
          name="Konstruktør A"
          tag="LUKKA FORMEL · EUROKODE"
          steps={AGENT_A_STEPS}
          currentStep={agentAStep}
          calculation={calculationA}
        />
        <AgentCard
          letter="B"
          name="Konstruktør B"
          tag="NUMERISK · FRI LEKAM"
          steps={AGENT_B_STEPS}
          currentStep={agentBStep}
          calculation={calculationB}
        />
      </div>

      <SamanliknarPanel
        bothComplete={bothComplete}
        comparison={comparison}
      />
    </div>
  );
}

function AgentCard({
  letter,
  name,
  tag,
  steps,
  currentStep,
  calculation,
}: {
  letter: string;
  name: string;
  tag: string;
  steps: string[];
  currentStep: number;
  calculation: CalculationResultMin | null;
}) {
  const complete = calculation !== null;
  // Vis top 2 results-verdiar som avhuka steg under skiljelinje
  const resultEntries = complete && calculation?.results
    ? Object.entries(calculation.results).slice(0, 2)
    : [];

  return (
    <div className={`mc-agent-card${complete ? " mc-agent-card--complete" : ""}`}>
      <header className="mc-agent-header">
        <div className="mc-agent-avatar">{letter}</div>
        <div className="mc-agent-name">{name}</div>
        <div className="mc-agent-tag">{tag}</div>
      </header>

      <ol className="mc-steps">
        {steps.map((step, i) => {
          const status = stepStatus(i, currentStep, complete);
          return (
            <li key={i} className={`mc-step mc-step--${status}`}>
              <span className="mc-step-icon">
                {status === "utført" ? "✓" : status === "pågår" ? "◐" : "○"}
              </span>
              <span className="mc-step-text">{step}</span>
            </li>
          );
        })}

        {/* Resultat-rader som avhuka steg under tjukk skiljelinje */}
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
        <div className="mc-compare-pill mc-compare-pill--active">REKNAR AVVIK</div>
      </div>
    );
  }

  const numDiffs = comparison.numeric_differences || [];
  const topDiffs = numDiffs.slice(0, 2);
  const allIdentical = numDiffs.length === 0 || numDiffs.every((d) => (d.percent_diff || 0) === 0);

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
              <div className="mc-compare-cell-value mc-compare-cell-value--prose">Begge konvergerer</div>
              <div className="mc-compare-cell-note">Lukka formel og numerisk gir same svar</div>
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
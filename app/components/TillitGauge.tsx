"use client";

import { useState } from "react";
import { tillitVisuals } from "@/lib/tillit-score";

/**
 * TillitGauge — sirkulær gauge-komponent for AI-pipeline-tillit (0-100).
 *
 * Tre states:
 * - idle: viss score er null (rapport laga før migrasjon eller berekning feila)
 * - collapsed: viss expanded=false, viser berre tal + label
 * - expanded: viser breakdown med tre komponentar (35/35/30)
 *
 * Fagperson-status vises separat i Kontrollstatus-panelet — ikkje i denne gauge'n.
 * Begrunnelse: pilot har ikkje fagperson-signering enno, så å inkludere ho i
 * score ville gjeve maks 85/100 og gjort "Høg"-kategorien uoppnåeleg.
 *
 * Print-mode: breakdown alltid utvida (CSS-styrt via @media print).
 */

interface TillitBreakdown {
  ab_agreement: number;
  controller_verdict: number;
  completeness: number;
  total: number;
  formula_version?: string;
  components?: {
    comparison_status: string;
    controller_verdict_raw: string;
    rekna_storleikar: number;
    spurde_storleikar: number;
    completeness_ratio: number;
  };
}

interface TillitGaugeProps {
  score: number | null | undefined;
  breakdown?: TillitBreakdown | null;
}

const SVG_SIZE = 180;
const CENTER = SVG_SIZE / 2;
const RADIUS = 72;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TillitGauge({ score, breakdown }: TillitGaugeProps) {
  const [expanded, setExpanded] = useState(false);

  if (score === null || score === undefined) {
    return (
      <div className="tillit-gauge tillit-gauge--idle">
        <span className="tillit-gauge__placeholder">
          Tillit-score ikkje rekna
        </span>
      </div>
    );
  }

  const { label, color } = tillitVisuals(score);
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="tillit-gauge">
      <button
        type="button"
        className="tillit-gauge__button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`Tillit-score ${score} av 100 (${label}). Klikk for å sjå breakdown.`}
      >
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          aria-hidden="true"
          className="tillit-gauge__svg"
        >
          {/* Bakgrunns-ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--rule, #E2E8F0)"
            strokeWidth={STROKE}
          />
          {/* Progresjons-boge — roter -90 grader så han startar på toppen */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            className="tillit-gauge__progress"
          />
        </svg>
        <div className="tillit-gauge__center">
          <span className="tillit-gauge__score">{score}</span>
          <span className="tillit-gauge__max">/100</span>
        </div>
        <div className="tillit-gauge__label" style={{ color }}>
          {label}
        </div>
      </button>

      {breakdown && (
        <div
          className="tillit-gauge__breakdown"
          data-expanded={expanded ? "true" : "false"}
        >
          <ComponentRow
            label="Konstruktør-semje"
            value={breakdown.ab_agreement}
            max={35}
            detail={prettifyEnum(breakdown.components?.comparison_status)}
          />
          <ComponentRow
            label="Kontrollør-verdict"
            value={breakdown.controller_verdict}
            max={35}
            detail={prettifyEnum(breakdown.components?.controller_verdict_raw)}
          />
          <ComponentRow
            label="Fullstendigheit"
            value={breakdown.completeness}
            max={30}
            detail={
              breakdown.components
                ? `${breakdown.components.rekna_storleikar} av ${breakdown.components.spurde_storleikar} storleikar rekna`
                : undefined
            }
          />
          <p className="tillit-gauge__formula-note">
            Gauge'n måler AI-pipeline-tillit. Fagperson-kontroll vises separat i kontrollstatus. Formelen er ein pilot-hypotese og blir kalibrert i v0.2.
          </p>
        </div>
      )}
    </div>
  );
}

interface ComponentRowProps {
  label: string;
  value: number;
  max: number;
  detail?: string;
}

function ComponentRow({ label, value, max, detail }: ComponentRowProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="tillit-gauge__row">
      <div className="tillit-gauge__row-header">
        <span className="tillit-gauge__row-label">{label}</span>
        <span className="tillit-gauge__row-value">
          {value} / {max}
        </span>
      </div>
      <div className="tillit-gauge__row-bar" aria-hidden="true">
        <div
          className="tillit-gauge__row-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      {detail && <div className="tillit-gauge__row-detail">{detail}</div>}
    </div>
  );
}

/**
 * Mappar snake_case enum-verdiar til lesbare etikettar.
 * Returnerer undefined viss input er undefined/tom.
 */
function prettifyEnum(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const map: Record<string, string> = {
    match: "Full semje",
    minor_differences: "Mindre avvik",
    significant_differences: "Betydelege avvik",
    critical_disagreement: "Kritisk usemje",
    approved: "Godkjent",
    approved_with_warnings: "Godkjent med åtvaringar",
    uncertain: "Usikker",
    rejected: "Avvist",
  };
  return map[raw] ?? raw;
}
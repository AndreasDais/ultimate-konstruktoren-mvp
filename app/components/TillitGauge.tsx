"use client";

import { useState } from "react";
import { tillitVisuals } from "@/lib/tillit-score";
import { InfoPopover } from "@/app/components/InfoPopover";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";

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

const TG_LABELS: Record<string, Record<Locale, string>> = {
  // Idle-state
  ikkjeRekna: { nb: "Tillit-score ikke beregnet", nn: "Tillit-score ikkje rekna" },
  // Aria-label
  ariaPre: { nb: "Tillit-score ", nn: "Tillit-score " },
  ariaMid: { nb: " av 100 (", nn: " av 100 (" },
  ariaPost: { nb: "). Klikk for å se breakdown.", nn: "). Klikk for å sjå breakdown." },
  // Komponent-rader
  konstruktorSemje: { nb: "Konstruktør-enighet", nn: "Konstruktør-semje" },
  konstruktorSemjeExpl: { nb: "Speiler Sammenligner sin vurdering av om Konstruktør A og B kom frem til samme svar. Full enighet gir høyeste verdi; metodiske eller numeriske avvik trekker ned.", nn: "Speglar Samanliknar si vurdering av om Konstruktør A og B kom fram til same svar. Full semje gjev høgaste verdi; metodiske eller numeriske avvik trekker ned." },
  kontrollorVerdict: { nb: "Kontrollør-verdict", nn: "Kontrollør-verdict" },
  kontrollorVerdictExpl: { nb: "Speiler Kontrollørens endelige avgjørelse. Godkjent gir høyeste verdi; godkjent med advarsler litt lavere; usikker mye lavere; avvist nuller ut.", nn: "Speglar Kontrollør si endelege avgjerd. Godkjent gjev høgaste verdi; godkjent med åtvaringar litt lågare; usikker mykje lågare; avvist nullar ut." },
  fullstendigheit: { nb: "Fullstendighet", nn: "Fullstendigheit" },
  fullstendigheitExpl: { nb: "Måler hvor mange av de forespurte størrelsene som faktisk ble beregnet i pipeline. Full pott når alle er dekket.", nn: "Måler kor mange av dei førespurde storleikane som faktisk blei rekna i pipeline. Full pott når alle er dekt." },
  formulaNote: { nb: "Gauge'en måler AI-pipeline-tillit. Fagperson-kontroll vises separat i kontrollstatus. Formelen er en pilot-hypotese og blir kalibrert i v0.2.", nn: "Gauge'n måler AI-pipeline-tillit. Fagperson-kontroll vises separat i kontrollstatus. Formelen er ein pilot-hypotese og blir kalibrert i v0.2." },
  storleikarRekna: { nb: "størrelser beregnet", nn: "storleikar rekna" },
  avInfix: { nb: "av", nn: "av" },
};

// Enum-mapping for prettifyEnum — locale-aware
const ENUM_LABELS_BY_LOCALE: Record<Locale, Record<string, string>> = {
  nb: {
    match: "Full enighet",
    minor_differences: "Mindre avvik",
    significant_differences: "Betydelige avvik",
    critical_disagreement: "Kritisk uenighet",
    approved: "Godkjent",
    approved_with_warnings: "Godkjent med advarsler",
    uncertain: "Usikker",
    rejected: "Avvist",
  },
  nn: {
    match: "Full semje",
    minor_differences: "Mindre avvik",
    significant_differences: "Betydelege avvik",
    critical_disagreement: "Kritisk usemje",
    approved: "Godkjent",
    approved_with_warnings: "Godkjent med åtvaringar",
    uncertain: "Usikker",
    rejected: "Avvist",
  },
};

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
  const { locale } = useLocale();
  const [expanded, setExpanded] = useState(false);

  if (score === null || score === undefined) {
    return (
      <div className="tillit-gauge tillit-gauge--idle">
        <span className="tillit-gauge__placeholder">
          {TG_LABELS.ikkjeRekna[locale]}
        </span>
      </div>
    );
  }

  const { label, color } = tillitVisuals(score, locale);
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="tillit-gauge">
      <button
        type="button"
        className="tillit-gauge__button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${TG_LABELS.ariaPre[locale]}${score}${TG_LABELS.ariaMid[locale]}${label}${TG_LABELS.ariaPost[locale]}`}
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
            label={TG_LABELS.konstruktorSemje[locale]}
            value={breakdown.ab_agreement}
            max={35}
            detail={prettifyEnum(breakdown.components?.comparison_status, locale)}
            explanation={TG_LABELS.konstruktorSemjeExpl[locale]}
          />
          <ComponentRow
            label={TG_LABELS.kontrollorVerdict[locale]}
            value={breakdown.controller_verdict}
            max={35}
            detail={prettifyEnum(breakdown.components?.controller_verdict_raw, locale)}
            explanation={TG_LABELS.kontrollorVerdictExpl[locale]}
          />
          <ComponentRow
            label={TG_LABELS.fullstendigheit[locale]}
            value={breakdown.completeness}
            max={30}
            detail={
              breakdown.components
                ? `${breakdown.components.rekna_storleikar} ${TG_LABELS.avInfix[locale]} ${breakdown.components.spurde_storleikar} ${TG_LABELS.storleikarRekna[locale]}`
                : undefined
            }
            explanation={TG_LABELS.fullstendigheitExpl[locale]}
          />
          <p className="tillit-gauge__formula-note">
            {TG_LABELS.formulaNote[locale]}
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
  explanation: string;
}

function ComponentRow({ label, value, max, detail, explanation }: ComponentRowProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="tillit-gauge__row">
      <div className="tillit-gauge__row-header">
        <span className="tillit-gauge__row-label">
          {label}
          <InfoPopover label={label}>
            <p>{explanation}</p>
          </InfoPopover>
        </span>
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
function prettifyEnum(raw: string | undefined, locale: Locale): string | undefined {
  if (!raw) return undefined;
  const map = ENUM_LABELS_BY_LOCALE[locale];
  return map[raw] ?? raw;
}
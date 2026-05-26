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
 * - collapsed: viss expanded=false, viser only tal + label
 * - expanded: viser breakdown med tre komponentar (35/35/30)
 *
 * Fagperson-status vises separat i Kontrollstatus-panelet — ikkje i denne gauge'n.
 * Begrunnelse: pilot har ikkje fagperson-signering enno, så å inkludere ho i
 * score ville gjeve maks 85/100 og gjort "Høg"-kategorien uoppnåeleg.
 *
 * Print-mode: breakdown alltid utvida (CSS-styrt via @media print).
 */

const TG_LABELS: Record<string, Record<Locale | "en", string>> = {
  // Idle-state
  ikkjeRekna: { nb: "Tillit-score ikke beregnet", nn: "Tillit-score ikkje rekna", en: "Trust score not calculated" },
  // Aria-label
  ariaPre: { nb: "Tillit-score ", nn: "Tillit-score ", en: "Trust score " },
  ariaMid: { nb: " av 100 (", nn: " av 100 (", en: " out of 100 (" },
  ariaPost: { nb: "). Klikk for å se breakdown.", nn: "). Klikk for å sjå breakdown.", en: "). Click to see breakdown." },
  // Komponent-rader
  konstruktorSemje: { nb: "Konstruktør-enighet", nn: "Konstruktør-semje", en: "Engineer agreement" },
  konstruktorSemjeExpl: { nb: "Speiler Sammenligner sin vurdering av om Konstruktør A og Konstruktør B kom frem til samme svar. Full enighet gir høyeste verdi; metodiske eller numeriske avvik trekker ned.", nn: "Speglar Samanliknar si vurdering av om Konstruktør A og Konstruktør B kom fram til same svar. Full semje gjev høgaste verdi; metodiske eller numeriske avvik trekker ned.", en: "Reflects the Comparator's assessment of whether Engineer A and Engineer B reached the same answer. Full agreement gives the highest value; methodological or numerical differences reduce it." },
  kontrollorVerdict: { nb: "Kontrollør-verdikt", nn: "Kontrollør-verdikt", en: "Controller verdict" },
  kontrollorVerdictExpl: { nb: "Speiler Kontrollørens endelige avgjørelse. Godkjent gir høyeste verdi; godkjent med advarsler litt lavere; usikker mye lavere; avvist nuller ut.", nn: "Speglar Kontrolløren si endelege avgjerd. Godkjent gjev høgaste verdi; godkjent med åtvaringar litt lågare; usikker mykje lågare; avvist nullar ut.", en: "Reflects the Controller's final decision. Approved gives the highest value; approved with warnings slightly lower; uncertain much lower; rejected zeroes it out." },
  fullstendigheit: { nb: "Fullstendighet", nn: "Fullstendigheit", en: "Completeness" },
  fullstendigheitExpl: { nb: "Måler hvor mange av de forespurte størrelsene som faktisk ble beregnet i pipeline. Full pott når alle er dekket.", nn: "Måler kor mange av dei førespurde storleikane som faktisk blei rekna i pipeline. Full pott når alle er dekt.", en: "Measures how many of the requested quantities were actually calculated in the pipeline. Full score when all are covered." },
  formulaNote: { nb: "Gauge'en måler AI-pipeline-tillit. Fagperson-kontroll vises separat i kontrollstatus. Formelen er en pilot-hypotese og blir kalibrert i v0.2.", nn: "Gauge'n måler AI-pipeline-tillit. Fagperson-kontroll vises separat i kontrollstatus. Formelen er ein pilot-hypotese og blir kalibrert i v0.2.", en: "The gauge measures AI pipeline trust. Professional review is shown separately in the control status. The formula is a pilot hypothesis and will be calibrated in v0.2." },
  storleikarRekna: { nb: "størrelser beregnet", nn: "storleikar rekna", en: "quantities calculated" },
  avInfix: { nb: "av", nn: "av", en: "of" },
};

// Enum-mapping for prettifyEnum — locale-aware
const ENUM_LABELS_BY_LOCALE: Record<Locale | "en", Record<string, string>> = {
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
  en: {
    match: "Full agreement",
    minor_differences: "Minor differences",
    significant_differences: "Significant differences",
    critical_disagreement: "Critical disagreement",
    approved: "Approved",
    approved_with_warnings: "Approved with warnings",
    uncertain: "Uncertain",
    rejected: "Rejected",
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
  displayLanguage?: Locale | "en";
}

const SVG_SIZE = 180;
const CENTER = SVG_SIZE / 2;
const RADIUS = 72;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const EN_TILLIT_LABELS: Record<string, string> = {
  high: "HIGH",
  good: "GOOD",
  medium: "MEDIUM",
  low: "LOW",
};

export function TillitGauge({ score, breakdown, displayLanguage }: TillitGaugeProps) {
  const { locale } = useLocale();
  const lang: Locale | "en" = displayLanguage ?? locale;
  const [expanded, setExpanded] = useState(false);

  if (score === null || score === undefined) {
    return (
      <div className="tillit-gauge tillit-gauge--idle">
        <span className="tillit-gauge__placeholder">
          {TG_LABELS.ikkjeRekna[lang]}
        </span>
      </div>
    );
  }

  const visuals = tillitVisuals(score, locale);
  const label =
    displayLanguage === "en"
      ? EN_TILLIT_LABELS[visuals.labelKey] ?? visuals.label
      : visuals.label;
  const color = visuals.color;
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="tillit-gauge">
      <button
        type="button"
        className="tillit-gauge__button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${TG_LABELS.ariaPre[lang]}${score}${TG_LABELS.ariaMid[lang]}${label}${TG_LABELS.ariaPost[lang]}`}
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
            label={TG_LABELS.konstruktorSemje[lang]}
            value={breakdown.ab_agreement}
            max={35}
            detail={prettifyEnum(breakdown.components?.comparison_status, lang)}
            explanation={TG_LABELS.konstruktorSemjeExpl[lang]}
          />
          <ComponentRow
            label={TG_LABELS.kontrollorVerdict[lang]}
            value={breakdown.controller_verdict}
            max={35}
            detail={prettifyEnum(breakdown.components?.controller_verdict_raw, lang)}
            explanation={TG_LABELS.kontrollorVerdictExpl[lang]}
          />
          <ComponentRow
            label={TG_LABELS.fullstendigheit[lang]}
            value={breakdown.completeness}
            max={30}
            detail={
              breakdown.components
                ? `${breakdown.components.rekna_storleikar} ${TG_LABELS.avInfix[lang]} ${breakdown.components.spurde_storleikar} ${TG_LABELS.storleikarRekna[lang]}`
                : undefined
            }
            explanation={TG_LABELS.fullstendigheitExpl[lang]}
          />
          <p className="tillit-gauge__formula-note">
            {TG_LABELS.formulaNote[lang]}
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
 * Mappar snake_case enum-verdiar til lesonly etikettar.
 * Returnerer undefined viss input er undefined/tom.
 */
function prettifyEnum(raw: string | undefined, lang: Locale | "en"): string | undefined {
  if (!raw) return undefined;
  const map = ENUM_LABELS_BY_LOCALE[lang];
  return map[raw] ?? raw;
}
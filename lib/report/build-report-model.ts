import {
  confidenceLabel,
  decisionStatusLabel,
  decisionStatusShort,
  formatPromptVersion,
  inputStatusLabel,
  matchPhrase,
  matchStatusShort,
} from "@/lib/format";
import type { Locale } from "@/lib/locale";
import { tillitVisuals, type TillitBreakdown } from "@/lib/tillit-score";
import {
  REPORT_DISCLAIMER,
  REPORT_MODEL_VERSION,
  type CalculationResultRow,
  type ComparisonRow,
  type KeyResult,
  type PipelineStatusRow,
  type ReportAudience,
  type ReportModel,
} from "./report-model";
import {
  canonicalResultKey,
  categorizeResultKey,
  cleanReportText,
  compactReportText,
  displayResultLabel,
  limitText,
  normalizeCalculationStep,
  normalizeReportModel,
  resultPriorityScore,
  splitValueUnit,
} from "./normalize-report-model";

export type UpstreamAgentOutput = {
  agent_name: string;
  structured_output: {
    short_conclusion?: string;
    assumptions?: string[];
    calculation_steps?: { title: string; text: string; latex_formula?: string | string[] | null }[];
    results?: Record<string, string>;
    limitations?: string[];
    warnings?: string[];
    confidence?: string;
  };
  prompt_version: string;
};

export type UpstreamReportData = {
  report: {
    id: string;
    document_id: string;
    executive_summary: string;
    technical_assessment: string;
    conclusion: string;
    prompt_version: string;
    created_at: string;
    tillit_score: number | null;
    tillit_breakdown: TillitBreakdown | null;
  };
  cached?: boolean;
  run: { request: { raw_text: string } };
  inputReview: {
    input_status: string;
    parsed_data?: unknown;
    prompt_version: string;
  } | null;
  agentA: UpstreamAgentOutput;
  agentB: UpstreamAgentOutput;
  comparison: { match_status: string; comparison_data: unknown } | null;
  controllerDecision: {
    decision_status: string;
    risk_level?: string;
    reason?: string;
    user_message: string;
    blocked_outputs?: string[];
  } | null;
};

export type BuildReportModelOptions = {
  locale: Locale;
  reportUrl: string;
  audience?: ReportAudience;
};

const LABELS: Record<string, Record<Locale, string>> = {
  title: { nb: "Beregningsnotat", nn: "Berekningsnotat" },
  subtitle: { nb: "AI-generert beregningsnotat", nn: "AI-generert berekningsnotat" },
  qrLabel: { nb: "Skann for nettversjon", nn: "Skann for nettversjon" },
  qrDescription: {
    nb: "Åpner rapporten med kontrollstatus, pipeline og delbar lenke for medstudenter eller kollegaer.",
    nn: "Opnar rapporten med kontrollstatus, pipeline og delbar lenkje for medstudentar eller kollegaer.",
  },
  inputTolking: { nb: "Input-tolkning", nn: "Input-tolking" },
  konstruktorA: { nb: "Konstruktør A", nn: "Konstruktør A" },
  konstruktorB: { nb: "Konstruktør B", nn: "Konstruktør B" },
  samanlikning: { nb: "Sammenligning", nn: "Samanlikning" },
  kontrollor: { nb: "Kontrollør", nn: "Kontrollør" },
  fagperson: { nb: "Fagperson", nn: "Fagperson" },
  ikkjeKontrollert: { nb: "Ikke kontrollert", nn: "Ikkje kontrollert" },
  ukjent: { nb: "Ukjent", nn: "Ukjent" },
};

function statusTone(value: string | undefined | null): PipelineStatusRow["status"] {
  const normalized = (value ?? "").toLowerCase();
  if (["approved", "match", "klar", "high", "ok", "godkjent"].some((token) => normalized.includes(token))) return "ok";
  if (["warning", "warnings", "minor", "medium", "delvis", "foreløpig"].some((token) => normalized.includes(token))) return "warning";
  if (["rejected", "critical", "low", "avvist", "mangelfull"].some((token) => normalized.includes(token))) return "danger";
  return "unknown";
}

function resultRowsFrom(results: Record<string, string> | undefined): CalculationResultRow[] {
  const byCanonical = new Map<string, CalculationResultRow>();

  for (const [sourceLabel, raw] of Object.entries(results ?? {})) {
    const cleanedRaw = compactReportText(raw);
    if (!cleanedRaw) continue;

    const canonical = canonicalResultKey(sourceLabel);
    const { value, unit } = splitValueUnit(cleanedRaw);
    const category = categorizeResultKey(sourceLabel);
    const row = {
      label: displayResultLabel(sourceLabel),
      value,
      unit,
      raw: cleanedRaw,
      category,
    };

    const existing = byCanonical.get(canonical);
    if (!existing || resultPriorityScore(sourceLabel) < resultPriorityScore(existing.label)) {
      byCanonical.set(canonical, row);
    }
  }

  return Array.from(byCanonical.values()).sort((a, b) => resultPriorityScore(a.label) - resultPriorityScore(b.label));
}

function keyResultsFrom(rows: CalculationResultRow[]): KeyResult[] {
  const byCanonical = new Map<string, CalculationResultRow>();
  for (const row of rows) {
    const canonical = canonicalResultKey(row.label);
    if (!byCanonical.has(canonical)) byCanonical.set(canonical, row);
  }

  const preferredCoverOrder = [
    "eddim",
    "med",
    "ved",
    "ned",
    "qed",
    "l",
    "qk",
    "gk",
    "sk",
  ];

  const selected: KeyResult[] = [];
  const seen = new Set<string>();

  for (const canonical of preferredCoverOrder) {
    const row = byCanonical.get(canonical);
    if (!row || seen.has(canonical)) continue;
    seen.add(canonical);
    selected.push({ ...row });
    if (selected.length >= 4) return selected;
  }

  const fallbacks = rows
    .filter((row) => row.category !== "anna")
    .filter((row) => {
      const canonical = canonicalResultKey(row.label);
      // Cover should communicate main engineering results and basic input, not
      // internal comparison variants or partial-/combination factors.
      if (/^(psi0|gamma)/.test(canonical)) return false;
      if (/^ed610/.test(canonical) && byCanonical.has("eddim")) return false;
      return !seen.has(canonical);
    })
    .sort((a, b) => resultPriorityScore(a.label) - resultPriorityScore(b.label));

  for (const row of fallbacks) {
    const canonical = canonicalResultKey(row.label);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    selected.push({ ...row });
    if (selected.length >= 4) break;
  }

  return selected.length > 0 ? selected : rows.slice(0, 4).map((row) => ({ ...row }));
}

function numericValue(raw: string): number | null {
  const token = raw.replace(/\s/g, "").match(/-?[\d.,]+/);
  if (!token) return null;
  const parsed = Number.parseFloat(token[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function valuesMatch(a: string, b: string): boolean {
  if (a === "-" || b === "-") return false;
  if (a === b) return true;
  const aNum = numericValue(a);
  const bNum = numericValue(b);
  return aNum !== null && bNum !== null && Math.abs(aNum - bNum) < 0.005;
}

function buildComparisonRows(data: UpstreamReportData): ComparisonRow[] {
  const resultsA = data.agentA.structured_output.results ?? {};
  const resultsB = data.agentB.structured_output.results ?? {};
  const groups = new Map<string, { label: string; a: string; b: string; score: number }>();

  for (const [sourceLabel, raw] of Object.entries(resultsA)) {
    const canonical = canonicalResultKey(sourceLabel);
    const current = groups.get(canonical);
    const score = resultPriorityScore(sourceLabel);
    groups.set(canonical, {
      label: current && current.score < score ? current.label : displayResultLabel(sourceLabel),
      a: compactReportText(raw),
      b: current?.b ?? "-",
      score: Math.min(score, current?.score ?? score),
    });
  }

  for (const [sourceLabel, raw] of Object.entries(resultsB)) {
    const canonical = canonicalResultKey(sourceLabel);
    const current = groups.get(canonical);
    const score = resultPriorityScore(sourceLabel);
    groups.set(canonical, {
      label: current && current.score < score ? current.label : displayResultLabel(sourceLabel),
      a: current?.a ?? "-",
      b: compactReportText(raw),
      score: Math.min(score, current?.score ?? score),
    });
  }

  return Array.from(groups.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, 12)
    .map((row) => ({
      label: row.label,
      constructorA: row.a || "-",
      constructorB: row.b || "-",
      match: valuesMatch(row.a || "-", row.b || "-"),
    }));
}

function buildPipelineStatus(data: UpstreamReportData, locale: Locale): PipelineStatusRow[] {
  const input = data.inputReview ? inputStatusLabel(data.inputReview.input_status, locale) : "-";
  const a = confidenceLabel(data.agentA.structured_output.confidence ?? "", locale);
  const b = confidenceLabel(data.agentB.structured_output.confidence ?? "", locale);
  const comp = matchStatusShort(data.comparison?.match_status ?? "", locale);
  const ctrl = decisionStatusShort(data.controllerDecision?.decision_status ?? "", locale);

  return [
    { label: LABELS.inputTolking[locale], value: input, status: statusTone(input) },
    { label: LABELS.konstruktorA[locale], value: a, status: statusTone(data.agentA.structured_output.confidence) },
    { label: LABELS.konstruktorB[locale], value: b, status: statusTone(data.agentB.structured_output.confidence) },
    { label: LABELS.samanlikning[locale], value: comp, status: statusTone(data.comparison?.match_status) },
    { label: LABELS.kontrollor[locale], value: ctrl, status: statusTone(data.controllerDecision?.decision_status) },
    { label: LABELS.fagperson[locale], value: LABELS.ikkjeKontrollert[locale], status: "warning" },
  ];
}

function decisionStatusCode(data: UpstreamReportData): string {
  return data.controllerDecision?.decision_status ?? "unknown";
}

function displayDate(createdAt: string, locale: Locale): string {
  const dateTag = locale === "nb" ? "nb-NO" : "nn-NO";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return createdAt;
  return parsed.toLocaleDateString(dateTag, { year: "numeric", month: "long", day: "numeric" });
}

export function buildReportModel(data: UpstreamReportData, options: BuildReportModelOptions): ReportModel {
  const locale = options.locale;
  const primary = data.agentA;
  const resultRows = resultRowsFrom(primary.structured_output.results);
  const keyResults = keyResultsFrom(resultRows);
  const tillit = data.report.tillit_score === null || data.report.tillit_score === undefined
    ? { label: LABELS.ukjent[locale], labelKey: "unknown" }
    : tillitVisuals(data.report.tillit_score, locale);
  const decisionCode = decisionStatusCode(data);
  const decision = decisionStatusLabel(decisionCode, locale) ?? LABELS.ukjent[locale];
  const comparisonStatus = data.comparison?.match_status ?? "unknown";
  const comparisonText = matchPhrase(comparisonStatus, locale) ?? "";
  const summary = cleanReportText(data.report.executive_summary);

  return normalizeReportModel({
    meta: {
      schemaVersion: REPORT_MODEL_VERSION,
      documentId: cleanReportText(data.report.document_id),
      runId: cleanReportText(data.report.id),
      createdAt: cleanReportText(data.report.created_at),
      displayDate: displayDate(data.report.created_at, locale),
      status: decision,
      statusCode: decisionCode,
      version: formatPromptVersion(data.report.prompt_version),
      locale,
      reportUrl: options.reportUrl,
      audience: options.audience ?? "engineer",
    },
    cover: {
      title: LABELS.title[locale],
      subtitle: LABELS.subtitle[locale],
      shortSummary: limitText(summary, 340),
      qrLabel: LABELS.qrLabel[locale],
      qrDescription: LABELS.qrDescription[locale],
      qrUrl: options.reportUrl,
    },
    keyResults,
    summary: {
      text: summary,
      request: cleanReportText(data.run.request.raw_text),
    },
    interpretation: {
      status: data.inputReview ? inputStatusLabel(data.inputReview.input_status, locale) : "-",
      statusCode: data.inputReview?.input_status ?? "unknown",
      assumptions: primary.structured_output.assumptions ?? [],
    },
    calculation: {
      resultRows,
      steps: (primary.structured_output.calculation_steps ?? []).map(normalizeCalculationStep),
    },
    assessment: {
      professionalAssessment: cleanReportText(data.report.technical_assessment),
      limitations: primary.structured_output.limitations ?? [],
      warnings: primary.structured_output.warnings ?? [],
    },
    control: {
      decision,
      decisionCode,
      controllerText: cleanReportText(data.controllerDecision?.user_message ?? data.controllerDecision?.reason ?? ""),
      comparisonStatus,
      comparisonText,
      comparisonRows: buildComparisonRows(data),
      pipelineStatus: buildPipelineStatus(data, locale),
    },
    trust: {
      score: data.report.tillit_score ?? null,
      label: tillit.label,
      tone: tillit.labelKey,
      breakdown: data.report.tillit_breakdown ?? null,
    },
    conclusion: cleanReportText(data.report.conclusion),
    disclaimer: REPORT_DISCLAIMER[locale],
  });
}

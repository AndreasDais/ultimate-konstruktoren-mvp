import type { CalculationStep, KeyResultCategory, ReportModel } from "./report-model";

const CONTROL_STEP_RE = /\b(kontroll|kryss-?sjekk|kryss-?kontroll|verifikasjon|verifiser|konsistens|likevekt|sjekk|oppsummering)\b/i;
const DIMENSJONERANDE_RE = /^(m|v|n|q|p|e|ed|m_ed|v_ed|n_ed|q_ed|m\s*ed|v\s*ed|n\s*ed)/i;
const INPUT_RE = /^(l|b|h|d|t|a|f|fy|fyk|fck|profil|spenn|lengde)/i;

export function cleanReportText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\uFFFE/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function compactReportText(value: unknown): string {
  return cleanReportText(value).replace(/\s+/g, " ").trim();
}

export function limitText(value: string, maxChars: number): string {
  const text = compactReportText(value);
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars - 1).trimEnd();
  const lastSentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (lastSentence > maxChars * 0.55) return `${cut.slice(0, lastSentence + 1).trim()} …`;
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, Math.max(0, lastSpace)).trim()} …`;
}

export function splitValueUnit(raw: string): { value: string; unit: string | null } {
  const text = compactReportText(raw);
  if (!text) return { value: "", unit: null };
  const match = text.match(/^(-?[\d\s.,]+)\s*([^\d\s].*)$/u);
  if (!match) return { value: text, unit: null };
  return { value: match[1].trim(), unit: match[2].trim() || null };
}

export function categorizeResultKey(key: string): KeyResultCategory {
  const normalized = key.trim().toLowerCase();
  if (DIMENSJONERANDE_RE.test(normalized)) return "dimensjonerande";
  if (INPUT_RE.test(normalized)) return "input";
  if (/kontroll|utnytt|eta|η|ratio|samsvar/.test(normalized)) return "kontroll";
  return "anna";
}

export function isControlStepTitle(title: string): boolean {
  return CONTROL_STEP_RE.test(title);
}

export function normalizeFormulaList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(cleanReportText).filter(Boolean);
  }
  const cleaned = cleanReportText(value);
  return cleaned ? [cleaned] : [];
}

export function normalizeCalculationStep(
  raw: { title?: unknown; text?: unknown; latex_formula?: unknown },
  index: number,
): CalculationStep {
  const title = cleanReportText(raw.title) || `Steg ${index + 1}`;
  const prose = cleanReportText(raw.text);
  return {
    id: `step-${String(index + 1).padStart(2, "0")}`,
    number: index + 1,
    title,
    prose,
    formulas: normalizeFormulaList(raw.latex_formula),
    isControlStep: isControlStepTitle(title),
  };
}

export function normalizeReportModel(model: ReportModel): ReportModel {
  return {
    ...model,
    cover: {
      ...model.cover,
      shortSummary: limitText(model.cover.shortSummary, 340),
    },
    summary: {
      text: cleanReportText(model.summary.text),
      request: cleanReportText(model.summary.request),
    },
    interpretation: {
      ...model.interpretation,
      assumptions: model.interpretation.assumptions.map(cleanReportText).filter(Boolean),
    },
    assessment: {
      professionalAssessment: cleanReportText(model.assessment.professionalAssessment),
      limitations: model.assessment.limitations.map(cleanReportText).filter(Boolean),
      warnings: model.assessment.warnings.map(cleanReportText).filter(Boolean),
    },
    conclusion: cleanReportText(model.conclusion),
    disclaimer: cleanReportText(model.disclaimer),
  };
}

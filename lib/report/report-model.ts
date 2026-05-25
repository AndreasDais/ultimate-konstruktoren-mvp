import type { Locale } from "@/lib/locale";
import type { PilarDisplayLanguage } from "@/lib/international/display";
import type { TillitBreakdown } from "@/lib/tillit-score";

export const REPORT_MODEL_VERSION = "report_model_v0.1";

export type ReportAudience = "student" | "engineer" | "documentation";
export type ReportStatus = "draft" | "preliminary" | "approved" | "warning" | "uncertain" | "rejected";
export type KeyResultCategory = "dimensjonerande" | "input" | "kontroll" | "anna";
export type CheckStatus = "ok" | "warning" | "danger" | "unknown";

export type ReportMeta = {
  schemaVersion: typeof REPORT_MODEL_VERSION;
  documentId: string;
  runId: string;
  createdAt: string;
  displayDate: string;
  status: string;
  statusCode: string;
  version: string;
  locale: Locale;
  displayLanguage?: PilarDisplayLanguage;
  reportUrl: string;
  audience: ReportAudience;
};

export type ReportCover = {
  title: string;
  subtitle: string;
  shortSummary: string;
  qrLabel: string;
  qrDescription: string;
  qrUrl: string;
};

export type KeyResult = {
  label: string;
  value: string;
  unit: string | null;
  raw: string;
  category: KeyResultCategory;
};

export type ReportSummary = {
  text: string;
  request: string;
};

export type ReportInterpretation = {
  status: string;
  statusCode: string;
  assumptions: string[];
};

export type CalculationResultRow = {
  label: string;
  value: string;
  unit: string | null;
  raw: string;
  category: KeyResultCategory;
};

export type CalculationStep = {
  id: string;
  number: number;
  title: string;
  prose: string;
  formulas: string[];
  isControlStep: boolean;
};

export type ReportCalculation = {
  resultRows: CalculationResultRow[];
  steps: CalculationStep[];
};

export type ReportAssessment = {
  professionalAssessment: string;
  limitations: string[];
  warnings: string[];
};

export type ComparisonRow = {
  label: string;
  constructorA: string;
  constructorB: string;
  match: boolean;
};

export type PipelineStatusRow = {
  label: string;
  value: string;
  status: CheckStatus;
};

export type ReportControl = {
  decision: string;
  decisionCode: string;
  controllerText: string;
  comparisonStatus: string;
  comparisonText: string;
  comparisonRows: ComparisonRow[];
  pipelineStatus: PipelineStatusRow[];
};

export type ReportTrust = {
  score: number | null;
  label: string;
  tone: string;
  breakdown: TillitBreakdown | null;
};

export type ReportModel = {
  meta: ReportMeta;
  cover: ReportCover;
  keyResults: KeyResult[];
  summary: ReportSummary;
  interpretation: ReportInterpretation;
  calculation: ReportCalculation;
  assessment: ReportAssessment;
  control: ReportControl;
  trust: ReportTrust;
  conclusion: string;
  disclaimer: string;
};

export type ReportValidationIssue = {
  code: string;
  message: string;
  path: string;
  severity: "error" | "warning";
};

export type ReportValidationResult = {
  ok: boolean;
  errors: ReportValidationIssue[];
  warnings: ReportValidationIssue[];
};

export const REPORT_DISCLAIMER: Record<PilarDisplayLanguage, string> = {
  nb: "AI-generert beregningsnotat. Innholdet er støtte, læringshjelp og foreløpig teknisk vurdering. Det erstatter ikke kontroll utført av kvalifisert fagperson, ansvarlig prosjekterende eller godkjent foretak. Alle beregninger, assumptioner, standardreferanser, materialdata og konklusjoner må kontrolleres før bruk i reelle prosjekter.",
  nn: "AI-generert berekningsnotat. Innhaldet er støtte, læringshjelp og førebels teknisk vurdering. Det erstattar ikkje kontroll utført av kvalifisert fagperson, ansvarleg prosjekterande eller godkjent føretak. Alle berekningar, assumptioner, standardreferansar, materialdata og konklusjonar må kontrollerast før bruk i reelle prosjekt.",
  en: "AI-generated engineering note. The content is support, learning aid and preliminary technical assessment. It does not replace review by a qualified professional, responsible engineer or approved organization. All calculations, assumptions, standard references, material data and conclusions must be verified before use in real projects.",
};

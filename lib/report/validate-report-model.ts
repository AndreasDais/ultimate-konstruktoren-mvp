import type { ReportModel, ReportValidationIssue, ReportValidationResult } from "./report-model";

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function issue(
  severity: "error" | "warning",
  code: string,
  path: string,
  message: string,
): ReportValidationIssue {
  return { severity, code, path, message };
}

function hasProfessionalReviewDisclaimer(model: ReportModel): boolean {
  const text = model.disclaimer.trim();
  const displayLanguage = model.meta.displayLanguage ?? model.meta.locale;

  if (displayLanguage === "en") {
    return /\b(qualified professional|professional review|responsible engineer|must be verified before use)\b/i.test(text);
  }

  return /\b(fagperson|ansvarlig prosjekterende|ansvarleg prosjekterande|kontrolleres|kontrollerast)\b/i.test(text);
}

export function validateReportModel(model: ReportModel): ReportValidationResult {
  const issues: ReportValidationIssue[] = [];

  if (isBlank(model.meta.documentId)) {
    issues.push(issue("error", "missing_document_id", "meta.documentId", "Rapporten manglar dokument-ID."));
  }
  if (isBlank(model.meta.runId)) {
    issues.push(issue("error", "missing_run_id", "meta.runId", "Rapporten manglar run-ID."));
  }
  if (isBlank(model.meta.reportUrl)) {
    issues.push(issue("warning", "missing_report_url", "meta.reportUrl", "Rapporten manglar nettlenkje/QR-grunnlag."));
  }
  if (isBlank(model.cover.title)) {
    issues.push(issue("error", "missing_title", "cover.title", "Rapporten manglar tittel."));
  }
  if (isBlank(model.summary.text)) {
    issues.push(issue("warning", "missing_summary", "summary.text", "Rapporten manglar samandrag."));
  }
  if (isBlank(model.summary.request)) {
    issues.push(issue("warning", "missing_request", "summary.request", "Rapporten manglar original førespurnad."));
  }
  if (model.keyResults.length === 0 && model.calculation.resultRows.length === 0) {
    issues.push(issue("warning", "missing_results", "keyResults", "Rapporten har ingen nøkkelresultat."));
  }
  if (model.interpretation.assumptions.length === 0) {
    issues.push(issue("warning", "missing_assumptions", "interpretation.assumptions", "Rapporten har ingen assumptioner."));
  }
  if (model.calculation.steps.length === 0) {
    issues.push(issue("warning", "missing_steps", "calculation.steps", "Rapporten har ingen berekningssteg."));
  }
  if (isBlank(model.conclusion)) {
    issues.push(issue("error", "missing_conclusion", "conclusion", "Rapporten manglar konklusjon."));
  }
  if (isBlank(model.disclaimer)) {
    issues.push(issue("error", "missing_disclaimer", "disclaimer", "Rapporten manglar AI-/fagpersonforbehold."));
  } else if (!hasProfessionalReviewDisclaimer(model)) {
    issues.push(issue("error", "missing_professional_review_disclaimer", "disclaimer", "Rapporten manglar tydeleg fagpersonforbehold."));
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return { ok: errors.length === 0, errors, warnings };
}

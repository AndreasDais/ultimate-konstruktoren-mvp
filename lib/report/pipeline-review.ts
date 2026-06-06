import type {
  CalculationResultRow,
  CalculationStep,
  ComparisonRow,
  PipelineStatusRow,
  ReportModel,
} from "./report-model";
import { cleanReportText, limitText } from "./normalize-report-model";

export const PIPELINE_REVIEW_SCHEMA_VERSION = "pilar.pipeline_review.v1" as const;

export const PIPELINE_REVIEW_SAFE_SELECTS = {
  run: "id, request_id, run_status, calculation_type, started_at, completed_at, display_language, engineering_context",
  inputReview:
    "input_status, parsed_data, calculation_type, extracted_inputs, can_calculate, cannot_calculate, assumptions, prompt_version",
  agentOutputs: "agent_name, structured_output, prompt_version",
  comparison: "match_status",
  controllerDecision:
    "decision_status, risk_level, reason, user_message, blocked_outputs, manual_review_required, prompt_version",
  report:
    "id, run_id, document_id, executive_summary, technical_assessment, conclusion, prompt_version, created_at, tillit_score, tillit_breakdown",
} as const;

export type PipelineReviewRun = {
  id: string;
  status: string | null;
  calculationType: string | null;
  startedAt: string | null;
  completedAt: string | null;
  displayLanguage: "nb" | "nn" | "en";
};

export type PipelineReviewAgentSource = {
  role: "engineer_a" | "engineer_b";
  label: string;
  confidence?: string | null;
  summary?: string | null;
  warnings?: string[];
  limitations?: string[];
  withheld?: boolean;
  present?: boolean;
};

export type PipelineReviewLinks = {
  report: string;
  pdf: string;
  word: string;
  calculationSheet: string;
};

export type PublicPipelineReview = {
  schema_version: typeof PIPELINE_REVIEW_SCHEMA_VERSION;
  mode: "public_pipeline_review";
  resume_available: false;
  read_only: true;
  professional_approval: false;
  requires_professional_review: true;
  source: "canonical_report_model";
  run: {
    id: string;
    status: string | null;
    calculation_type: string | null;
    started_at: string | null;
    completed_at: string | null;
    display_language: "nb" | "nn" | "en";
  };
  report: {
    document_id: string;
    title: string;
    subtitle: string;
    summary: string;
    links: PipelineReviewLinks;
  };
  problem: {
    canonical_summary: string;
    engineering_context: {
      country: string | null;
      standard: string | null;
      support_level: string | null;
      units: string | null;
    };
  };
  interpretation: {
    status: string;
    status_code: string;
    assumptions: string[];
  };
  engineers: Array<{
    role: "engineer_a" | "engineer_b";
    label: string;
    status: "available" | "missing" | "withheld";
    confidence: string | null;
    summary: string | null;
    warnings: string[];
    limitations: string[];
  }>;
  comparison: {
    status: string;
    text: string;
    rows: Array<{
      label: string;
      engineer_a: string;
      engineer_b: string;
      match: boolean;
    }>;
  };
  controller: {
    status: string;
    status_code: string;
    risk_level: string | null;
    text: string;
    manual_review_required: boolean;
    blocked_fields: string[];
  };
  calculation: {
    facts: Array<{
      label: string;
      value: string;
      unit: string | null;
      category: string;
    }>;
    steps: Array<{
      title: string;
      prose: string;
      formulas: string[];
      is_control_step: boolean;
    }>;
  };
  safety: {
    ai_pipeline_confidence_only: true;
    raw_data_excluded: true;
    blocked_fields_respected: true;
    review_required_text: string;
  };
};

export type BuildPublicPipelineReviewInput = {
  run: PipelineReviewRun;
  reportModel: ReportModel;
  engineeringContext?: unknown;
  links: PipelineReviewLinks;
  agents?: PipelineReviewAgentSource[];
  controller?: {
    riskLevel?: string | null;
    manualReviewRequired?: boolean | null;
    blockedFields?: string[];
  } | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function bounded(value: unknown, max = 520): string {
  return limitText(cleanReportText(value), max);
}

function boundedList(values: unknown, maxItems = 6, maxLen = 220): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => bounded(value, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeEngineeringContext(value: unknown): PublicPipelineReview["problem"]["engineering_context"] {
  const context = asRecord(value);
  const region = asRecord(context?.region);
  const standards = asRecord(context?.standards);
  const outputPreferences = asRecord(context?.outputPreferences);

  return {
    country: bounded(region?.countryName ?? region?.countryCode, 80) || null,
    standard: bounded(standards?.label ?? standards?.family, 120) || null,
    support_level: bounded(standards?.supportLevel, 80) || null,
    units: bounded(outputPreferences?.units, 40) || null,
  };
}

function factsFromRows(
  rows: CalculationResultRow[],
  blockedFields: Set<string>,
): PublicPipelineReview["calculation"]["facts"] {
  if (blockedFields.has("results_a") || blockedFields.has("results_b")) return [];

  return rows.slice(0, 16).map((row) => ({
    label: bounded(row.label, 80),
    value: bounded(row.value || row.raw, 120),
    unit: row.unit ? bounded(row.unit, 40) : null,
    category: row.category,
  }));
}

function stepsFromReportModel(
  steps: CalculationStep[],
  blockedFields: Set<string>,
): PublicPipelineReview["calculation"]["steps"] {
  if (blockedFields.has("calculation_steps_a") || blockedFields.has("calculation_steps_b")) {
    return [];
  }

  return steps.slice(0, 8).map((step) => ({
    title: bounded(step.title, 140),
    prose: bounded(step.prose, 420),
    formulas: boundedList(step.formulas, 4, 180),
    is_control_step: step.isControlStep,
  }));
}

function comparisonRows(rows: ComparisonRow[]): PublicPipelineReview["comparison"]["rows"] {
  return rows.slice(0, 16).map((row) => ({
    label: bounded(row.label, 100),
    engineer_a: bounded(row.constructorA, 120),
    engineer_b: bounded(row.constructorB, 120),
    match: row.match,
  }));
}

function pipelineStatusValue(
  rows: PipelineStatusRow[],
  labelNeedle: RegExp,
): string | null {
  return rows.find((row) => labelNeedle.test(row.label))?.value ?? null;
}

function agentStatus(source: PipelineReviewAgentSource): "available" | "missing" | "withheld" {
  if (source.withheld) return "withheld";
  if (source.present === false && !source.summary && !source.confidence) return "missing";
  return "available";
}

function agentSummary(source: PipelineReviewAgentSource): string | null {
  if (source.withheld) return null;
  const summary = bounded(source.summary, 380);
  return summary || null;
}

function agentsFromSources(
  sources: PipelineReviewAgentSource[] | undefined,
  model: ReportModel,
): PublicPipelineReview["engineers"] {
  const fallbackConfidenceA = pipelineStatusValue(
    model.control.pipelineStatus,
    /(?:^| )A$|Engineer A/i,
  );
  const fallbackConfidenceB = pipelineStatusValue(
    model.control.pipelineStatus,
    /(?:^| )B$|Engineer B/i,
  );
  const defaultSources: PipelineReviewAgentSource[] = [
    {
      role: "engineer_a",
      label: model.meta.displayLanguage === "en" ? "Engineer A" : "Konstruktør A",
      confidence: fallbackConfidenceA,
      present: Boolean(fallbackConfidenceA),
    },
    {
      role: "engineer_b",
      label: model.meta.displayLanguage === "en" ? "Engineer B" : "Konstruktør B",
      confidence: fallbackConfidenceB,
      present: Boolean(fallbackConfidenceB),
    },
  ];

  const byRole = new Map(defaultSources.map((source) => [source.role, source]));
  for (const source of sources ?? []) {
    byRole.set(source.role, { ...byRole.get(source.role), ...source });
  }

  return (["engineer_a", "engineer_b"] as const).map((role) => {
    const source = byRole.get(role) ?? defaultSources[role === "engineer_a" ? 0 : 1];
    return {
      role,
      label: bounded(source.label, 80) || role,
      status: agentStatus(source),
      confidence: source.withheld ? null : bounded(source.confidence, 80) || null,
      summary: agentSummary(source),
      warnings: source.withheld ? [] : boundedList(source.warnings),
      limitations: source.withheld ? [] : boundedList(source.limitations),
    };
  });
}

export function buildPublicPipelineReview(
  input: BuildPublicPipelineReviewInput,
): PublicPipelineReview {
  const blockedFields = new Set(input.controller?.blockedFields ?? []);
  const model = input.reportModel;
  const reviewText =
    model.meta.displayLanguage === "en"
      ? "AI-generated pipeline review. Requires qualified professional review before use."
      : model.meta.locale === "nn"
        ? "AI-generert pipeline-review. Må kontrollerast av kvalifisert fagperson før bruk."
        : "AI-generert pipeline-review. Må kontrolleres av kvalifisert fagperson før bruk.";

  return {
    schema_version: PIPELINE_REVIEW_SCHEMA_VERSION,
    mode: "public_pipeline_review",
    resume_available: false,
    read_only: true,
    professional_approval: false,
    requires_professional_review: true,
    source: "canonical_report_model",
    run: {
      id: input.run.id,
      status: bounded(input.run.status, 80) || null,
      calculation_type: bounded(input.run.calculationType, 120) || null,
      started_at: input.run.startedAt,
      completed_at: input.run.completedAt,
      display_language: input.run.displayLanguage,
    },
    report: {
      document_id: bounded(model.meta.documentId, 120),
      title: bounded(model.cover.title, 180),
      subtitle: bounded(model.cover.subtitle, 220),
      summary: bounded(model.summary.text || model.cover.shortSummary, 720),
      links: input.links,
    },
    problem: {
      canonical_summary: bounded(model.summary.request, 900),
      engineering_context: safeEngineeringContext(input.engineeringContext),
    },
    interpretation: {
      status: bounded(model.interpretation.status, 120),
      status_code: bounded(model.interpretation.statusCode, 80),
      assumptions: boundedList(model.interpretation.assumptions),
    },
    engineers: agentsFromSources(input.agents, model),
    comparison: {
      status: bounded(model.control.comparisonStatus, 80),
      text: bounded(model.control.comparisonText, 280),
      rows: comparisonRows(model.control.comparisonRows),
    },
    controller: {
      status: bounded(model.control.decision, 140),
      status_code: bounded(model.control.decisionCode, 80),
      risk_level: bounded(input.controller?.riskLevel, 80) || null,
      text: bounded(model.control.controllerText, 520),
      manual_review_required: input.controller?.manualReviewRequired ?? true,
      blocked_fields: Array.from(blockedFields).map((field) => bounded(field, 80)).filter(Boolean),
    },
    calculation: {
      facts: factsFromRows(model.calculation.resultRows, blockedFields),
      steps: stepsFromReportModel(model.calculation.steps, blockedFields),
    },
    safety: {
      ai_pipeline_confidence_only: true,
      raw_data_excluded: true,
      blocked_fields_respected: true,
      review_required_text: reviewText,
    },
  };
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EngineeringContext } from "@/lib/engineering-context";
import type { Locale } from "@/lib/locale";
import type { TillitBreakdown } from "@/lib/tillit-score";
import {
  buildReportModel,
  type UpstreamAgentOutput,
  type UpstreamReportData,
} from "./build-report-model";
import {
  buildLiveReadEvidence,
  type LiveReadEvidence,
  type LiveReadStopCondition,
  type LiveReadTraceRowInput,
} from "./live-read-evidence";

export const LIVE_READ_SAFE_SELECTS = {
  run: "id, request_id, user_id, run_status, run_type, calculation_type, started_at, completed_at, display_language, eval_case_id, engineering_context",
  inputReview: "input_status, prompt_version",
  agentOutputs: "agent_name, structured_output, confidence, prompt_version",
  comparison: "match_status, comparison_data",
  controllerDecision:
    "decision_status, risk_level, reason, user_message, blocked_outputs, allowed_outputs, manual_review_required, controller_notes, prompt_version",
  report:
    "id, run_id, document_id, executive_summary, technical_assessment, conclusion, prompt_version, created_at, tillit_score, tillit_breakdown",
  stepMetrics:
    "id, run_id, request_id, step_name, model, prompt_version, stop_reason, ok, created_at",
  stepMessages:
    "id, run_id, request_id, step_name, model, prompt_version, temperature, max_tokens, created_at",
} as const;

export type LiveReadEvidencePolicy = "diagnostic" | "release_proof";

export type LiveReadEvidenceAuth =
  | { kind: "user"; userId: string }
  | { kind: "admin"; userId: string; adminVerified?: boolean }
  | { kind: "eval_service"; reason: string }
  | { kind: "legacy_anonymous"; allowedForDiagnosticOnly: true };

export type LiveReadEvidenceServerInput = {
  runId: string;
  expectedEvalCaseId?: string | null;
  policy: LiveReadEvidencePolicy;
  auth: LiveReadEvidenceAuth;
  locale?: Locale;
  reportUrl?: string;
  generatedAt?: string;
};

export type DiagnosticLiveReadEvidenceForEvalAuth = Extract<
  LiveReadEvidenceAuth,
  { kind: "eval_service" }
>;

export type DiagnosticLiveReadEvidenceForEvalInput = {
  runId: string;
  expectedEvalCaseId?: string | null;
  auth: DiagnosticLiveReadEvidenceForEvalAuth;
  generatedAt?: string;
  locale?: Locale;
  reportUrl?: string;
  reader?: LiveReadEvidenceReader;
  supabase?: SupabaseClient;
};

export type LiveReadRunRow = {
  id: string;
  request_id: string | null;
  user_id: string | null;
  run_status: string | null;
  run_type?: string | null;
  calculation_type?: string | null;
  started_at: string | null;
  completed_at: string | null;
  display_language?: string | null;
  eval_case_id?: string | null;
  engineering_context?: unknown;
};

export type LiveReadInputReviewRow = {
  input_status: string | null;
  prompt_version: string | null;
};

export type LiveReadAgentOutputRow = {
  agent_name: string;
  structured_output: UpstreamAgentOutput["structured_output"] | null;
  confidence?: string | null;
  prompt_version: string | null;
};

export type LiveReadComparisonRow = {
  match_status: string | null;
  comparison_data?: unknown;
};

export type LiveReadControllerDecisionRow = {
  decision_status: string | null;
  risk_level?: string | null;
  reason?: string | null;
  user_message?: string | null;
  blocked_outputs?: unknown;
  allowed_outputs?: unknown;
  manual_review_required?: boolean | null;
  controller_notes?: string | null;
  prompt_version?: string | null;
};

export type LiveReadReportRow = {
  id: string;
  run_id?: string | null;
  document_id: string | null;
  executive_summary?: string | null;
  technical_assessment?: string | null;
  conclusion?: string | null;
  prompt_version: string | null;
  created_at: string | null;
  tillit_score?: number | null;
  tillit_breakdown?: TillitBreakdown | null;
};

export type LiveReadStepMetricRow = {
  id: string;
  run_id?: string | null;
  request_id?: string | null;
  step_name: string;
  model?: string | null;
  prompt_version?: string | null;
  stop_reason?: string | null;
  ok?: boolean | null;
  created_at?: string | null;
  error_category?: string | null;
  retryable?: boolean | null;
};

export type LiveReadStepMessageMetaRow = {
  id: string;
  run_id?: string | null;
  request_id?: string | null;
  step_name: string;
  model?: string | null;
  prompt_version?: string | null;
  temperature?: number | null;
  max_tokens?: number | null;
  created_at?: string | null;
};

export type LiveReadEvidenceReader = {
  readRun(input: {
    runId: string;
    select: typeof LIVE_READ_SAFE_SELECTS.run;
  }): Promise<LiveReadRunRow | null>;
  readInputReview(input: {
    requestId: string;
    select: typeof LIVE_READ_SAFE_SELECTS.inputReview;
  }): Promise<LiveReadInputReviewRow | null>;
  readAgentOutputs(input: {
    runId: string;
    select: typeof LIVE_READ_SAFE_SELECTS.agentOutputs;
  }): Promise<LiveReadAgentOutputRow[]>;
  readComparison(input: {
    runId: string;
    select: typeof LIVE_READ_SAFE_SELECTS.comparison;
  }): Promise<LiveReadComparisonRow | null>;
  readControllerDecision(input: {
    runId: string;
    select: typeof LIVE_READ_SAFE_SELECTS.controllerDecision;
  }): Promise<LiveReadControllerDecisionRow | null>;
  readReport(input: {
    runId: string;
    select: typeof LIVE_READ_SAFE_SELECTS.report;
  }): Promise<LiveReadReportRow | null>;
  readStepMetrics(input: {
    runId: string;
    select: typeof LIVE_READ_SAFE_SELECTS.stepMetrics;
  }): Promise<LiveReadStepMetricRow[]>;
  readStepMessages(input: {
    runId: string;
    select: typeof LIVE_READ_SAFE_SELECTS.stepMessages;
  }): Promise<LiveReadStepMessageMetaRow[]>;
};

type SupabaseMaybeSingleResult<T> = {
  data: T | null;
  error: unknown;
};

type SupabaseManyResult<T> = {
  data: T[] | null;
  error: unknown;
};

function isReadError(error: unknown): boolean {
  return error !== null && error !== undefined;
}

async function readMaybeSingle<T>(
  query: PromiseLike<SupabaseMaybeSingleResult<T>>,
): Promise<T | null> {
  const { data, error } = await query;
  if (isReadError(error)) return null;
  return data ?? null;
}

async function readMany<T>(
  query: PromiseLike<SupabaseManyResult<T>>,
): Promise<T[]> {
  const { data, error } = await query;
  if (isReadError(error)) return [];
  return data ?? [];
}

export function createSupabaseLiveReadEvidenceReader(
  supabase: SupabaseClient,
): LiveReadEvidenceReader {
  return {
    readRun({ runId, select }) {
      return readMaybeSingle<LiveReadRunRow>(
        supabase
          .from("calculation_runs")
          .select(select)
          .eq("id", runId)
          .maybeSingle(),
      );
    },
    readInputReview({ requestId, select }) {
      if (!requestId) return Promise.resolve(null);
      return readMaybeSingle<LiveReadInputReviewRow>(
        supabase
          .from("input_reviews")
          .select(select)
          .eq("request_id", requestId)
          .maybeSingle(),
      );
    },
    readAgentOutputs({ runId, select }) {
      return readMany<LiveReadAgentOutputRow>(
        supabase.from("agent_outputs").select(select).eq("run_id", runId),
      );
    },
    readComparison({ runId, select }) {
      return readMaybeSingle<LiveReadComparisonRow>(
        supabase
          .from("comparisons")
          .select(select)
          .eq("run_id", runId)
          .maybeSingle(),
      );
    },
    readControllerDecision({ runId, select }) {
      return readMaybeSingle<LiveReadControllerDecisionRow>(
        supabase
          .from("controller_decisions")
          .select(select)
          .eq("run_id", runId)
          .maybeSingle(),
      );
    },
    readReport({ runId, select }) {
      return readMaybeSingle<LiveReadReportRow>(
        supabase
          .from("reports")
          .select(select)
          .eq("run_id", runId)
          .maybeSingle(),
      );
    },
    readStepMetrics({ runId, select }) {
      return readMany<LiveReadStepMetricRow>(
        supabase
          .from("step_metrics")
          .select(select)
          .eq("run_id", runId)
          .order("created_at", { ascending: true }),
      );
    },
    readStepMessages({ runId, select }) {
      return readMany<LiveReadStepMessageMetaRow>(
        supabase
          .from("step_messages")
          .select(select)
          .eq("run_id", runId)
          .order("created_at", { ascending: true }),
      );
    },
  };
}

function diagnosticOnlyEvidence(evidence: LiveReadEvidence): LiveReadEvidence {
  return {
    ...evidence,
    professional_approval: false,
    release_proof_status: "FAIL",
    release_proof_reason:
      evidence.stop_conditions.length > 0
        ? `diagnostic_live_read_only:${evidence.stop_conditions.join(",")}`
        : "diagnostic_live_read_only",
  };
}

export async function buildDiagnosticLiveReadEvidenceForEval(
  input: DiagnosticLiveReadEvidenceForEvalInput,
): Promise<LiveReadEvidence> {
  const reason = cleanString(input.auth?.reason);
  if (input.auth?.kind !== "eval_service" || !reason) {
    throw new Error(
      "live_read eval handoff requires eval_service auth with a non-empty reason",
    );
  }

  const reader =
    input.reader ??
    (input.supabase
      ? createSupabaseLiveReadEvidenceReader(input.supabase)
      : null);
  if (!reader) {
    throw new Error(
      "live_read eval handoff requires an injected reader or Supabase client",
    );
  }

  const evidence = await buildLiveReadEvidenceFromServerRead(
    {
      runId: input.runId,
      expectedEvalCaseId: input.expectedEvalCaseId ?? null,
      policy: "diagnostic",
      auth: { kind: "eval_service", reason },
      locale: input.locale,
      reportUrl: input.reportUrl,
      generatedAt: input.generatedAt,
    },
    reader,
  );

  return diagnosticOnlyEvidence(evidence);
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isTerminalRunStatus(status: string | null | undefined): boolean {
  return ["completed", "failed", "blocked", "cancelled", "canceled"].includes(
    cleanString(status)?.toLowerCase() ?? "",
  );
}

function isCompletedRun(status: string | null | undefined): boolean {
  return cleanString(status)?.toLowerCase() === "completed";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nestedString(
  source: Record<string, unknown> | null,
  path: string[],
): string | null {
  let current: unknown = source;
  for (const key of path) {
    if (!isPlainRecord(current)) return null;
    current = current[key];
  }
  return cleanString(current);
}

function engineeringContextSummary(
  engineeringContext: unknown,
  fallback: string | null | undefined,
): string | null {
  const record = isPlainRecord(engineeringContext) ? engineeringContext : null;
  const parts = [
    nestedString(record, ["region", "countryCode"]),
    nestedString(record, ["standards", "family"]),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join("/") : cleanString(fallback);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .map((item) => cleanString(item))
    .filter((item): item is string => Boolean(item));
}

function hasBlockedOutputSignal(
  controllerDecision: LiveReadControllerDecisionRow | null,
): boolean {
  if (!controllerDecision) return false;
  if (controllerDecision.blocked_outputs === undefined) return false;
  const blocked = stringArray(controllerDecision.blocked_outputs);
  return blocked === null || blocked.length > 0;
}

function ownershipVerified(
  run: LiveReadRunRow,
  auth: LiveReadEvidenceAuth,
  policy: LiveReadEvidencePolicy,
): boolean {
  if (auth.kind === "user") {
    return cleanString(run.user_id) === cleanString(auth.userId);
  }
  if (auth.kind === "admin") {
    return auth.adminVerified === true;
  }
  if (auth.kind === "eval_service") {
    return cleanString(auth.reason) !== null;
  }
  return (
    policy === "diagnostic" &&
    auth.allowedForDiagnosticOnly === true &&
    cleanString(run.user_id) === null
  );
}

function emptyAgentOutput(agentName: string): UpstreamAgentOutput {
  return {
    agent_name: agentName,
    prompt_version: "unknown",
    structured_output: {
      assumptions: [],
      calculation_steps: [],
      results: {},
      limitations: [],
      warnings: [],
      confidence: "medium",
    },
  };
}

function mapAgentOutput(
  rows: LiveReadAgentOutputRow[],
  agentName: string,
): UpstreamAgentOutput {
  const row = rows.find((item) => item.agent_name === agentName);
  if (!row?.structured_output) return emptyAgentOutput(agentName);
  return {
    agent_name: agentName,
    prompt_version: cleanString(row.prompt_version) ?? "unknown",
    structured_output: {
      ...row.structured_output,
      confidence:
        cleanString(row.structured_output.confidence) ??
        cleanString(row.confidence) ??
        "medium",
    },
  };
}

function reportDataFromRows(input: {
  run: LiveReadRunRow;
  inputReview: LiveReadInputReviewRow | null;
  agentOutputs: LiveReadAgentOutputRow[];
  comparison: LiveReadComparisonRow | null;
  controllerDecision: LiveReadControllerDecisionRow | null;
  report: LiveReadReportRow;
}): UpstreamReportData {
  return {
    report: {
      id: input.report.id,
      document_id: cleanString(input.report.document_id) ?? "",
      executive_summary: cleanString(input.report.executive_summary) ?? "",
      technical_assessment:
        cleanString(input.report.technical_assessment) ?? "",
      conclusion: cleanString(input.report.conclusion) ?? "",
      prompt_version: cleanString(input.report.prompt_version) ?? "unknown",
      created_at:
        cleanString(input.report.created_at) ??
        cleanString(input.run.completed_at) ??
        cleanString(input.run.started_at) ??
        "",
      tillit_score:
        typeof input.report.tillit_score === "number"
          ? input.report.tillit_score
          : null,
      tillit_breakdown: input.report.tillit_breakdown ?? null,
    },
    run: {
      request: { raw_text: "" },
      display_language: input.run.display_language ?? null,
    },
    inputReview: input.inputReview
      ? {
          input_status: cleanString(input.inputReview.input_status) ?? "unknown",
          prompt_version:
            cleanString(input.inputReview.prompt_version) ?? "unknown",
        }
      : null,
    agentA: mapAgentOutput(input.agentOutputs, "agent_a"),
    agentB: mapAgentOutput(input.agentOutputs, "agent_b"),
    comparison: input.comparison
      ? {
          match_status: cleanString(input.comparison.match_status) ?? "unknown",
          comparison_data: input.comparison.comparison_data ?? null,
        }
      : null,
    controllerDecision: input.controllerDecision
      ? {
          decision_status:
            cleanString(input.controllerDecision.decision_status) ?? "unknown",
          risk_level: cleanString(input.controllerDecision.risk_level) ?? undefined,
          reason: cleanString(input.controllerDecision.reason) ?? undefined,
          user_message: cleanString(input.controllerDecision.user_message) ?? "",
          blocked_outputs:
            stringArray(input.controllerDecision.blocked_outputs) ?? [],
        }
      : null,
  };
}

function localeForReport(
  locale: Locale | undefined,
  displayLanguage: string | null | undefined,
): Locale {
  if (locale === "nn" || locale === "nb") return locale;
  return displayLanguage === "nn" ? "nn" : "nb";
}

function statusFromMetric(row: LiveReadStepMetricRow): string {
  const stopReason = cleanString(row.stop_reason)?.toLowerCase();
  if (row.ok === false || stopReason === "max_tokens") return "failed";
  return "completed";
}

function messageByStepName(
  rows: LiveReadStepMessageMetaRow[],
): Map<string, LiveReadStepMessageMetaRow> {
  const map = new Map<string, LiveReadStepMessageMetaRow>();
  for (const row of rows) {
    if (!map.has(row.step_name)) {
      map.set(row.step_name, row);
    }
  }
  return map;
}

function traceRowsFrom(
  metrics: LiveReadStepMetricRow[],
  messages: LiveReadStepMessageMetaRow[],
): LiveReadTraceRowInput[] {
  const messageByStep = messageByStepName(messages);
  return metrics.map((metric) => {
    const message = messageByStep.get(metric.step_name);
    return {
      step_id: metric.id,
      step_name: metric.step_name,
      status: statusFromMetric(metric),
      completed_at: cleanString(metric.created_at),
      created_at: cleanString(metric.created_at),
      model: cleanString(metric.model) ?? cleanString(message?.model),
      prompt_version:
        cleanString(metric.prompt_version) ??
        cleanString(message?.prompt_version),
      stop_reason: cleanString(metric.stop_reason),
      error_category: cleanString(metric.error_category),
      retryable:
        typeof metric.retryable === "boolean" ? metric.retryable : null,
      redaction_ok: true,
      provider_message_id: null,
    };
  });
}

function targetAgentsFrom(traceRows: LiveReadTraceRowInput[]): string[] {
  return Array.from(new Set(traceRows.map((row) => row.step_name))).filter(
    Boolean,
  );
}

export async function buildLiveReadEvidenceFromServerRead(
  input: LiveReadEvidenceServerInput,
  reader: LiveReadEvidenceReader,
): Promise<LiveReadEvidence> {
  const run = await reader.readRun({
    runId: input.runId,
    select: LIVE_READ_SAFE_SELECTS.run,
  });

  if (!run) {
    return buildLiveReadEvidence({
      requestedRunId: input.runId,
      ownershipVerified: true,
      run: null,
      reportModel: null,
      traceRows: [],
      blockedFields: [],
      blockedOutputIndicated: false,
      adapterStopConditions: ["run_not_found"],
      generatedAt: input.generatedAt,
    });
  }

  const [
    inputReview,
    agentOutputs,
    comparison,
    controllerDecision,
    report,
    stepMetrics,
    stepMessages,
  ] = await Promise.all([
    reader.readInputReview({
      requestId: run.request_id ?? "",
      select: LIVE_READ_SAFE_SELECTS.inputReview,
    }),
    reader.readAgentOutputs({
      runId: run.id,
      select: LIVE_READ_SAFE_SELECTS.agentOutputs,
    }),
    reader.readComparison({
      runId: run.id,
      select: LIVE_READ_SAFE_SELECTS.comparison,
    }),
    reader.readControllerDecision({
      runId: run.id,
      select: LIVE_READ_SAFE_SELECTS.controllerDecision,
    }),
    reader.readReport({
      runId: run.id,
      select: LIVE_READ_SAFE_SELECTS.report,
    }),
    reader.readStepMetrics({
      runId: run.id,
      select: LIVE_READ_SAFE_SELECTS.stepMetrics,
    }),
    reader.readStepMessages({
      runId: run.id,
      select: LIVE_READ_SAFE_SELECTS.stepMessages,
    }),
  ]);

  const adapterStopConditions: LiveReadStopCondition[] = [];
  const expectedEvalCaseId = cleanString(input.expectedEvalCaseId);
  const runEvalCaseId = cleanString(run.eval_case_id);

  if (expectedEvalCaseId && runEvalCaseId !== expectedEvalCaseId) {
    adapterStopConditions.push("eval_case_mismatch");
  }
  if (
    input.policy === "release_proof" &&
    !isTerminalRunStatus(run.run_status)
  ) {
    adapterStopConditions.push("non_terminal_run_for_release_proof");
  }
  if (isCompletedRun(run.run_status) && !report) {
    adapterStopConditions.push("report_row_missing");
  }

  const traceRows = traceRowsFrom(stepMetrics, stepMessages);
  const blockedFields = stringArray(controllerDecision?.blocked_outputs);
  const reportModel = report
    ? buildReportModel(
        reportDataFromRows({
          run,
          inputReview,
          agentOutputs,
          comparison,
          controllerDecision,
          report,
        }),
        {
          locale: localeForReport(input.locale, run.display_language),
          reportUrl: input.reportUrl ?? "",
          engineeringContext: isPlainRecord(run.engineering_context)
            ? (run.engineering_context as EngineeringContext)
            : null,
          audience: "engineer",
        },
      )
    : null;

  return buildLiveReadEvidence({
    requestedRunId: input.runId,
    ownershipVerified: ownershipVerified(run, input.auth, input.policy),
    run: {
      run_id: run.id,
      run_status: run.run_status,
      started_at: run.started_at,
      completed_at: run.completed_at,
      display_language: run.display_language ?? null,
      eval_case_id: run.eval_case_id ?? null,
      standard_context: engineeringContextSummary(
        run.engineering_context,
        run.calculation_type,
      ),
      target_agents: targetAgentsFrom(traceRows),
      manual_review_required: controllerDecision?.manual_review_required === true,
    },
    reportModel,
    traceRows,
    blockedFields,
    blockedOutputIndicated: hasBlockedOutputSignal(controllerDecision),
    adapterStopConditions,
    generatedAt: input.generatedAt,
  });
}

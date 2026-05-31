import type { ReportModel } from "./report-model";
import { isTerminalRunStatus } from "@/lib/result/run-status-terminal-state";

export const LIVE_READ_EVIDENCE_SOURCE = "live_read" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SAFE_ERROR_CATEGORIES = [
  "none",
  "quota",
  "auth",
  "transient",
  "bad_request",
  "model_output",
  "validation",
  "unsupported_context",
  "blocked",
  "internal",
  "unknown",
  "not_applicable",
] as const;

const SAFE_TERMINAL_STATUSES = [
  "completed",
  "failed",
  "blocked",
  "skipped",
  "not_applicable",
] as const;

const UNSAFE_TRACE_KEYS = new Set([
  "raw_message",
  "rawMessage",
  "raw_provider_payload",
  "provider_payload",
  "providerPayload",
  "prompt",
  "raw_prompt",
  "system_prompt",
  "user_prompt",
  "messages",
  "stack",
  "stack_trace",
  "local_path",
  "file_path",
]);

const UNSAFE_TEXT_RE =
  /(SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|process\.env|BEGIN\s+PROMPT|SYSTEM_PROMPT|sk-[a-z0-9_-]{12,}|[A-Za-z]:\\Users\\|\/Users\/|\/home\/)/i;

const PROFESSIONAL_APPROVAL_RE =
  /\b(professionally approved|approved for (?:engineering )?use|final approval|signed off|verifisert|godkjent for bruk|faglig godkjent|fagleg godkjent)\b/i;

export type SafeErrorCategory = (typeof SAFE_ERROR_CATEGORIES)[number];

export type LiveReadStopCondition =
  | "run_not_found"
  | "eval_case_mismatch"
  | "non_terminal_run_for_release_proof"
  | "report_row_missing"
  | "missing_run_id"
  | "malformed_run_id"
  | "ownership_not_verified"
  | "report_claimed_but_empty"
  | "blocked_fields_missing"
  | "completed_run_missing_terminal_trace"
  | "failed_step_missing_error_category"
  | "release_proof_trace_metadata_incomplete"
  | "release_proof_writer_coverage_incomplete"
  | "unsafe_trace_payload"
  | "professional_approval_implication";

export type LiveReadRunInput = {
  run_id?: string | null;
  id?: string | null;
  run_status?: string | null;
  status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  display_language?: string | null;
  eval_case_id?: string | null;
  standard_context?: string | null;
  target_agents?: string[] | null;
  manual_review_required?: boolean | null;
};

export type LiveReadTraceRowInput = {
  step_id?: string | null;
  id?: string | null;
  step_name: string;
  status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  model?: string | null;
  prompt_version?: string | null;
  stop_reason?: string | null;
  error_category?: string | null;
  retryable?: boolean | null;
  raw_error_redacted?: boolean | null;
  redaction_ok?: boolean | null;
  provider_message_id?: string | null;
  [key: string]: unknown;
};

export type BuildLiveReadEvidenceInput = {
  requestedRunId?: string | null;
  ownershipVerified: boolean;
  run?: LiveReadRunInput | null;
  reportModel?: ReportModel | null;
  traceRows?: LiveReadTraceRowInput[] | null;
  blockedFields?: string[] | null;
  blockedOutputIndicated?: boolean;
  fullWriterCoverage?: boolean;
  adapterStopConditions?: LiveReadStopCondition[];
  generatedAt?: string;
};

export type LiveReadEvidence = {
  evidence_source: typeof LIVE_READ_EVIDENCE_SOURCE;
  live_read_enabled: true;
  professional_approval: false;
  run_summary: {
    requested_run_id: string | null;
    run_id: string | null;
    eval_case_id: string | null;
    run_status: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string | null;
    display_language: string | null;
    standard_context: string | null;
    target_agents: string[];
    manual_review_required: boolean;
  };
  report_evidence: {
    has_report: boolean;
    report_id: string | null;
    report_locale: string | null;
    report_text: string;
    disclaimer_present: boolean;
    blocked_fields: string[];
    report_model_version: string | null;
  };
  trace_summary: {
    steps: Array<{
      step_id: string | null;
      step_name: string;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      created_at: string | null;
      model: string | null;
      prompt_version: string | null;
      stop_reason: string | null;
      error_category: SafeErrorCategory | null;
      retryable: boolean | null;
      raw_error_redacted: boolean | null;
      redaction_ok: boolean;
      provider_message_id: string | null;
    }>;
    terminal_step_count: number;
    unsafe_trace_payload: boolean;
  };
  freshness: {
    generated_at: string;
    run_completed_at: string | null;
    evidence_is_snapshot: true;
  };
  release_proof_status: "READY" | "FAIL";
  release_proof_reason: string;
  stop_conditions: LiveReadStopCondition[];
};

function uniqueStopConditions(
  conditions: LiveReadStopCondition[],
): LiveReadStopCondition[] {
  return Array.from(new Set(conditions));
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function hasProfessionalReviewText(value: string): boolean {
  return /\b(fagperson|qualified professional|professional review|responsible engineer|must be verified before use|kontrolleres|kontrollerast)\b/i.test(
    value,
  );
}

function reportTextFrom(model: ReportModel | null | undefined): string {
  if (!model) return "";
  return [
    model.summary.text,
    model.assessment.professionalAssessment,
    model.calculation.resultRows
      .map((row) => `${row.label}: ${row.raw}`)
      .join("\n"),
    model.calculation.steps
      .map((step) => `${step.title}\n${step.prose}`)
      .join("\n\n"),
    model.control.controllerText,
    model.conclusion,
    model.disclaimer,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

function reportApprovalTextFrom(model: ReportModel | null | undefined): string {
  if (!model) return "";
  return [
    model.meta.status,
    model.control.decision,
    model.control.controllerText,
    model.summary.text,
    model.assessment.professionalAssessment,
    model.conclusion,
  ]
    .filter(Boolean)
    .join("\n");
}

function isSafeErrorCategory(value: unknown): value is SafeErrorCategory {
  return (
    typeof value === "string" &&
    (SAFE_ERROR_CATEGORIES as readonly string[]).includes(value)
  );
}

function isSafeTerminalStatus(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (SAFE_TERMINAL_STATUSES as readonly string[]).includes(value)
  );
}

function isTerminalStep(row: LiveReadTraceRowInput): boolean {
  const status = cleanString(row.status)?.toLowerCase();
  if (["completed", "failed", "blocked", "skipped"].includes(status ?? "")) {
    return true;
  }
  return typeof row.completed_at === "string" && row.completed_at.trim().length > 0;
}

function isFailedOrBlockedStep(row: LiveReadTraceRowInput): boolean {
  const status = cleanString(row.status)?.toLowerCase();
  return status === "failed" || status === "blocked";
}

function containsUnsafePayload(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return UNSAFE_TEXT_RE.test(value);
  if (typeof value !== "object") return false;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (UNSAFE_TRACE_KEYS.has(key)) return true;
    if (containsUnsafePayload(nested)) return true;
  }
  return false;
}

function safeTraceStep(row: LiveReadTraceRowInput) {
  const errorCategory = isSafeErrorCategory(row.error_category)
    ? row.error_category
    : null;
  const rawErrorRedacted =
    typeof row.raw_error_redacted === "boolean" ? row.raw_error_redacted : null;
  return {
    step_id: cleanString(row.step_id) ?? cleanString(row.id),
    step_name: row.step_name,
    status: cleanString(row.status) ?? "unknown",
    started_at: cleanString(row.started_at),
    completed_at: cleanString(row.completed_at),
    created_at: cleanString(row.created_at),
    model: cleanString(row.model),
    prompt_version: cleanString(row.prompt_version),
    stop_reason: cleanString(row.stop_reason),
    error_category: errorCategory,
    retryable:
      typeof row.retryable === "boolean" ? row.retryable : retryableFrom(errorCategory),
    raw_error_redacted: rawErrorRedacted,
    redaction_ok:
      row.redaction_ok !== false &&
      rawErrorRedacted !== false &&
      !containsUnsafePayload(row),
    provider_message_id: cleanString(row.provider_message_id),
  };
}

function retryableFrom(category: SafeErrorCategory | null): boolean | null {
  if (category === "quota" || category === "transient") return true;
  if (
    category === "auth" ||
    category === "bad_request" ||
    category === "model_output"
  ) {
    return false;
  }
  return null;
}

function hasReportClaimed(model: ReportModel | null | undefined): boolean {
  return model !== null && model !== undefined;
}

function isCompletedRun(status: string | null): boolean {
  return status?.toLowerCase() === "completed";
}

function hasCompleteReleaseReadinessTraceMetadata(
  row: LiveReadTraceRowInput,
): boolean {
  return (
    isSafeTerminalStatus(cleanString(row.status)) &&
    cleanString(row.completed_at) !== null &&
    isSafeErrorCategory(row.error_category) &&
    typeof row.retryable === "boolean" &&
    row.raw_error_redacted === true
  );
}

export function buildLiveReadEvidence(
  input: BuildLiveReadEvidenceInput,
): LiveReadEvidence {
  const requestedRunId = cleanString(input.requestedRunId);
  const runId = cleanString(input.run?.run_id) ?? cleanString(input.run?.id);
  const effectiveRunId = requestedRunId ?? runId;
  const runStatus = cleanString(input.run?.run_status) ?? cleanString(input.run?.status);
  const traceRows = input.traceRows ?? [];
  const safeSteps = traceRows.map(safeTraceStep);
  const blockedFields = input.blockedFields ?? [];
  const reportText = reportTextFrom(input.reportModel);
  const stopConditions: LiveReadStopCondition[] = [
    ...(input.adapterStopConditions ?? []),
  ];

  if (!effectiveRunId) {
    stopConditions.push("missing_run_id");
  } else if (!UUID_RE.test(effectiveRunId)) {
    stopConditions.push("malformed_run_id");
  }
  if (!input.ownershipVerified) {
    stopConditions.push("ownership_not_verified");
  }
  if (input.run && input.fullWriterCoverage !== true) {
    stopConditions.push("release_proof_writer_coverage_incomplete");
  }
  if (hasReportClaimed(input.reportModel) && reportText.trim().length === 0) {
    stopConditions.push("report_claimed_but_empty");
  }
  if (input.blockedOutputIndicated === true && blockedFields.length === 0) {
    stopConditions.push("blocked_fields_missing");
  }
  if (isCompletedRun(runStatus) && safeSteps.filter((step) => step.redaction_ok).length === 0) {
    stopConditions.push("completed_run_missing_terminal_trace");
  } else if (
    isCompletedRun(runStatus) &&
    !traceRows.some((row) => isTerminalStep(row))
  ) {
    stopConditions.push("completed_run_missing_terminal_trace");
  }
  if (
    traceRows.some(
      (row) => isFailedOrBlockedStep(row) && !isSafeErrorCategory(row.error_category),
    )
  ) {
    stopConditions.push("failed_step_missing_error_category");
  }
  if (
    isTerminalRunStatus(runStatus) &&
    traceRows.some(
      (row) =>
        isTerminalStep(row) && !hasCompleteReleaseReadinessTraceMetadata(row),
    )
  ) {
    stopConditions.push("release_proof_trace_metadata_incomplete");
  }
  if (traceRows.some(containsUnsafePayload)) {
    stopConditions.push("unsafe_trace_payload");
  }
  if (PROFESSIONAL_APPROVAL_RE.test(reportApprovalTextFrom(input.reportModel))) {
    stopConditions.push("professional_approval_implication");
  }

  const finalStopConditions = uniqueStopConditions(stopConditions);
  const releaseProofStatus = finalStopConditions.length === 0 ? "READY" : "FAIL";

  return {
    evidence_source: LIVE_READ_EVIDENCE_SOURCE,
    live_read_enabled: true,
    professional_approval: false,
    run_summary: {
      requested_run_id: requestedRunId,
      run_id: runId,
      eval_case_id: cleanString(input.run?.eval_case_id),
      run_status: runStatus,
      started_at: cleanString(input.run?.started_at),
      completed_at: cleanString(input.run?.completed_at),
      created_at: cleanString(input.run?.created_at),
      display_language: cleanString(input.run?.display_language),
      standard_context: cleanString(input.run?.standard_context),
      target_agents: input.run?.target_agents ?? [],
      manual_review_required: input.run?.manual_review_required === true,
    },
    report_evidence: {
      has_report: hasReportClaimed(input.reportModel),
      report_id: cleanString(input.reportModel?.meta.runId),
      report_locale:
        cleanString(input.reportModel?.meta.displayLanguage) ??
        cleanString(input.reportModel?.meta.locale),
      report_text: reportText,
      disclaimer_present: hasProfessionalReviewText(input.reportModel?.disclaimer ?? ""),
      blocked_fields: [...blockedFields],
      report_model_version: cleanString(input.reportModel?.meta.schemaVersion),
    },
    trace_summary: {
      steps: safeSteps,
      terminal_step_count: traceRows.filter(isTerminalStep).length,
      unsafe_trace_payload: traceRows.some(containsUnsafePayload),
    },
    freshness: {
      generated_at: input.generatedAt ?? new Date().toISOString(),
      run_completed_at: cleanString(input.run?.completed_at),
      evidence_is_snapshot: true,
    },
    release_proof_status: releaseProofStatus,
    release_proof_reason:
      releaseProofStatus === "READY"
        ? "live_read_evidence_ready"
        : finalStopConditions.join(","),
    stop_conditions: finalStopConditions,
  };
}

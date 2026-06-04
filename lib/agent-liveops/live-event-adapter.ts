import "server-only";

import {
  AGENT_LIVEOPS_SCHEMA_VERSION,
  type AgentLiveOpsEvent,
  type AgentLiveOpsEventType,
  type AgentLiveOpsMetadata,
  type AgentLiveOpsRedactionStatus,
  type AgentLiveOpsSeverity,
  type AgentLiveOpsStatus,
} from "./types";
import { sortAgentLiveOpsEvents } from "./status";

export const AGENT_LIVEOPS_SAFE_SELECTS = {
  run: "id, request_id, user_id, run_status, run_type, calculation_type, started_at, completed_at, display_language, eval_case_id",
  inputReview:
    "id, request_id, input_status, calculation_type, discipline, prompt_version, confidence, created_at",
  agentOutputs:
    "id, run_id, agent_name, confidence, prompt_version, created_at",
  comparison:
    "id, run_id, match_status, recommended_status, prompt_version, created_at",
  controllerDecision:
    "id, run_id, decision_status, risk_level, manual_review_required, prompt_version, created_at, blocked_outputs",
  report:
    "id, run_id, document_id, prompt_version, created_at, tillit_score",
  stepMetrics:
    "id, run_id, request_id, step_name, model, prompt_version, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, latency_ms, stop_reason, ok, created_at, status, completed_at, error_category, retryable, raw_error_redacted",
  stepMessages:
    "id, run_id, request_id, step_name, model, prompt_version, temperature, max_tokens, created_at",
} as const;

export type AgentLiveOpsRunRow = {
  id: string;
  request_id: string | null;
  user_id?: string | null;
  run_status: string | null;
  run_type?: string | null;
  calculation_type?: string | null;
  started_at: string | null;
  completed_at: string | null;
  display_language?: string | null;
  eval_case_id?: string | null;
};

export type AgentLiveOpsInputReviewRow = {
  id: string;
  request_id: string | null;
  input_status?: string | null;
  calculation_type?: string | null;
  discipline?: string | null;
  prompt_version?: string | null;
  confidence?: string | null;
  created_at?: string | null;
};

export type AgentLiveOpsAgentOutputRow = {
  id: string;
  run_id: string | null;
  agent_name: string | null;
  confidence?: string | null;
  prompt_version?: string | null;
  created_at?: string | null;
};

export type AgentLiveOpsComparisonRow = {
  id: string;
  run_id: string | null;
  match_status?: string | null;
  recommended_status?: string | null;
  prompt_version?: string | null;
  created_at?: string | null;
};

export type AgentLiveOpsControllerDecisionRow = {
  id: string;
  run_id: string | null;
  decision_status?: string | null;
  risk_level?: string | null;
  manual_review_required?: boolean | null;
  prompt_version?: string | null;
  created_at?: string | null;
  blocked_outputs?: unknown;
};

export type AgentLiveOpsReportRow = {
  id: string;
  run_id: string | null;
  document_id?: string | null;
  prompt_version?: string | null;
  created_at?: string | null;
  tillit_score?: number | null;
};

export type AgentLiveOpsStepMetricRow = {
  id: string;
  run_id?: string | null;
  request_id?: string | null;
  step_name: string | null;
  model?: string | null;
  prompt_version?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_creation_tokens?: number | null;
  latency_ms?: number | null;
  stop_reason?: string | null;
  ok?: boolean | null;
  created_at?: string | null;
  status?: string | null;
  completed_at?: string | null;
  error_category?: string | null;
  retryable?: boolean | null;
  raw_error_redacted?: boolean | null;
};

export type AgentLiveOpsStepMessageMetaRow = {
  id: string;
  run_id?: string | null;
  request_id?: string | null;
  step_name: string | null;
  model?: string | null;
  prompt_version?: string | null;
  temperature?: number | null;
  max_tokens?: number | null;
  created_at?: string | null;
};

export type AgentLiveOpsLiveRows = {
  run?: AgentLiveOpsRunRow | null;
  inputReview?: AgentLiveOpsInputReviewRow | null;
  agentOutputs?: AgentLiveOpsAgentOutputRow[];
  comparison?: AgentLiveOpsComparisonRow | null;
  controllerDecision?: AgentLiveOpsControllerDecisionRow | null;
  report?: AgentLiveOpsReportRow | null;
  stepMetrics?: AgentLiveOpsStepMetricRow[];
  stepMessages?: AgentLiveOpsStepMessageMetaRow[];
};

export type AgentLiveOpsLiveEventReader = {
  readRun(input: {
    runId: string;
    select: typeof AGENT_LIVEOPS_SAFE_SELECTS.run;
  }): Promise<AgentLiveOpsRunRow | null>;
  readInputReview(input: {
    requestId: string;
    select: typeof AGENT_LIVEOPS_SAFE_SELECTS.inputReview;
  }): Promise<AgentLiveOpsInputReviewRow | null>;
  readAgentOutputs(input: {
    runId: string;
    select: typeof AGENT_LIVEOPS_SAFE_SELECTS.agentOutputs;
  }): Promise<AgentLiveOpsAgentOutputRow[]>;
  readComparison(input: {
    runId: string;
    select: typeof AGENT_LIVEOPS_SAFE_SELECTS.comparison;
  }): Promise<AgentLiveOpsComparisonRow | null>;
  readControllerDecision(input: {
    runId: string;
    select: typeof AGENT_LIVEOPS_SAFE_SELECTS.controllerDecision;
  }): Promise<AgentLiveOpsControllerDecisionRow | null>;
  readReport(input: {
    runId: string;
    select: typeof AGENT_LIVEOPS_SAFE_SELECTS.report;
  }): Promise<AgentLiveOpsReportRow | null>;
  readStepMetrics(input: {
    runId: string;
    select: typeof AGENT_LIVEOPS_SAFE_SELECTS.stepMetrics;
  }): Promise<AgentLiveOpsStepMetricRow[]>;
  readStepMessages(input: {
    runId: string;
    select: typeof AGENT_LIVEOPS_SAFE_SELECTS.stepMessages;
  }): Promise<AgentLiveOpsStepMessageMetaRow[]>;
};

const FORBIDDEN_KEYS = new Set([
  "raw_text",
  "raw_user_data",
  "full_user_prompt",
  "unredacted_file_text",
  "personal_data",
  "raw_message",
  "rawMessage",
  "input_payload",
  "output_text",
  "structured_output",
  "executive_summary",
  "technical_assessment",
  "conclusion",
  "raw_prompt",
  "system_prompt",
  "user_prompt",
  "messages",
  "provider_payload",
  "providerPayload",
  "raw_provider_payload",
  "provider_envelope",
  "providerEnvelope",
  "stack",
  "stack_trace",
  "uploaded_file_text",
  "file_text",
  "chain_of_thought",
]);

const FORBIDDEN_TEXT_RE =
  /(SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|BEGIN\s+PROMPT|SYSTEM_PROMPT|raw prompt|provider envelope|chain[-_ ]?of[-_ ]?thought|hidden reasoning|private reasoning|sk-[a-z0-9_-]{12,}|[A-Za-z]:\\Users\\|\/Users\/|\/home\/)/i;

const STEP_AGENT_LABELS: Record<string, { key: string; label: string }> = {
  tolkar: { key: "input_agent", label: "Input Agent" },
  input_agent: { key: "input_agent", label: "Input Agent" },
  konstruktor_a: { key: "engineer_a", label: "Engineer A" },
  agent_a: { key: "engineer_a", label: "Engineer A" },
  konstruktor_b: { key: "engineer_b", label: "Engineer B" },
  agent_b: { key: "engineer_b", label: "Engineer B" },
  samanliknar: { key: "comparator", label: "Comparator" },
  comparison: { key: "comparator", label: "Comparator" },
  kontrollor: { key: "controller", label: "Controller" },
  controller: { key: "controller", label: "Controller" },
  rapportor: { key: "reporter", label: "Reporter" },
  reporter: { key: "reporter", label: "Reporter" },
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function hasTimestamp(value: unknown): value is string {
  const text = cleanString(value);
  return text !== null && !Number.isNaN(Date.parse(text));
}

function assertSafeRows(value: unknown, path = "$"): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (FORBIDDEN_TEXT_RE.test(value)) {
      throw new Error(`Agent LiveOps live adapter rejected unsafe text at ${path}`);
    }
    return;
  }
  if (typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeRows(item, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`Agent LiveOps live adapter rejected forbidden field ${path}.${key}`);
    }
    assertSafeRows(nested, `${path}.${key}`);
  }
}

function toSafeMetadata(
  metadata: Record<string, unknown>,
): AgentLiveOpsMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as AgentLiveOpsMetadata;
}

function runIdFrom(rows: AgentLiveOpsLiveRows): string | null {
  return cleanString(rows.run?.id) ??
    cleanString(rows.agentOutputs?.[0]?.run_id) ??
    cleanString(rows.comparison?.run_id) ??
    cleanString(rows.controllerDecision?.run_id) ??
    cleanString(rows.report?.run_id) ??
    cleanString(rows.stepMetrics?.[0]?.run_id) ??
    cleanString(rows.stepMessages?.[0]?.run_id);
}

function sourceId(value: string | null | undefined, fallback: string): string {
  return cleanString(value)?.replace(/[^a-zA-Z0-9._-]+/g, "-") ?? fallback;
}

function agentFor(stepName: string | null | undefined) {
  const normalized = cleanString(stepName)?.toLowerCase() ?? "unknown_agent";
  return STEP_AGENT_LABELS[normalized] ?? {
    key: normalized.replace(/[^a-z0-9_]+/g, "_") || "unknown_agent",
    label: normalized,
  };
}

function terminalRunEvent(
  status: string | null | undefined,
): { eventType: AgentLiveOpsEventType; status: AgentLiveOpsStatus; severity?: AgentLiveOpsSeverity } | null {
  const normalized = cleanString(status)?.toLowerCase();
  if (normalized === "completed") {
    return { eventType: "run.completed", status: "completed" };
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return { eventType: "run.cancelled", status: "cancelled", severity: "warn" };
  }
  if (normalized === "failed") {
    return { eventType: "run.failed", status: "failed", severity: "error" };
  }
  if (normalized === "blocked") {
    return { eventType: "run.failed", status: "blocked", severity: "block" };
  }
  return null;
}

function stepStatus(row: AgentLiveOpsStepMetricRow): {
  eventType: AgentLiveOpsEventType;
  status: AgentLiveOpsStatus;
  severity?: AgentLiveOpsSeverity;
} {
  const status = cleanString(row.status)?.toLowerCase();
  const stopReason = cleanString(row.stop_reason)?.toLowerCase();

  if (status === "blocked") {
    return { eventType: "agent.failed", status: "blocked", severity: "block" };
  }
  if (status === "failed" || row.ok === false || stopReason === "max_tokens") {
    return { eventType: "agent.failed", status: "failed", severity: "error" };
  }
  if (status === "skipped" || status === "not_applicable") {
    return {
      eventType: "agent.completed_with_warning",
      status: "completed_with_warning",
      severity: "warn",
    };
  }
  return { eventType: "agent.completed", status: "completed" };
}

function controllerStatus(row: AgentLiveOpsControllerDecisionRow): {
  status: AgentLiveOpsStatus;
  severity?: AgentLiveOpsSeverity;
} {
  const decision = cleanString(row.decision_status)?.toLowerCase();
  const risk = cleanString(row.risk_level)?.toLowerCase();
  if (decision === "rejected" || decision === "blocked") {
    return { status: "blocked", severity: "block" };
  }
  if (
    row.manual_review_required === true ||
    risk === "high" ||
    risk === "medium" ||
    decision === "uncertain" ||
    decision === "approved_with_warnings"
  ) {
    return { status: "completed_with_warning", severity: "warn" };
  }
  return { status: "completed" };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item))
    .filter((item): item is string => Boolean(item));
}

function createEvent(input: {
  runId: string;
  eventId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  agentKey: string;
  agentLabel: string;
  eventType: AgentLiveOpsEventType;
  status: AgentLiveOpsStatus;
  timestamp: string;
  summary: string;
  redactionStatus?: AgentLiveOpsRedactionStatus;
  severity?: AgentLiveOpsSeverity;
  durationMs?: number | null;
  artifactRef?: string | null;
  reasonCodes?: string[];
  metadata?: AgentLiveOpsMetadata;
}): AgentLiveOpsEvent {
  return {
    schema_version: AGENT_LIVEOPS_SCHEMA_VERSION,
    run_id: input.runId,
    event_id: input.eventId,
    trace_id: input.traceId,
    span_id: input.spanId,
    ...(input.parentSpanId ? { parent_span_id: input.parentSpanId } : {}),
    agent: input.agentKey,
    agent_key: input.agentKey,
    agent_label: input.agentLabel,
    event_type: input.eventType,
    status: input.status,
    ...(input.severity ? { severity: input.severity } : {}),
    timestamp: input.timestamp,
    ...(typeof input.durationMs === "number"
      ? { duration_ms: input.durationMs }
      : {}),
    summary: input.summary,
    ...(input.artifactRef ? { artifact_ref: input.artifactRef } : {}),
    ...(input.reasonCodes?.length ? { reason_codes: input.reasonCodes } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    redaction_status: input.redactionStatus ?? "no_user_data",
  };
}

function messageMetadataByStep(
  rows: AgentLiveOpsStepMessageMetaRow[],
): Map<string, AgentLiveOpsStepMessageMetaRow> {
  const map = new Map<string, AgentLiveOpsStepMessageMetaRow>();
  for (const row of rows) {
    const key = cleanString(row.step_name);
    if (key && !map.has(key)) map.set(key, row);
  }
  return map;
}

export function buildAgentLiveOpsEventsFromRows(
  rows: AgentLiveOpsLiveRows,
): AgentLiveOpsEvent[] {
  assertSafeRows(rows);
  const runId = runIdFrom(rows);
  if (!runId) return [];

  const traceId = `trace-${runId}`;
  const runSpanId = `span-run-${sourceId(rows.run?.id, runId)}`;
  const events: AgentLiveOpsEvent[] = [];

  if (rows.run?.started_at && hasTimestamp(rows.run.started_at)) {
    events.push(createEvent({
      runId,
      eventId: `evt-run-started-${sourceId(rows.run.id, runId)}`,
      traceId,
      spanId: runSpanId,
      agentKey: "pipeline",
      agentLabel: "Pipeline",
      eventType: "run.started",
      status: "running",
      timestamp: rows.run.started_at,
      summary: "Pipeline run started.",
      metadata: toSafeMetadata({
        run_status: rows.run.run_status,
        run_type: rows.run.run_type,
        calculation_type: rows.run.calculation_type,
        display_language: rows.run.display_language,
        eval_case_id: rows.run.eval_case_id,
      }),
    }));
  }

  const terminal = terminalRunEvent(rows.run?.run_status);
  if (terminal && rows.run?.completed_at && hasTimestamp(rows.run.completed_at)) {
    events.push(createEvent({
      runId,
      eventId: `evt-${terminal.eventType.replace(".", "-")}-${sourceId(rows.run.id, runId)}`,
      traceId,
      spanId: `${runSpanId}-terminal`,
      parentSpanId: runSpanId,
      agentKey: "pipeline",
      agentLabel: "Pipeline",
      eventType: terminal.eventType,
      status: terminal.status,
      severity: terminal.severity,
      timestamp: rows.run.completed_at,
      summary: `Pipeline run reached terminal status: ${terminal.status}.`,
    }));
  }

  if (rows.inputReview?.created_at && hasTimestamp(rows.inputReview.created_at)) {
    events.push(createEvent({
      runId,
      eventId: `evt-input-agent-${sourceId(rows.inputReview.id, "input-review")}`,
      traceId,
      spanId: `span-input-agent-${sourceId(rows.inputReview.id, "input-review")}`,
      parentSpanId: runSpanId,
      agentKey: "input_agent",
      agentLabel: "Input Agent",
      eventType: "agent.completed",
      status: "completed",
      timestamp: rows.inputReview.created_at,
      summary: "Input Agent recorded a sanitized classification status.",
      redactionStatus: "safe_summary_only",
      metadata: toSafeMetadata({
        input_status: rows.inputReview.input_status,
        calculation_type: rows.inputReview.calculation_type,
        discipline: rows.inputReview.discipline,
        prompt_version: rows.inputReview.prompt_version,
        confidence: rows.inputReview.confidence,
      }),
    }));
  }

  for (const row of rows.agentOutputs ?? []) {
    if (!row.created_at || !hasTimestamp(row.created_at)) continue;
    const agent = agentFor(row.agent_name);
    events.push(createEvent({
      runId,
      eventId: `evt-agent-output-${sourceId(row.id, agent.key)}`,
      traceId,
      spanId: `span-agent-output-${sourceId(row.id, agent.key)}`,
      parentSpanId: runSpanId,
      agentKey: agent.key,
      agentLabel: agent.label,
      eventType: "agent.completed",
      status: cleanString(row.confidence)?.toLowerCase() === "low"
        ? "completed_with_warning"
        : "completed",
      severity: cleanString(row.confidence)?.toLowerCase() === "low"
        ? "warn"
        : undefined,
      timestamp: row.created_at,
      summary: `${agent.label} output metadata recorded.`,
      redactionStatus: "safe_summary_only",
      metadata: toSafeMetadata({
        confidence: row.confidence,
        prompt_version: row.prompt_version,
      }),
    }));
  }

  if (rows.comparison?.created_at && hasTimestamp(rows.comparison.created_at)) {
    const mismatch = cleanString(rows.comparison.match_status)?.toLowerCase() === "mismatch";
    events.push(createEvent({
      runId,
      eventId: `evt-comparison-${sourceId(rows.comparison.id, "comparison")}`,
      traceId,
      spanId: `span-comparison-${sourceId(rows.comparison.id, "comparison")}`,
      parentSpanId: runSpanId,
      agentKey: "comparator",
      agentLabel: "Comparator",
      eventType: mismatch ? "agent.completed_with_warning" : "agent.completed",
      status: mismatch ? "completed_with_warning" : "completed",
      severity: mismatch ? "warn" : undefined,
      timestamp: rows.comparison.created_at,
      summary: mismatch
        ? "Comparator recorded a mismatch that needs review."
        : "Comparator recorded sanitized comparison metadata.",
      redactionStatus: "safe_summary_only",
      metadata: toSafeMetadata({
        match_status: rows.comparison.match_status,
        recommended_status: rows.comparison.recommended_status,
        prompt_version: rows.comparison.prompt_version,
      }),
    }));
  }

  if (
    rows.controllerDecision?.created_at &&
    hasTimestamp(rows.controllerDecision.created_at)
  ) {
    const status = controllerStatus(rows.controllerDecision);
    const blockedOutputs = stringArray(rows.controllerDecision.blocked_outputs);
    const controllerSpanId = `span-controller-${sourceId(rows.controllerDecision.id, "controller")}`;
    events.push(createEvent({
      runId,
      eventId: `evt-controller-${sourceId(rows.controllerDecision.id, "controller")}`,
      traceId,
      spanId: controllerSpanId,
      parentSpanId: runSpanId,
      agentKey: "controller",
      agentLabel: "Controller",
      eventType: status.status === "blocked"
        ? "agent.failed"
        : status.status === "completed_with_warning"
          ? "agent.completed_with_warning"
          : "agent.completed",
      status: status.status,
      severity: status.severity,
      timestamp: rows.controllerDecision.created_at,
      summary: "Controller recorded sanitized decision metadata.",
      redactionStatus: "safe_summary_only",
      metadata: toSafeMetadata({
        decision_status: rows.controllerDecision.decision_status,
        risk_level: rows.controllerDecision.risk_level,
        manual_review_required: rows.controllerDecision.manual_review_required,
        prompt_version: rows.controllerDecision.prompt_version,
      }),
    }));

    if (blockedOutputs.length > 0 || status.status === "blocked") {
      events.push(createEvent({
        runId,
        eventId: `evt-guardrail-block-${sourceId(rows.controllerDecision.id, "controller")}`,
        traceId,
        spanId: `span-guardrail-block-${sourceId(rows.controllerDecision.id, "controller")}`,
        parentSpanId: controllerSpanId,
        agentKey: "guardrail_agent",
        agentLabel: "Guardrail Agent",
        eventType: "guardrail.block",
        status: "blocked",
        severity: "block",
        timestamp: rows.controllerDecision.created_at,
        summary: "Guardrail blocked unsafe output fields.",
        reasonCodes: blockedOutputs.length > 0
          ? blockedOutputs.map((field) => `blocked_output:${field}`)
          : ["controller_blocked"],
      }));
    } else if (
      rows.controllerDecision.manual_review_required === true ||
      status.status === "completed_with_warning"
    ) {
      events.push(createEvent({
        runId,
        eventId: `evt-guardrail-warn-${sourceId(rows.controllerDecision.id, "controller")}`,
        traceId,
        spanId: `span-guardrail-warn-${sourceId(rows.controllerDecision.id, "controller")}`,
        parentSpanId: controllerSpanId,
        agentKey: "guardrail_agent",
        agentLabel: "Guardrail Agent",
        eventType: "guardrail.warn",
        status: "completed_with_warning",
        severity: "warn",
        timestamp: rows.controllerDecision.created_at,
        summary: "Guardrail recorded a diagnostic warning.",
        reasonCodes: rows.controllerDecision.manual_review_required === true
          ? ["manual_review_required"]
          : ["controller_warning"],
      }));
    }
  }

  if (rows.report?.created_at && hasTimestamp(rows.report.created_at)) {
    events.push(createEvent({
      runId,
      eventId: `evt-report-web-ready-${sourceId(rows.report.id, "report")}`,
      traceId,
      spanId: `span-report-${sourceId(rows.report.id, "report")}`,
      parentSpanId: runSpanId,
      agentKey: "reporter",
      agentLabel: "Reporter",
      eventType: "report.web_ready",
      status: "completed",
      timestamp: rows.report.created_at,
      summary: "Web report artifact metadata recorded.",
      artifactRef: `artifact://${runId}/report/web`,
      metadata: toSafeMetadata({
        document_id: rows.report.document_id,
        prompt_version: rows.report.prompt_version,
        tillit_score: rows.report.tillit_score,
      }),
    }));
  }

  const stepMessages = messageMetadataByStep(rows.stepMessages ?? []);
  for (const row of rows.stepMetrics ?? []) {
    const timestamp = hasTimestamp(row.completed_at)
      ? row.completed_at
      : hasTimestamp(row.created_at)
        ? row.created_at
        : null;
    if (!timestamp) continue;

    const agent = agentFor(row.step_name);
    const status = stepStatus(row);
    const stepName = cleanString(row.step_name);
    const message = stepName ? stepMessages.get(stepName) : undefined;
    events.push(createEvent({
      runId,
      eventId: `evt-step-metric-${sourceId(row.id, agent.key)}`,
      traceId,
      spanId: `span-step-metric-${sourceId(row.id, agent.key)}`,
      parentSpanId: runSpanId,
      agentKey: agent.key,
      agentLabel: agent.label,
      eventType: status.eventType,
      status: status.status,
      severity: status.severity,
      timestamp,
      durationMs: typeof row.latency_ms === "number" ? row.latency_ms : null,
      summary: `Safe telemetry metadata recorded for ${agent.label}.`,
      metadata: toSafeMetadata({
        source: "step_metrics",
        model: row.model ?? message?.model,
        prompt_version: row.prompt_version ?? message?.prompt_version,
        input_tokens: row.input_tokens,
        output_tokens: row.output_tokens,
        cache_read_tokens: row.cache_read_tokens,
        cache_creation_tokens: row.cache_creation_tokens,
        stop_reason: row.stop_reason,
        error_category: row.error_category,
        retryable: row.retryable,
        raw_error_redacted: row.raw_error_redacted,
        temperature: message?.temperature,
        max_tokens: message?.max_tokens,
      }),
    }));
  }

  return sortAgentLiveOpsEvents(events);
}

export async function buildAgentLiveOpsEventsFromReader(
  reader: AgentLiveOpsLiveEventReader,
  runId: string,
): Promise<AgentLiveOpsEvent[]> {
  const run = await reader.readRun({
    runId,
    select: AGENT_LIVEOPS_SAFE_SELECTS.run,
  });
  if (!run) return [];

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
      select: AGENT_LIVEOPS_SAFE_SELECTS.inputReview,
    }),
    reader.readAgentOutputs({
      runId: run.id,
      select: AGENT_LIVEOPS_SAFE_SELECTS.agentOutputs,
    }),
    reader.readComparison({
      runId: run.id,
      select: AGENT_LIVEOPS_SAFE_SELECTS.comparison,
    }),
    reader.readControllerDecision({
      runId: run.id,
      select: AGENT_LIVEOPS_SAFE_SELECTS.controllerDecision,
    }),
    reader.readReport({
      runId: run.id,
      select: AGENT_LIVEOPS_SAFE_SELECTS.report,
    }),
    reader.readStepMetrics({
      runId: run.id,
      select: AGENT_LIVEOPS_SAFE_SELECTS.stepMetrics,
    }),
    reader.readStepMessages({
      runId: run.id,
      select: AGENT_LIVEOPS_SAFE_SELECTS.stepMessages,
    }),
  ]);

  return buildAgentLiveOpsEventsFromRows({
    run,
    inputReview,
    agentOutputs,
    comparison,
    controllerDecision,
    report,
    stepMetrics,
    stepMessages,
  });
}

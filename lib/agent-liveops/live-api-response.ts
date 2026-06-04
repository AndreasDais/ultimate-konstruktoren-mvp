import {
  AGENT_LIVEOPS_EVENT_TYPES,
  AGENT_LIVEOPS_REDACTION_STATUSES,
  AGENT_LIVEOPS_SCHEMA_VERSION,
  AGENT_LIVEOPS_STATUSES,
  type AgentLiveOpsEvent,
  type AgentLiveOpsEventType,
  type AgentLiveOpsMetadata,
  type AgentLiveOpsRedactionStatus,
  type AgentLiveOpsSeverity,
  type AgentLiveOpsStatus,
} from "./types";

/**
 * Client-safe validator for the diagnostic live-read API response
 * (`GET /api/admin/agent-liveops/runs/:runId/events`).
 *
 * It has NO server-only / Supabase / Node imports so it can run in the
 * admin client component. It re-validates the sanitized envelope and
 * whitelists every event to the known safe shape, so the UI can never carry
 * raw provider payloads, prompts, user data, stack traces or chain-of-thought
 * even if an upstream layer regressed. It is defence-in-depth, not the
 * primary redaction boundary (that remains server-side).
 */

const EVENT_TYPES = new Set<string>(AGENT_LIVEOPS_EVENT_TYPES);
const STATUSES = new Set<string>(AGENT_LIVEOPS_STATUSES);
const REDACTION_STATUSES = new Set<string>(AGENT_LIVEOPS_REDACTION_STATUSES);
const SEVERITIES = new Set<string>(["info", "warn", "error", "block"]);

/** Keys that must never appear on a sanitized event — fail closed if present. */
export const AGENT_LIVEOPS_FORBIDDEN_EVENT_KEYS = [
  "raw_user_data",
  "full_user_prompt",
  "unredacted_file_text",
  "personal_data",
  "raw_message",
  "rawMessage",
  "raw_text",
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
  "user_id",
] as const;

const FORBIDDEN_KEY_SET = new Set<string>(AGENT_LIVEOPS_FORBIDDEN_EVENT_KEYS);

const FORBIDDEN_TEXT_RE =
  /(SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|SERVICE_ROLE_KEY|BEGIN\s+PROMPT|SYSTEM_PROMPT|chain[-_ ]?of[-_ ]?thought|hidden reasoning|private reasoning|sk-[a-z0-9_-]{12,}|[A-Za-z]:\\Users\\|\/Users\/|\/home\/)/i;

export type AgentLiveOpsLiveReadResult =
  | { ok: true; runId: string; events: AgentLiveOpsEvent[] }
  | { ok: false; reason: "invalid_shape" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Walks the raw value rejecting forbidden keys (anywhere) and forbidden text. */
function rawValueIsSafe(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return !FORBIDDEN_TEXT_RE.test(value);
  if (typeof value !== "object") return true;
  if (Array.isArray(value)) return value.every(rawValueIsSafe);
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEY_SET.has(key)) return false;
    if (!rawValueIsSafe(nested)) return false;
  }
  return true;
}

/** Validates + whitelists a single event. Returns null on any invalid field. */
export function parseAgentLiveOpsEvent(raw: unknown): AgentLiveOpsEvent | null {
  if (!isRecord(raw)) return null;
  if (!rawValueIsSafe(raw)) return null;

  if (raw.schema_version !== AGENT_LIVEOPS_SCHEMA_VERSION) return null;
  if (!isNonEmptyString(raw.run_id)) return null;
  if (!isNonEmptyString(raw.event_id)) return null;
  if (!isNonEmptyString(raw.trace_id)) return null;
  if (!isNonEmptyString(raw.span_id)) return null;
  if (typeof raw.event_type !== "string" || !EVENT_TYPES.has(raw.event_type)) {
    return null;
  }
  if (typeof raw.status !== "string" || !STATUSES.has(raw.status)) return null;
  if (!isNonEmptyString(raw.timestamp) || Number.isNaN(Date.parse(raw.timestamp))) {
    return null;
  }
  if (
    typeof raw.redaction_status !== "string" ||
    !REDACTION_STATUSES.has(raw.redaction_status)
  ) {
    return null;
  }

  const event: AgentLiveOpsEvent = {
    schema_version: AGENT_LIVEOPS_SCHEMA_VERSION,
    run_id: raw.run_id,
    event_id: raw.event_id,
    trace_id: raw.trace_id,
    span_id: raw.span_id,
    event_type: raw.event_type as AgentLiveOpsEventType,
    status: raw.status as AgentLiveOpsStatus,
    timestamp: raw.timestamp,
    redaction_status: raw.redaction_status as AgentLiveOpsRedactionStatus,
  };

  if (isNonEmptyString(raw.parent_span_id)) event.parent_span_id = raw.parent_span_id;
  if (isNonEmptyString(raw.agent)) event.agent = raw.agent;
  if (isNonEmptyString(raw.agent_key)) event.agent_key = raw.agent_key;
  if (isNonEmptyString(raw.agent_label)) event.agent_label = raw.agent_label;
  if (typeof raw.severity === "string" && SEVERITIES.has(raw.severity)) {
    event.severity = raw.severity as AgentLiveOpsSeverity;
  }
  if (typeof raw.duration_ms === "number") event.duration_ms = raw.duration_ms;
  else if (raw.duration_ms === null) event.duration_ms = null;
  if (typeof raw.summary === "string") event.summary = raw.summary;
  if (typeof raw.message === "string") event.message = raw.message;
  if (typeof raw.artifact_ref === "string") event.artifact_ref = raw.artifact_ref;
  else if (raw.artifact_ref === null) event.artifact_ref = null;
  if (isStringArray(raw.reason_codes)) event.reason_codes = raw.reason_codes;
  // metadata already passed the forbidden-key/text scan above.
  if (isRecord(raw.metadata)) event.metadata = raw.metadata as AgentLiveOpsMetadata;

  return event;
}

/**
 * Validates the full response envelope. Fails closed: a single malformed
 * event rejects the whole response so the UI never renders a partially
 * validated set. `reason` is intentionally coarse — the component maps HTTP
 * status to the user-facing bounded error messages.
 */
export function parseAgentLiveOpsLiveResponse(
  data: unknown,
): AgentLiveOpsLiveReadResult {
  if (!isRecord(data)) return { ok: false, reason: "invalid_shape" };
  // The diagnostic endpoint always asserts the read-only boundary.
  if (data.read_only !== true) return { ok: false, reason: "invalid_shape" };
  if (!Array.isArray(data.events)) return { ok: false, reason: "invalid_shape" };

  const events: AgentLiveOpsEvent[] = [];
  for (const rawEvent of data.events) {
    const event = parseAgentLiveOpsEvent(rawEvent);
    if (!event) return { ok: false, reason: "invalid_shape" };
    events.push(event);
  }

  const runId = isNonEmptyString(data.run_id)
    ? data.run_id
    : events[0]?.run_id ?? "unknown_run";

  return { ok: true, runId, events };
}

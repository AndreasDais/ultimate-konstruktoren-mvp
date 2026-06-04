import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  AGENT_LIVEOPS_EVENT_TYPES,
  AGENT_LIVEOPS_REDACTION_STATUSES,
  AGENT_LIVEOPS_SCHEMA_VERSION,
  AGENT_LIVEOPS_STATUSES,
  type AgentLiveOpsEvent,
  type AgentLiveOpsParseResult,
  type AgentLiveOpsRunSummary,
} from "./types";

export const AGENT_LIVEOPS_SAMPLE_EVENTS_PATH =
  "qa/agent-liveops/sample-run-events.jsonl";
export const AGENT_LIVEOPS_SAMPLE_SUMMARY_PATH =
  "qa/agent-liveops/sample-run-summary.json";

const forbiddenKeys = new Set([
  "raw_user_data",
  "full_user_prompt",
  "unredacted_file_text",
  "personal_data",
]);

const forbiddenTextPatterns = [
  { label: "chain-of-thought", pattern: /\b(chain[-_ ]?of[-_ ]?thought|hidden reasoning|private reasoning)\b/i },
  { label: "final approval", pattern: /\b(final compliance|approved for construction|final professional approval|professionally approved)\b/i },
  { label: "AISC adequacy", pattern: /\b(AISC adequacy|final AISC compliance)\b/i },
  { label: "DCR claim", pattern: /\bDCR\b\s*(=|:|>=|>|<|\d)/i },
  { label: "LTB capacity claim", pattern: /\b(Mb\s*,?\s*Rd|LTB capacity|phi_b\s*\*?\s*Mn\s*(=|>=|>))\b/i },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!isRecord(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key) || hasForbiddenKey(child)) return true;
  }
  return false;
}

function isEventType(value: unknown): value is AgentLiveOpsEvent["event_type"] {
  return typeof value === "string" &&
    AGENT_LIVEOPS_EVENT_TYPES.includes(value as AgentLiveOpsEvent["event_type"]);
}

function isStatus(value: unknown): value is AgentLiveOpsEvent["status"] {
  return typeof value === "string" &&
    AGENT_LIVEOPS_STATUSES.includes(value as AgentLiveOpsEvent["status"]);
}

function isRedactionStatus(value: unknown): value is AgentLiveOpsEvent["redaction_status"] {
  return typeof value === "string" &&
    AGENT_LIVEOPS_REDACTION_STATUSES.includes(value as AgentLiveOpsEvent["redaction_status"]);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getUnsafeSafeTextLabel(value: Record<string, unknown>): string | null {
  const safeText = [value.summary, value.message]
    .filter(isNonEmptyString)
    .join("\n");

  for (const { label, pattern } of forbiddenTextPatterns) {
    if (pattern.test(safeText)) return label;
  }
  return null;
}

function toAgentLiveOpsEvent(value: unknown, lineNumber: number): AgentLiveOpsEvent | string {
  if (!isRecord(value)) return `line ${lineNumber}: event must be an object`;
  if (hasForbiddenKey(value)) return `line ${lineNumber}: event contains forbidden raw-data field`;
  if (value.schema_version !== AGENT_LIVEOPS_SCHEMA_VERSION) {
    return `line ${lineNumber}: unsupported schema_version`;
  }
  for (const field of ["run_id", "event_id", "trace_id", "span_id", "timestamp"]) {
    if (!isNonEmptyString(value[field])) return `line ${lineNumber}: missing ${field}`;
  }
  if (!isNonEmptyString(value.agent) && !isNonEmptyString(value.agent_key)) {
    return `line ${lineNumber}: missing agent or agent_key`;
  }
  if (!isNonEmptyString(value.summary) && !isNonEmptyString(value.message)) {
    return `line ${lineNumber}: missing safe summary/message`;
  }
  if (!isEventType(value.event_type)) return `line ${lineNumber}: unknown event_type`;
  if (!isStatus(value.status)) return `line ${lineNumber}: unknown status`;
  if (!isRedactionStatus(value.redaction_status)) {
    return `line ${lineNumber}: invalid redaction_status`;
  }
  if (!isNonEmptyString(value.timestamp) || Number.isNaN(Date.parse(value.timestamp))) {
    return `line ${lineNumber}: timestamp is not ISO-parseable`;
  }

  const unsafeSafeTextLabel = getUnsafeSafeTextLabel(value);
  if (unsafeSafeTextLabel) {
    return `line ${lineNumber}: unsafe ${unsafeSafeTextLabel} text in summary/message`;
  }

  return value as AgentLiveOpsEvent;
}

export function parseAgentLiveOpsEventsJsonl(jsonl: string): AgentLiveOpsParseResult {
  const events: AgentLiveOpsEvent[] = [];
  const errors: string[] = [];
  const seenEventIds = new Set<string>();

  jsonl.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      errors.push(`line ${lineNumber}: invalid JSON (${error instanceof Error ? error.message : "unknown error"})`);
      return;
    }

    const event = toAgentLiveOpsEvent(parsed, lineNumber);
    if (typeof event === "string") {
      errors.push(event);
      return;
    }
    if (seenEventIds.has(event.event_id)) {
      errors.push(`line ${lineNumber}: duplicate event_id ${event.event_id}`);
      return;
    }
    seenEventIds.add(event.event_id);
    events.push(event);
  });

  if (events.length === 0) errors.push("no events found");
  return errors.length > 0 ? { ok: false, errors } : { ok: true, events };
}

export function readAgentLiveOpsMockEvents(root = process.cwd()): AgentLiveOpsEvent[] {
  const jsonl = readFileSync(resolve(root, AGENT_LIVEOPS_SAMPLE_EVENTS_PATH), "utf8");
  const result = parseAgentLiveOpsEventsJsonl(jsonl);
  if (!result.ok) {
    throw new Error(`Invalid Agent LiveOps mock events: ${result.errors.join("; ")}`);
  }
  return result.events;
}

export function readAgentLiveOpsMockSummary(root = process.cwd()): AgentLiveOpsRunSummary {
  const text = readFileSync(resolve(root, AGENT_LIVEOPS_SAMPLE_SUMMARY_PATH), "utf8");
  return JSON.parse(text) as AgentLiveOpsRunSummary;
}

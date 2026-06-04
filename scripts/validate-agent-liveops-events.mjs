#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = process.cwd();
const SAMPLE_EVENTS = "qa/agent-liveops/sample-run-events.jsonl";
const SAMPLE_SUMMARY = "qa/agent-liveops/sample-run-summary.json";
const INVALID_FIXTURES = [
  "qa/agent-liveops/invalid-events/raw-user-data.jsonl",
  "qa/agent-liveops/invalid-events/missing-redaction-status.jsonl"
];

const REQUIRED_EVENT_FIELDS = [
  "schema_version",
  "run_id",
  "event_id",
  "trace_id",
  "span_id",
  "event_type",
  "timestamp",
  "status",
  "redaction_status"
];

const ALLOWED_EVENT_TYPES = new Set([
  "run.created",
  "run.started",
  "run.completed",
  "run.completed_with_warning",
  "run.failed",
  "run.cancelled",
  "agent.queued",
  "agent.started",
  "agent.streaming",
  "agent.completed",
  "agent.completed_with_warning",
  "agent.failed",
  "agent.retrying",
  "agent.handoff",
  "agent.parallel_started",
  "agent.parallel_joined",
  "tool.started",
  "tool.completed",
  "tool.failed",
  "guardrail.started",
  "guardrail.pass",
  "guardrail.warn",
  "guardrail.block",
  "report.started",
  "report.web_ready",
  "report.pdf_ready",
  "report.docx_ready",
  "report.failed",
  "eval.started",
  "eval.passed",
  "eval.failed",
  "eval.needs_human_review",
  "human.review_required",
  "human.review_completed",
  "feature.evidence_created",
  "feature.hypothesis_candidate_created",
  "release.gate_started",
  "release.ready",
  "release.risky",
  "release.blocked"
]);

const ALLOWED_STATUSES = new Set([
  "idle",
  "queued",
  "running",
  "streaming",
  "waiting_for_tool",
  "waiting_for_handoff",
  "waiting_for_human",
  "completed",
  "completed_with_warning",
  "blocked",
  "failed",
  "cancelled"
]);

const ALLOWED_REDACTION_STATUSES = new Set([
  "safe_summary_only",
  "no_user_data"
]);

const FORBIDDEN_KEYS = new Set([
  "raw_user_data",
  "full_user_prompt",
  "unredacted_file_text",
  "personal_data"
]);

const FORBIDDEN_TEXT_PATTERNS = [
  { label: "chain-of-thought", pattern: /\b(chain[-_ ]?of[-_ ]?thought|hidden reasoning|private reasoning)\b/i },
  { label: "final approval", pattern: /\b(final compliance|approved for construction|final professional approval|professionally approved)\b/i },
  { label: "AISC adequacy", pattern: /\b(AISC adequacy|final AISC compliance)\b/i },
  { label: "DCR claim", pattern: /\bDCR\b\s*(=|:|>=|>|<|\d)/i },
  { label: "LTB capacity claim", pattern: /\b(Mb\s*,?\s*Rd|LTB capacity|phi_b\s*\*?\s*Mn\s*(=|>=|>))\b/i }
];

function repoPath(filePath) {
  return relative(ROOT, resolve(ROOT, filePath));
}

function readJsonl(filePath) {
  const absolutePath = resolve(ROOT, filePath);
  const text = readFileSync(absolutePath, "utf8");
  const records = [];
  const errors = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (!line) continue;

    try {
      records.push({ lineNumber, value: JSON.parse(line) });
    } catch (error) {
      errors.push(`${repoPath(filePath)}:${lineNumber}: invalid JSON (${error.message})`);
    }
  }

  if (records.length === 0) {
    errors.push(`${repoPath(filePath)}: no JSONL events found`);
  }

  return { records, errors };
}

function collectForbiddenKeys(value, path = "$", hits = []) {
  if (!value || typeof value !== "object") return hits;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_KEYS.has(key)) {
      hits.push(childPath);
    }
    collectForbiddenKeys(child, childPath, hits);
  }

  return hits;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateEvent(record, seenEventIds) {
  const event = record.value;
  const prefix = `line ${record.lineNumber}`;
  const errors = [];

  for (const field of REQUIRED_EVENT_FIELDS) {
    if (!isNonEmptyString(event[field])) {
      errors.push(`${prefix}: missing or empty ${field}`);
    }
  }

  if (!isNonEmptyString(event.agent) && !isNonEmptyString(event.agent_key)) {
    errors.push(`${prefix}: missing agent or agent_key`);
  }

  if (!isNonEmptyString(event.summary) && !isNonEmptyString(event.message)) {
    errors.push(`${prefix}: missing safe summary/message`);
  }

  if (isNonEmptyString(event.event_type) && !ALLOWED_EVENT_TYPES.has(event.event_type)) {
    errors.push(`${prefix}: unknown event_type ${event.event_type}`);
  }

  if (isNonEmptyString(event.status) && !ALLOWED_STATUSES.has(event.status)) {
    errors.push(`${prefix}: unknown status ${event.status}`);
  }

  if (isNonEmptyString(event.redaction_status) && !ALLOWED_REDACTION_STATUSES.has(event.redaction_status)) {
    errors.push(`${prefix}: invalid redaction_status ${event.redaction_status}`);
  }

  if (isNonEmptyString(event.event_id)) {
    if (seenEventIds.has(event.event_id)) {
      errors.push(`${prefix}: duplicate event_id ${event.event_id}`);
    }
    seenEventIds.add(event.event_id);
  }

  if (isNonEmptyString(event.timestamp) && Number.isNaN(Date.parse(event.timestamp))) {
    errors.push(`${prefix}: timestamp is not ISO-parseable`);
  }

  const forbiddenKeys = collectForbiddenKeys(event);
  for (const keyPath of forbiddenKeys) {
    errors.push(`${prefix}: forbidden field ${keyPath}`);
  }

  const safeText = [event.summary, event.message].filter(isNonEmptyString).join("\n");
  for (const { label, pattern } of FORBIDDEN_TEXT_PATTERNS) {
    if (pattern.test(safeText)) {
      errors.push(`${prefix}: unsafe ${label} text in summary/message`);
    }
  }

  return errors;
}

function validateEventsFile(filePath) {
  const { records, errors } = readJsonl(filePath);
  const seenEventIds = new Set();

  for (const record of records) {
    errors.push(...validateEvent(record, seenEventIds));
  }

  return { records: records.map((record) => record.value), errors };
}

function countWarnings(events) {
  return events.filter((event) =>
    event.status === "completed_with_warning" ||
    event.status === "waiting_for_human" ||
    event.event_type === "guardrail.warn" ||
    event.event_type === "eval.needs_human_review" ||
    event.event_type === "human.review_required" ||
    event.event_type === "release.risky"
  ).length;
}

function countBlocked(events) {
  return events.filter((event) =>
    event.status === "blocked" ||
    event.event_type === "guardrail.block" ||
    event.event_type === "release.blocked"
  ).length;
}

function validateSummary(filePath, events) {
  const errors = [];
  let summary;

  try {
    summary = JSON.parse(readFileSync(resolve(ROOT, filePath), "utf8"));
  } catch (error) {
    return [`${repoPath(filePath)}: invalid JSON (${error.message})`];
  }

  const runIds = new Set(events.map((event) => event.run_id));
  if (!isNonEmptyString(summary.run_id) || !runIds.has(summary.run_id) || runIds.size !== 1) {
    errors.push(`${repoPath(filePath)}: run_id must match the single sample run_id`);
  }

  if (summary.event_count !== events.length) {
    errors.push(`${repoPath(filePath)}: event_count ${summary.event_count} does not match ${events.length}`);
  }

  const warningCount = countWarnings(events);
  if (summary.warning_count !== warningCount) {
    errors.push(`${repoPath(filePath)}: warning_count ${summary.warning_count} does not match ${warningCount}`);
  }

  const blockedCount = countBlocked(events);
  if (summary.blocked_count !== blockedCount) {
    errors.push(`${repoPath(filePath)}: blocked_count ${summary.blocked_count} does not match ${blockedCount}`);
  }

  if (!ALLOWED_REDACTION_STATUSES.has(summary.redaction_status)) {
    errors.push(`${repoPath(filePath)}: invalid summary redaction_status`);
  }

  if (summary.read_only !== true) {
    errors.push(`${repoPath(filePath)}: read_only must be true`);
  }

  if (summary.human_final !== true) {
    errors.push(`${repoPath(filePath)}: human_final must be true`);
  }

  const artifactStatuses = summary.artifact_statuses || {};
  for (const artifactName of ["web", "pdf", "docx"]) {
    if (artifactStatuses[artifactName] !== "ready") {
      errors.push(`${repoPath(filePath)}: artifact_statuses.${artifactName} must be ready`);
    }
  }

  return errors;
}

function printErrors(errors) {
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
}

let failed = false;
const sampleResult = validateEventsFile(SAMPLE_EVENTS);
const summaryErrors = validateSummary(SAMPLE_SUMMARY, sampleResult.records);
const sampleErrors = [...sampleResult.errors, ...summaryErrors];

if (sampleErrors.length > 0) {
  failed = true;
  console.error(`FAILED ${repoPath(SAMPLE_EVENTS)} / ${repoPath(SAMPLE_SUMMARY)}: ${sampleErrors.length} error(s)`);
  printErrors(sampleErrors);
} else {
  console.log(`OK ${repoPath(SAMPLE_EVENTS)}: ${sampleResult.records.length} sanitized events validated`);
  console.log(`OK ${repoPath(SAMPLE_SUMMARY)}: summary matches sample run`);
}

for (const fixturePath of INVALID_FIXTURES) {
  const result = validateEventsFile(fixturePath);
  if (result.errors.length === 0) {
    failed = true;
    console.error(`FAILED ${repoPath(fixturePath)}: invalid fixture unexpectedly passed`);
  } else {
    console.log(`OK ${repoPath(fixturePath)}: invalid fixture rejected (${result.errors[0]})`);
  }
}

if (failed) {
  console.error("FAILED Agent LiveOps event validation");
  process.exit(1);
}

console.log("OK Agent LiveOps event validation complete");

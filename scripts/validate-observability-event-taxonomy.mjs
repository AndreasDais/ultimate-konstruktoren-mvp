#!/usr/bin/env node
import fs from "node:fs";

const FILE = "sources/observability/observability-event-taxonomy.json";

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`WARN ${message}`);
  warnings += 1;
}

let warnings = 0;
let errors = 0;

function recordError(message) {
  errors += 1;
  fail(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function validateEventName(name) {
  return /^[a-z]+(?:-[a-z]+)*\.[a-z]+(?:-[a-z]+)*$/.test(name);
}

if (!fs.existsSync(FILE)) {
  recordError(`${FILE} does not exist`);
  process.exit(process.exitCode ?? 1);
}

let taxonomy;
try {
  taxonomy = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch (error) {
  recordError(`${FILE} is not valid JSON: ${error.message}`);
  process.exit(process.exitCode ?? 1);
}

if (!isNonEmptyString(taxonomy.version)) recordError("taxonomy.version must be a non-empty string");
if (!isNonEmptyString(taxonomy.status)) recordError("taxonomy.status must be a non-empty string");
if (!isStringArray(taxonomy.categories)) recordError("taxonomy.categories must be a non-empty string array");
if (!isStringArray(taxonomy.severity_levels)) recordError("taxonomy.severity_levels must be a non-empty string array");
if (!isStringArray(taxonomy.common_required_fields)) recordError("taxonomy.common_required_fields must be a string array");
if (!isStringArray(taxonomy.common_optional_fields)) recordError("taxonomy.common_optional_fields must be a string array");
if (!Array.isArray(taxonomy.events) || taxonomy.events.length === 0) {
  recordError("taxonomy.events must be a non-empty array");
}

const categories = new Set(taxonomy.categories ?? []);
const severityLevels = new Set(taxonomy.severity_levels ?? []);
const eventTypes = new Set();
const requiredCommon = new Set(taxonomy.common_required_fields ?? []);
const expectedCommonRequired = ["event_type", "event_version", "created_at", "source", "severity"];

for (const field of expectedCommonRequired) {
  if (!requiredCommon.has(field)) {
    recordError(`common_required_fields missing ${field}`);
  }
}

for (const [index, event] of (taxonomy.events ?? []).entries()) {
  const prefix = `events[${index}]`;

  if (!isNonEmptyString(event.event_type)) {
    recordError(`${prefix}.event_type must be a non-empty string`);
    continue;
  }

  if (!validateEventName(event.event_type)) {
    recordError(`${prefix}.event_type '${event.event_type}' must use category.action dot notation`);
  }

  if (eventTypes.has(event.event_type)) {
    recordError(`duplicate event_type '${event.event_type}'`);
  }
  eventTypes.add(event.event_type);

  if (!isNonEmptyString(event.category)) recordError(`${event.event_type}.category must be a non-empty string`);
  if (event.category && !categories.has(event.category)) {
    recordError(`${event.event_type}.category '${event.category}' is not declared in taxonomy.categories`);
  }

  const eventCategory = event.event_type.split(".")[0];
  if (event.category && eventCategory !== event.category) {
    recordError(`${event.event_type} category mismatch: event_type prefix '${eventCategory}' != category '${event.category}'`);
  }

  if (!isNonEmptyString(event.description)) recordError(`${event.event_type}.description must be a non-empty string`);
  if (!isNonEmptyString(event.producer)) recordError(`${event.event_type}.producer must be a non-empty string`);
  if (!isNonEmptyString(event.severity)) recordError(`${event.event_type}.severity must be a non-empty string`);
  if (event.severity && !severityLevels.has(event.severity)) {
    recordError(`${event.event_type}.severity '${event.severity}' is not declared in severity_levels`);
  }

  if (!isStringArray(event.required_fields)) recordError(`${event.event_type}.required_fields must be a string array`);
  if (!isStringArray(event.optional_fields)) recordError(`${event.event_type}.optional_fields must be a string array`);

  if (Array.isArray(event.required_fields) && event.required_fields.includes("metadata")) {
    warn(`${event.event_type}: metadata should normally be optional, not required`);
  }

  if (Array.isArray(event.required_fields) && Array.isArray(event.optional_fields)) {
    const optional = new Set(event.optional_fields);
    for (const field of event.required_fields) {
      if (optional.has(field)) {
        recordError(`${event.event_type}: field '${field}' is both required and optional`);
      }
    }
  }
}

const requiredEventTypes = [
  "run.started",
  "input.classified",
  "agent.completed",
  "agent.failed",
  "comparison.completed",
  "controller.decision",
  "report.generated",
  "artifact.rendered",
  "guardrail.evaluated",
  "eval.executed",
  "research.memo.generated",
  "release.gate.checked",
  "health.snapshot.written",
  "feedback.recorded",
  "anomaly.flagged"
];

for (const eventType of requiredEventTypes) {
  if (!eventTypes.has(eventType)) {
    recordError(`missing required event type '${eventType}'`);
  }
}

if (!taxonomy.pii_policy || typeof taxonomy.pii_policy !== "object") {
  recordError("taxonomy.pii_policy must exist");
} else {
  if (!isNonEmptyString(taxonomy.pii_policy.rule)) recordError("pii_policy.rule must be a non-empty string");
  if (!isStringArray(taxonomy.pii_policy.requires_redaction)) recordError("pii_policy.requires_redaction must be a string array");
}

if (errors > 0 || process.exitCode) {
  console.error(`FAILED ${FILE}: ${taxonomy.events?.length ?? 0} events checked, ${errors} errors, ${warnings} warnings`);
  process.exit(process.exitCode ?? 1);
}

console.log(`OK ${FILE}: ${taxonomy.events.length} observability events validated, 0 errors, ${warnings} warnings`);

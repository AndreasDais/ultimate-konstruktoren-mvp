#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const registryPath = path.join("sources", "release-manager", "release-gates.json");
const allowedStatuses = new Set(["RELEASE_READY", "RELEASE_RISKY", "RELEASE_BLOCKED"]);
const allowedSeverity = new Set(["blocker", "risk", "info"]);
const allowedEvidence = new Set([
  "terminal_output",
  "artifact",
  "manual_confirmation",
  "runtime_screenshot",
  "new_run_result"
]);
const allowedModes = new Set([
  "manual_command",
  "manual_conditional",
  "manual_review"
]);

const requiredGateIds = [
  "working_tree_clean",
  "agent_ecosystem_gate",
  "typescript_gate",
  "production_build_gate",
  "health_snapshot_check_mode",
  "eval_readiness_gate",
  "eval_coverage_gate",
  "research_gate",
  "guardrails_gate",
  "observability_gate",
  "report_qa_gate",
  "runtime_smoke_if_app_changed",
  "new_run_if_prompt_or_report_output_changed",
  "i18n_regression_if_language_changed",
  "generated_artifacts_reviewed"
];

function fail(message) {
  console.error(`ERROR ${message}`);
  return 1;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

if (!existsSync(registryPath)) {
  process.exit(fail(`missing ${registryPath}`));
}

let registry;
try {
  registry = JSON.parse(readFileSync(registryPath, "utf8"));
} catch (error) {
  process.exit(fail(`${registryPath} is not valid JSON: ${error.message}`));
}

const errors = [];
const warnings = [];

if (!isNonEmptyString(registry.version)) errors.push("version must be a non-empty string");
if (!Array.isArray(registry.decision_statuses)) errors.push("decision_statuses must be an array");
if (!Array.isArray(registry.severity_levels)) errors.push("severity_levels must be an array");
if (!Array.isArray(registry.evidence_types)) errors.push("evidence_types must be an array");
if (!Array.isArray(registry.gates)) errors.push("gates must be an array");

for (const status of registry.decision_statuses || []) {
  if (!allowedStatuses.has(status)) errors.push(`unknown decision status '${status}'`);
}
for (const severity of registry.severity_levels || []) {
  if (!allowedSeverity.has(severity)) errors.push(`unknown severity level '${severity}'`);
}
for (const evidence of registry.evidence_types || []) {
  if (!allowedEvidence.has(evidence)) errors.push(`unknown evidence type '${evidence}'`);
}

const seen = new Set();
for (const [index, gate] of (registry.gates || []).entries()) {
  const prefix = `gates[${index}]`;
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    errors.push(`${prefix} must be an object`);
    continue;
  }

  if (!isNonEmptyString(gate.id)) errors.push(`${prefix}.id must be a non-empty string`);
  if (isNonEmptyString(gate.id)) {
    if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(gate.id)) {
      errors.push(`${prefix}.id '${gate.id}' must use snake_case`);
    }
    if (seen.has(gate.id)) errors.push(`duplicate gate id '${gate.id}'`);
    seen.add(gate.id);
  }

  if (!isNonEmptyString(gate.title)) errors.push(`${prefix}.title must be a non-empty string`);
  if (!isNonEmptyString(gate.phase)) errors.push(`${prefix}.phase must be a non-empty string`);
  if (!allowedSeverity.has(gate.severity)) errors.push(`${prefix}.severity must be blocker, risk or info`);
  if (typeof gate.required !== "boolean") errors.push(`${prefix}.required must be boolean`);
  if (!allowedModes.has(gate.mode)) errors.push(`${prefix}.mode has unsupported value '${gate.mode}'`);
  if (!isNonEmptyString(gate.command)) errors.push(`${prefix}.command must be a non-empty string`);
  if (!isNonEmptyString(gate.expected)) errors.push(`${prefix}.expected must be a non-empty string`);
  if (!allowedEvidence.has(gate.evidence_type)) errors.push(`${prefix}.evidence_type has unsupported value '${gate.evidence_type}'`);
  if (typeof gate.blocks_if_failed !== "boolean") errors.push(`${prefix}.blocks_if_failed must be boolean`);
  if (!isNonEmptyString(gate.rationale)) errors.push(`${prefix}.rationale must be a non-empty string`);

  if (gate.mode === "manual_conditional" && !isNonEmptyString(gate.condition)) {
    errors.push(`${prefix}.condition is required for manual_conditional gates`);
  }
  if (gate.severity === "blocker" && gate.blocks_if_failed !== true) {
    warnings.push(`${prefix} '${gate.id}' is blocker but blocks_if_failed is not true`);
  }
}

for (const id of requiredGateIds) {
  if (!seen.has(id)) errors.push(`missing required gate '${id}'`);
}

const blockerCount = (registry.gates || []).filter((gate) => gate && gate.severity === "blocker").length;
if (blockerCount < 5) warnings.push(`expected at least 5 blocker gates, found ${blockerCount}`);

for (const warning of warnings) console.warn(`WARN ${registryPath}: ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${registryPath}: ${error}`);
  console.error(`FAILED ${registryPath}: ${(registry.gates || []).length} release gates checked, ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(1);
}

console.log(`OK ${registryPath}: ${registry.gates.length} release gates validated, 0 errors, ${warnings.length} warnings`);

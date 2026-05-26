import fs from "node:fs";
import path from "node:path";

const filePath = path.join("sources", "report-qa", "report-qa-checks.json");

const allowedCategories = new Set([
  "task_alignment",
  "assumption_traceability",
  "calculation_consistency",
  "risk_language",
  "standard_profile",
  "i18n",
  "traceability",
  "risk_visibility",
  "artifact_parity",
  "safety_disclaimer",
  "input_quality",
  "standard_safety",
  "decision_traceability",
  "artifact_availability",
]);

const allowedSeverity = new Set(["info", "warn", "block"]);
const allowedAutomatedLevel = new Set(["manual", "semi_auto", "rule"]);
const requiredStringFields = ["id", "category", "severity", "automated_level", "description"];
const requiredArrayFields = ["applies_to", "pass_signals", "fail_signals", "evidence_fields"];

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exitCode = 1;
}

function readJson(file) {
  if (!fs.existsSync(file)) {
    fail(`${file}: file not found`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${file}: invalid JSON: ${error.message}`);
    return null;
  }
}

const registry = readJson(filePath);

if (!registry) {
  process.exit();
}

let errors = 0;
let warnings = 0;

function error(message) {
  errors += 1;
  console.error(`ERROR ${message}`);
}

function warn(message) {
  warnings += 1;
  console.warn(`WARN ${message}`);
}

if (registry.schema_version !== "report_qa_checks_v0.1") {
  error(`${filePath}: schema_version must be report_qa_checks_v0.1`);
}

if (!Array.isArray(registry.checks)) {
  error(`${filePath}: checks must be an array`);
} else if (registry.checks.length < 8) {
  error(`${filePath}: expected at least 8 report QA checks`);
}

const ids = new Set();

for (const [index, check] of (registry.checks ?? []).entries()) {
  const label = `checks[${index}]`;

  for (const field of requiredStringFields) {
    if (typeof check[field] !== "string" || check[field].trim().length === 0) {
      error(`${filePath}: ${label}.${field} must be a non-empty string`);
    }
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(check[field]) || check[field].length === 0) {
      error(`${filePath}: ${label}.${field} must be a non-empty array`);
    }
  }

  if (typeof check.id === "string") {
    if (!/^[a-z][a-z0-9_]*$/.test(check.id)) {
      error(`${filePath}: ${label}.id must be snake_case`);
    }

    if (ids.has(check.id)) {
      error(`${filePath}: duplicate id ${check.id}`);
    }

    ids.add(check.id);
  }

  if (typeof check.category === "string" && !allowedCategories.has(check.category)) {
    error(`${filePath}: ${label}.category is not allowed: ${check.category}`);
  }

  if (typeof check.severity === "string" && !allowedSeverity.has(check.severity)) {
    error(`${filePath}: ${label}.severity is not allowed: ${check.severity}`);
  }

  if (typeof check.automated_level === "string" && !allowedAutomatedLevel.has(check.automated_level)) {
    error(`${filePath}: ${label}.automated_level is not allowed: ${check.automated_level}`);
  }

  if (Array.isArray(check.applies_to) && !check.applies_to.includes("web_report")) {
    warn(`${filePath}: ${label}.applies_to does not include web_report`);
  }

  if (typeof check.description === "string" && check.description.length < 24) {
    warn(`${filePath}: ${label}.description is very short`);
  }
}

if (errors > 0) {
  console.error(`FAIL ${filePath}: ${errors} errors, ${warnings} warnings`);
  process.exit(1);
}

console.log(
  `OK ${filePath}: ${ids.size} report QA checks validated, ${errors} errors, ${warnings} warnings`
);

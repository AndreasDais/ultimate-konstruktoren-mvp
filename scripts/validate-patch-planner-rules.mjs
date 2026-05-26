#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = "sources/patch-planner/patch-planner-rules.json";
const absolutePath = path.join(root, registryPath);

const validSeverities = new Set(["block", "warn", "info"]);
const validStatuses = new Set(["active", "draft", "deprecated"]);
const validCategories = new Set([
  "planning",
  "scope",
  "release_gate",
  "evidence",
  "artifact_workflow",
  "patch_safety",
  "rollback",
  "observability",
  "i18n",
  "domain_safety",
  "git_hygiene",
  "verification",
  "authority"
]);

const errors = [];
const warnings = [];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function readRegistry() {
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing registry: ${registryPath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    errors.push(`Invalid JSON in ${registryPath}: ${error.message}`);
    return null;
  }
}

const registry = readRegistry();

if (registry) {
  if (!isNonEmptyString(registry.version)) errors.push("Registry missing version");
  if (!isNonEmptyString(registry.status)) errors.push("Registry missing status");
  if (!isNonEmptyString(registry.owner)) errors.push("Registry missing owner");
  if (!isNonEmptyString(registry.purpose)) errors.push("Registry missing purpose");

  if (!Array.isArray(registry.rules)) {
    errors.push("Registry rules must be an array");
  } else {
    const ids = new Set();
    for (const [index, rule] of registry.rules.entries()) {
      const prefix = `rules[${index}]`;

      if (!isNonEmptyString(rule.id)) {
        errors.push(`${prefix}.id must be a non-empty string`);
      } else {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.id)) {
          errors.push(`${prefix}.id '${rule.id}' must be kebab-case`);
        }
        if (ids.has(rule.id)) errors.push(`Duplicate rule id '${rule.id}'`);
        ids.add(rule.id);
      }

      if (!isNonEmptyString(rule.title)) errors.push(`${prefix}.title must be a non-empty string`);
      if (!isNonEmptyString(rule.requirement)) errors.push(`${prefix}.requirement must be a non-empty string`);

      if (!validCategories.has(rule.category)) {
        errors.push(`${prefix}.category '${rule.category}' is not allowed`);
      }

      if (!validSeverities.has(rule.severity)) {
        errors.push(`${prefix}.severity '${rule.severity}' is not allowed`);
      }

      if (!validStatuses.has(rule.status)) {
        errors.push(`${prefix}.status '${rule.status}' is not allowed`);
      }

      if (!isStringArray(rule.applies_to)) errors.push(`${prefix}.applies_to must be a non-empty string array`);
      if (!isStringArray(rule.required_evidence)) errors.push(`${prefix}.required_evidence must be a non-empty string array`);
      if (!Array.isArray(rule.forbidden_patterns)) errors.push(`${prefix}.forbidden_patterns must be an array`);

      if (rule.severity === "block" && Array.isArray(rule.required_evidence) && rule.required_evidence.length === 0) {
        errors.push(`${prefix} is blocking but has no required evidence`);
      }

      if (rule.category === "patch_safety" && rule.severity !== "block") {
        warnings.push(`${prefix} patch_safety rule is not blocking`);
      }
    }

    if (registry.rules.length < 10) {
      warnings.push(`Registry has only ${registry.rules.length} rules; expected at least 10 foundation rules`);
    }

    const requiredRuleIds = [
      "sprint-format-required",
      "one-file-group-per-sprint",
      "no-new-sprint-on-red-gate",
      "audit-before-patch",
      "downloadable-artifact-preferred",
      "no-broad-tsx-regex",
      "backup-before-write",
      "stage-only-owned-files",
      "verify-with-tsc-and-relevant-gates",
      "human-review-for-write-power"
    ];

    for (const id of requiredRuleIds) {
      if (!ids.has(id)) errors.push(`Missing required rule '${id}'`);
    }
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  console.error(`FAILED ${registryPath}: ${registry?.rules?.length ?? 0} rules checked, ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(1);
}

console.log(`OK ${registryPath}: ${registry.rules.length} patch planner rules validated, 0 errors, ${warnings.length} warnings`);

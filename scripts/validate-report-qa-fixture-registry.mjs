#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = "sources/report-qa/dry-run/fixtures/fixture-registry.json";
const ALLOWED_STATUSES = new Set(["active", "planned", "deferred"]);
const REQUIRED_FIELDS = [
  "id",
  "title",
  "status",
  "family",
  "risk_area",
  "language",
  "standard_context",
  "fixture_path",
  "expected_signal",
  "checks_targeted",
  "notes"
];

function rel(path) {
  return join(ROOT, path);
}

function readJson(path) {
  return JSON.parse(readFileSync(rel(path), "utf8"));
}

function isKebabCase(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ""));
}

function addError(errors, message) {
  errors.push(`ERROR ${message}`);
}

function addWarning(warnings, message) {
  warnings.push(`WARN ${message}`);
}

const errors = [];
const warnings = [];

if (!existsSync(rel(REGISTRY_PATH))) {
  addError(errors, `missing registry: ${REGISTRY_PATH}`);
} else {
  let registry;
  try {
    registry = readJson(REGISTRY_PATH);
  } catch (error) {
    addError(errors, `${REGISTRY_PATH}: invalid JSON: ${error.message}`);
  }

  if (registry) {
    if (typeof registry.schema_version !== "string" || registry.schema_version.trim() === "") {
      addError(errors, `${REGISTRY_PATH}: schema_version must be a non-empty string`);
    }
    if (!Array.isArray(registry.fixtures)) {
      addError(errors, `${REGISTRY_PATH}: fixtures must be an array`);
    }

    const families = Array.isArray(registry.fixture_families) ? new Set(registry.fixture_families) : new Set();
    const ids = new Set();
    let activeCount = 0;
    let plannedCount = 0;
    let deferredCount = 0;

    if (Array.isArray(registry.fixtures)) {
      registry.fixtures.forEach((fixture, index) => {
        const prefix = `fixtures[${index}]`;
        if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
          addError(errors, `${prefix}: must be an object`);
          return;
        }

        for (const field of REQUIRED_FIELDS) {
          if (!(field in fixture)) addError(errors, `${prefix}: missing required field '${field}'`);
        }

        const id = String(fixture.id || "");
        if (!isKebabCase(id)) addError(errors, `${prefix}.id '${id}' must be kebab-case`);
        if (ids.has(id)) addError(errors, `${prefix}.id '${id}' is duplicated`);
        ids.add(id);

        if (!ALLOWED_STATUSES.has(fixture.status)) {
          addError(errors, `${prefix}.status '${fixture.status}' must be one of ${Array.from(ALLOWED_STATUSES).join(", ")}`);
        }
        if (fixture.status === "active") activeCount += 1;
        if (fixture.status === "planned") plannedCount += 1;
        if (fixture.status === "deferred") deferredCount += 1;

        if (families.size > 0 && !families.has(fixture.family)) {
          addError(errors, `${prefix}.family '${fixture.family}' is not listed in fixture_families`);
        }

        if (typeof fixture.fixture_path !== "string" || !fixture.fixture_path.startsWith("sources/report-qa/")) {
          addError(errors, `${prefix}.fixture_path must be under sources/report-qa/`);
        } else if (fixture.status === "active" && !existsSync(rel(fixture.fixture_path))) {
          addError(errors, `${prefix}.fixture_path active fixture does not exist: ${fixture.fixture_path}`);
        } else if (fixture.status !== "active" && existsSync(rel(fixture.fixture_path))) {
          addWarning(warnings, `${prefix}.fixture_path exists but status is '${fixture.status}': ${fixture.fixture_path}`);
        }

        if (!Array.isArray(fixture.checks_targeted) || fixture.checks_targeted.length === 0) {
          addError(errors, `${prefix}.checks_targeted must be a non-empty array`);
        } else {
          const seenChecks = new Set();
          for (const check of fixture.checks_targeted) {
            if (typeof check !== "string" || check.trim() === "") {
              addError(errors, `${prefix}.checks_targeted contains a non-string or empty value`);
              continue;
            }
            if (seenChecks.has(check)) addWarning(warnings, `${prefix}.checks_targeted contains duplicate '${check}'`);
            seenChecks.add(check);
          }
        }
      });
    }

    if (activeCount < 1) addError(errors, `${REGISTRY_PATH}: expected at least one active fixture`);
    if (plannedCount < 1) addWarning(warnings, `${REGISTRY_PATH}: no planned fixtures listed`);

    if (errors.length === 0) {
      console.log(`OK ${REGISTRY_PATH}: ${registry.fixtures.length} fixtures validated (${activeCount} active, ${plannedCount} planned, ${deferredCount} deferred), ${errors.length} errors, ${warnings.length} warnings`);
    }
  }
}

for (const warning of warnings) console.warn(warning);
for (const error of errors) console.error(error);

if (errors.length > 0) process.exit(1);

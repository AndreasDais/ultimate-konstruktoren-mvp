#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const registryPath = path.join("sources", "guardrails", "guardrail-reason-codes.json");

const requiredRootFields = [
  "schema_version",
  "status",
  "owner",
  "purpose",
  "allowed_statuses",
  "allowed_severities",
  "allowed_categories",
  "reason_codes",
];

const requiredCodeFields = [
  "code",
  "category",
  "default_status",
  "severity",
  "description_en",
  "description_nb",
  "trigger_condition",
  "allowed_next_step",
  "user_message_en",
  "developer_message",
];

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exitCode = 1;
}

function warn(message, warnings) {
  warnings.push(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`${filePath}: file not found`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${filePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function validate() {
  const warnings = [];
  const registry = readJson(registryPath);
  if (!registry) return;

  for (const field of requiredRootFields) {
    if (!(field in registry)) fail(`${registryPath}: missing root field ${field}`);
  }

  if (!Array.isArray(registry.allowed_statuses) || registry.allowed_statuses.length === 0) {
    fail(`${registryPath}: allowed_statuses must be a non-empty array`);
  }

  if (!Array.isArray(registry.allowed_severities) || registry.allowed_severities.length === 0) {
    fail(`${registryPath}: allowed_severities must be a non-empty array`);
  }

  if (!Array.isArray(registry.allowed_categories) || registry.allowed_categories.length === 0) {
    fail(`${registryPath}: allowed_categories must be a non-empty array`);
  }

  if (!Array.isArray(registry.reason_codes) || registry.reason_codes.length === 0) {
    fail(`${registryPath}: reason_codes must be a non-empty array`);
    return;
  }

  const allowedStatuses = new Set(registry.allowed_statuses || []);
  const allowedSeverities = new Set(registry.allowed_severities || []);
  const allowedCategories = new Set(registry.allowed_categories || []);
  const seenCodes = new Set();

  for (const [index, item] of registry.reason_codes.entries()) {
    const location = `${registryPath}: reason_codes[${index}]`;

    if (!isObject(item)) {
      fail(`${location}: must be an object`);
      continue;
    }

    for (const field of requiredCodeFields) {
      if (!(field in item)) {
        fail(`${location}: missing field ${field}`);
      } else if (typeof item[field] === "string" && item[field].trim() === "") {
        fail(`${location}: field ${field} must not be empty`);
      }
    }

    if (typeof item.code !== "string" || !/^[a-z][a-z0-9_]*$/.test(item.code)) {
      fail(`${location}: code must be lower_snake_case`);
    } else if (seenCodes.has(item.code)) {
      fail(`${location}: duplicate code ${item.code}`);
    } else {
      seenCodes.add(item.code);
    }

    if (!allowedCategories.has(item.category)) {
      fail(`${location}: invalid category ${item.category}`);
    }

    if (!allowedStatuses.has(item.default_status)) {
      fail(`${location}: invalid default_status ${item.default_status}`);
    }

    if (!allowedSeverities.has(item.severity)) {
      fail(`${location}: invalid severity ${item.severity}`);
    }

    if (item.default_status === "block" && item.severity === "low") {
      warn(`${item.code}: block status with low severity should be reviewed`, warnings);
    }

    if (item.default_status === "warn" && item.severity === "critical") {
      warn(`${item.code}: critical severity with warn status should be reviewed`, warnings);
    }
  }

  if (registry.reason_codes.length < 10) {
    warn(`${registryPath}: fewer than 10 reason codes registered`, warnings);
  }

  if (process.exitCode && process.exitCode !== 0) {
    console.error(`FAILED ${registryPath}: ${registry.reason_codes.length} reason codes checked, ${warnings.length} warnings`);
    for (const message of warnings) console.warn(`WARN ${message}`);
    return;
  }

  for (const message of warnings) console.warn(`WARN ${message}`);
  console.log(
    `OK ${registryPath}: ${registry.reason_codes.length} guardrail reason codes validated, 0 errors, ${warnings.length} warnings`,
  );
}

validate();

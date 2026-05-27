#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FIXTURE_ID = "overconfident-conclusion-report";
const FIXTURE_PATH = join(ROOT, "sources/report-qa/dry-run/fixtures/overconfident-conclusion-report.md");
const REGISTRY_PATH = join(ROOT, "sources/report-qa/dry-run/fixtures/fixture-registry.json");

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readText(path, label) {
  if (!existsSync(path)) {
    fail(`${label} missing: ${path}`);
    return "";
  }

  return readFileSync(path, "utf8");
}

function includesAny(text, patterns) {
  const normalized = text.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function countSignals(text, patterns) {
  const normalized = text.toLowerCase();
  return patterns.filter((pattern) => normalized.includes(pattern.toLowerCase())).length;
}

function requireText(text, patterns, label) {
  if (!includesAny(text, patterns)) {
    fail(`Fixture is missing overconfidence-QA signal: ${label}`);
  }
}

function requireRegistryValue(entry, key, expected) {
  if (entry?.[key] !== expected) {
    fail(`Registry entry ${FIXTURE_ID} has ${key}=${JSON.stringify(entry?.[key])}; expected ${JSON.stringify(expected)}`);
  }
}

const fixture = readText(FIXTURE_PATH, "Fixture");
const registryText = readText(REGISTRY_PATH, "Fixture registry");

let registry = null;
if (registryText) {
  try {
    registry = JSON.parse(registryText);
  } catch (error) {
    fail(`Fixture registry is not valid JSON: ${error.message}`);
  }
}

const entries = Array.isArray(registry) ? registry : registry?.fixtures;
const entry = Array.isArray(entries) ? entries.find((item) => item?.id === FIXTURE_ID) : null;

if (!entry) {
  fail(`Registry entry missing for ${FIXTURE_ID}`);
} else {
  requireRegistryValue(entry, "status", "active");
  requireRegistryValue(entry, "fixture_path", "sources/report-qa/dry-run/fixtures/overconfident-conclusion-report.md");

  const outcome = [entry.expected_outcome, entry.expected_signal, entry.expected_result]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!outcome.includes("fail_or_warn")) {
    fail(`Registry entry ${FIXTURE_ID} should include expected fail_or_warn outcome/signal.`);
  }
}

if (fixture) {
  requireText(fixture, ["Fixture id: `overconfident-conclusion-report`", "overconfident-conclusion-report"], "fixture id");
  requireText(fixture, ["fail_or_warn", "fail or warn", "warn_or_fail"], "expected fail_or_warn outcome");
  requireText(fixture, ["overconfident", "too confident", "too-strong", "too strong", "for sterk", "strong conclusion", "over-confident"], "overconfident conclusion");
  requireText(fixture, ["approved", "approval", "acceptable", "safe to use", "may be used", "suitable", "godkjent"], "approval/final decision language");
  requireText(fixture, ["without sufficient", "not enough evidence", "insufficient evidence", "manglar grunnlag", "not verified", "not documented", "insufficient documentation"], "insufficient evidence/documentation");
  requireText(fixture, ["calculation basis", "calculation", "berekningsgrunnlag", "not shown", "not provided", "no detailed check", "not documented"], "missing calculation basis");
  requireText(fixture, ["expected report qa", "expected qa", "should flag", "must flag", "should not accept", "request more", "downgrade"], "expected Report QA findings");

  const overconfidenceSignalCount = countSignals(fixture, [
    "overconfident",
    "too confident",
    "too strong",
    "strong conclusion",
    "approved",
    "approval",
    "safe to use",
    "acceptable",
    "without sufficient",
    "not enough evidence",
    "insufficient evidence",
    "not verified",
    "not documented",
    "insufficient documentation",
    "calculation basis",
    "not shown",
    "no detailed check",
    "request more input",
    "downgrade",
    "fail_or_warn"
  ]);

  if (overconfidenceSignalCount < 7) {
    fail(`Fixture only contains ${overconfidenceSignalCount} overconfidence-QA signals; expected at least 7`);
  }

  const hasReportTextSection = fixture.includes("## Report text") || fixture.toLowerCase().includes("deliberately weak report text") || fixture.toLowerCase().includes("report text");
  if (!hasReportTextSection) {
    fail("Fixture must include a report text section.");
  }

  const hasExpectedSection = fixture.includes("## Expected Report QA findings") || fixture.toLowerCase().includes("expected qa") || fixture.toLowerCase().includes("expected report qa");
  if (!hasExpectedSection) {
    fail("Fixture must include expected Report QA findings/signals.");
  }

  if (fixture.length < 1200) {
    warn(`Fixture is short (${fixture.length} chars); consider adding more report context later.`);
  }
}

if (errors.length > 0) {
  console.error(`FAIL ${FIXTURE_ID}: ${errors.length} error(s), ${warnings.length} warning(s)`);
  for (const error of errors) console.error(`- ${error}`);
  for (const warning of warnings) console.warn(`WARN: ${warning}`);
  process.exitCode = 1;
} else {
  console.log(`OK ${FIXTURE_ID}: dedicated fixture validator passed (${warnings.length} warning(s))`);
  for (const warning of warnings) console.warn(`WARN: ${warning}`);
}

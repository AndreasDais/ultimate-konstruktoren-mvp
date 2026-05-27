#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ID = "missing-input-report";
const FIXTURE_PATH = join(ROOT, "sources/report-qa/dry-run/fixtures/missing-input-report.md");
const REGISTRY_PATH = join(ROOT, "sources/report-qa/dry-run/fixtures/fixture-registry.json");

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(String(message));
}

function warn(message) {
  warnings.push(String(message));
}

function readText(path, label) {
  if (!existsSync(path)) {
    fail(label + " missing: " + path);
    return "";
  }

  return readFileSync(path, "utf8");
}

function includesAny(text, patterns) {
  const normalized = String(text || "").toLowerCase();
  return patterns.some((pattern) => normalized.includes(String(pattern).toLowerCase()));
}

function requireText(text, patterns, label) {
  if (!includesAny(text, patterns)) {
    fail("Fixture is missing signal: " + label);
  }
}

function requireRegistryValue(entry, key, expected) {
  if (!entry || entry[key] !== expected) {
    const actual = entry ? entry[key] : undefined;
    fail("Registry entry " + FIXTURE_ID + " has " + key + "=" + JSON.stringify(actual) + "; expected " + JSON.stringify(expected));
  }
}

const fixture = readText(FIXTURE_PATH, "Fixture");
const registryText = readText(REGISTRY_PATH, "Fixture registry");

let registry = null;
if (registryText) {
  try {
    registry = JSON.parse(registryText);
  } catch (error) {
    fail("Fixture registry is not valid JSON: " + error.message);
  }
}

const entries = Array.isArray(registry) ? registry : registry && Array.isArray(registry.fixtures) ? registry.fixtures : null;
const entry = Array.isArray(entries) ? entries.find((item) => item && item.id === FIXTURE_ID) : null;

if (!entry) {
  fail("Registry entry missing for " + FIXTURE_ID);
} else {
  requireRegistryValue(entry, "status", "active");
  requireRegistryValue(entry, "fixture_path", "sources/report-qa/dry-run/fixtures/missing-input-report.md");
  requireRegistryValue(entry, "expected_outcome", "fail_or_warn");
}

if (fixture) {
  requireText(fixture, ["Fixture id: `missing-input-report`", "missing-input-report"], "fixture id");
  requireText(fixture, ["Expected QA outcome: `fail_or_warn`", "fail_or_warn"], "expected fail_or_warn outcome");
  requireText(fixture, ["missing", "not confirmed", "not fully available", "manglar", "mangelfull"], "missing input");
  requireText(fixture, ["assumed", "assumption", "uncertain", "not confirmed", "føresetnad"], "uncertain assumptions");
  requireText(fixture, ["approved for use", "approved", "acceptable", "satisfy", "sufficient"], "over-confident conclusion");
  requireText(fixture, ["request more input", "more input", "lacks enough verified assumptions", "required input"], "should ask for more input");
  requireText(fixture, ["span", "load", "steel grade", "lateral restraint", "deflection", "national annex"], "engineering input checklist");

  const missingSignalCount = [
    "span",
    "load category",
    "permanent load",
    "imposed load",
    "steel grade",
    "lateral restraint",
    "deflection limit",
    "national annex"
  ].filter((signal) => fixture.toLowerCase().includes(signal)).length;

  if (missingSignalCount < 5) {
    fail("Fixture only contains " + missingSignalCount + " missing-input checklist signals; expected at least 5");
  }

  const reportFindingCount = [
    "conclusion is too confident",
    "required input values are missing",
    "assumptions are not separated",
    "final approval",
    "request more input"
  ].filter((signal) => fixture.toLowerCase().includes(signal)).length;

  if (reportFindingCount < 4) {
    fail("Fixture only contains " + reportFindingCount + " expected-QA finding signals; expected at least 4");
  }

  if (!fixture.includes("## Report text")) {
    fail("Fixture must include a '## Report text' section.");
  }

  if (!fixture.includes("## Expected Report QA findings")) {
    fail("Fixture must include a '## Expected Report QA findings' section.");
  }

  if (fixture.length < 1200) {
    warn("Fixture is short (" + fixture.length + " chars); consider adding more report context later.");
  }
}

if (errors.length > 0) {
  console.error("FAIL " + FIXTURE_ID + ": " + errors.length + " error(s), " + warnings.length + " warning(s)");
  for (const error of errors) console.error("- " + error);
  for (const warning of warnings) console.warn("WARN: " + warning);
  process.exitCode = 1;
} else {
  console.log("OK " + FIXTURE_ID + ": dedicated fixture validator passed (" + warnings.length + " warning(s))");
  for (const warning of warnings) console.warn("WARN: " + warning);
}

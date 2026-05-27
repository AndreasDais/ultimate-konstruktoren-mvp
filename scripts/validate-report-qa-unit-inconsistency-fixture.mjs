#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ID = "unit-inconsistency-report";
const FIXTURE_PATH = join(ROOT, "sources/report-qa/dry-run/fixtures/unit-inconsistency-report.md");
const REGISTRY_PATH = join(ROOT, "sources/report-qa/dry-run/fixtures/fixture-registry.json");

const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }

function readText(filePath, label) {
  if (!existsSync(filePath)) {
    fail(label + " missing: " + filePath);
    return "";
  }
  return readFileSync(filePath, "utf8");
}

function normalize(value) {
  return String(value || "")
    .replace(/⁴/g, "4")
    .replace(/³/g, "3")
    .replace(/²/g, "2")
    .replace(/·/g, "*")
    .toLowerCase();
}

function hasAny(text, patterns) {
  const normalized = normalize(text);
  return patterns.some((pattern) => normalized.includes(normalize(pattern)));
}

function requireAny(text, patterns, label) {
  if (!hasAny(text, patterns)) {
    fail("Fixture is missing unit-QA signal: " + label);
  }
}

function requireRegistryValue(entry, key, expected) {
  if (!entry || entry[key] !== expected) {
    fail("Registry entry " + FIXTURE_ID + " has " + key + "=" + JSON.stringify(entry ? entry[key] : undefined) + "; expected " + JSON.stringify(expected));
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

const entries = Array.isArray(registry) ? registry : registry && registry.fixtures;
const entry = Array.isArray(entries) ? entries.find((item) => item && item.id === FIXTURE_ID) : null;

if (!entry) {
  fail("Registry entry missing for " + FIXTURE_ID);
} else {
  requireRegistryValue(entry, "status", "active");
  requireRegistryValue(entry, "fixture_path", "sources/report-qa/dry-run/fixtures/unit-inconsistency-report.md");
  const outcome = entry.expected_outcome || entry.expected_signal || entry.expected_result || "";
  if (!String(outcome).includes("fail_or_warn")) {
    fail("Registry entry " + FIXTURE_ID + " expected outcome must include fail_or_warn; got " + JSON.stringify(outcome));
  }
}

if (fixture) {
  requireAny(fixture, ["unit-inconsistency-report", "Fixture id: unit-inconsistency-report", "Fixture id: `unit-inconsistency-report`"], "fixture id");
  requireAny(fixture, ["fail_or_warn", "fail or warn"], "expected fail_or_warn outcome");
  requireAny(fixture, ["kN/N", "kN and N", "kN og N", "kN vs N", "kN, N"], "kN/N mismatch");
  requireAny(fixture, ["m/mm", "m and mm", "m og mm", "m vs mm", "metres and millimetres"], "m/mm mismatch");
  requireAny(fixture, ["kNm/Nmm", "kNm and Nmm", "kNm og Nmm", "kNm vs Nmm", "knm/nmm"], "kNm/Nmm mismatch");
  requireAny(fixture, ["cm4/mm4", "cm^4/mm^4", "cm⁴/mm⁴", "cm4 and mm4", "cm^4 and mm^4"], "cm4/mm4 mismatch");
  requireAny(fixture, ["unit mismatch", "unit inconsistency", "unit conversion", "blanda einingar", "blandet enheter", "einingsfeil", "enhetsfeil"], "unit inconsistency language");
  requireAny(fixture, ["approved", "acceptable", "safe", "sufficient", "godkjent", "tilstrekkelig", "trygg"], "over-confident conclusion");
  requireAny(fixture, ["report qa", "expected qa", "expected findings", "should flag", "skal flagge"], "expected QA findings");

  const pairSignals = [
    hasAny(fixture, ["kN/N", "kN and N", "kN og N", "kN vs N"]),
    hasAny(fixture, ["m/mm", "m and mm", "m og mm", "m vs mm"]),
    hasAny(fixture, ["kNm/Nmm", "kNm and Nmm", "kNm og Nmm", "kNm vs Nmm"]),
    hasAny(fixture, ["cm4/mm4", "cm^4/mm^4", "cm⁴/mm⁴", "cm4 and mm4"])
  ].filter(Boolean).length;

  if (pairSignals < 4) {
    fail("Fixture only contains " + pairSignals + " explicit unit-pair mismatch signals; expected 4");
  }

  if (!hasAny(fixture, ["## Report text", "## Deliberately weak report text", "### Report text"])) {
    warn("Fixture should include a report-text section heading.");
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

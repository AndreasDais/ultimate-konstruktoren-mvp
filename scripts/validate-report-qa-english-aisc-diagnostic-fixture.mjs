#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");

const FIXTURE_ID = "english-aisc-diagnostic-report";
const EXPECTED_FIXTURE_PATH = "sources/report-qa/dry-run/fixtures/english-aisc-diagnostic-report.md";

const registryPath = path.join(ROOT, "sources/report-qa/dry-run/fixtures/fixture-registry.json");
const fixturePath = path.join(ROOT, EXPECTED_FIXTURE_PATH);
const registryDocPath = path.join(ROOT, "sources/report-qa/dry-run/fixtures/FIXTURE_REGISTRY.md");

const errors = [];
const warnings = [];

function readText(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    errors.push("Missing or unreadable " + label + ": " + path.relative(ROOT, filePath) + " (" + error.message + ")");
    return "";
  }
}

function readJson(filePath, label) {
  const text = readText(filePath, label);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push("Invalid JSON in " + label + ": " + path.relative(ROOT, filePath) + " (" + error.message + ")");
    return null;
  }
}

function textFrom(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textFrom).join(" ");
  if (typeof value === "object") return Object.values(value).map(textFrom).join(" ");
  return "";
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

const registry = readJson(registryPath, "fixture registry");
const fixture = readText(fixturePath, "English/AISC diagnostic fixture");
const registryDoc = readText(registryDocPath, "fixture registry markdown");

let entry = null;
if (registry) {
  const fixtures = Array.isArray(registry) ? registry : registry.fixtures;
  if (!Array.isArray(fixtures)) {
    errors.push("Fixture registry must contain a fixtures array or be an array.");
  } else {
    entry = fixtures.find((candidate) => candidate && candidate.id === FIXTURE_ID);
    if (!entry) errors.push("Fixture registry is missing " + FIXTURE_ID + " entry.");
  }
}

if (entry) {
  if (entry.status !== "active") {
    errors.push(FIXTURE_ID + " registry status must be active; got " + JSON.stringify(entry.status) + ".");
  }

  if (entry.fixture_path !== EXPECTED_FIXTURE_PATH) {
    errors.push(FIXTURE_ID + " fixture_path must be " + EXPECTED_FIXTURE_PATH + "; got " + JSON.stringify(entry.fixture_path) + ".");
  }

  if (entry.language !== "en") {
    errors.push(FIXTURE_ID + " registry language must be en; got " + JSON.stringify(entry.language) + ".");
  }

  if (entry.standard_context !== "aisc_diagnostic") {
    errors.push(FIXTURE_ID + " registry standard_context must be aisc_diagnostic; got " + JSON.stringify(entry.standard_context) + ".");
  }

  const entryText = textFrom(entry).toLowerCase();
  if (!entryText.includes("pass_or_warn")) {
    errors.push(FIXTURE_ID + " registry entry must include expected QA outcome/signal pass_or_warn.");
  }

  const requiredChecks = [
    "standard_context_consistent",
    "language_shell_consistent",
    "no_hallucinated_standard_values",
  ];
  for (const requiredCheck of requiredChecks) {
    if (!entryText.includes(requiredCheck)) {
      errors.push(FIXTURE_ID + " registry entry is missing targeted check: " + requiredCheck + ".");
    }
  }
}

if (registryDoc && !new RegExp(FIXTURE_ID, "i").test(registryDoc)) {
  errors.push("FIXTURE_REGISTRY.md does not mention " + FIXTURE_ID + ".");
}

if (fixture) {
  if (!fixture.includes("Fixture ID: `" + FIXTURE_ID + "`")) {
    errors.push("Fixture body must include fixture id: " + FIXTURE_ID + ".");
  }

  if (!/expected\s+(qa\s+)?outcome\s*[:=]\s*`?pass_or_warn`?/i.test(fixture)) {
    errors.push("Fixture body must state expected QA outcome = pass_or_warn.");
  }

  const languageSignals = [
    /language\s+target\s*:\s*`?en`?/i,
    /english/i,
    /shell\s+and\s+role\s+language\s+should\s+remain\s+English/i,
    /written\s+in\s+English/i,
  ];
  if (countMatches(fixture, languageSignals) < 3) {
    errors.push("Fixture does not contain enough English language/shell signals.");
  }

  const standardSignals = [
    /AISC/i,
    /ASCE/i,
    /LRFD/i,
    /United\s+States/i,
    /ASTM\s+A992/i,
    /W12x26/i,
  ];
  if (countMatches(fixture, standardSignals) < 5) {
    errors.push("Fixture does not contain enough AISC/ASCE diagnostic standard-context signals.");
  }

  const usUnitSignals = [
    /\bft\b/i,
    /\bkip\/ft\b/i,
    /\bkip-ft\b/i,
    /\bksi\b/i,
    /\b20\s*ft\b/i,
    /\b1\.82\s*kip\/ft\b/i,
  ];
  if (countMatches(fixture, usUnitSignals) < 4) {
    errors.push("Fixture does not contain enough US customary unit signals.");
  }

  const requiredCalculationSignals = [
    /w_u\s*=\s*1\.2D\s*\+\s*1\.6L/i,
    /M_u\s*=\s*w_u\s*L\^2\s*\/\s*8/i,
    /V_u\s*=\s*w_u\s*L\s*\/\s*2/i,
    /91\.0\s*kip-ft/i,
    /18\.2\s*kip/i,
  ];
  for (const signal of requiredCalculationSignals) {
    if (!signal.test(fixture)) {
      errors.push("Fixture is missing expected diagnostic calculation signal: " + signal + ".");
    }
  }

  const noInventSignals = [
    /must\s+not\s+invent/i,
    /verified\s+AISC\s+section\s+properties/i,
    /does\s+not\s+claim\s+final\s+AISC\s+code\s+compliance/i,
    /cannot\s+complete\s+a\s+final\s+AISC\s+LTB\s+resistance\s+check/i,
    /must\s+not\s+be\s+marked\s+as\s+finally\s+approved/i,
    /licensed\s+structural\s+engineer/i,
  ];
  if (countMatches(fixture, noInventSignals) < 5) {
    errors.push("Fixture does not contain enough AISC guardrail / preliminary-warning signals.");
  }

  const propertyTokens = ["Zx", "Sx", "J", "Cw", "rts", "Lp", "Lr", "Mp", "Mn", "phi_b Mn"];
  for (const token of propertyTokens) {
    if (!fixture.includes("`" + token + "`") && !fixture.includes(token)) {
      errors.push("Fixture must explicitly mention prohibited/incomplete AISC property token: " + token + ".");
    }
  }

  const reportExcerpt = fixture.match(/## Report excerpt[\s\S]*?(?:## Expected QA observations|$)/i)?.[0] ?? fixture;
  const norwegianLeakSignals = [
    /Konstrukt/i,
    /Samanliknar/i,
    /FOREL/i,
    /FØREBELS/i,
    /HØG/i,
    /HØY/i,
    /\bGOD\b/i,
  ];
  if (hasAny(reportExcerpt, norwegianLeakSignals)) {
    errors.push("Report excerpt contains Norwegian shell/status leakage in the English/AISC fixture.");
  }

  const mustNotSection = fixture.match(/## Must-not signals[\s\S]*?(?:## Report QA fixture notes|$)/i)?.[0] ?? "";
  const expectedForbiddenMetadata = [
    /Eurocode\s+partial\s+factors/i,
    /Eurocode\s+notation/i,
    /Norwegian\s+shell\s+labels/i,
    /invented\s+AISC\s+table\s+values/i,
    /construction-ready\s+approval\s+language/i,
  ];
  if (countMatches(mustNotSection, expectedForbiddenMetadata) < 4) {
    warnings.push("Must-not section may be too weak for AISC/English regression coverage.");
  }
}

if (errors.length > 0) {
  console.error("FAIL " + FIXTURE_ID + ": " + errors.length + " error(s), " + warnings.length + " warning(s)");
  for (const error of errors) console.error("- " + error);
  for (const warning of warnings) console.error("- WARN " + warning);
  process.exit(1);
}

console.log("OK " + FIXTURE_ID + ": dedicated fixture validator passed (" + warnings.length + " warning(s))");
for (const warning of warnings) console.log("WARN " + warning);

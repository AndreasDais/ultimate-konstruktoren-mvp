#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");

const registryPath = path.join(ROOT, "sources/report-qa/dry-run/fixtures/fixture-registry.json");
const fixturePath = path.join(ROOT, "sources/report-qa/dry-run/fixtures/nynorsk-report.md");
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

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function flatten(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  if (typeof value === "object") return Object.values(value).map(flatten).join(" ");
  return "";
}

const registry = readJson(registryPath, "fixture registry");
const fixture = readText(fixturePath, "nynorsk fixture");
const registryDoc = readText(registryDocPath, "fixture registry markdown");

let entry = null;
if (registry) {
  const fixtures = Array.isArray(registry) ? registry : registry.fixtures;
  if (!Array.isArray(fixtures)) {
    errors.push("Fixture registry must contain a fixtures array or be an array.");
  } else {
    entry = fixtures.find((candidate) => candidate && candidate.id === "nynorsk-report");
    if (!entry) {
      errors.push("Fixture registry is missing nynorsk-report entry.");
    }
  }
}

if (entry) {
  if (entry.status !== "active") {
    errors.push("nynorsk-report registry status must be active; got " + JSON.stringify(entry.status) + ".");
  }

  if (entry.fixture_path !== "sources/report-qa/dry-run/fixtures/nynorsk-report.md") {
    errors.push("nynorsk-report fixture_path must be sources/report-qa/dry-run/fixtures/nynorsk-report.md; got " + JSON.stringify(entry.fixture_path) + ".");
  }

  const entryText = flatten(entry).toLowerCase();
  if (!/\bpass\b/.test(entryText)) {
    errors.push("nynorsk-report registry entry must declare expected outcome/signal pass.");
  }

  if (!/(nynorsk|nn|locale|språk|language)/i.test(entryText)) {
    warnings.push("nynorsk-report registry entry does not clearly mention language/locale coverage.");
  }
}

if (registryDoc && !/nynorsk-report/i.test(registryDoc)) {
  errors.push("FIXTURE_REGISTRY.md does not mention nynorsk-report.");
}

if (fixture) {
  const lower = fixture.toLowerCase();
  const nynorskSignals = [
    /\bikkje\b/i,
    /\bfrå\b/i,
    /\bføresetnad(?:er|ane)?\b/i,
    /\bvurdering\b/i,
    /\bsaman(?:likn|drag|heng)/i,
    /\beigenlast\b/i,
    /\bnyttelast\b/i,
    /\bnedbøying\b/i,
    /\btilråd/i,
    /\bskal\s+vere\b/i,
    /\bkontrollen\b/i,
    /\bbruksgrense(?:tilstand)?\b/i,
    /\bbrot(?:t)?grense(?:tilstand)?\b/i,
  ];
  const nynorskCount = countMatches(fixture, nynorskSignals);
  if (nynorskCount < 5) {
    errors.push("Fixture does not contain enough nynorsk language signals; found " + nynorskCount + ", expected at least 5.");
  }

  const structuralSignals = [
    /\bbjelke\b/i,
    /\blast(?:er|a|ene)?\b/i,
    /\bmoment\b/i,
    /\bskj[æe]r\b/i,
    /\bnedbøying\b/i,
    /\bkapasitet\b/i,
    /\bopplag\b/i,
    /\bprofil\b/i,
    /\bstålkvalitet\b/i,
    /\bdimensjonerande\b/i,
  ];
  const structuralCount = countMatches(fixture, structuralSignals);
  if (structuralCount < 4) {
    errors.push("Fixture does not contain enough Norwegian structural-engineering terms; found " + structuralCount + ", expected at least 4.");
  }

  if (!hasAny(fixture, [/NS-EN/i, /Eurokode/i, /EN\s*199/i, /199[0-9]-[0-9]/i])) {
    errors.push("Fixture is missing Eurokode/NS-EN-like reference signal.");
  }

  const reportStructureSignals = [
    /^#{1,3}\s+.*(?:grunnlag|føresetnad|last|berekning|kontroll|vurdering|konklusjon)/im,
    /\bgrunnlag\b/i,
    /\bføresetnad(?:er|ane)?\b/i,
    /\bberekning(?:ar|ane)?\b/i,
    /\bkontroll\b/i,
    /\bkonklusjon\b/i,
  ];
  const reportStructureCount = countMatches(fixture, reportStructureSignals);
  if (reportStructureCount < 4) {
    errors.push("Fixture does not contain enough technical report-structure signals; found " + reportStructureCount + ", expected at least 4.");
  }

  const expectedOutcomeSignals = [/expected\s+(qa\s+)?outcome\s*[:=]\s*pass/i, /expected[^\n]{0,80}\bpass\b/i, /forventa[^\n]{0,80}\bpass\b/i];
  if (!hasAny(fixture, expectedOutcomeSignals)) {
    errors.push("Fixture body must state expected QA outcome = pass.");
  }

  const driftMatches = (lower.match(/\b(ikke|forutsetning|vurderingen|beregning|beam|steel beam|design check|member capacity)\b/g) || []).length;
  if (driftMatches >= 4) {
    warnings.push("Fixture contains several bokmål/English drift signals (" + driftMatches + "); verify this still tests nynorsk coverage.");
  }
}

if (errors.length > 0) {
  console.error("FAIL nynorsk-report: " + errors.length + " error(s), " + warnings.length + " warning(s)");
  for (const error of errors) console.error("- " + error);
  for (const warning of warnings) console.error("- WARN " + warning);
  process.exit(1);
}

console.log("OK nynorsk-report: dedicated fixture validator passed (" + warnings.length + " warning(s))");
for (const warning of warnings) console.log("WARN " + warning);

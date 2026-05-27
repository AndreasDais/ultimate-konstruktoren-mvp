import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "sources/report-qa/dry-run/fixtures/fixture-registry.json");
const FIXTURE_PATH = path.join(ROOT, "sources/report-qa/dry-run/fixtures/missing-disclaimer-report.md");
const FIXTURE_ID = "missing-disclaimer-report";
const EXPECTED_FIXTURE_PATH = "sources/report-qa/dry-run/fixtures/missing-disclaimer-report.md";

const errors = [];
const warnings = [];

function readText(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    errors.push(`Missing or unreadable ${label}: ${path.relative(ROOT, filePath)} (${error.message})`);
    return "";
  }
}

function tryParseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`Invalid JSON in ${label}: ${error.message}`);
    return null;
  }
}

function collectObjects(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    out.push(value);
    for (const child of Object.values(value)) collectObjects(child, out);
  }
  return out;
}

function textFrom(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textFrom).join(" ");
  if (typeof value === "object") return Object.values(value).map(textFrom).join(" ");
  return "";
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

const registryText = readText(REGISTRY_PATH, "fixture registry");
const fixtureText = readText(FIXTURE_PATH, "missing-disclaimer fixture");
const registry = registryText ? tryParseJson(registryText, "fixture registry") : null;
const fixtureLower = fixtureText.toLowerCase();

if (registry) {
  const registryObjects = collectObjects(registry);
  const entry = registryObjects.find((item) => item.id === FIXTURE_ID);

  if (!entry) {
    errors.push(`Registry is missing fixture id: ${FIXTURE_ID}`);
  } else {
    if (entry.status !== "active") {
      errors.push(`Registry status for ${FIXTURE_ID} must be active, got ${JSON.stringify(entry.status)}`);
    }

    const entryText = textFrom(entry).toLowerCase();

    if (!entryText.includes(EXPECTED_FIXTURE_PATH)) {
      errors.push(`Registry entry for ${FIXTURE_ID} is missing fixture path: ${EXPECTED_FIXTURE_PATH}`);
    }

    if (!entryText.includes("fail_or_warn")) {
      errors.push(`Registry entry for ${FIXTURE_ID} must include expected QA outcome/signal fail_or_warn`);
    }
  }
}

if (fixtureText) {
  if (!fixtureLower.includes(FIXTURE_ID)) {
    warnings.push(`Fixture text does not explicitly include fixture id: ${FIXTURE_ID}`);
  }

  const expectedOutcomeSignal = /fail_or_warn|fail or warn|fail\/warn|warn_or_fail/i;
  if (!expectedOutcomeSignal.test(fixtureText)) {
    errors.push("Fixture is missing expected QA outcome signal: fail_or_warn");
  }

  const missingDisclaimerSignal = [
    /missing[-\s]?disclaimer/i,
    /manglar\s+(tydeleg\s+)?disclaimer/i,
    /mangler\s+(tydelig\s+)?disclaimer/i,
    /disclaimer\s+(is\s+)?missing/i,
    /ansvarsavgrensing\s+manglar/i,
    /ansvarsbegrensning\s+mangler/i,
  ];

  const aiLimitationSignal = [
    /ai[-\s]?generated/i,
    /ai[-\s]?generert/i,
    /generated\s+by\s+ai/i,
    /maskinelt\s+generert/i,
    /spr[åa]kmodell/i,
  ];

  const notFinalDesignSignal = [
    /not\s+final\s+engineering\s+design/i,
    /not\s+final\s+design/i,
    /ikkje\s+endeleg\s+prosjektering/i,
    /ikke\s+endelig\s+prosjektering/i,
    /ikkje\s+ferdig\s+prosjektering/i,
    /ikke\s+ferdig\s+prosjektering/i,
    /not\s+a\s+substitute\s+for/i,
    /ikkje\s+erstatning\s+for/i,
    /ikke\s+erstatning\s+for/i,
  ];

  const engineerReviewSignal = [
    /qualified\s+engineer\s+review/i,
    /licensed\s+engineer\s+review/i,
    /professional\s+engineer\s+review/i,
    /responsible\s+engineer/i,
    /kvalifisert\s+ingeni[øo]r/i,
    /ansvarleg\s+ingeni[øo]r/i,
    /ansvarlig\s+ingeni[øo]r/i,
    /fagkyndig\s+kontroll/i,
    /uavhengig\s+kontroll/i,
  ];

  const liabilitySignal = [
    /liability\s+limitation/i,
    /responsibility\s+limitation/i,
    /ansvarsavgrensing/i,
    /ansvarsbegrensning/i,
    /ansvar\s+og\s+avgrensing/i,
    /ansvar\s+og\s+begrensning/i,
  ];

  const expectedFindingsSignal = [
    /expected\s+(qa\s+)?findings/i,
    /forventa\s+(qa\s+)?funn/i,
    /forventede\s+(qa\s+)?funn/i,
    /qa\s+should\s+(fail|warn|flag|catch)/i,
    /skal\s+(feile|varsle|fange|flaggast|flagges)/i,
  ];

  const requiredSignals = [
    ["missing disclaimer", missingDisclaimerSignal],
    ["AI-generated report limitation", aiLimitationSignal],
    ["not final engineering design", notFinalDesignSignal],
    ["requires qualified engineer review", engineerReviewSignal],
    ["responsibility / liability limitation", liabilitySignal],
    ["expected QA findings", expectedFindingsSignal],
  ];

  for (const [label, patterns] of requiredSignals) {
    if (!hasAny(fixtureText, patterns)) {
      errors.push(`Fixture is missing disclaimer-QA signal: ${label}`);
    }
  }

  const prohibitedStrongDisclaimerPatterns = [
    /\bdisclaimer\b[\s\S]{0,160}\bnot\s+final\s+engineering\s+design\b/i,
    /\bdisclaimer\b[\s\S]{0,160}\bqualified\s+engineer\s+review\b/i,
    /\bdisclaimer\b[\s\S]{0,160}\bliability\s+limitation\b/i,
    /\bansvarsavgrensing\b[\s\S]{0,160}\bansvarleg\s+ingeni[øo]r\b/i,
    /\bansvarsbegrensning\b[\s\S]{0,160}\bansvarlig\s+ingeni[øo]r\b/i,
  ];

  const expectedSectionStart = fixtureText.search(/expected\s+(qa\s+)?findings|forventa\s+(qa\s+)?funn|forventede\s+(qa\s+)?funn|qa\s+expect/i);
  const reportBody = expectedSectionStart >= 0 ? fixtureText.slice(0, expectedSectionStart) : fixtureText;

  if (hasAny(reportBody, prohibitedStrongDisclaimerPatterns)) {
    warnings.push("Fixture report body appears to contain a strong disclaimer; verify this is still a missing-disclaimer negative fixture.");
  }
}

if (errors.length > 0) {
  console.error(`FAIL ${FIXTURE_ID}: ${errors.length} error(s), ${warnings.length} warning(s)`);
  for (const error of errors) console.error(`- ${error}`);
  for (const warning of warnings) console.error(`- WARN ${warning}`);
  process.exit(1);
}

console.log(`OK ${FIXTURE_ID}: dedicated fixture validator passed (${warnings.length} warning(s))`);
for (const warning of warnings) console.log(`WARN ${warning}`);


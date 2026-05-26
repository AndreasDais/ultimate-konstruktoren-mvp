#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fixturePath = "sources/report-qa/dry-run/fixtures/realistic-steel-beam-report.md";
const path = join(root, fixturePath);

let source = "";
const errors = [];
const warnings = [];

try {
  source = readFileSync(path, "utf8");
} catch (error) {
  console.error(`FAILED missing fixture: ${fixturePath}`);
  console.error(error.message);
  process.exit(1);
}

function requireText(text, label = text) {
  if (!source.includes(text)) errors.push(`missing required text: ${label}`);
}

function forbidText(pattern, label) {
  if (pattern.test(source)) errors.push(`forbidden text present: ${label}`);
}

const requiredHeadings = [
  "# PILAR Realistic Report QA Fixture",
  "## User request",
  "## Given data",
  "## Assumptions",
  "## Calculation",
  "## Results",
  "## Warnings",
  "## Controller decision",
  "## Traceability",
  "## Disclaimer"
];

for (const heading of requiredHeadings) requireText(heading);

const requiredValues = [
  ["L = 6.0 m", "span value"],
  ["qEd = 12 kN/m", "design load"],
  ["Mmax = 54 kNm", "bending moment result"],
  ["Vmax = 36 kN", "shear force result"],
  ["qEd * L^2 / 8", "bending formula"],
  ["qEd * L / 2", "shear formula"],
  ["lateral-torsional buckling", "stability warning"],
  ["not a final design", "disclaimer strength"]
];

for (const [text, label] of requiredValues) requireText(text, label);

forbidText(/final\s+code\s+compliance\s+is\s+verified/i, "final code compliance claim");
forbidText(/approved\s+for\s+construction/i, "construction approval claim");
forbidText(/AISC|ASCE|kip|ft/i, "US context leakage in Eurocode-style fixture");

const wordCount = source.trim().split(/\s+/).filter(Boolean).length;
if (wordCount < 350) warnings.push(`fixture is short: ${wordCount} words`);

const tableCount = (source.match(/^\|/gm) || []).length;
if (tableCount < 8) warnings.push("fixture has few Markdown table rows");

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  for (const warning of warnings) console.warn(`WARN ${warning}`);
  console.error(`FAILED ${fixturePath}: ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(1);
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
console.log(`OK ${fixturePath}: realistic Report QA fixture validated, 0 errors, ${warnings.length} warnings`);

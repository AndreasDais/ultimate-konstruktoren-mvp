#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const memoDir = path.join(root, "sources", "agent-research", "memos");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function listMemoFiles() {
  if (!fileExists(memoDir)) return [];
  return fs
    .readdirSync(memoDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".md"))
    .filter((name) => name !== "README.md")
    .filter((name) => !name.startsWith("."))
    .sort()
    .map((name) => path.join(memoDir, name));
}

const requiredChecks = [
  {
    key: "title",
    label: "Has a Markdown title",
    test: (text) => /^#\s+\S+/m.test(text),
    severity: "error",
  },
  {
    key: "external_signal",
    label: "Describes external signal / market pattern",
    test: (text) => /external signal|external_signal|market|yc|startup|pattern/i.test(text),
    severity: "warning",
  },
  {
    key: "sources",
    label: "Includes source section or URLs",
    test: (text) => /\bSources?\b|\bKjelder?\b|https?:\/\//i.test(text),
    severity: "warning",
  },
  {
    key: "pilar_mapping",
    label: "Maps the finding to a concrete PILAR problem",
    test: (text) => /PILAR problem|PILAR-problem|problem mapping|maps? to PILAR|relevans for PILAR/i.test(text),
    severity: "warning",
  },
  {
    key: "proposed_agent",
    label: "Names a proposed agent or explicit no-build decision",
    test: (text) => /proposed agent|recommended agent|foreslått agent|recommended_agent|NO_BUILD|no-build/i.test(text),
    severity: "warning",
  },
  {
    key: "priority",
    label: "Contains priority P0/P1/P2/NO_BUILD",
    test: (text) => /\b(P0|P1|P2|NO_BUILD)\b/.test(text),
    severity: "warning",
  },
  {
    key: "mvp_scope",
    label: "Defines MVP scope",
    test: (text) => /MVP scope|mvp_scope|MVP-scope|første MVP|scope/i.test(text),
    severity: "warning",
  },
  {
    key: "data_to_log",
    label: "States data to log",
    test: (text) => /data to log|data_to_log|logg|logging|data som må/i.test(text),
    severity: "warning",
  },
  {
    key: "eval_criteria",
    label: "States evaluation criteria",
    test: (text) => /eval criteria|eval_criteria|evaluation criteria|eval-kriter/i.test(text),
    severity: "warning",
  },
  {
    key: "risks",
    label: "Contains risk section",
    test: (text) => /\brisk\b|\brisiko\b|risks/i.test(text),
    severity: "warning",
  },
  {
    key: "sprint_suggestion",
    label: "Contains sprint suggestion or next step",
    test: (text) => /Sprint\s+\d+|sprint suggestion|next step|neste steg|recommended sprint/i.test(text),
    severity: "warning",
  },
  {
    key: "human_review",
    label: "Mentions human review or read-only/suggest-only limitation",
    test: (text) => /human review|human-in-the-loop|read-only|suggest-only|menneskeleg|menneskelig|review/i.test(text),
    severity: "warning",
  },
];

function validateMemo(filePath) {
  const text = readText(filePath);
  const rel = path.relative(root, filePath).replaceAll(path.sep, "/");
  const issues = [];

  if (text.trim().length < 500) {
    issues.push({ severity: "warning", message: "Memo is short; confirm it is not a placeholder." });
  }

  for (const check of requiredChecks) {
    if (!check.test(text)) {
      issues.push({ severity: check.severity, message: `Missing: ${check.label}` });
    }
  }

  const passedChecks = requiredChecks.length - issues.filter((issue) => issue.message.startsWith("Missing:")).length;
  const score = Math.round((passedChecks / requiredChecks.length) * 100);

  return { rel, score, issues };
}

const files = listMemoFiles();
const results = files.map(validateMemo);
const errorCount = results.reduce((sum, result) => sum + result.issues.filter((issue) => issue.severity === "error").length, 0);
const warningCount = results.reduce((sum, result) => sum + result.issues.filter((issue) => issue.severity === "warning").length, 0);

if (!fileExists(memoDir)) {
  console.error("FAILED sources/agent-research/memos: directory not found");
  process.exit(1);
}

if (files.length === 0) {
  console.error("FAILED sources/agent-research/memos: no research memo markdown files found");
  process.exit(1);
}

for (const result of results) {
  const status = result.issues.some((issue) => issue.severity === "error") ? "FAILED" : "OK";
  console.log(`${status} ${result.rel}: quality score ${result.score}/100`);
  for (const issue of result.issues) {
    const prefix = issue.severity === "error" ? "  ERROR" : "  WARN";
    console.log(`${prefix}: ${issue.message}`);
  }
}

const summary = `${errorCount === 0 ? "OK" : "FAILED"} research memo quality: ${files.length} memos checked, ${errorCount} errors, ${warningCount} warnings`;
console.log(summary);

if (errorCount > 0) process.exit(1);

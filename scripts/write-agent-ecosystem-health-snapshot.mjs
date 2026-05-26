#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const CHECK_ONLY = process.argv.includes("--check");
const ROOT = process.cwd();
const OUT_PATH = join(ROOT, "sources/agent-research/status/latest-agent-ecosystem-health.md");

const requiredFiles = [
  "sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md",
  "sources/agent-research/AGENT_ECOSYSTEM_INDEX.md",
  "sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md",
  "sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md",
  "sources/agent-research/AGENT_ECOSYSTEM_HANDOFF.md",
  "sources/agent-research/AGENT_ECOSYSTEM_FINAL_CHECKPOINT.md",
  "sources/agent-research/RESEARCH_AGENT_FINAL_CHECKPOINT.md",
  "sources/agent-research/EVAL_AGENT_FINAL_CHECKPOINT.md",
  "sources/guardrails/GUARDRAIL_FINAL_CHECKPOINT.md",
  "sources/agent-research/topics/topic-registry.json",
  "sources/agent-research/topics/ai-agent-testing.md",
  "sources/agent-research/topics/agent-observability.md",
  "sources/agent-research/topics/guardrail-runtime-actions.md",
  "sources/agent-research/topics/report-qa-agent.md",
  "sources/agent-research/memos/agent-opportunity-ai-agent-testing.md",
  "sources/agent-research/memos/agent-opportunity-agent-observability.md",
  "sources/agent-research/memos/agent-opportunity-guardrail-runtime-actions.md",
  "sources/agent-research/memos/agent-opportunity-report-qa-agent.md",
  "qa/evals/pilar-core-evals.jsonl",
  "qa/evals/taxonomy/eval-case-taxonomy.json",
  "qa/evals/reports/latest-eval-readiness.md",
  "qa/evals/reports/latest-eval-coverage.md",
  "sources/guardrails/guardrail-reason-codes.json",
  "sources/observability/observability-event-taxonomy.json",
  "sources/report-qa/report-qa-checks.json",
  "sources/report-qa/REPORT_QA_CHECK_REGISTRY.md",
  "scripts/validate-report-qa-checks.mjs",
  "scripts/validate-eval-cases.mjs",
  "scripts/run-eval-suite.mjs",
  "scripts/summarize-eval-coverage.mjs",
  "scripts/create-agent-opportunity-memo.mjs",
  "scripts/validate-agent-research-topics.mjs",
  "scripts/validate-agent-research-memos.mjs",
  "scripts/validate-guardrail-reason-codes.mjs",
  "scripts/validate-observability-event-taxonomy.mjs",
  "scripts/pilar-agent-ecosystem-hub.mjs",
  "scripts/write-agent-ecosystem-health-snapshot.mjs"
];

const requiredScripts = [
  "agent:status",
  "agent:validate",
  "agent:readiness",
  "agent:research",
  "agent:all",
  "agent:health",
  "research:topics",
  "research:memo",
  "research:ai-agent-testing",
  "research:memos",
  "research:check",
  "research:coverage",
  "eval:readiness",
  "eval:coverage",
  "eval:coverage:check",
  "guardrails:codes",
  "guardrails:check",
  "observability:events",
  "observability:check",
  "report-qa:checks",
  "report-qa:check"
];

const checks = [
  {
    id: "eval-cases",
    title: "Eval case validator",
    command: ["node", ["scripts/validate-eval-cases.mjs"]]
  },
  {
    id: "eval-coverage",
    title: "Eval coverage check",
    command: ["node", ["scripts/summarize-eval-coverage.mjs", "--check"]]
  },
  {
    id: "research-topics",
    title: "Research topic registry + coverage",
    command: ["node", ["scripts/validate-agent-research-topics.mjs"]]
  },
  {
    id: "research-memos",
    title: "Research memo quality",
    command: ["node", ["scripts/validate-agent-research-memos.mjs"]]
  },
  {
    id: "guardrail-codes",
    title: "Guardrail reason-code registry",
    command: ["node", ["scripts/validate-guardrail-reason-codes.mjs"]]
  },
  {
    id: "observability-events",
    title: "Observability event taxonomy",
    command: ["node", ["scripts/validate-observability-event-taxonomy.mjs"]]
  },
  {
    id: "report-qa-checks",
    title: "Report QA check registry",
    command: ["node", ["scripts/validate-report-qa-checks.mjs"]]
  }
];

function rel(path) {
  return join(ROOT, path);
}

function readJson(path) {
  return JSON.parse(readFileSync(rel(path), "utf8"));
}

function runCheck(check) {
  const [command, args] = check.command;
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false
  });
  const stdout = String(result.stdout || "").trim();
  const stderr = String(result.stderr || "").trim();
  return {
    ...check,
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout,
    stderr
  };
}

function firstLine(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.split(/\r?\n/)[0].trim();
}

function resultIcon(ok) {
  return ok ? "PASS" : "FAIL";
}

const missingFiles = requiredFiles.filter((file) => !existsSync(rel(file)));

let packageScripts = {};
let packageJsonOk = true;
try {
  packageScripts = readJson("package.json").scripts || {};
} catch (error) {
  packageJsonOk = false;
}

const missingScripts = packageJsonOk
  ? requiredScripts.filter((name) => typeof packageScripts[name] !== "string")
  : requiredScripts;

const checkResults = checks.map(runCheck);
const failedChecks = checkResults.filter((check) => !check.ok);
const status = missingFiles.length === 0 && missingScripts.length === 0 && failedChecks.length === 0
  ? "PASS"
  : "FAIL";

const now = new Date().toISOString();
const lines = [];
lines.push("# PILAR Agent Ecosystem Health Snapshot");
lines.push("");
lines.push(`**Generated:** ${now}`);
lines.push(`**Mode:** ${CHECK_ONLY ? "check-only" : "write"}`);
lines.push(`**Status:** ${status}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Required files: ${requiredFiles.length - missingFiles.length}/${requiredFiles.length}`);
lines.push(`- Required npm scripts: ${requiredScripts.length - missingScripts.length}/${requiredScripts.length}`);
lines.push(`- Local checks: ${checkResults.length - failedChecks.length}/${checkResults.length}`);
lines.push("");
lines.push("## Local checks");
lines.push("");
lines.push("| Check | Status | First output line |");
lines.push("|---|---:|---|");
for (const check of checkResults) {
  const output = firstLine(check.stdout || check.stderr).replace(/\|/g, "\\|") || "—";
  lines.push(`| ${check.title} | ${resultIcon(check.ok)} | ${output} |`);
}
lines.push("");
lines.push("## File coverage");
lines.push("");
if (missingFiles.length === 0) {
  lines.push("All required agent-ecosystem files are present.");
} else {
  lines.push("Missing files:");
  for (const file of missingFiles) lines.push(`- ${file}`);
}
lines.push("");
lines.push("## npm script coverage");
lines.push("");
if (missingScripts.length === 0) {
  lines.push("All required npm scripts are present.");
} else {
  lines.push("Missing npm scripts:");
  for (const script of missingScripts) lines.push(`- ${script}`);
}
lines.push("");
lines.push("## Domains covered");
lines.push("");
lines.push("- Research Agent: topic registry, topic files, memo files, memo quality, registry-to-memo coverage.");
lines.push("- Eval Agent: eval case validation, readiness runner, coverage summarizer, taxonomy.");
lines.push("- Guardrails: reason-code registry and validation.");
lines.push("- Observability: event taxonomy and validation.");
lines.push("- Report QA: check registry and validation.");
lines.push("");
lines.push("## Stop conditions");
lines.push("");
lines.push("Stop and fix before continuing if any section above reports FAIL, missing files, or missing scripts.");
lines.push("");
lines.push("## Commands");
lines.push("");
lines.push("```bash");
lines.push("npm run research:check");
lines.push("npm run eval:coverage:check");
lines.push("npm run guardrails:check");
lines.push("npm run observability:check");
lines.push("npm run report-qa:check");
lines.push("npm run agent:all");
lines.push("npm run agent:health");
lines.push("```");
lines.push("");

const content = `${lines.join("\n")}\n`;

if (!CHECK_ONLY) {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, content, "utf8");
  console.log(`OK wrote ${OUT_PATH.replace(ROOT + "/", "")}`);
}

console.log(`Status: ${status}`);
console.log(`Required files: ${requiredFiles.length - missingFiles.length}/${requiredFiles.length}`);
console.log(`Required npm scripts: ${requiredScripts.length - missingScripts.length}/${requiredScripts.length}`);
console.log(`Local checks: ${checkResults.length - failedChecks.length}/${checkResults.length}`);

if (status !== "PASS") {
  if (missingFiles.length > 0) console.error(`Missing files: ${missingFiles.join(", ")}`);
  if (missingScripts.length > 0) console.error(`Missing npm scripts: ${missingScripts.join(", ")}`);
  for (const check of failedChecks) {
    console.error(`Failed check: ${check.id}`);
    if (check.stderr) console.error(check.stderr);
    if (check.stdout) console.error(check.stdout);
  }
  process.exit(1);
}

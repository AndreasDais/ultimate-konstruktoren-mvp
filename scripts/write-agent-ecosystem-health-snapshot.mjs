#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check") || args.has("--dry-run");
const now = new Date().toISOString();
const reportPath = path.join(root, "sources", "agent-research", "status", "latest-agent-ecosystem-health.md");

function rel(filePath) {
  return filePath.split(path.sep).join("/");
}

function repoPath(relativePath) {
  return path.join(root, relativePath);
}

function fileExists(relativePath) {
  return fs.existsSync(repoPath(relativePath));
}

function readText(relativePath) {
  try {
    return fs.readFileSync(repoPath(relativePath), "utf8");
  } catch {
    return "";
  }
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(repoPath(relativePath), "utf8"));
  } catch (error) {
    return { __error: String(error?.message ?? error) };
  }
}

function runNode(relativeScript, args = []) {
  const result = spawnSync(process.execPath, [relativeScript, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    command: `node ${[relativeScript, ...args].join(" ")}`,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function runCommand(command, args = []) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    command: `${command} ${args.join(" ")}`.trim(),
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function countJsonlCases(relativePath) {
  try {
    const content = fs.readFileSync(repoPath(relativePath), "utf8");
    return content
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean).length;
  } catch {
    return 0;
  }
}

function countResearchTopics() {
  const registry = readJson("sources/agent-research/topics/topic-registry.json");
  if (Array.isArray(registry)) return registry.length;
  if (Array.isArray(registry.topics)) return registry.topics.length;
  return 0;
}

function countResearchMemos() {
  const memoDir = repoPath("sources/agent-research/memos");
  try {
    return fs
      .readdirSync(memoDir)
      .filter((name) => name.endsWith(".md"))
      .filter((name) => !["README.md", "MEMO_QUALITY_CHECKS.md"].includes(name))
      .length;
  } catch {
    return 0;
  }
}

function shortOutput(result, maxLines = 12) {
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (!combined) return "(no output)";
  return combined.split(/\r?\n/u).slice(-maxLines).join("\n");
}

function markdownCode(value) {
  return ["```txt", value.trim() || "(no output)", "```"].join("\n");
}

function row(status, item, detail) {
  return `| ${status} | ${item} | ${String(detail).replace(/\|/g, "\\|")} |`;
}

const expectedFiles = [
  "sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md",
  "sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md",
  "sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md",
  "sources/agent-research/AGENT_ECOSYSTEM_INDEX.md",
  "sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md",
  "sources/agent-research/AGENT_ECOSYSTEM_HANDOFF.md",
  "sources/agent-research/AGENT_ECOSYSTEM_FINAL_CHECKPOINT.md",
  "sources/agent-research/RESEARCH_AGENT_FINAL_CHECKPOINT.md",
  "sources/agent-research/topics/README.md",
  "sources/agent-research/topics/ai-agent-testing.md",
  "sources/agent-research/topics/agent-observability.md",
  "sources/agent-research/topics/guardrail-runtime-actions.md",
  "sources/agent-research/topics/report-qa-agent.md",
  "sources/agent-research/topics/topic-registry.json",
  "sources/agent-research/topics/RESEARCH_TOPIC_REGISTRY.md",
  "sources/agent-research/topics/RESEARCH_TOPIC_IMPLEMENTATION_CHECKLIST.md",
  "sources/agent-research/topics/REGISTRY_TO_MEMO_COVERAGE.md",
  "sources/agent-research/memos/README.md",
  "sources/agent-research/memos/MEMO_QUALITY_CHECKS.md",
  "sources/agent-research/memos/agent-opportunity-ai-agent-testing.md",
  "sources/agent-research/memos/agent-opportunity-agent-observability.md",
  "sources/agent-research/memos/agent-opportunity-guardrail-runtime-actions.md",
  "sources/agent-research/memos/agent-opportunity-report-qa-agent.md",
  "sources/agent-research/status/README.md",
  "sources/agent-research/status/latest-agent-ecosystem-health.md",
  "sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md",
  "sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md",
  "qa/evals/README.md",
  "qa/evals/EVAL_AGENT_EXPANSION.md",
  "qa/evals/pilar-core-evals.jsonl",
  "qa/evals/taxonomy/eval-case-taxonomy.json",
  "qa/evals/reports/README.md",
  "qa/evals/reports/latest-eval-readiness.md",
  "qa/evals/reports/latest-eval-coverage.md",
  "qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md",
  "qa/e2e/prompts/english-aisc-simple-beam.txt",
  "qa/e2e/prompts/norwegian-simple-beam.txt",
  "scripts/validate-eval-cases.mjs",
  "scripts/run-eval-suite.mjs",
  "scripts/summarize-eval-coverage.mjs",
  "scripts/create-agent-opportunity-memo.mjs",
  "scripts/validate-agent-research-topics.mjs",
  "scripts/validate-agent-research-memos.mjs",
  "scripts/write-agent-ecosystem-health-snapshot.mjs",
  "scripts/pilar-agent-ecosystem-hub.mjs",
];

const requiredScripts = [
  "eval:readiness",
  "eval:coverage",
  "eval:coverage:check",
  "agent:hub",
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
];

const packageJson = readJson("package.json");
const packageScripts = packageJson.scripts ?? {};
const gitHead = runCommand("git", ["rev-parse", "--short", "HEAD"]);
const gitStatus = runCommand("git", ["status", "--short"]);
const evalCaseCount = countJsonlCases("qa/evals/pilar-core-evals.jsonl");
const topicCount = countResearchTopics();
const memoCount = countResearchMemos();
const validateRun = runNode("scripts/validate-eval-cases.mjs");
const readinessRun = runNode("scripts/run-eval-suite.mjs");
const evalCoverageRun = runNode("scripts/summarize-eval-coverage.mjs", ["--check"]);
const researchTopicsRun = runNode("scripts/validate-agent-research-topics.mjs");
const researchMemosRun = runNode("scripts/validate-agent-research-memos.mjs");

const fileChecks = expectedFiles.map((file) => ({
  file,
  ok: fileExists(file),
}));

const scriptChecks = requiredScripts.map((scriptName) => ({
  scriptName,
  ok: typeof packageScripts[scriptName] === "string" && packageScripts[scriptName].length > 0,
  value: packageScripts[scriptName] ?? "",
}));

const latestHealthText = readText("sources/agent-research/status/latest-agent-ecosystem-health.md");
const healthAlreadyMentionsResearch = /Research topic registry|Research memo quality|Research Agent/i.test(latestHealthText);
const healthAlreadyMentionsEvalCoverage = /Eval coverage|latest-eval-coverage|summarize-eval-coverage/i.test(latestHealthText);

const criticalFailures = [
  ...fileChecks.filter((check) => !check.ok).map((check) => `Missing file: ${check.file}`),
  ...scriptChecks.filter((check) => !check.ok).map((check) => `Missing npm script: ${check.scriptName}`),
  ...(validateRun.status === 0 ? [] : [`Command failed: ${validateRun.command}`]),
  ...(readinessRun.status === 0 ? [] : [`Command failed: ${readinessRun.command}`]),
  ...(evalCoverageRun.status === 0 ? [] : [`Command failed: ${evalCoverageRun.command}`]),
  ...(researchTopicsRun.status === 0 ? [] : [`Command failed: ${researchTopicsRun.command}`]),
  ...(researchMemosRun.status === 0 ? [] : [`Command failed: ${researchMemosRun.command}`]),
];

const readinessReportExists = fileExists("qa/evals/reports/latest-eval-readiness.md");
if (!readinessReportExists) {
  criticalFailures.push("Missing readiness report artifact: qa/evals/reports/latest-eval-readiness.md");
}

const coverageReportExists = fileExists("qa/evals/reports/latest-eval-coverage.md");
if (!coverageReportExists) {
  criticalFailures.push("Missing coverage report artifact: qa/evals/reports/latest-eval-coverage.md");
}

const statusText = criticalFailures.length === 0 ? "PASS" : "FAIL";
const gitStatusText = gitStatus.stdout.trim() || "CLEAN at snapshot start";

const lines = [];
lines.push("# PILAR Agent Ecosystem Health Snapshot");
lines.push("");
lines.push(`**Generated:** ${now}`);
lines.push(`**Status:** ${statusText}`);
lines.push(`**Mode:** ${checkOnly ? "check-only / no repository write" : "write latest snapshot"}`);
lines.push(`**Git HEAD:** ${(gitHead.stdout.trim() || "unknown")}`);
lines.push("");
lines.push("## 1. Summary");
lines.push("");
lines.push(`- Eval cases detected: **${evalCaseCount}**`);
lines.push(`- Eval validator: **${validateRun.status === 0 ? "PASS" : "FAIL"}**`);
lines.push(`- Eval readiness runner: **${readinessRun.status === 0 ? "PASS" : "FAIL"}**`);
lines.push(`- Eval coverage checker: **${evalCoverageRun.status === 0 ? "PASS" : "FAIL"}**`);
lines.push(`- Readiness report artifact: **${readinessReportExists ? "present" : "missing"}**`);
lines.push(`- Coverage report artifact: **${coverageReportExists ? "present" : "missing"}**`);
lines.push(`- Research topics detected: **${topicCount}**`);
lines.push(`- Research memos detected: **${memoCount}**`);
lines.push(`- Research topic registry validator: **${researchTopicsRun.status === 0 ? "PASS" : "FAIL"}**`);
lines.push(`- Research memo quality validator: **${researchMemosRun.status === 0 ? "PASS" : "FAIL"}**`);
lines.push(`- Previous committed health snapshot mentions research checks: **${healthAlreadyMentionsResearch ? "yes" : "no"}**`);
lines.push(`- Previous committed health snapshot mentions eval coverage checks: **${healthAlreadyMentionsEvalCoverage ? "yes" : "no"}**`);
lines.push(`- Critical failures: **${criticalFailures.length}**`);
lines.push("");
lines.push("## 2. Required file map");
lines.push("");
lines.push("| Status | File | Detail |");
lines.push("|---|---|---|");
for (const check of fileChecks) {
  lines.push(row(check.ok ? "OK" : "MISSING", check.file, check.ok ? "present" : "not found"));
}
lines.push("");
lines.push("## 3. NPM command map");
lines.push("");
lines.push("| Status | Script | Command |");
lines.push("|---|---|---|");
for (const check of scriptChecks) {
  lines.push(row(check.ok ? "OK" : "MISSING", check.scriptName, check.value || "not configured"));
}
lines.push("");
lines.push("## 4. Command results");
lines.push("");
for (const result of [validateRun, readinessRun, evalCoverageRun, researchTopicsRun, researchMemosRun]) {
  lines.push(`### ${result.command}`);
  lines.push("");
  lines.push(`Exit code: ${result.status}`);
  lines.push(markdownCode(shortOutput(result)));
  lines.push("");
}
lines.push("## 5. Git status at snapshot start");
lines.push("");
lines.push(markdownCode(gitStatusText));
lines.push("");
lines.push("## 6. Critical failures");
lines.push("");
if (criticalFailures.length === 0) {
  lines.push("No critical failures detected.");
} else {
  for (const failure of criticalFailures) {
    lines.push(`- ${failure}`);
  }
}
lines.push("");
lines.push("## 7. Next recommended checks");
lines.push("");
lines.push("```bash");
lines.push("npm run agent:all");
lines.push("npm run eval:coverage:check");
lines.push("npm run research:check");
lines.push("npm run eval:readiness");
lines.push("npx tsc --noEmit --pretty false");
lines.push("```");
lines.push("");

if (!checkOnly) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`OK wrote ${rel(reportPath)}`);
} else {
  console.log("OK check-only mode: no files written");
}

console.log(`Status: ${statusText}`);
console.log(`Eval cases: ${evalCaseCount}`);
console.log(`Research topics: ${topicCount}`);
console.log(`Research memos: ${memoCount}`);
console.log(`Eval coverage: ${evalCoverageRun.status === 0 ? "PASS" : "FAIL"}`);

if (criticalFailures.length > 0) {
  for (const failure of criticalFailures) {
    console.error(`FAIL ${failure}`);
  }
  process.exit(1);
}

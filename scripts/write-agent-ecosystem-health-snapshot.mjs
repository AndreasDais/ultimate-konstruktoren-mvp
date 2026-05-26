#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
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

function shortOutput(result, maxLines = 12) {
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (!combined) return "(no output)";
  return combined.split(/\r?\n/u).slice(-maxLines).join("\n");
}

function markdownCode(value) {
  return ["```txt", value.trim() || "(no output)", "```"].join("\n");
}

function row(status, item, detail) {
  return `| ${status} | ${item} | ${detail.replace(/\|/g, "\\|")} |`;
}

const expectedFiles = [
  "sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md",
  "sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md",
  "sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md",
  "sources/agent-research/AGENT_ECOSYSTEM_INDEX.md",
  "sources/agent-research/topics/README.md",
  "sources/agent-research/topics/ai-agent-testing.md",
  "sources/agent-research/memos/README.md",
  "sources/agent-research/memos/agent-opportunity-ai-agent-testing.md",
  "sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md",
  "sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md",
  "qa/evals/README.md",
  "qa/evals/pilar-core-evals.jsonl",
  "qa/evals/reports/README.md",
  "qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md",
  "qa/e2e/prompts/english-aisc-simple-beam.txt",
  "qa/e2e/prompts/norwegian-simple-beam.txt",
  "scripts/validate-eval-cases.mjs",
  "scripts/create-agent-opportunity-memo.mjs",
  "scripts/run-eval-suite.mjs",
  "scripts/pilar-agent-ecosystem-hub.mjs",
];

const requiredScripts = [
  "eval:readiness",
  "agent:hub",
  "agent:status",
  "agent:validate",
  "agent:readiness",
  "agent:research",
  "agent:all",
];

const packageJson = readJson("package.json");
const packageScripts = packageJson.scripts ?? {};
const gitHead = runCommand("git", ["rev-parse", "--short", "HEAD"]);
const gitStatus = runCommand("git", ["status", "--short"]);
const evalCaseCount = countJsonlCases("qa/evals/pilar-core-evals.jsonl");
const validateRun = runNode("scripts/validate-eval-cases.mjs");
const readinessRun = runNode("scripts/run-eval-suite.mjs");

const fileChecks = expectedFiles.map((file) => ({
  file,
  ok: fileExists(file),
}));

const scriptChecks = requiredScripts.map((scriptName) => ({
  scriptName,
  ok: typeof packageScripts[scriptName] === "string" && packageScripts[scriptName].length > 0,
  value: packageScripts[scriptName] ?? "",
}));

const criticalFailures = [
  ...fileChecks.filter((check) => !check.ok).map((check) => `Missing file: ${check.file}`),
  ...scriptChecks.filter((check) => !check.ok).map((check) => `Missing npm script: ${check.scriptName}`),
  ...(validateRun.status === 0 ? [] : [`Command failed: ${validateRun.command}`]),
  ...(readinessRun.status === 0 ? [] : [`Command failed: ${readinessRun.command}`]),
];

const readinessReportExists = fileExists("qa/evals/reports/latest-eval-readiness.md");
if (!readinessReportExists) {
  criticalFailures.push("Missing readiness report artifact: qa/evals/reports/latest-eval-readiness.md");
}

const statusText = criticalFailures.length === 0 ? "PASS" : "FAIL";
const gitStatusText = gitStatus.stdout.trim() || "CLEAN at snapshot start";

const lines = [];
lines.push("# PILAR Agent Ecosystem Health Snapshot");
lines.push("");
lines.push(`**Generated:** ${now}`);
lines.push(`**Status:** ${statusText}`);
lines.push(`**Git HEAD:** ${(gitHead.stdout.trim() || "unknown")}`);
lines.push("");
lines.push("## 1. Summary");
lines.push("");
lines.push(`- Eval cases detected: **${evalCaseCount}**`);
lines.push(`- Eval validator: **${validateRun.status === 0 ? "PASS" : "FAIL"}**`);
lines.push(`- Eval readiness runner: **${readinessRun.status === 0 ? "PASS" : "FAIL"}**`);
lines.push(`- Readiness report artifact: **${readinessReportExists ? "present" : "missing"}**`);
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
lines.push(`### ${validateRun.command}`);
lines.push("");
lines.push(`Exit code: ${validateRun.status}`);
lines.push(markdownCode(shortOutput(validateRun)));
lines.push("");
lines.push(`### ${readinessRun.command}`);
lines.push("");
lines.push(`Exit code: ${readinessRun.status}`);
lines.push(markdownCode(shortOutput(readinessRun)));
lines.push("");
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
lines.push("npm run eval:readiness");
lines.push("npx tsc --noEmit --pretty false");
lines.push("```");
lines.push("");

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");

console.log(`OK wrote ${rel(reportPath)}`);
console.log(`Status: ${statusText}`);
console.log(`Eval cases: ${evalCaseCount}`);

if (criticalFailures.length > 0) {
  for (const failure of criticalFailures) {
    console.error(`FAIL ${failure}`);
  }
  process.exit(1);
}

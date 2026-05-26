#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");
const STRICT = process.argv.includes("--strict");
const OUT_PATH = join(ROOT, "sources/release-manager/reports/latest-release-readiness.md");
const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const npxCmd = isWindows ? "npx.cmd" : "npx";

const steps = [
  {
    id: "working-tree-clean",
    title: "Working tree clean",
    severity: "warn",
    command: "git",
    args: ["status", "--short"],
    interpret: (result) => {
      const output = combinedOutput(result).trim();
      return {
        ok: result.status === 0 && output.length === 0,
        note: output.length === 0 ? "Clean working tree" : "Working tree has local changes"
      };
    }
  },
  {
    id: "release-gate-registry",
    title: "Release gate registry",
    severity: "block",
    command: npmCmd,
    args: ["run", "release:check"]
  },
  {
    id: "agent-ecosystem-gate",
    title: "Agent ecosystem gate",
    severity: "block",
    command: npmCmd,
    args: ["run", "agent:all"]
  },
  {
    id: "health-snapshot-check",
    title: "Health snapshot check mode",
    severity: "block",
    command: "node",
    args: ["scripts/write-agent-ecosystem-health-snapshot.mjs", "--check"]
  },
  {
    id: "typescript-gate",
    title: "TypeScript gate",
    severity: "block",
    command: npxCmd,
    args: ["tsc", "--noEmit", "--pretty", "false"]
  }
];

function combinedOutput(result) {
  return `${result.stdout || ""}${result.stderr ? `\n${result.stderr}` : ""}`;
}

function runStep(step) {
  const result = spawnSync(step.command, step.args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
    env: process.env
  });

  const output = combinedOutput(result);
  const interpreted = typeof step.interpret === "function"
    ? step.interpret(result)
    : { ok: result.status === 0, note: "" };

  return {
    ...step,
    ok: Boolean(interpreted.ok),
    status: typeof result.status === "number" ? result.status : 1,
    error: result.error ? result.error.message : "",
    note: interpreted.note || "",
    output
  };
}

function firstUsefulLine(value) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] || "-";
}

function escapeCell(value) {
  return String(value || "-").replace(/\|/g, "\\|");
}

const results = steps.map(runStep);
const blockers = results.filter((step) => !step.ok && step.severity === "block");
const warnings = results.filter((step) => !step.ok && step.severity === "warn");
const releaseStatus = blockers.length > 0 ? "RELEASE_BLOCKED" : warnings.length > 0 ? "RELEASE_RISKY" : "RELEASE_READY";
const now = new Date().toISOString();

const lines = [];
lines.push("# PILAR Release Readiness Report");
lines.push("");
lines.push(`**Generated:** ${now}`);
lines.push(`**Mode:** ${CHECK_ONLY ? "check-only" : "write"}`);
lines.push(`**Status:** ${releaseStatus}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Blocking gates failed: ${blockers.length}`);
lines.push(`- Warning gates failed: ${warnings.length}`);
lines.push(`- Gates checked: ${results.length}`);
lines.push("");
lines.push("## Gate results");
lines.push("");
lines.push("| Gate | Severity | Status | First output line | Note |");
lines.push("|---|---:|---:|---|---|");
for (const result of results) {
  lines.push(`| ${escapeCell(result.title)} | ${result.severity.toUpperCase()} | ${result.ok ? "PASS" : "FAIL"} | ${escapeCell(firstUsefulLine(result.output || result.error))} | ${escapeCell(result.note)} |`);
}
lines.push("");
lines.push("## Interpretation");
lines.push("");
if (releaseStatus === "RELEASE_READY") {
  lines.push("All local blocking and warning gates passed at report time.");
} else if (releaseStatus === "RELEASE_RISKY") {
  lines.push("All blocking gates passed, but one or more warning gates need human review before release.");
} else {
  lines.push("One or more blocking gates failed. Do not merge or deploy until they are fixed.");
}
lines.push("");
lines.push("## Gates intentionally not executed in v0.1");
lines.push("");
lines.push("- Production build gate: run manually with `{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log`.");
lines.push("- Runtime smoke tests: run when app/UI/runtime behavior changed.");
lines.push("- New PILAR run: required when prompts, report generation, or stored output behavior changed.");
lines.push("- i18n regression: required when shell language, answer language, or standard-profile behavior changed.");
lines.push("");
lines.push("## Standard follow-up commands");
lines.push("");
lines.push("```bash");
lines.push("npm run agent:all");
lines.push("node scripts/write-agent-ecosystem-health-snapshot.mjs --check");
lines.push("npx tsc --noEmit --pretty false");
lines.push("{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log");
lines.push("```");
lines.push("");
lines.push("## Raw command outputs");
for (const result of results) {
  lines.push("");
  lines.push(`### ${result.title}`);
  lines.push("");
  lines.push("```txt");
  const output = (result.output || result.error || "").trim();
  lines.push(output || "No output.");
  lines.push("```");
}
lines.push("");

const content = `${lines.join("\n")}\n`;

if (!CHECK_ONLY) {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, content, "utf8");
  console.log(`OK wrote ${OUT_PATH.replace(ROOT + "/", "")}`);
}

console.log(`Status: ${releaseStatus}`);
console.log(`Blocking failures: ${blockers.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Gates checked: ${results.length}`);

if (STRICT && releaseStatus !== "RELEASE_READY") {
  process.exit(1);
}

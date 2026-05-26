#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");
const STRICT = process.argv.includes("--strict");
const FULL = process.argv.includes("--full");
const FAST_CHECK_MODE = CHECK_ONLY && !FULL;
const OUT_PATH = join(ROOT, "sources/release-manager/reports/latest-release-readiness.md");
const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const npxCmd = isWindows ? "npx.cmd" : "npx";
const npmLifecycle = String(process.env.npm_lifecycle_event || "");
const IN_AGENT_HUB_RUN = npmLifecycle === "agent:all" || npmLifecycle === "agent:hub";
const IN_RELEASE_READINESS_CHILD = process.env.PILAR_RELEASE_READINESS_RUNNING === "1";
const RECURSION_GUARD_ACTIVE = IN_AGENT_HUB_RUN || IN_RELEASE_READINESS_CHILD;

const steps = [
  {
    id: "working-tree-clean",
    title: "Working tree clean",
    severity: "warn",
    command: "git",
    args: ["status", "--short"],
    action: "Commit, stash, or intentionally document local changes before treating the report as release-ready.",
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
    args: ["run", "release:check"],
    action: "Run npm run release:check and fix release gate registry errors before release."
  },
  {
    id: "agent-ecosystem-gate",
    title: "Agent ecosystem gate",
    severity: "block",
    command: npmCmd,
    args: ["run", "agent:all"],
    action: "Run npm run agent:all and fix the first failing registry, validator, or health check.",
    skipWhen: () => FAST_CHECK_MODE || RECURSION_GUARD_ACTIVE,
    skipNote: "Skipped in fast check mode or inside agent hub / nested release-readiness run to avoid recursion."
  },
  {
    id: "health-snapshot-check",
    title: "Health snapshot check mode",
    severity: "block",
    command: "node",
    args: ["scripts/write-agent-ecosystem-health-snapshot.mjs", "--check"],
    action: "Run node scripts/write-agent-ecosystem-health-snapshot.mjs --check and fix missing files, npm scripts, or failed checks.",
    skipWhen: () => FAST_CHECK_MODE,
    skipNote: "Skipped in fast check mode. Run node scripts/write-release-readiness-report.mjs --check --full for the full nested gate."
  },
  {
    id: "typescript-gate",
    title: "TypeScript gate",
    severity: "block",
    command: npxCmd,
    args: ["tsc", "--noEmit", "--pretty", "false"],
    action: "Run npx tsc --noEmit --pretty false and fix TypeScript errors before release.",
    skipWhen: () => FAST_CHECK_MODE,
    skipNote: "Skipped in fast check mode. Run npx tsc --noEmit --pretty false or --full mode before release."
  }
];

function combinedOutput(result) {
  return `${result.stdout || ""}${result.stderr ? `\n${result.stderr}` : ""}`;
}

function shouldUseShell(command) {
  return isWindows && /\.cmd$/i.test(String(command));
}

function commandLine(step) {
  return [step.command, ...(step.args || [])].join(" ");
}

function runStep(step) {
  if (typeof step.skipWhen === "function" && step.skipWhen()) {
    const note = step.skipNote || "Skipped by release-readiness recursion guard.";
    return {
      ...step,
      ok: true,
      skipped: true,
      status: 0,
      error: "",
      note,
      output: note,
      commandLine: commandLine(step)
    };
  }

  const result = spawnSync(step.command, step.args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: shouldUseShell(step.command),
    env: {
      ...process.env,
      PILAR_RELEASE_READINESS_RUNNING: "1"
    }
  });

  const output = combinedOutput(result);
  const interpreted = typeof step.interpret === "function"
    ? step.interpret(result)
    : { ok: result.status === 0 && !result.error, note: "" };

  return {
    ...step,
    ok: Boolean(interpreted.ok),
    skipped: false,
    status: typeof result.status === "number" ? result.status : 1,
    error: result.error ? result.error.message : "",
    note: interpreted.note || "",
    output,
    commandLine: commandLine(step)
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

function resultLabel(result) {
  if (result.skipped) return "SKIP";
  return result.ok ? "PASS" : "FAIL";
}

function actionFor(result) {
  if (result.skipped) return "No action needed in nested/check-mode hub run.";
  if (result.ok) return "No action needed.";
  const output = `${result.output || ""}\n${result.error || ""}`;
  if (/spawnSync .*EINVAL/i.test(output)) {
    return "Command spawn failed. This sprint hardens Windows command execution; rerun the reporter, then run the listed command manually if it still fails.";
  }
  return result.action || "Inspect raw output and rerun the failing command directly.";
}

function statusExplanation(status) {
  if (status === "RELEASE_READY") {
    return "All local blocking and warning gates passed at report time.";
  }
  if (status === "RELEASE_RISKY") {
    return "All blocking gates passed, but at least one warning gate needs human review before release.";
  }
  return "One or more blocking gates failed. Do not merge or deploy until they are fixed.";
}

const results = steps.map(runStep);
const blockers = results.filter((step) => !step.ok && step.severity === "block");
const warnings = results.filter((step) => !step.ok && step.severity === "warn");
const skipped = results.filter((step) => step.skipped);
const releaseStatus = blockers.length > 0 ? "RELEASE_BLOCKED" : warnings.length > 0 || skipped.length > 0 ? "RELEASE_RISKY" : "RELEASE_READY";
const now = new Date().toISOString();

const lines = [];
lines.push("# PILAR Release Readiness Report");
lines.push("");
lines.push(`**Generated:** ${now}`);
lines.push(`**Mode:** ${CHECK_ONLY ? (FULL ? "check-full" : "check-fast") : "write"}`);
lines.push(`**Status:** ${releaseStatus}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Blocking gates failed: ${blockers.length}`);
lines.push(`- Warning gates failed: ${warnings.length}`);
lines.push(`- Gates skipped by recursion guard: ${skipped.length}`);
lines.push(`- Gates checked: ${results.length}`);
lines.push("");
lines.push("## Release decision");
lines.push("");
lines.push(statusExplanation(releaseStatus));
lines.push("");
lines.push("## Action plan");
lines.push("");
if (blockers.length === 0 && warnings.length === 0) {
  lines.push("- No blocking or warning gates failed.");
} else {
  for (const result of blockers) {
    lines.push(`- **BLOCKED — ${result.title}:** ${actionFor(result)}`);
  }
  for (const result of warnings) {
    lines.push(`- **RISK — ${result.title}:** ${actionFor(result)}`);
  }
}
if (skipped.length > 0) {
  lines.push("");
  lines.push("Skipped gates were intentionally skipped by the recursion guard. This prevents `release-readiness -> agent:all -> release-readiness` loops when the reporter is invoked from the agent hub.");
}
lines.push("");
lines.push("## Gate results");
lines.push("");
lines.push("| Gate | Severity | Status | Command | First output line | Recommended action | Note |");
lines.push("|---|---:|---:|---|---|---|---|");
for (const result of results) {
  lines.push(`| ${escapeCell(result.title)} | ${result.severity.toUpperCase()} | ${resultLabel(result)} | ${escapeCell(result.commandLine)} | ${escapeCell(firstUsefulLine(result.output || result.error))} | ${escapeCell(actionFor(result))} | ${escapeCell(result.note)} |`);
}
lines.push("");
lines.push("## Fast/full check modes");
lines.push("");
lines.push("Default `--check` mode is intentionally fast. It validates the release registry and working tree status, but skips nested expensive gates that are already covered by `agent:all`, `agent:health`, or explicit manual checks.");
lines.push("");
lines.push("Use full mode when you intentionally want the release-readiness reporter to execute nested gates:");
lines.push("");
lines.push("```bash");
lines.push("node scripts/write-release-readiness-report.mjs --check --full");
lines.push("```");
lines.push("");
lines.push("## Recursion guard");
lines.push("");
lines.push("The reporter may be called directly or from `agent:all`. When it detects fast check mode, the agent hub, or a nested release-readiness run, it skips heavy nested gates to avoid long recursive gate execution.");
lines.push("");
lines.push("## Gates intentionally not executed in v0.2");
lines.push("");
lines.push("- Production build gate: run manually with `{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log`.");
lines.push("- Runtime smoke tests: run when app/UI/runtime behavior changed.");
lines.push("- New PILAR run: required when prompts, report generation, or stored output behavior changed.");
lines.push("- i18n regression: required when shell language, answer language, or standard-profile behavior changed.");
lines.push("- PDF/Word parity review: required when report rendering or artifact generation changed.");
lines.push("");
lines.push("## Standard follow-up commands");
lines.push("");
lines.push("```bash");
lines.push("npm run agent:all");
lines.push("node scripts/write-agent-ecosystem-health-snapshot.mjs --check");
lines.push("npm run release:readiness:check");
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
  console.log(`OK wrote ${relative(ROOT, OUT_PATH)}`);
}

console.log(`Status: ${releaseStatus}`);
console.log(`Fast check mode: ${FAST_CHECK_MODE ? "yes" : "no"}`);
console.log(`Blocking failures: ${blockers.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Skipped gates: ${skipped.length}`);
console.log(`Gates checked: ${results.length}`);

if (STRICT && releaseStatus !== "RELEASE_READY") {
  process.exit(1);
}

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const nodeBin = process.execPath;

const requiredFiles = [
  "sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md",
  "sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md",
  "sources/agent-research/topics/README.md",
  "sources/agent-research/topics/ai-agent-testing.md",
  "sources/agent-research/memos/README.md",
  "qa/evals/README.md",
  "qa/evals/pilar-core-evals.jsonl",
  "qa/evals/reports/README.md",
  "qa/evals/reports/latest-eval-readiness.md",
  "qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md",
  "scripts/validate-eval-cases.mjs",
  "scripts/run-eval-suite.mjs",
  "scripts/create-agent-opportunity-memo.mjs",
  "sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md",
  "sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md"
];

const commandHelp = `PILAR Agent Ecosystem Hub

Usage:
  node scripts/pilar-agent-ecosystem-hub.mjs help
  node scripts/pilar-agent-ecosystem-hub.mjs status
  node scripts/pilar-agent-ecosystem-hub.mjs validate
  node scripts/pilar-agent-ecosystem-hub.mjs eval-readiness
  node scripts/pilar-agent-ecosystem-hub.mjs research-memo <topic-slug>
  node scripts/pilar-agent-ecosystem-hub.mjs all

Commands:
  status          Check that the Sprint 34 agent-ecosystem foundation files exist.
  validate        Run qa/evals/pilar-core-evals.jsonl validation.
  eval-readiness  Run the local eval readiness suite and update the latest report artifact.
  research-memo   Generate an Agent Opportunity Memo from a topic in sources/agent-research/topics/.
  all             Run status, validate and eval-readiness in sequence.

Examples:
  node scripts/pilar-agent-ecosystem-hub.mjs status
  node scripts/pilar-agent-ecosystem-hub.mjs research-memo ai-agent-testing
  node scripts/pilar-agent-ecosystem-hub.mjs all

NPM convenience command, if configured:
  npm run agent:hub -- status
  npm run agent:hub -- all
`;

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function printStep(title) {
  console.log(`\n=== ${title} ===`);
}

function runNodeScript(scriptPath, args = []) {
  if (!exists(scriptPath)) {
    console.error(`FAILED missing script: ${scriptPath}`);
    process.exitCode = 1;
    return false;
  }

  const result = spawnSync(nodeBin, [scriptPath, ...args], {
    cwd: root,
    stdio: "inherit",
    shell: false
  });

  if (typeof result.status === "number" && result.status !== 0) {
    console.error(`FAILED ${scriptPath} exited with ${result.status}`);
    process.exitCode = result.status;
    return false;
  }

  if (result.error) {
    console.error(`FAILED ${scriptPath}: ${result.error.message}`);
    process.exitCode = 1;
    return false;
  }

  return true;
}

function status() {
  printStep("agent ecosystem file status");

  let missing = 0;
  for (const file of requiredFiles) {
    if (exists(file)) {
      console.log(`OK ${file}`);
    } else {
      console.log(`MISSING ${file}`);
      missing += 1;
    }
  }

  if (missing > 0) {
    console.error(`FAILED agent ecosystem status: ${missing} required file(s) missing`);
    process.exitCode = 1;
    return false;
  }

  console.log(`OK agent ecosystem status: ${requiredFiles.length} required files found`);
  return true;
}

function validate() {
  printStep("eval case validation");
  return runNodeScript("scripts/validate-eval-cases.mjs");
}

function evalReadiness() {
  printStep("eval readiness suite");
  return runNodeScript("scripts/run-eval-suite.mjs");
}

function researchMemo(topic) {
  printStep("research memo generation");
  if (!topic) {
    console.error("FAILED missing topic slug. Example: ai-agent-testing");
    process.exitCode = 1;
    return false;
  }
  return runNodeScript("scripts/create-agent-opportunity-memo.mjs", [topic]);
}

function all() {
  const okStatus = status();
  if (!okStatus) return false;
  const okValidate = validate();
  if (!okValidate) return false;
  const okEval = evalReadiness();
  if (!okEval) return false;
  printStep("summary");
  console.log("OK agent ecosystem command hub completed all checks");
  return true;
}

const [command = "help", ...args] = process.argv.slice(2);

switch (command) {
  case "help":
  case "--help":
  case "-h":
    console.log(commandHelp);
    break;
  case "status":
    status();
    break;
  case "validate":
    validate();
    break;
  case "eval-readiness":
    evalReadiness();
    break;
  case "research-memo":
    researchMemo(args[0]);
    break;
  case "all":
    all();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.log(commandHelp);
    process.exitCode = 1;
}

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const nodeBin = process.execPath;

const requiredFiles = [
  "sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md",
  "sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md",
  "sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md",
  "sources/agent-research/AGENT_ECOSYSTEM_INDEX.md",
  "sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md",
  "sources/agent-research/AGENT_ECOSYSTEM_HANDOFF.md",
  "sources/agent-research/AGENT_ECOSYSTEM_FINAL_CHECKPOINT.md",
  "sources/agent-research/topics/README.md",
  "sources/agent-research/topics/ai-agent-testing.md",
  "sources/agent-research/topics/topic-registry.json",
  "sources/agent-research/topics/RESEARCH_TOPIC_REGISTRY.md",
  "sources/agent-research/memos/README.md",
  "sources/agent-research/memos/MEMO_QUALITY_CHECKS.md",
  "sources/agent-research/memos/agent-opportunity-ai-agent-testing.md",
  "sources/agent-research/status/README.md",
  "sources/agent-research/status/latest-agent-ecosystem-health.md",
  "qa/evals/README.md",
  "qa/evals/pilar-core-evals.jsonl",
  "qa/evals/reports/README.md",
  "qa/evals/reports/latest-eval-readiness.md",
  "qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md",
  "qa/e2e/prompts/english-aisc-simple-beam.txt",
  "qa/e2e/prompts/norwegian-simple-beam.txt",
  "scripts/validate-eval-cases.mjs",
  "scripts/run-eval-suite.mjs",
  "scripts/create-agent-opportunity-memo.mjs",
  "scripts/validate-agent-research-topics.mjs",
  "scripts/validate-agent-research-memos.mjs",
  "scripts/write-agent-ecosystem-health-snapshot.mjs",
  "sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md",
  "sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md"
];

const commandHelp = `PILAR Agent Ecosystem Hub

Usage:
  node scripts/pilar-agent-ecosystem-hub.mjs help
  node scripts/pilar-agent-ecosystem-hub.mjs status
  node scripts/pilar-agent-ecosystem-hub.mjs validate
  node scripts/pilar-agent-ecosystem-hub.mjs eval-readiness
  node scripts/pilar-agent-ecosystem-hub.mjs research-topics
  node scripts/pilar-agent-ecosystem-hub.mjs research-memos
  node scripts/pilar-agent-ecosystem-hub.mjs research-check
  node scripts/pilar-agent-ecosystem-hub.mjs research-memo <topic-slug>
  node scripts/pilar-agent-ecosystem-hub.mjs health
  node scripts/pilar-agent-ecosystem-hub.mjs all

Commands:
  status          Check that required agent-ecosystem foundation files exist.
  validate        Run qa/evals/pilar-core-evals.jsonl validation.
  eval-readiness  Run the local eval readiness suite and update the latest report artifact.
  research-topics Validate the Research Agent topic registry.
  research-memos  Validate generated Agent Opportunity Memos.
  research-check  Run both research-topics and research-memos.
  research-memo   Generate an Agent Opportunity Memo from a topic in sources/agent-research/topics/.
  health          Write the latest agent ecosystem health snapshot.
  all             Run status, validate, eval-readiness and research-check in sequence.

Examples:
  node scripts/pilar-agent-ecosystem-hub.mjs status
  node scripts/pilar-agent-ecosystem-hub.mjs research-check
  node scripts/pilar-agent-ecosystem-hub.mjs research-memo ai-agent-testing
  node scripts/pilar-agent-ecosystem-hub.mjs all

NPM convenience commands, if configured:
  npm run agent:status
  npm run agent:validate
  npm run agent:readiness
  npm run agent:research -- ai-agent-testing
  npm run agent:health
  npm run agent:all
  npm run research:check
`;

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

  if (result.error) {
    console.error(`FAILED ${scriptPath}: ${result.error.message}`);
    process.exitCode = 1;
    return false;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    console.error(`FAILED ${scriptPath} exited with ${result.status}`);
    process.exitCode = result.status;
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

function researchTopics() {
  printStep("research topic registry validation");
  return runNodeScript("scripts/validate-agent-research-topics.mjs");
}

function researchMemos() {
  printStep("research memo quality validation");
  return runNodeScript("scripts/validate-agent-research-memos.mjs");
}

function researchCheck() {
  const okTopics = researchTopics();
  if (!okTopics) return false;
  const okMemos = researchMemos();
  if (!okMemos) return false;
  printStep("research check summary");
  console.log("OK research checks completed");
  return true;
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

function health() {
  printStep("agent ecosystem health snapshot");
  return runNodeScript("scripts/write-agent-ecosystem-health-snapshot.mjs");
}

function all() {
  const okStatus = status();
  if (!okStatus) return false;
  const okValidate = validate();
  if (!okValidate) return false;
  const okEval = evalReadiness();
  if (!okEval) return false;
  const okResearch = researchCheck();
  if (!okResearch) return false;
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
  case "research-topics":
    researchTopics();
    break;
  case "research-memos":
    researchMemos();
    break;
  case "research-check":
    researchCheck();
    break;
  case "research-memo":
    researchMemo(args[0]);
    break;
  case "health":
    health();
    break;
  case "all":
    all();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.log(commandHelp);
    process.exitCode = 1;
}

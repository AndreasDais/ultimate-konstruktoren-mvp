#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const node = process.execPath;

const requiredFiles = [
  "sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md",
  "sources/agent-research/AGENT_ECOSYSTEM_INDEX.md",
  "sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md",
  "sources/agent-research/AGENT_ECOSYSTEM_FINAL_CHECKPOINT.md",
  "sources/agent-research/RESEARCH_AGENT_FINAL_CHECKPOINT.md",
  "sources/agent-research/topics/topic-registry.json",
  "sources/agent-research/memos/agent-opportunity-ai-agent-testing.md",
  "qa/evals/pilar-core-evals.jsonl",
  "qa/evals/taxonomy/eval-case-taxonomy.json",
  "qa/evals/reports/latest-eval-readiness.md",
  "qa/evals/reports/latest-eval-coverage.md",
  "scripts/validate-eval-cases.mjs",
  "scripts/run-eval-suite.mjs",
  "scripts/summarize-eval-coverage.mjs",
  "scripts/create-agent-opportunity-memo.mjs",
  "scripts/validate-agent-research-topics.mjs",
  "scripts/validate-agent-research-memos.mjs",
  "scripts/write-agent-ecosystem-health-snapshot.mjs",
  "sources/guardrails/guardrail-reason-codes.json",
  "sources/guardrails/GUARDRAIL_REASON_CODE_REGISTRY.md",
  "scripts/validate-guardrail-reason-codes.mjs",
  "sources/observability/observability-event-taxonomy.json",
  "sources/observability/OBSERVABILITY_EVENT_TAXONOMY.md",
  "scripts/validate-observability-event-taxonomy.mjs",
  "scripts/pilar-agent-ecosystem-hub.mjs"
];

const commandGroups = {
  "status": {
    description: "Show local file and command readiness for the PILAR agent ecosystem.",
    run: () => runStatus()
  },
  "validate": {
    description: "Validate eval case JSONL structure.",
    run: () => runNodeScript("scripts/validate-eval-cases.mjs")
  },
  "eval-readiness": {
    description: "Run eval readiness report workflow.",
    run: () => runNodeScript("scripts/run-eval-suite.mjs")
  },
  "eval-coverage": {
    description: "Run eval coverage check without rewriting the coverage artifact.",
    run: () => runNodeScript("scripts/summarize-eval-coverage.mjs", ["--check"])
  },
  "eval-coverage-write": {
    description: "Write/update qa/evals/reports/latest-eval-coverage.md.",
    run: () => runNodeScript("scripts/summarize-eval-coverage.mjs")
  },
  "research-topics": {
    description: "Validate Research Agent topic registry and registry-to-memo coverage.",
    run: () => runNodeScript("scripts/validate-agent-research-topics.mjs")
  },
  "research-memos": {
    description: "Validate Research Agent memo quality.",
    run: () => runNodeScript("scripts/validate-agent-research-memos.mjs")
  },
  "research-memo": {
    description: "Generate one Agent Opportunity Memo from a topic id.",
    run: (args) => {
      const topic = args[0];
      if (!topic) {
        console.error("FAILED research-memo: missing topic id");
        console.error("Usage: node scripts/pilar-agent-ecosystem-hub.mjs research-memo ai-agent-testing");
        return 1;
      }
      return runNodeScript("scripts/create-agent-opportunity-memo.mjs", [topic]);
    }
  },
  "research-check": {
    description: "Run both Research Agent topic coverage and memo-quality checks.",
    run: () => runSequence([
      ["research-topics", []],
      ["research-memos", []]
    ])
  },
  "guardrails-codes": {
    description: "Validate Guardrail Agent reason-code registry.",
    run: () => runNodeScript("scripts/validate-guardrail-reason-codes.mjs")
  },
  "guardrails-check": {
    description: "Run Guardrail Agent registry checks.",
    run: () => runNodeScript("scripts/validate-guardrail-reason-codes.mjs")
  },
  "observability-events": {
    description: "Validate Observability Agent event taxonomy.",
    run: () => runNodeScript("scripts/validate-observability-event-taxonomy.mjs")
  },
  "observability-check": {
    description: "Run Observability Agent taxonomy checks.",
    run: () => runNodeScript("scripts/validate-observability-event-taxonomy.mjs")
  },
  "health": {
    description: "Run health snapshot check mode without rewriting latest-agent-ecosystem-health.md.",
    run: () => runNodeScript("scripts/write-agent-ecosystem-health-snapshot.mjs", ["--check"])
  },
  "health-write": {
    description: "Write/update sources/agent-research/status/latest-agent-ecosystem-health.md.",
    run: () => runNodeScript("scripts/write-agent-ecosystem-health-snapshot.mjs")
  },
  "all": {
    description: "Run the non-writing local agent-ecosystem gate.",
    run: () => runSequence([
      ["status", []],
      ["validate", []],
      ["eval-readiness", []],
      ["eval-coverage", []],
      ["research-topics", []],
      ["research-memos", []],
      ["guardrails-check", []],
      ["observability-check", []],
      ["health", []]
    ])
  }
};

function hasFile(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function runNodeScript(scriptPath, args = []) {
  if (!hasFile(scriptPath)) {
    console.error(`FAILED missing script: ${scriptPath}`);
    return 1;
  }

  console.log(`\n=== ${scriptPath} ${args.join(" ")} ===`);
  const result = spawnSync(node, [scriptPath, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });

  if (result.error) {
    console.error(`FAILED ${scriptPath}: ${result.error.message}`);
    return 1;
  }

  return typeof result.status === "number" ? result.status : 1;
}

function runSequence(steps) {
  for (const [name, args] of steps) {
    const command = commandGroups[name];
    if (!command) {
      console.error(`FAILED unknown command in sequence: ${name}`);
      return 1;
    }
    const code = command.run(args);
    if (code !== 0) {
      console.error(`FAILED ${name}: exit code ${code}`);
      return code;
    }
  }
  console.log("\nOK agent ecosystem gate completed");
  return 0;
}

function runStatus() {
  console.log("PILAR Agent Ecosystem Hub");
  console.log(`Root: ${root}`);
  console.log("");

  let missing = 0;
  for (const file of requiredFiles) {
    const ok = hasFile(file);
    console.log(`${ok ? "OK" : "MISSING"} ${file}`);
    if (!ok) missing += 1;
  }

  console.log("");
  console.log("Available commands:");
  for (const [name, command] of Object.entries(commandGroups)) {
    console.log(`- ${name}: ${command.description}`);
  }

  if (missing > 0) {
    console.error(`\nFAILED status: ${missing} required file(s) missing`);
    return 1;
  }

  console.log("\nOK status: required agent ecosystem files are present");
  return 0;
}

function printHelp() {
  console.log("PILAR Agent Ecosystem Hub");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/pilar-agent-ecosystem-hub.mjs <command> [args]");
  console.log("");
  console.log("Commands:");
  for (const [name, command] of Object.entries(commandGroups)) {
    console.log(`  ${name.padEnd(20)} ${command.description}`);
  }
  console.log("");
  console.log("Examples:");
  console.log("  npm run agent:all");
  console.log("  npm run agent:hub -- eval-coverage");
  console.log("  npm run agent:hub -- guardrails-check");
  console.log("  npm run agent:hub -- observability-check");
  console.log("  npm run agent:hub -- research-memo ai-agent-testing");
}

const [commandName = "help", ...args] = process.argv.slice(2);

if (commandName === "help" || commandName === "--help" || commandName === "-h") {
  printHelp();
  process.exit(0);
}

const command = commandGroups[commandName];
if (!command) {
  console.error(`FAILED unknown command: ${commandName}`);
  printHelp();
  process.exit(1);
}

const exitCode = command.run(args);
process.exit(exitCode);

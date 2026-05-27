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
  "sources/release-manager/release-gates.json",
  "sources/release-manager/RELEASE_MANAGER_GATE_REGISTRY.md",
  "scripts/validate-release-gates.mjs",
  "scripts/run-report-qa-dry-run.mjs",
  "scripts/validate-report-qa-real-fixture.mjs",
  "sources/report-qa/REPORT_QA_REAL_REPORT_FIXTURE.md",
  "sources/report-qa/dry-run/fixtures/README.md",
  "sources/report-qa/dry-run/fixtures/realistic-steel-beam-report.md",
  "sources/report-qa/REPORT_QA_DRY_RUN.md",
  "sources/report-qa/dry-run/sample-report.md",
  "sources/report-qa/reports/README.md",
  "scripts/write-release-readiness-report.mjs",
  "sources/release-manager/RELEASE_READINESS_REPORTER.md",
  "sources/release-manager/reports/README.md",
  "sources/release-manager/reports/latest-release-readiness.md",
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
  "sources/patch-planner/patch-planner-rules.json",
  "sources/patch-planner/PATCH_PLANNER_RULE_REGISTRY.md",
  "scripts/validate-patch-planner-rules.mjs",
  "scripts/validate-report-qa-fixture-registry.mjs",
  "scripts/validate-report-qa-missing-input-fixture.mjs",
  "scripts/validate-report-qa-unit-inconsistency-fixture.mjs",
  "scripts/validate-report-qa-overconfident-conclusion-fixture.mjs",
  "sources/report-qa/REPORT_QA_UNIT_INCONSISTENCY_FIXTURE.md",
  "sources/report-qa/dry-run/fixtures/unit-inconsistency-report.md",
  "sources/report-qa/REPORT_QA_MISSING_INPUT_FIXTURE.md",
  "sources/report-qa/dry-run/fixtures/missing-input-report.md",
  "sources/report-qa/dry-run/fixtures/fixture-registry.json",
  "sources/report-qa/dry-run/fixtures/FIXTURE_REGISTRY.md",
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
  "report-qa-check": {
    description: "Run Report QA Agent check registry validation.",
    run: () => runNodeScript("scripts/validate-report-qa-checks.mjs")
  },
  "report-qa-fixture": {
    description: "Validate Report QA realistic report fixture.",
    run: () => runNodeScript("scripts/validate-report-qa-real-fixture.mjs")
  },
  "report-qa-fixture-check": {
    description: "Run Report QA realistic fixture checks.",
    run: () => runNodeScript("scripts/validate-report-qa-real-fixture.mjs")
  },
  "report-qa-fixtures-check": {
    description: "Validate Report QA fixture registry coverage.",
    run: () => runNodeScript("scripts/validate-report-qa-fixture-registry.mjs")
  },
  "report-qa-missing-input-check": {
    description: "Validate the active Report QA missing-input fixture.",
    run: () => runNodeScript("scripts/validate-report-qa-missing-input-fixture.mjs")
  },
  "report-qa-unit-inconsistency-check": {
    description: "Validate the active Report QA unit-inconsistency fixture.",
    run: () => runNodeScript("scripts/validate-report-qa-unit-inconsistency-fixture.mjs")
  },
  "report-qa-overconfident-conclusion-check": {
    description: "Validate the active Report QA overconfident-conclusion fixture.",
    run: () => runNodeScript("scripts/validate-report-qa-overconfident-conclusion-fixture.mjs")
  },
  "report-qa-dry-run": {
    description: "Write the Report QA dry-run report artifact.",
    run: () => runNodeScript("scripts/run-report-qa-dry-run.mjs", ["--write"])
  },
  "report-qa-dry-run-check": {
    description: "Run Report QA dry-run in non-writing check mode.",
    run: () => runNodeScript("scripts/run-report-qa-dry-run.mjs", ["--check"])
  },
  "release-gates": {
    description: "Validate Release Manager gate registry.",
    run: () => runNodeScript("scripts/validate-release-gates.mjs")
  },
  "release-check": {
    description: "Run Release Manager gate registry checks.",
    run: () => runNodeScript("scripts/validate-release-gates.mjs")
  },
  "release-readiness": {
    description: "Run release readiness reporter in check mode without rewriting latest-release-readiness.md.",
    run: () => runNodeScript("scripts/write-release-readiness-report.mjs", ["--check"])
  },
  "release-readiness-write": {
    description: "Write/update sources/release-manager/reports/latest-release-readiness.md.",
    run: () => runNodeScript("scripts/write-release-readiness-report.mjs")
  },
  "patch-planner-rules": {
    description: "Validate Patch Planner Agent rule registry.",
    run: () => runNodeScript("scripts/validate-patch-planner-rules.mjs")
  },
  "patch-planner-check": {
    description: "Run Patch Planner Agent registry checks.",
    run: () => runNodeScript("scripts/validate-patch-planner-rules.mjs")
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
      ["report-qa-check", []],
      ["report-qa-dry-run-check", []],
      ["report-qa-fixture-check", []],
      ["report-qa-fixtures-check", []],
      ["report-qa-missing-input-check", []],
      ["report-qa-unit-inconsistency-check", []],
      ["report-qa-overconfident-conclusion-check", []],
      ["release-check", []],
      ["release-readiness", []],
      ["patch-planner-check", []],
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
  console.log("  npm run agent:hub -- release-check");
  console.log("  npm run agent:hub -- release-readiness");
  console.log("  npm run agent:hub -- report-qa-check");
  console.log("  npm run agent:hub -- report-qa-dry-run-check");
  console.log("  npm run agent:hub -- report-qa-fixture-check");
  console.log("  npm run agent:hub -- report-qa-fixtures-check");
  console.log("  npm run agent:hub -- report-qa-missing-input-check");
  console.log("  npm run agent:hub -- report-qa-unit-inconsistency-check");
  console.log("  npm run agent:hub -- report-qa-overconfident-conclusion-check");
  console.log("  npm run agent:hub -- patch-planner-check");
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

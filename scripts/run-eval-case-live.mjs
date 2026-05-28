#!/usr/bin/env node
import fs from "node:fs";

const DEFAULT_CASES = "qa/evals/pilar-core-evals.jsonl";
const DEFAULT_SCRATCH_DIR = "/tmp/pilar-live-eval";
const DRY_RUN_ID = "dry-run";
const BUNDLE_FILES = [
  "manifest.json",
  "runrecord-summary.json",
  "report-text.txt",
  "trace-events-summary.json",
  "step-metadata-summary.json",
  "grade-result.json",
];

function parseArgs(argv) {
  const args = {
    casesPath: DEFAULT_CASES,
    caseId: "",
    scratchDir: DEFAULT_SCRATCH_DIR,
    dryRun: true,
    requireTrace: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--json") {
      args.json = true;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--require-trace") {
      args.requireTrace = true;
      continue;
    }

    if (token === "--cases") {
      args.casesPath = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--cases=")) {
      args.casesPath = token.slice("--cases=".length);
      continue;
    }

    if (token === "--case-id") {
      args.caseId = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--case-id=")) {
      args.caseId = token.slice("--case-id=".length);
      continue;
    }

    if (token === "--scratch-dir") {
      args.scratchDir = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--scratch-dir=")) {
      args.scratchDir = token.slice("--scratch-dir=".length);
      continue;
    }

    throw new Error(`unknown argument '${token}'`);
  }

  return args;
}

function requireValue(argv, index, token) {
  const value = argv[index + 1];
  if (!value) throw new Error(`${token} requires a value`);
  return value;
}

function printHelp() {
  console.log(`PILAR live eval single-case runner

Usage:
  node scripts/run-eval-case-live.mjs --case-id <id> --dry-run
  node scripts/run-eval-case-live.mjs --case-id <id> --scratch-dir /tmp/pilar-live-eval
  node scripts/run-eval-case-live.mjs --case-id <id> --json

Scope:
  Dry-run only. No LLM calls, no Supabase reads, no pipeline execution, no writes.
`);
}

function stripBom(value) {
  return String(value).replace(/^\uFEFF/, "");
}

function readJsonl(filePath) {
  return stripBom(fs.readFileSync(filePath, "utf8"))
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((entry) => entry.line.length > 0)
    .map((entry) => {
      try {
        return JSON.parse(entry.line);
      } catch (error) {
        throw new Error(`${filePath}:${entry.lineNumber}: invalid JSON (${error.message})`);
      }
    });
}

function joinBundlePath(scratchDir, caseId, runId) {
  return [scratchDir.replace(/[\\/]+$/, ""), caseId, runId].join("/");
}

function buildDryRunPlan(evalCase, args) {
  const bundlePath = joinBundlePath(args.scratchDir, evalCase.case_id, DRY_RUN_ID);

  return {
    case_id: evalCase.case_id,
    title: evalCase.title ?? "",
    priority: evalCase.priority ?? "unknown",
    domain: evalCase.domain ?? "unknown",
    standard_context: evalCase.standard_context ?? "unknown",
    display_language: evalCase.display_language ?? "unknown",
    target_agents: Array.isArray(evalCase.target_agents) ? evalCase.target_agents : [],
    run_id: null,
    run_status: "SKIP",
    eval_status: "SKIP",
    dry_run: true,
    manual_review_required: Boolean(evalCase.manual_review_required),
    artifact_bundle: {
      path: bundlePath,
      files: BUNDLE_FILES,
    },
    rule_summary: {
      checked: 0,
      failed: 0,
      skipped: ["dry-run only; deterministic rules were not executed"],
    },
    trace_summary: {
      checked: 0,
      failed: 0,
      warnings: ["dry-run only; trace assertions were not executed"],
    },
    planned_action: {
      live_pipeline_execution: false,
      supabase_reads: false,
      repo_writes: false,
      require_trace: args.requireTrace,
    },
  };
}

function formatTextPlan(plan) {
  return [
    `DRY_RUN ${plan.case_id}`,
    `title: ${plan.title}`,
    `run_id: ${plan.run_id}`,
    `run_status: ${plan.run_status}`,
    `eval_status: ${plan.eval_status}`,
    `artifact_bundle: ${plan.artifact_bundle.path}`,
    `artifact_files: ${plan.artifact_bundle.files.join(", ")}`,
    `manual_review_required: ${plan.manual_review_required}`,
    "live_pipeline_execution: false",
    "supabase_reads: false",
    "repo_writes: false",
  ].join("\n");
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`FAILED live eval runner: ${error.message}`);
    process.exit(2);
  }

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.caseId) {
    console.error("FAILED live eval runner: --case-id is required");
    process.exit(2);
  }

  const cases = readJsonl(args.casesPath);
  const evalCase = cases.find((candidate) => candidate.case_id === args.caseId);
  if (!evalCase) {
    console.error(`FAILED live eval runner: unknown case_id '${args.caseId}'`);
    process.exit(2);
  }

  const plan = buildDryRunPlan(evalCase, args);
  console.log(args.json ? JSON.stringify(plan, null, 2) : formatTextPlan(plan));
}

main();

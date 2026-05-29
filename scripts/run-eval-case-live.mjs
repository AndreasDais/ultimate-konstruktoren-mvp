#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CASES = "qa/evals/pilar-core-evals.jsonl";
const DEFAULT_SCRATCH_DIR = "/tmp/pilar-live-eval";
const DRY_RUN_ID = "dry-run";
const BUNDLE_SCHEMA_VERSION = "live-eval-artifact-bundle.v0";
const RUNNER_PATH = "scripts/run-eval-case-live.mjs";
const BUNDLE_STATUS_TAXONOMY = Object.freeze({
  SKIP: "no bundle planning or live execution was requested",
  PLAN: "dry-run bundle plan only; no files written",
  READY: "bundle evidence is present and sufficient for deterministic grading",
  MISSING: "required bundle evidence is absent or incomplete",
  FAIL: "bundle generation or deterministic bundle checks failed",
});
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

Options:
  --cases <path>        Eval case JSONL path. Defaults to qa/evals/pilar-core-evals.jsonl.
  --scratch-dir <path>  Planned artifact bundle root. Defaults to /tmp/pilar-live-eval.
  --require-trace       Plan trace evidence as required for future live execution.
  --json                Emit the dry-run plan as stable JSON.

Scope:
  Dry-run only. Prints planned /tmp bundle paths and offline grading commands.
  No LLM calls, no Supabase reads, no pipeline execution, no writes.
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

function assertOutsideRepo(bundlePath) {
  const repoRoot = path.resolve(".");
  const resolvedBundlePath = path.resolve(bundlePath);
  const relativeToRepo = path.relative(repoRoot, resolvedBundlePath);
  if (relativeToRepo && !relativeToRepo.startsWith("..") && !path.isAbsolute(relativeToRepo)) {
    throw new Error(`planned artifact bundle path must be outside the repo: ${bundlePath}`);
  }
}

function quoteArg(value) {
  return JSON.stringify(String(value));
}

function buildPlannedCommands(bundlePath) {
  const quotedBundlePath = quoteArg(bundlePath);
  return {
    grade_bundle: `node scripts/grade-eval-artifact.mjs --bundle ${quotedBundlePath}`,
    grade_bundle_json: `node scripts/grade-eval-artifact.mjs --bundle ${quotedBundlePath} --json`,
  };
}

function buildPlannedFileInventory() {
  return BUNDLE_FILES.map((file) => ({
    file,
    planned: true,
    written: false,
  }));
}

function buildDryRunPlan(evalCase, args) {
  const bundlePath = joinBundlePath(args.scratchDir, evalCase.case_id, DRY_RUN_ID);
  assertOutsideRepo(bundlePath);
  const manualReviewRequired = Boolean(evalCase.manual_review_required);
  const plannedManifest = {
    schema_version: BUNDLE_SCHEMA_VERSION,
    case_id: evalCase.case_id,
    run_id: null,
    created_at: null,
    manual_review_required: manualReviewRequired,
    source: {
      cases_path: args.casesPath,
      runner: RUNNER_PATH,
    },
  };

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
    bundle_status: "PLAN",
    bundle_status_taxonomy: BUNDLE_STATUS_TAXONOMY,
    dry_run: true,
    manual_review_required: manualReviewRequired,
    artifact_bundle: {
      path: bundlePath,
      files: BUNDLE_FILES,
    },
    planned_file_inventory: buildPlannedFileInventory(),
    manifest_preview: plannedManifest,
    planned_manifest: plannedManifest,
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
    planned_commands: buildPlannedCommands(bundlePath),
  };
}

function formatTextPlan(plan) {
  return [
    `DRY_RUN ${plan.case_id}`,
    `title: ${plan.title}`,
    `priority: ${plan.priority}`,
    `domain: ${plan.domain}`,
    `standard_context: ${plan.standard_context}`,
    `display_language: ${plan.display_language}`,
    `target_agents: ${plan.target_agents.join(", ")}`,
    `dry_run: ${plan.dry_run}`,
    `run_id: ${plan.run_id}`,
    `run_status: ${plan.run_status}`,
    `eval_status: ${plan.eval_status}`,
    `bundle_status: ${plan.bundle_status}`,
    `bundle_status_taxonomy: ${Object.keys(plan.bundle_status_taxonomy).join(", ")}`,
    `artifact_bundle: ${plan.artifact_bundle.path}`,
    "bundle_write_plan: temp_path_only; dry_run writes no files",
    `artifact_files: ${plan.artifact_bundle.files.join(", ")}`,
    `manifest_schema: ${plan.manifest_preview.schema_version}`,
    `manifest_case_id: ${plan.manifest_preview.case_id}`,
    `manifest_cases_path: ${plan.manifest_preview.source.cases_path}`,
    `manifest_runner: ${plan.manifest_preview.source.runner}`,
    `manual_review_required: ${plan.manual_review_required}`,
    `rule_summary: checked=${plan.rule_summary.checked}, failed=${plan.rule_summary.failed}, skipped=${plan.rule_summary.skipped.length}`,
    `trace_summary: checked=${plan.trace_summary.checked}, failed=${plan.trace_summary.failed}, warnings=${plan.trace_summary.warnings.length}`,
    `grade_command: ${plan.planned_commands.grade_bundle}`,
    `grade_json_command: ${plan.planned_commands.grade_bundle_json}`,
    "live_pipeline_execution: false",
    "supabase_reads: false",
    "repo_writes: false",
    `require_trace: ${plan.planned_action.require_trace}`,
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

  let plan;
  try {
    plan = buildDryRunPlan(evalCase, args);
  } catch (error) {
    console.error(`FAILED live eval runner: ${error.message}`);
    process.exit(2);
  }

  console.log(args.json ? JSON.stringify(plan, null, 2) : formatTextPlan(plan));
}

main();

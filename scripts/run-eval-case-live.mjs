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
const EVIDENCE_SOURCE_LABELS = Object.freeze({
  fixture: "local fixture evidence; no live runtime read",
  dry_run: "planning evidence only; no files written and no runtime read",
  cached_report: "previously captured report evidence; freshness must be checked",
  live_read: "read-only runtime evidence from an existing PILAR run",
});
const EVIDENCE_SOURCE_MODES = Object.freeze(Object.keys(EVIDENCE_SOURCE_LABELS));
const EVIDENCE_FRESHNESS_LABELS = Object.freeze({
  current: "evidence was explicitly assessed as fresh enough for the requested proof",
  stale: "evidence exists, but freshness is too old or unknown for release proof",
  unknown: "freshness has not been assessed yet",
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
    runId: "",
    scratchDir: DEFAULT_SCRATCH_DIR,
    dryRun: true,
    mode: "dry_run",
    requireTrace: false,
    json: false,
    checkLiveReadContract: false,
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

    if (token === "--check-live-read-contract") {
      args.checkLiveReadContract = true;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      args.mode = "dry_run";
      continue;
    }

    if (token === "--mode") {
      args.mode = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--mode=")) {
      args.mode = token.slice("--mode=".length);
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

    if (token === "--run-id") {
      args.runId = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--run-id=")) {
      args.runId = token.slice("--run-id=".length);
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

function validateRunIdInput(runId) {
  if (!runId) return;
  if (runId.length > 128) {
    throw new Error("--run-id must be 128 characters or fewer");
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(runId)) {
    throw new Error("--run-id may only contain letters, numbers, dots, underscores, colons, and hyphens");
  }
}

function validateEvidenceModeInput(args) {
  if (!EVIDENCE_SOURCE_MODES.includes(args.mode)) {
    throw new Error(`--mode must be one of: ${EVIDENCE_SOURCE_MODES.join(", ")}`);
  }

  if (args.mode === "live_read" && !args.runId) {
    throw new Error("--mode live_read requires --run-id <id> because live-read must target one existing run");
  }
}

function printHelp() {
  console.log(`PILAR live eval single-case runner

Usage:
  node scripts/run-eval-case-live.mjs --case-id <id> --dry-run
  node scripts/run-eval-case-live.mjs --case-id <id> --mode live_read --run-id <id> --json
  node scripts/run-eval-case-live.mjs --case-id <id> --scratch-dir /tmp/pilar-live-eval
  node scripts/run-eval-case-live.mjs --case-id <id> --run-id <id> --json
  node scripts/run-eval-case-live.mjs --case-id <id> --json
  node scripts/run-eval-case-live.mjs --check-live-read-contract

Options:
  --cases <path>        Eval case JSONL path. Defaults to qa/evals/pilar-core-evals.jsonl.
  --mode <mode>         Evidence request mode: dry_run, fixture, cached_report, or live_read.
  --run-id <id>         Future live-read run id input. Validated, but not read yet.
  --scratch-dir <path>  Planned artifact bundle root. Defaults to /tmp/pilar-live-eval.
  --require-trace       Plan trace evidence as required for future live execution.
  --json                Emit the dry-run plan as stable JSON.

Scope:
  Dry-run only. Prints planned /tmp bundle paths and offline grading commands.
  No LLM calls, no Supabase reads, no pipeline execution, no writes.
  live_read mode is a read-only request contract only; missing evidence is WARN/FAIL, never PASS.
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

function buildEvidenceRequestContract(args) {
  const liveReadRequested = args.mode === "live_read";
  return {
    mode: args.mode,
    labels: EVIDENCE_SOURCE_LABELS,
    read_only_by_design: true,
    live_read_enabled: false,
    requires_existing_run_id: liveReadRequested,
    requested_run_id: args.runId || null,
    evidence_freshness: "unknown",
    freshness_labels: EVIDENCE_FRESHNESS_LABELS,
    freshness_checked: false,
    freshness_checked_at: null,
    freshness_source: null,
    freshness_reason: null,
    freshness_required_for_release: false,
    missing_evidence_policy: {
      missing_required_report: "FAIL",
      missing_required_trace: args.requireTrace ? "FAIL" : "WARN",
      stale_cached_report: "WARN",
      infer_pass_from_absence: false,
    },
    professional_approval: false,
    refusal_reason: liveReadRequested
      ? "live-read runtime/report reads are not implemented in this dry interface"
      : null,
  };
}

function buildDryRunPlan(evalCase, args) {
  const bundlePath = joinBundlePath(args.scratchDir, evalCase.case_id, DRY_RUN_ID);
  assertOutsideRepo(bundlePath);
  const manualReviewRequired = Boolean(evalCase.manual_review_required);
  const requestedRunId = args.runId || null;
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
    evidence_source: "dry_run",
    requested_evidence_source: args.mode,
    evidence_source_labels: EVIDENCE_SOURCE_LABELS,
    evidence_freshness: "unknown",
    evidence_freshness_labels: EVIDENCE_FRESHNESS_LABELS,
    freshness_checked_at: null,
    freshness_source: null,
    freshness_reason: null,
    freshness_required_for_release: false,
    evidence_request_contract: buildEvidenceRequestContract(args),
    requested_run_id: requestedRunId,
    run_id: null,
    run_status: "SKIP",
    eval_status: "SKIP",
    bundle_status: "PLAN",
    bundle_status_taxonomy: BUNDLE_STATUS_TAXONOMY,
    dry_run: true,
    manual_review_required: manualReviewRequired,
    professional_approval: false,
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
    run_id_contract: {
      accepted: Boolean(requestedRunId),
      live_read_enabled: false,
      supabase_reads: false,
      refusal_reason: requestedRunId
        ? "run id input accepted for future live-read; runtime evidence reads are not implemented"
        : null,
    },
    planned_action: {
      live_pipeline_execution: false,
      supabase_reads: false,
      llm_calls: false,
      repo_writes: false,
      read_only_runtime_report_request: args.mode === "live_read",
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
    `evidence_source: ${plan.evidence_source}`,
    `requested_evidence_source: ${plan.requested_evidence_source}`,
    `evidence_source_labels: ${Object.keys(plan.evidence_source_labels).join(", ")}`,
    `evidence_freshness: ${plan.evidence_freshness}`,
    `evidence_freshness_labels: ${Object.keys(plan.evidence_freshness_labels).join(", ")}`,
    `freshness_checked_at: ${plan.freshness_checked_at}`,
    `freshness_source: ${plan.freshness_source}`,
    `freshness_reason: ${plan.freshness_reason}`,
    `freshness_required_for_release: ${plan.freshness_required_for_release}`,
    `missing_evidence_policy: report=${plan.evidence_request_contract.missing_evidence_policy.missing_required_report}, trace=${plan.evidence_request_contract.missing_evidence_policy.missing_required_trace}, infer_pass_from_absence=${plan.evidence_request_contract.missing_evidence_policy.infer_pass_from_absence}`,
    `dry_run: ${plan.dry_run}`,
    `requested_run_id: ${plan.requested_run_id}`,
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
    `professional_approval: ${plan.professional_approval}`,
    `rule_summary: checked=${plan.rule_summary.checked}, failed=${plan.rule_summary.failed}, skipped=${plan.rule_summary.skipped.length}`,
    `trace_summary: checked=${plan.trace_summary.checked}, failed=${plan.trace_summary.failed}, warnings=${plan.trace_summary.warnings.length}`,
    `run_id_contract: accepted=${plan.run_id_contract.accepted}, live_read_enabled=${plan.run_id_contract.live_read_enabled}`,
    `read_only_runtime_report_request: ${plan.planned_action.read_only_runtime_report_request}`,
    `grade_command: ${plan.planned_commands.grade_bundle}`,
    `grade_json_command: ${plan.planned_commands.grade_bundle_json}`,
    "live_pipeline_execution: false",
    "supabase_reads: false",
    "llm_calls: false",
    "repo_writes: false",
    `require_trace: ${plan.planned_action.require_trace}`,
  ].join("\n");
}

function assertContract(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildContractCheckArgs(overrides = {}) {
  return {
    casesPath: DEFAULT_CASES,
    caseId: "pilar_eval_prompt_leakage_uk_en_012",
    runId: "eval-contract-check-68A32",
    scratchDir: DEFAULT_SCRATCH_DIR,
    dryRun: true,
    mode: "live_read",
    requireTrace: false,
    json: true,
    checkLiveReadContract: false,
    help: false,
    ...overrides,
  };
}

function runLiveReadContractCheck() {
  let refusedWithoutRunId = false;
  try {
    validateEvidenceModeInput(buildContractCheckArgs({ runId: "" }));
  } catch (error) {
    refusedWithoutRunId = error.message.includes("--run-id");
  }
  assertContract(refusedWithoutRunId, "--mode live_read must refuse when --run-id is missing");

  const cases = readJsonl(DEFAULT_CASES);
  const evalCase = cases.find((candidate) => candidate.case_id === "pilar_eval_prompt_leakage_uk_en_012");
  assertContract(Boolean(evalCase), "contract check case is missing from qa/evals/pilar-core-evals.jsonl");

  const plan = buildDryRunPlan(evalCase, buildContractCheckArgs());
  assertContract(plan.evidence_source === "dry_run", "live_read plan must remain dry_run evidence");
  assertContract(plan.requested_evidence_source === "live_read", "live_read request mode must be visible");
  assertContract(plan.evidence_freshness === "unknown", "freshness must remain unknown until assessed");
  assertContract(
    Object.keys(plan.evidence_freshness_labels).join(",") === "current,stale,unknown",
    "freshness labels must remain stable"
  );
  assertContract(
    plan.evidence_request_contract.freshness_checked === false,
    "freshness must not be marked checked by the dry interface"
  );
  assertContract(plan.freshness_checked_at === null, "dry interface must not set freshness_checked_at");
  assertContract(plan.freshness_source === null, "dry interface must not set freshness_source");
  assertContract(plan.freshness_reason === null, "dry interface must not set freshness_reason");
  assertContract(
    plan.freshness_required_for_release === false,
    "dry interface must not require freshness for release proof"
  );
  assertContract(
    plan.evidence_request_contract.freshness_checked_at === null,
    "contract must not set freshness_checked_at in dry mode"
  );
  assertContract(
    plan.evidence_request_contract.freshness_source === null,
    "contract must not set freshness_source in dry mode"
  );
  assertContract(
    plan.evidence_request_contract.freshness_reason === null,
    "contract must not set freshness_reason in dry mode"
  );
  assertContract(
    plan.evidence_request_contract.freshness_required_for_release === false,
    "contract must not treat dry freshness as release proof"
  );
  assertContract(plan.evidence_request_contract.live_read_enabled === false, "live_read must not be enabled yet");
  assertContract(plan.planned_action.supabase_reads === false, "live_read dry interface must not read Supabase");
  assertContract(plan.planned_action.llm_calls === false, "live_read dry interface must not call LLMs");
  assertContract(plan.planned_action.repo_writes === false, "live_read dry interface must not write repo artifacts");
  assertContract(plan.professional_approval === false, "live_read evidence must not imply professional approval");
  assertContract(
    plan.evidence_request_contract.missing_evidence_policy.missing_required_report === "FAIL",
    "missing required report evidence must be FAIL"
  );
  assertContract(
    plan.evidence_request_contract.missing_evidence_policy.missing_required_trace === "WARN",
    "missing trace evidence must be WARN by default"
  );
  assertContract(
    plan.evidence_request_contract.missing_evidence_policy.infer_pass_from_absence === false,
    "missing evidence must not infer PASS"
  );

  const traceRequiredPlan = buildDryRunPlan(evalCase, buildContractCheckArgs({ requireTrace: true }));
  assertContract(
    traceRequiredPlan.evidence_request_contract.missing_evidence_policy.missing_required_trace === "FAIL",
    "missing trace evidence must be FAIL when --require-trace is set"
  );

  console.log("OK live_read contract: refusal and dry plan-shape locked");
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

  if (args.checkLiveReadContract) {
    try {
      runLiveReadContractCheck();
    } catch (error) {
      console.error(`FAILED live_read contract: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  if (!args.caseId) {
    console.error("FAILED live eval runner: --case-id is required");
    process.exit(2);
  }

  try {
    validateRunIdInput(args.runId);
    validateEvidenceModeInput(args);
  } catch (error) {
    console.error(`FAILED live eval runner: ${error.message}`);
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

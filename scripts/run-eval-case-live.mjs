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

function isPlainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stopConditionStatus(condition, args) {
  if (condition === "missing_run_id" || condition === "malformed_run_id" || condition === "run_not_found") {
    return "MISSING";
  }
  if (
    condition === "eval_case_mismatch" ||
    condition === "report_row_missing" ||
    condition === "report_claimed_but_empty" ||
    condition === "unsafe_trace_payload" ||
    condition === "professional_approval_implication"
  ) {
    return "FAIL";
  }
  if (condition === "completed_run_missing_terminal_trace") {
    return args.requireTrace ? "FAIL" : "WARN";
  }
  if (condition === "failed_step_missing_error_category") {
    return args.requireTrace ? "FAIL" : "WARN";
  }
  return "WARN";
}

function highestDiagnosticStatus({ failures, missing, warnings }) {
  if (failures.length > 0) return "FAIL";
  if (missing.length > 0) return "MISSING";
  if (warnings.length > 0) return "WARN";
  return "READY";
}

function bundleStatusFromDiagnosticStatus(status) {
  if (status === "FAIL") return "FAIL";
  if (status === "MISSING") return "MISSING";
  return "READY";
}

function mapDiagnosticLiveReadEvidenceToEvalOutput(runtimeEvidence, args = {}) {
  const requireTrace = Boolean(args.requireTrace);
  const evidence = isPlainRecord(runtimeEvidence) ? runtimeEvidence : {};
  const stopConditions = Array.isArray(evidence.stop_conditions)
    ? uniqueValues(evidence.stop_conditions.map((condition) => cleanText(condition)))
    : [];
  const runSummary = isPlainRecord(evidence.run_summary) ? evidence.run_summary : {};
  const reportEvidence = isPlainRecord(evidence.report_evidence) ? evidence.report_evidence : null;
  const runtimeTraceSummary = isPlainRecord(evidence.trace_summary) ? evidence.trace_summary : null;
  const traceSteps = Array.isArray(runtimeTraceSummary?.steps) ? runtimeTraceSummary.steps : [];
  const failures = [];
  const missing = [];
  const warnings = [];

  if (!isPlainRecord(runtimeEvidence)) {
    missing.push("runtime_evidence_missing");
  }

  for (const condition of stopConditions) {
    const status = stopConditionStatus(condition, { requireTrace });
    if (status === "FAIL") failures.push(condition);
    else if (status === "MISSING") missing.push(condition);
    else warnings.push(condition);
  }

  if (!cleanText(runSummary.requested_run_id) && !cleanText(runSummary.run_id)) {
    missing.push("missing_run_id");
  }

  if (!reportEvidence) {
    missing.push("report_evidence_missing");
  } else if (reportEvidence.has_report === true && !cleanText(reportEvidence.report_text)) {
    failures.push("report_claimed_but_empty");
  }

  if (!runtimeTraceSummary || traceSteps.length === 0) {
    const traceStatus = requireTrace ? "FAIL" : "WARN";
    if (traceStatus === "FAIL") failures.push("trace_summary_missing");
    else warnings.push("trace_summary_missing");
  }

  const diagnosticStatus = highestDiagnosticStatus({
    failures,
    missing,
    warnings,
  });

  return {
    evidence_source: "live_read",
    requested_evidence_source: "live_read",
    diagnostic_only: true,
    diagnostic_status: diagnosticStatus,
    bundle_status: bundleStatusFromDiagnosticStatus(diagnosticStatus),
    bundle_status_taxonomy: BUNDLE_STATUS_TAXONOMY,
    dry_run: false,
    professional_approval: false,
    release_proof_status: "not_available",
    release_proof_reason: "diagnostic_live_read_only",
    runtime_release_proof_status: cleanText(evidence.release_proof_status),
    runtime_release_proof_reason: cleanText(evidence.release_proof_reason),
    freshness_required_for_release: false,
    requested_run_id: cleanText(runSummary.requested_run_id) ?? cleanText(args.runId),
    run_id: cleanText(runSummary.run_id),
    run_status: cleanText(runSummary.run_status),
    eval_case_id: cleanText(runSummary.eval_case_id),
    runtime_stop_conditions: stopConditions,
    diagnostic_summary: {
      failures: uniqueValues(failures),
      missing: uniqueValues(missing),
      warnings: uniqueValues(warnings),
      infer_pass_from_absence: false,
    },
    report_evidence_summary: {
      has_report: reportEvidence?.has_report === true,
      report_id: cleanText(reportEvidence?.report_id),
      report_locale: cleanText(reportEvidence?.report_locale),
      report_text_present: Boolean(cleanText(reportEvidence?.report_text)),
      disclaimer_present: reportEvidence?.disclaimer_present === true,
      blocked_fields_count: Array.isArray(reportEvidence?.blocked_fields) ? reportEvidence.blocked_fields.length : 0,
    },
    trace_summary: {
      checked: traceSteps.length,
      failed: uniqueValues(failures.filter((failure) => failure.includes("trace") || failure.includes("step"))).length,
      warnings: uniqueValues(warnings.filter((warning) => warning.includes("trace") || warning.includes("step"))),
    },
    planned_action: {
      live_pipeline_execution: false,
      supabase_reads: false,
      llm_calls: false,
      repo_writes: false,
      read_only_runtime_report_request: true,
      require_trace: requireTrace,
    },
  };
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
    release_proof_status: "not_available",
    release_proof_reason: "dry_interface_only",
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
    release_proof_status: "not_available",
    release_proof_reason: "dry_interface_only",
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
    `release_proof_status: ${plan.release_proof_status}`,
    `release_proof_reason: ${plan.release_proof_reason}`,
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

function diagnosticRuntimeEvidenceFixture(overrides = {}) {
  return {
    evidence_source: "live_read",
    live_read_enabled: true,
    professional_approval: false,
    run_summary: {
      requested_run_id: "eval-contract-check-68A41",
      run_id: "eval-contract-check-68A41",
      eval_case_id: "pilar_eval_prompt_leakage_uk_en_012",
      run_status: "completed",
    },
    report_evidence: {
      has_report: true,
      report_id: "report-68A41",
      report_locale: "en",
      report_text: "Calculation note. Must be reviewed by a qualified professional before use.",
      disclaimer_present: true,
      blocked_fields: [],
    },
    trace_summary: {
      steps: [
        {
          step_id: "step-1",
          step_name: "rapportor",
          status: "completed",
          error_category: null,
          redaction_ok: true,
        },
      ],
      terminal_step_count: 1,
      unsafe_trace_payload: false,
    },
    release_proof_status: "FAIL",
    release_proof_reason: "diagnostic_live_read_only",
    stop_conditions: [],
    ...overrides,
  };
}

function runDiagnosticMapperContractCheck() {
  const baseArgs = buildContractCheckArgs();
  const ready = mapDiagnosticLiveReadEvidenceToEvalOutput(diagnosticRuntimeEvidenceFixture(), baseArgs);
  assertContract(ready.evidence_source === "live_read", "diagnostic mapper must preserve live_read evidence_source");
  assertContract(
    ready.requested_evidence_source === "live_read",
    "diagnostic mapper must preserve requested live_read source"
  );
  assertContract(ready.diagnostic_only === true, "diagnostic mapper output must be diagnostic_only");
  assertContract(ready.professional_approval === false, "diagnostic mapper must not imply professional approval");
  assertContract(
    ready.planned_action.live_pipeline_execution === false,
    "diagnostic mapper must not imply live pipeline execution"
  );
  assertContract(ready.planned_action.repo_writes === false, "diagnostic mapper must not write repo artifacts");
  assertContract(
    ready.planned_action.supabase_reads === false,
    "diagnostic mapper contract check must not perform Supabase reads"
  );
  assertContract(
    ready.release_proof_status === "not_available",
    "diagnostic mapper must normalize release proof to not_available"
  );
  assertContract(
    ready.release_proof_reason === "diagnostic_live_read_only",
    "diagnostic mapper must normalize release proof reason"
  );
  assertContract(
    ready.runtime_release_proof_status === "FAIL",
    "diagnostic mapper should retain Runtime's internal release-proof denial separately"
  );
  assertContract(
    ready.freshness_required_for_release === false,
    "diagnostic mapper must not require freshness for release proof"
  );

  const missingRun = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({
      stop_conditions: ["run_not_found"],
      run_summary: { requested_run_id: "missing-run" },
      report_evidence: null,
      trace_summary: null,
    }),
    baseArgs
  );
  assertContract(missingRun.diagnostic_status === "MISSING", "run_not_found must map to MISSING");
  assertContract(missingRun.bundle_status === "MISSING", "missing diagnostic evidence must not look READY");
  assertContract(
    missingRun.diagnostic_summary.missing.includes("run_not_found"),
    "run_not_found must remain visible in diagnostic missing summary"
  );

  const missingRunId = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({
      stop_conditions: ["missing_run_id"],
      run_summary: {},
    }),
    baseArgs
  );
  assertContract(missingRunId.diagnostic_status === "MISSING", "missing_run_id must map to MISSING");
  assertContract(
    missingRunId.diagnostic_summary.missing.includes("missing_run_id"),
    "missing_run_id must remain visible in diagnostic missing summary"
  );

  const malformedRunId = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({
      stop_conditions: ["malformed_run_id"],
      run_summary: { requested_run_id: "bad run id" },
    }),
    baseArgs
  );
  assertContract(malformedRunId.diagnostic_status === "MISSING", "malformed_run_id must map to MISSING");
  assertContract(
    malformedRunId.diagnostic_summary.missing.includes("malformed_run_id"),
    "malformed_run_id must remain visible in diagnostic missing summary"
  );

  const mismatch = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({ stop_conditions: ["eval_case_mismatch"] }),
    baseArgs
  );
  assertContract(mismatch.diagnostic_status === "FAIL", "eval_case_mismatch must map to FAIL");
  assertContract(mismatch.evidence_source === "live_read", "failed diagnostic fixture must keep evidence_source stable");
  assertContract(
    mismatch.requested_evidence_source === "live_read",
    "failed diagnostic fixture must keep requested_evidence_source stable"
  );

  const missingReportRow = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({
      stop_conditions: ["report_row_missing"],
      report_evidence: null,
    }),
    baseArgs
  );
  assertContract(missingReportRow.diagnostic_status === "FAIL", "report_row_missing must map to FAIL");
  assertContract(
    missingReportRow.diagnostic_summary.failures.includes("report_row_missing"),
    "report_row_missing must remain visible in diagnostic failure summary"
  );

  const emptyClaimedReport = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({
      report_evidence: {
        has_report: true,
        report_id: "empty-report-68A42",
        report_locale: "en",
        report_text: "",
        disclaimer_present: false,
        blocked_fields: [],
      },
    }),
    baseArgs
  );
  assertContract(
    emptyClaimedReport.diagnostic_status === "FAIL",
    "report_claimed_but_empty must map to FAIL even without Runtime stop_conditions"
  );
  assertContract(
    emptyClaimedReport.diagnostic_summary.failures.includes("report_claimed_but_empty"),
    "report_claimed_but_empty must remain visible in diagnostic failure summary"
  );

  const traceWarn = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({
      stop_conditions: ["completed_run_missing_terminal_trace"],
      trace_summary: { steps: [] },
    }),
    baseArgs
  );
  assertContract(traceWarn.diagnostic_status === "WARN", "missing trace must WARN by default");
  assertContract(traceWarn.bundle_status === "READY", "non-required trace warnings may leave bundle READY");

  const traceFail = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({
      stop_conditions: ["completed_run_missing_terminal_trace"],
      trace_summary: { steps: [] },
    }),
    buildContractCheckArgs({ requireTrace: true })
  );
  assertContract(traceFail.diagnostic_status === "FAIL", "missing trace must FAIL when --require-trace is set");

  const unsafe = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({ stop_conditions: ["unsafe_trace_payload"] }),
    baseArgs
  );
  assertContract(unsafe.diagnostic_status === "FAIL", "unsafe trace payload must map to FAIL");

  const approval = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({ stop_conditions: ["professional_approval_implication"] }),
    baseArgs
  );
  assertContract(approval.diagnostic_status === "FAIL", "professional approval implication must map to FAIL");

  const failedStep = mapDiagnosticLiveReadEvidenceToEvalOutput(
    diagnosticRuntimeEvidenceFixture({ stop_conditions: ["failed_step_missing_error_category"] }),
    baseArgs
  );
  assertContract(failedStep.diagnostic_status === "WARN", "missing failed-step error category must WARN by default");

  const encoded = JSON.stringify([
    ready,
    missingRun,
    missingRunId,
    malformedRunId,
    mismatch,
    missingReportRow,
    emptyClaimedReport,
    traceWarn,
    traceFail,
    unsafe,
    approval,
    failedStep,
  ]);
  assertContract(!encoded.includes('"PASS"'), "diagnostic mapper must never infer PASS from absence");
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
    plan.release_proof_status === "not_available",
    "dry interface must mark release proof as not_available"
  );
  assertContract(
    plan.release_proof_reason === "dry_interface_only",
    "dry interface must explain release proof as dry_interface_only"
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
  assertContract(
    plan.evidence_request_contract.release_proof_status === "not_available",
    "contract must mark release proof as not_available in dry mode"
  );
  assertContract(
    plan.evidence_request_contract.release_proof_reason === "dry_interface_only",
    "contract must explain release proof as dry_interface_only in dry mode"
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

  runDiagnosticMapperContractCheck();

  console.log("OK live_read contract: refusal, dry plan-shape, and diagnostic mapper locked");
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

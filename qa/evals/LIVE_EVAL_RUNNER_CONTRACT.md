# PILAR Live Eval Runner Contract

**Status:** Draft contract with dry-run implementation  
**Lane:** Chat A / Live Eval Bridge  
**Runtime impact:** None  

This contract defines the smallest safe boundary for a single-case live eval
runner. The first implementation is a dry-run planner only. The goal is to make
future live execution boring, auditable, and hard to confuse with offline
readiness.

## Purpose

The future runner should prove one narrow thing:

```txt
One eval case was executed as one auditable PILAR run, and the resulting output
was checked against deterministic rules and trace expectations.
```

It must not claim broad release confidence, full batch coverage, or professional
engineering approval.

## Non-goals

The first runner must not:

```txt
run every eval case by default
write generated repo artifacts
call an LLM grader
modify agent prompts
modify database schema
join agent:all
hide missing trace data behind a PASS
use old stored reports as proof of new runtime behavior
```

## Command shape

Future command shape:

```bash
node scripts/run-eval-case-live.mjs --case-id <case_id> --dry-run
node scripts/run-eval-case-live.mjs --case-id <case_id> --scratch-dir /tmp/pilar-live-eval
```

Default mode should be dry-run until the implementation has explicit safeguards.
The current implementation always behaves as a dry-run planner.

## Inputs

Required:

```txt
case_id
```

Optional:

```txt
--cases <path>                defaults to qa/evals/pilar-core-evals.jsonl
--scratch-dir <path>          defaults to /tmp/pilar-live-eval
--dry-run                     prints planned action only
--require-trace               plans trace evidence as required for future live execution
--json                        emits machine-readable result
```

The runner should reject unknown `case_id` values using the same JSONL source as
`scripts/grade-eval-artifact.mjs`.

## Outputs

Text output should include:

```txt
case_id
title
priority
domain
standard_context
display_language
target_agents
dry_run
run_id, if a run was created or inspected
run_status
eval_status: PASS | FAIL | WARN | SKIP
bundle_status: PASS | FAIL | WARN | SKIP
artifact bundle path, if written outside the repo
manifest case source and runner path
offline grading commands for the artifact bundle, if planned
rule checks summary
trace assertions summary
manual_review_required
require_trace
```

JSON output should use stable snake_case keys:

```json
{
  "case_id": "pilar_eval_example_001",
  "run_id": "uuid-or-null",
  "run_status": "completed",
  "eval_status": "WARN",
  "bundle_status": "WARN",
  "manual_review_required": true,
  "artifact_bundle": {
    "path": "/tmp/pilar-live-eval/pilar_eval_example_001",
    "files": []
  },
  "rule_summary": {
    "checked": 0,
    "failed": 0,
    "skipped": []
  },
  "trace_summary": {
    "checked": 0,
    "failed": 0,
    "warnings": []
  }
}
```

## Artifact bundle

The first comparable bundle should follow
[LIVE_EVAL_ARTIFACT_BUNDLE_CONTRACT.md](LIVE_EVAL_ARTIFACT_BUNDLE_CONTRACT.md).
It should be small:

```txt
runrecord-summary.json
report-text.txt
trace-events-summary.json
step-metadata-summary.json
grade-result.json
```

The bundle should live under `/tmp` by default. Writing into `qa/evals/reports/`
should require an explicit later sprint.

## Trace assertions

Minimum trace assertions:

```txt
eval_case_id is present on the run
expected target agents have completion or clear failure evidence
step metadata includes model and prompt_version when a model call happened
errors are categorized without secrets or raw credentials
```

Missing trace data should produce `WARN` or `FAIL`, not a silent pass.

## Exit codes

```txt
0  eval passed or dry-run succeeded
1  deterministic eval failed
2  runner contract/setup error
3  trace evidence missing or incomplete when required
```

## First implementation boundary

The current implementation starts with `--dry-run` and `--case-id` lookup only.
It prints the planned runtime action, expected scratch paths, and offline
grading commands for the planned artifact bundle, including whether trace
evidence is planned as required. Actual pipeline execution should wait until
Chat B confirms the runtime read path and artifact bundle are stable enough.

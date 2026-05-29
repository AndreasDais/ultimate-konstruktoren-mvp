# PILAR Live Eval Artifact Bundle Contract

**Status:** Draft contract  
**Lane:** Chat A / Live Eval Bridge  
**Runtime impact:** None  

This contract defines the first artifact bundle shape for future live eval
evidence. It names the files and fields a single-case live eval runner should
produce after one auditable PILAR run.

The bundle is not a second source of truth. It is a small evidence package
extracted from canonical runtime data, report data, and trace data.

## Purpose

The bundle should let deterministic graders answer three questions:

```txt
What case was run?
What user-facing output was produced?
Was the run trace auditable enough to trust the evidence?
```

## Non-goals

The first bundle must not:

```txt
store full raw LLM envelopes
store secrets or service-role data
store a second canonical report model
rewrite generated repo reports
claim professional engineering approval
hide missing report or trace evidence behind PASS
```

## Default location

Future live eval runners should write bundles outside the repo by default:

```txt
/tmp/pilar-live-eval/<case_id>/<run_id>/
```

Writing under `qa/evals/reports/` should require a later explicit sprint.

## Files

Minimum bundle:

```txt
manifest.json
runrecord-summary.json
report-text.txt
trace-events-summary.json
step-metadata-summary.json
grade-result.json
```

Optional later files:

```txt
web-report-text.txt
word-export-text.txt
pdf-print-text.txt
artifact-parity-summary.json
```

## manifest.json

Required top-level keys:

```txt
schema_version
case_id
run_id
created_at
manual_review_required
source
```

Required `source` keys:

```txt
cases_path
runner
```

```json
{
  "schema_version": "live-eval-artifact-bundle.v0",
  "case_id": "pilar_eval_example_001",
  "run_id": "uuid",
  "created_at": "2026-05-28T00:00:00.000Z",
  "manual_review_required": true,
  "source": {
    "cases_path": "qa/evals/pilar-core-evals.jsonl",
    "runner": "scripts/run-eval-case-live.mjs"
  }
}
```

## runrecord-summary.json

This file should contain a small summary, not the full `RunRecord` payload:

```json
{
  "run_id": "uuid",
  "eval_case_id": "pilar_eval_example_001",
  "run_status": "completed",
  "display_language": "en",
  "standard_context": "eurocode_general",
  "target_agents": ["pipeline"],
  "has_report": true
}
```

## report-text.txt

Plain text extracted from canonical report/result data. It should be suitable
for `scripts/grade-eval-artifact.mjs --artifact <file>`.

If the report text cannot be extracted, the runner should write a clear marker
and set bundle status to `MISSING` or `FAIL`; it should not produce an empty
file that looks like valid evidence.

## trace-events-summary.json

```json
{
  "run_id": "uuid",
  "events_checked": 0,
  "expected_agents": ["pipeline"],
  "missing_completion_events": [],
  "failure_events": [],
  "warnings": []
}
```

## step-metadata-summary.json

This file should summarize metadata needed for audit, without raw messages:

```json
{
  "run_id": "uuid",
  "steps": [
    {
      "step_name": "konstruktor_a",
      "model": "model-name",
      "prompt_version": "version",
      "stop_reason": "end_turn",
      "ok": true,
      "error_category": null
    }
  ],
  "warnings": []
}
```

## grade-result.json

This file should reuse the deterministic result shape from the offline artifact
grader where possible:

```json
{
  "case_id": "pilar_eval_example_001",
  "status": "PASS",
  "checked": 0,
  "failed": 0,
  "skipped": [],
  "checks": []
}
```

## Bundle status

The future runner should report the overall bundle status separately from the
rule-grader status:

```txt
SKIP     no bundle planning or live execution was requested
PLAN     dry-run bundle plan only; no files written
READY    bundle evidence is present and sufficient for deterministic grading
MISSING  required bundle evidence is absent or incomplete
FAIL     bundle generation or deterministic bundle checks failed
```

## First implementation boundary

The first implementation should only create the directory plan, dry-run manifest
preview, bundle status, and offline grading commands. Actual report extraction
should wait until Chat B confirms the canonical read path for result/report text.

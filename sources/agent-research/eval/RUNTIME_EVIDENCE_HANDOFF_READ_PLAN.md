# Runtime Evidence Handoff Read Plan

**Sprint:** 68A.11  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Handoff request for Runtime lane  

This document defines the minimum runtime/report fields Chat A needs before the
live eval runner can add a safe read-only evidence mode. It is a contract
request, not an implementation. It does not authorize Supabase reads, service
role usage, LLM calls, live pipeline execution, or repo artifact writes.

## Goal

Future live-read eval mode should be able to assemble an evidence bundle from a
single already-existing PILAR run, then grade extracted canonical report text.
The read path must prove enough about the run to avoid confusing dry-run
planning with live proof.

## Minimum run fields

The runtime handoff should expose a small, user-scoped run summary:

```txt
run_id
eval_case_id
run_status
created_at
completed_at
display_language
standard_context
target_agents
manual_review_required
evidence_source
```

Requirements:

```txt
run_id is non-empty and stable
eval_case_id matches the requested eval case when present
run_status is terminal or clearly non-terminal
display_language is UI/report shell context, not a translated JSON key
standard_context is explicit; unknown/unsupported must not be hidden
evidence_source distinguishes live_read from dry_run and cached_report
manual_review_required remains visible
```

## Minimum report fields

The eval lane needs report evidence extracted from the canonical report/result
source, not from UI scraping or duplicate ad hoc report data:

```txt
has_report
report_locale
report_text
blocked_fields
report_model_version
disclaimer_present
```

Requirements:

```txt
report_text omits or marks blocked values instead of leaking them as prose
blocked_fields are machine-readable enough for Eval to assert they stayed blocked
report_locale describes generated prose locale and may differ from UI locale
disclaimer_present proves review language exists, not professional approval
report_model_version is non-secret and optional if not recorded yet
```

## Minimum trace fields

The eval lane needs a redacted step/trace summary, not raw provider payloads:

```txt
run_id
steps[]
step_id
step_name
status
started_at
completed_at
model
prompt_version
stop_reason
error_category
```

Requirements:

```txt
step_id values are unique within a run
step_name maps to stable target_agents where possible
status distinguishes completed, failed, skipped, and blocked
model and prompt_version are safe metadata only
error_category is bounded and redacted
raw provider ids, raw prompts, secrets, stack traces, and service keys are absent
```

## Bundle mapping

When the handoff exists, Eval can map runtime evidence into the planned bundle:

| Bundle file | Source fields |
|---|---|
| `manifest.json` | `run_id`, `eval_case_id`, `created_at`, runner metadata |
| `runrecord-summary.json` | minimum run fields |
| `report-text.txt` | canonical `report_text` with blocked fields preserved as blocked |
| `trace-events-summary.json` | trace step statuses and missing-completion summary |
| `step-metadata-summary.json` | redacted model/prompt/error metadata |
| `grade-result.json` | deterministic eval grader output |

## Refusal conditions

Eval live-read mode should refuse or mark evidence missing when:

```txt
run_id is absent
run ownership cannot be proven by the runtime read path
eval_case_id conflicts with the requested case
report_text is empty while has_report=true
blocked_fields are absent for a report that indicates blocked output
trace steps contain raw provider payloads or secrets
run_status is non-terminal and the caller requested proof, not planning
```

## Open handoff to Chat B

Chat B should confirm which of these fields already exist on the safe runtime
read path and which need follow-up tests. Until that confirmation exists, Chat A
must keep `supabase_reads=false`, `live_pipeline_execution=false`, and
`bundle_status=PLAN` for dry-run output.

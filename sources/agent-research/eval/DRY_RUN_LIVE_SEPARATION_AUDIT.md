# Dry-Run / Live Separation Audit

**Sprint:** 68A.8  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Planning contract  

This audit names the fields that must differ between the current dry-run live
eval plan and a future live-proof eval result. The goal is to keep planning
evidence useful without letting release gates, reports, or humans mistake it for
proof from a real PILAR run.

## Current dry-run invariant

The current runner must remain planning-only:

```txt
dry_run=true
run_id=null
run_status=SKIP
eval_status=SKIP
bundle_status=PLAN
live_pipeline_execution=false
supabase_reads=false
repo_writes=false
all planned_file_inventory entries have written=false
```

Dry-run may show planned paths, planned commands, planned manifest shape, and
case metadata. It must not create bundle files, call an LLM, read Supabase, run
the PILAR pipeline, or claim that deterministic grading has executed.

## Fields that must differ in live proof

Future live-proof output must change these fields before it can be treated as
runtime evidence:

| Field | Dry-run value | Live-proof expectation |
|---|---|---|
| `dry_run` | `true` | `false` |
| `run_id` | `null` | non-empty runtime run id |
| `run_status` | `SKIP` | terminal runtime status such as completed or failed |
| `eval_status` | `SKIP` | deterministic eval result status after checks run |
| `bundle_status` | `PLAN` | `READY`, `MISSING`, or `FAIL` |
| `planned_action.live_pipeline_execution` | `false` | true only when a separate live sprint explicitly permits execution |
| `planned_action.supabase_reads` | `false` | true only for a read-only, ownership-safe runtime evidence path |
| `planned_action.repo_writes` | `false` | must remain false unless a later sprint permits generated repo artifacts |
| `manifest_preview.run_id` | `null` | same non-empty run id as `run_id` |
| `manifest_preview.created_at` | `null` | timestamp for the artifact bundle creation |
| `planned_manifest` | preview-only object | actual manifest content, or removed in favor of written manifest evidence |
| `planned_file_inventory[].written` | `false` | true only for files actually written under the approved temp bundle path |
| `rule_summary.checked` | `0` | number of deterministic rule checks executed |
| `rule_summary.skipped` | dry-run explanation | only real skipped checks with reasons |
| `trace_summary.checked` | `0` | number of trace assertions evaluated |
| `trace_summary.warnings` | dry-run explanation | real trace warnings, if any |
| `artifact_bundle.path` | temp dry-run path ending in `/dry-run` | temp path ending in the actual run id |

## Fields that may stay stable

These fields may remain the same across dry-run and live proof because they
describe the eval case or runner contract:

```txt
case_id
title
priority
domain
standard_context
display_language
target_agents
manual_review_required
artifact_bundle.files
bundle_status_taxonomy
manifest_preview.schema_version
manifest_preview.source.cases_path
manifest_preview.source.runner
```

## Consumer rule

Consumers must treat `dry_run=true` or `bundle_status=PLAN` as planning evidence
only. They may use it for patch planning, readiness discussion, and release
checklist preparation, but not as proof that PILAR generated, graded, or safely
persisted a real report.

The minimum live-proof predicate is:

```txt
dry_run=false
run_id is non-empty
bundle_status is READY, MISSING, or FAIL
planned_file_inventory contains at least one written=true evidence file
rule_summary.checked > 0 or trace_summary.checked > 0
```

`manual_review_required=true` must remain visible in both modes. Neither dry-run
nor live proof may imply final professional engineering approval.

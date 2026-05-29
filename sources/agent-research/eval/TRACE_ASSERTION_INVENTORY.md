# Trace Assertion Inventory

**Sprint:** 68A.15  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Planning contract  

This inventory lists the trace assertions Eval should require before future
`live_read` evidence can be treated as auditable runtime proof. It does not
authorize Supabase reads, LLM calls, pipeline execution, prompt changes, or repo
artifact writes.

## Baseline assertions for every step

Every trace step exposed to Eval should satisfy these baseline assertions:

```txt
run_id matches the requested run id
step_id is non-empty and unique within the run
step_name is stable and maps to a known pipeline step or explicit extension
status is one of completed, failed, skipped, blocked, or not_applicable
started_at and completed_at are present when the step ran
error_category is present for failed or blocked steps
model and prompt_version are present when safely recorded, otherwise explicitly unknown
raw prompts, raw provider payloads, secrets, stack traces, and service keys are absent
```

Missing safe metadata should be `WARN` unless it prevents replay or hides a
failure. Unsafe raw payload or secret exposure is always `FAIL`.

## Pipeline step assertions

| Step | Required assertions | Missing classification |
|---|---|---|
| `tolkar` | input classified; structural relevance or insufficiency recorded; unsupported/unknown context stays explicit | `FAIL` if a completed pipeline lacks an input interpretation step |
| `konstruktor_a` | produces an engineering candidate, missing-input warnings, and no final approval wording | `MISSING` if target_agents includes it but no step exists; `FAIL` if final approval is asserted |
| `konstruktor_b` | independent candidate is traceable separately from A; no overwrite of A metadata | `MISSING` if target_agents includes it but no step exists |
| `samanliknar` | compares A/B outputs; mismatch categories are bounded and non-secret | `WARN` if absent for single-agent cases; `FAIL` if absent for dual-candidate pipeline proof |
| `kontrollor` | records blocked fields, hard-block decisions, and provisional confidence language | `FAIL` if blocked output is indicated but controller evidence is absent |
| `rapportor` | confirms canonical report text source, report locale, disclaimer presence, and blocked-field preservation | `FAIL` if report proof is requested and reporter evidence is absent |
| `pipeline` | terminal run summary ties step statuses to run_status and eval_case_id | `FAIL` if completed live proof lacks terminal pipeline summary |

## Cross-step assertions

Future live-read Eval should also assert:

```txt
all terminal steps share the same run_id
eval_case_id matches the requested case when present
step order is coherent: tolkar before constructors, constructors before comparator/controller/reporter
no duplicate terminal step_id values exist
blocked_fields recorded by controller remain blocked in report evidence
report_locale is separate from display_language when both are present
manual_review_required remains true for high-risk cases
```

## Target-agent mapping rule

`target_agents` in the eval case defines which step assertions are required:

```txt
pipeline      requires tolkar, terminal pipeline summary, and all steps that actually ran
tolkar        requires only input interpretation assertions
konstruktor_a requires konstruktor_a assertions
konstruktor_b requires konstruktor_b assertions
samanliknar   requires comparator assertions
kontrollor    requires controller assertions
rapportor     requires reporter assertions
```

If `target_agents` contains `pipeline`, absence of a step may be `WARN`,
`MISSING`, or `FAIL` depending on whether the run status claims completion and
whether the missing step is required to prove the case.

## Bundle output mapping

Trace assertions should feed these planned bundle files:

```txt
trace-events-summary.json       step presence, order, terminal status, missing completions
step-metadata-summary.json      safe model/prompt/error metadata per step
runrecord-summary.json          run_status, eval_case_id, target_agents, evidence_source
grade-result.json               deterministic trace assertion results when implemented
```

## Stop conditions

Eval must not treat trace evidence as live proof when:

```txt
evidence_source=dry_run
bundle_status=PLAN
run_id is null
trace contains raw provider payloads or secrets
run ownership cannot be proven by the future runtime read path
completed run proof lacks terminal step evidence
```

These conditions should keep current dry-run output in planning mode and should
block future live-proof consumption until Chat B confirms a safe read path.

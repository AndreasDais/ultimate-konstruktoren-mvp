# Runtime Handoff Checkpoint

**Sprint:** 68A.20  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Handoff checkpoint for Runtime lane  

This checkpoint summarizes what Chat B must expose before Chat A can move the
live eval runner from dry-run planning to read-only `live_read` evidence. It
does not authorize Supabase reads, LLM calls, live pipeline execution, service
role usage, prompt changes, report rendering changes, or repo artifact writes.

## Current Eval position

Eval is ready to describe live evidence, but not ready to consume it as proof.
The runner must continue to report:

```txt
evidence_source=dry_run
bundle_status=PLAN
run_id=null unless explicitly supplied for contract validation
supabase_reads=false
live_pipeline_execution=false
repo_writes=false
```

Dry-run output is useful for planning and release discussion. It is not proof
that a PILAR runtime run, report surface, or agent trace passed an eval.

## 68A.40 diagnostic handoff checkpoint

Runtime diagnostic handoff is now integrated on `main` through PR #18:

```txt
785f0b4 Runtime helper
5a3abca server adapter
3b28c06 diagnostic Supabase reader
a3c483f diagnostic Eval handoff
2ad56a6 PR #18 merge
```

This makes the Runtime handoff available for diagnostic planning. It does not
make `live_read` release proof. Runtime may internally return
`release_proof_status="FAIL"` to deny release proof; Eval should normalize
diagnostic consumption into its own output shape instead of treating Runtime's
internal guard as a release result:

```txt
diagnostic_only=true
release_proof_status="not_available"
release_proof_reason="diagnostic_live_read_only"
professional_approval=false
live_pipeline_execution=false
repo_writes=false
freshness_required_for_release=false
```

Missing diagnostic evidence must stay visible. It may map to `PLAN`,
`MISSING`, `WARN`, or `FAIL`, depending on whether evidence was planned,
absent, incomplete, or contradictory. Missing evidence must never become
`PASS`.

The next technical Eval sprint should be a pure mapper in
`scripts/run-eval-case-live.mjs` that consumes a diagnostic Runtime
evidence-shape and converts it into Eval bundle/status fields. That mapper
should not import Runtime TypeScript, read Supabase, call LLMs, execute the
pipeline, or write artifacts.

Opening a real live Supabase-read path still requires explicit Big Brain
approval, a stable callable boundary, an auth/ownership story, and redaction
contract tests.

## Must-have Runtime handoff

Before Eval can implement `live_read`, Runtime must provide a user-scoped,
read-only evidence shape with these guarantees:

| Area | Required Runtime evidence | Why Eval needs it |
|---|---|---|
| Ownership | The read path proves the caller may read the requested `run_id` | Prevents eval bundles from exposing another user's run |
| Run summary | `run_id`, `eval_case_id`, `run_status`, timestamps, `target_agents`, `manual_review_required`, `evidence_source` | Separates dry-run planning, cached evidence, and live proof |
| Report source | `has_report`, canonical `report_text`, `report_locale`, `report_model_version`, `disclaimer_present` | Lets Eval grade user-facing output without UI scraping or duplicate report truth |
| Blocked fields | Machine-readable `blocked_fields`, count/source/reason metadata when available, and report markers | Proves blocked values stayed blocked instead of leaking as prose |
| Trace steps | Stable `step_id`, `step_name`, `status`, timestamps, terminal summary, and coherent step order | Lets Eval assert the targeted agents actually ran or were explicitly skipped |
| Prompt/model metadata | Safe `model` and `prompt_version` labels or explicit `unknown` / `not_applicable` | Supports replayability without raw prompts |
| Error metadata | Bounded `error_category`, redacted public summary, retryability, and raw-error-redaction flag for failed/blocked steps | Supports safe eval and ops routing without leaking provider details |
| Redaction | No raw prompts, raw provider envelopes, secrets, service-role data, stack traces, local paths, or hidden reasoning | Keeps evidence safe to bundle and inspect |

If any must-have area is absent, Eval should keep live-read implementation in
refusal or planning mode.

## Required status semantics

Runtime evidence must keep these conditions distinguishable:

```txt
completed live run with auditable trace
failed live run with bounded error category
blocked live run with blocked-field evidence
skipped/not_applicable step
cached report evidence
dry-run planning output
unknown or unsupported engineering context
```

Eval must not infer these states from prose alone. They need machine-readable
fields that can be checked in bundle summaries.

## Bundle readiness mapping

When Runtime handoff is ready, Eval can map Runtime fields into:

| Bundle file | Runtime source |
|---|---|
| `manifest.json` | `run_id`, `eval_case_id`, created time, runner metadata |
| `runrecord-summary.json` | run summary, evidence source, target agents, manual review flag |
| `report-text.txt` | canonical report text with blocked values omitted or safely marked |
| `trace-events-summary.json` | step presence, order, terminal statuses, missing completions |
| `step-metadata-summary.json` | safe model/prompt/error metadata and redaction flags |
| `grade-result.json` | deterministic Eval result built from the evidence above |

The bundle remains evidence extracted from runtime/report truth. It must not
become a second canonical report model.

## Refusal conditions

Eval live-read mode should refuse or mark evidence unavailable when:

```txt
run_id is missing or malformed
run ownership cannot be proven
eval_case_id conflicts with the requested case
run_status is non-terminal and the caller requested proof
report_text is empty while has_report=true
blocked output is indicated but blocked_fields is absent
trace steps contain raw provider payloads or secrets
failed/blocked steps lack bounded error categories
prompt_version contains raw prompt text instead of a safe label
manual_review_required is false for high-risk blocked engineering output
```

These conditions should produce `MISSING`, `WARN`, `FAIL`, or refusal output,
not `PASS`.

## Handoff asks for Chat B

Chat B should confirm, in Runtime-owned files or tests:

```txt
which safe run summary fields already exist
which canonical report fields can be read without UI scraping
how blocked_fields are represented and preserved in report evidence
which trace step fields are stable across all terminal steps
whether model and prompt_version are recorded safely or should be explicit unknown
which bounded error_category values Runtime exposes
which read path enforces ownership without service-role leakage
```

Once Chat B confirms those points, Chat A can plan the first no-write
`live_read` interface sprint without crossing lane boundaries.

## Checkpoint verdict

Current verdict: `DIAGNOSTIC_HANDOFF_AVAILABLE_RELEASE_PROOF_NOT_READY`.

Reason:

```txt
Eval has planning contracts for run/report evidence, trace assertions, target
agents, prompt/model metadata, safe error categories, and blocked-field
evidence. Runtime now exposes a diagnostic handoff that Eval can plan to
consume, but Eval must still keep diagnostic output separate from release proof
and must not open real live Supabase reads without later approval.
```

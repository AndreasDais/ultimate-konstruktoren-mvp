# Missing Evidence Semantics

**Sprint:** 68A.14  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Planning contract  

This contract defines how Eval should classify absent report and trace evidence
when future live-read or cached evidence modes exist. It keeps missing evidence
visible without treating dry-run planning as failed live proof.

## Status vocabulary

Eval should keep these statuses separate:

```txt
PLAN     dry-run planning only; evidence was not expected to exist
READY    required evidence exists and can be checked
MISSING  required evidence is absent or incomplete
WARN     evidence exists but is incomplete, stale, or needs manual review
FAIL     required evidence is absent in a context that claimed live proof, or a deterministic check failed
SKIP     check was explicitly not applicable
```

`PLAN` belongs to dry-run bundle planning. `MISSING`, `WARN`, and `FAIL` belong
to evidence-consuming modes such as future `live_read`, `cached_report`, or
fixture adapter checks.

## Report evidence

Report text is required once a caller asks Eval to prove user-facing output from
an existing run.

| Condition | Classification | Reason |
|---|---|---|
| `dry_run=true` and no report text exists | `PLAN` | No runtime report was requested or read |
| `evidence_source=fixture` and fixture intentionally has no report text | `SKIP` or `WARN` | Use `SKIP` for non-report fixtures; use `WARN` when report checks are expected later |
| `evidence_source=cached_report` and report text is absent | `MISSING` | Cached evidence exists as a source label but lacks the required artifact |
| `evidence_source=live_read`, `has_report=false`, and run is terminal failed/blocked | `WARN` | Missing report may be expected, but must be explicit |
| `evidence_source=live_read`, `has_report=true`, and report text is empty | `FAIL` | Runtime claimed a report exists but Eval cannot inspect user-facing output |
| `blocked_fields` are absent while blocked output is indicated | `FAIL` | Eval cannot prove blocked values stayed blocked |
| `report_locale` is absent while report text exists | `WARN` | Text can be graded, but locale/prose separation cannot be proven |

## Trace evidence

Trace evidence is required when the eval case targets pipeline behavior or when
`--require-trace` is set.

| Condition | Classification | Reason |
|---|---|---|
| `dry_run=true` and no trace exists | `PLAN` | Trace was not expected to be read |
| `--require-trace=false` and report-only evidence is enough | `SKIP` | Trace checks were explicitly not required |
| `--require-trace=true` and trace summary is absent | `MISSING` | The caller asked for trace evidence but none was available |
| `evidence_source=live_read`, run is terminal completed, and completion steps are absent | `FAIL` | A completed run must have auditable terminal steps |
| Step metadata exists but omits safe model/prompt metadata | `WARN` | Eval can continue, but replayability is incomplete |
| Step metadata contains raw prompts, raw provider payloads, secrets, or stack traces | `FAIL` | Evidence is unsafe to consume or store |
| Error category is absent for a failed step | `WARN` | Failure is visible, but not explainable enough for release gating |

## Bundle status mapping

Future bundle status should summarize the evidence classification:

```txt
PLAN     all missing evidence is expected because this is dry-run planning
READY    report/trace evidence required by the case is present and safe to check
MISSING  at least one required evidence artifact is absent, but no unsafe leak occurred
FAIL     evidence contradicts its own metadata, leaks unsafe data, or deterministic checks failed
```

`WARN` should appear in per-file summaries such as `trace_summary.warnings` or
`rule_summary.skipped`; the overall bundle may still be `READY` if required
evidence is present and the warning is non-blocking.

## Consumer rule

Consumers must not convert missing evidence into PASS. If a release or ops gate
needs live proof and Eval only reports `PLAN`, `SKIP`, or `MISSING`, the gate
must treat the eval evidence as unavailable rather than successful.

Manual review remains mandatory whenever `manual_review_required=true`, even if
all available evidence is `READY`.

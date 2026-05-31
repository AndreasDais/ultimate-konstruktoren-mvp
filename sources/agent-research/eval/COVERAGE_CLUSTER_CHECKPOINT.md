# Eval Coverage Cluster Checkpoint

**Status:** 68A.30 checkpoint  
**Lane:** Chat A / Eval  
**Runtime impact:** None  

This checkpoint summarizes the current Eval coverage clusters before adding
more cases or live-read adapters. It is planning evidence only. It does not
call LLMs, read Supabase, run `/api/explain`, refresh generated reports, or
prove professional engineering approval.

## Current clusters

| Cluster | Eval-owned anchor | Current evidence state | Still missing before live proof |
|---|---|---|---|
| Approval language | `qa/evals/EVAL_RISK_BACKLOG.md` | Backlog cluster exists for final-approval wording regressions. | Dedicated cases across report/export surfaces and live evidence that disclaimers are present without final approval. |
| Blocked fields | `qa/evals/EVAL_RISK_BACKLOG.md`, `BLOCKED_FIELD_EVIDENCE_EXPECTATION.md` | Backlog cluster and evidence contract exist. | Live-read evidence with machine-readable `blocked_fields` and canonical report text proving blocked values stayed blocked. |
| Report parity | `qa/evals/EVAL_RISK_BACKLOG.md` | Backlog cluster exists for web/full report, Word-oriented text, and PDF/print text parity. | Artifact bundle files such as `web-report-text.txt`, `word-export-text.txt`, `pdf-print-text.txt`, or `artifact-parity-summary.json`. |
| Agent errors | `qa/evals/EVAL_RISK_BACKLOG.md`, `ERROR_CATEGORY_EXPECTATION.md` | Backlog cluster exists as of `eef30e4` for safe bounded error categories and redacted diagnostics. | Failed-agent fixture or live-read evidence proving `error_category`, public summary, retryability, and raw-error redaction. |

## Runtime and Ops evidence now visible to Eval

Recent Runtime work gives Eval better integration targets:

- `8d04837` added a safe explain route.
- `af53f3b` covered the explain route trust boundary.
- `58e8f54` added report parity source bundle evidence.

Recent Ops work gives Eval release-consumer context:

- `875e93b` documents release evidence semantics.
- `10088f5` documents follow-up release semantics.

Eval should treat this as integration context, not as live Eval proof. The
Eval lane still needs its own fixture, cached-report, or live-read evidence
before claiming a case passed.

## Evidence-source boundary

Eval outputs must keep these evidence sources distinct:

| Evidence source | Meaning | May prove |
|---|---|---|
| `dry_run` | Runner planning output only; no files written and no runtime read. | CLI safety, planned bundle shape, refusal semantics. |
| `fixture` | Local static fixture evidence. | Deterministic grading behavior against known text or metadata. |
| `cached_report` | Previously captured report evidence with unknown or explicit freshness. | Historical artifact behavior only; not proof of new runtime changes. |
| `live_read` | Read-only evidence from an existing PILAR run once Runtime exposes a safe path. | Runtime/report trace behavior for that specific run, if scoped and redacted. |

No evidence source is professional engineering approval. Manual review remains
required whenever the eval case or report risk requires it.

## Live-read dry-interface closeout

Sprints 68A.31-68A.39 closed the dry-interface metadata cluster for future
`live_read` evidence. This is plan-shape evidence only, not live-read proof.

Delivered:

| Sprint | Delivered Eval-owned contract |
|---|---|
| 68A.31-68A.33 | `--mode live_read` dry interface, required `--run-id`, and `--check-live-read-contract` preflight. |
| 68A.34 | Planned freshness labels: `current`, `stale`, and `unknown`. |
| 68A.35 | `freshness_checked_at=null` and `freshness_source=null` placeholders. |
| 68A.36 | `freshness_reason=null` placeholder. |
| 68A.37 | `freshness_required_for_release=false` release-proof guard. |
| 68A.38 | `release_proof_status="not_available"` placeholder. |
| 68A.39 | `release_proof_reason="dry_interface_only"` placeholder. |

The dry interface still does not read Supabase, call LLMs, execute the PILAR
pipeline, or write repo/artifact bundles. It keeps
`professional_approval=false`, and its output cannot be used as release proof.

Stop adding placeholder fields unless a concrete consumer needs one. The next
real step should be designing a safe read-only `live_read` adapter: ownership
checks, redacted runtime/report evidence shape, missing-evidence classification,
and explicit freshness assessment against an existing run.

## Diagnostic live-read consumption closeout

Sprints 68A.40-68A.42 moved Eval one step beyond dry-interface metadata. Eval
can now map diagnostic Runtime evidence safely, while still refusing to treat
that evidence as release proof.

Delivered:

| Sprint | Delivered Eval-owned contract |
|---|---|
| 68A.40 | Documented the Runtime diagnostic handoff plan and the release-proof boundary. |
| 68A.41 | Added a pure diagnostic mapper in `scripts/run-eval-case-live.mjs`. |
| 68A.42 | Locked the mapper contract with inline diagnostic fixtures in `--check-live-read-contract`. |

The diagnostic mapper remains `diagnostic_only`. It does not read Supabase,
import Runtime TypeScript, execute the live pipeline, write repo or artifact
files, or claim professional engineering approval. It keeps
`professional_approval=false`, normalizes release proof to
`release_proof_status="not_available"` with
`release_proof_reason="diagnostic_live_read_only"`, and never converts missing
evidence into `PASS`.

Stop here for the diagnostic metadata/mapper cluster. Do not add more
placeholder fields unless a concrete consumer needs them. The next technical
Eval sprint can be a non-writing CLI fixture input, such as
`--diagnostic-fixture <path> --json`, so Big Brain can inspect mapped evidence
without Supabase or Runtime imports. Real live Supabase reads still require
explicit Big Brain approval, a stable callable boundary, an auth/ownership
story, and redaction contract tests.

An alternative next move is to shift lane focus to a Runtime/Ops gap plan for
`error_category`, `retryable`, and `provider_message_id` readiness before Eval
consumes more diagnostic evidence.

## Next checkpoint target

Before moving from planning clusters to live proof, Eval should either:

1. add deterministic eval cases for one cluster, or
2. add fixture-only adapter tests that prove missing/error/blocked evidence is
   classified safely without Supabase, LLM calls, repo artifact writes, or
   live pipeline execution.

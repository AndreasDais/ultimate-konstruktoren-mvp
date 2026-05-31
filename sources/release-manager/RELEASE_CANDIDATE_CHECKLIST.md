# PILAR Release Candidate Checklist

**Sprint:** 67C.8
**Status:** docs-only release-candidate checklist
**Owner:** Chat C / Ops, Guardrails, and Observability Lane

## Purpose

This checklist defines the evidence needed before treating a branch as a release candidate. It is intentionally command-oriented and non-writing by default.

Do not use stale `latest-*` Markdown artifacts as proof of current readiness. Use current terminal output from the gates below.

## Latest artifact marker

Files named `latest-*` are historical snapshots unless the current sprint
explicitly refreshed that artifact and the diff was reviewed. Treat them as
context for release hygiene, not as live release readiness evidence.

## Start condition

Before running release-candidate gates:

```bash
git status --short
```

Expected:

```txt
no output
```

If the tree is not clean, stop and decide whether the local changes are intentional release-candidate contents or accidental generated artifacts.

## Required non-writing gates

Run:

```bash
npm run release:check
npm run guardrails:check
npm run observability:check
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run release:readiness:check
npx tsc --noEmit --pretty false
```

Expected:

- release, guardrail and observability validators exit 0,
- `agent:all` exits 0,
- health snapshot check reports `Status: PASS`,
- release readiness check has no blocking failures,
- TypeScript exits 0.

`RELEASE_RISKY` in fast release-readiness mode is acceptable only when it comes from warnings or intentionally skipped heavy gates that are then reviewed manually.

`release:check` may report stale-signal counts for stored `latest-*` artifacts. Treat those counts as informational release hygiene, not blockers by themselves. Use current non-writing command output for release-candidate evidence.

## Local sandbox EPERM note

If a local sandboxed run fails only with `spawnSync node EPERM`, rerun the same
gate in the normal unrestricted integration shell. When that rerun passes, treat
the first result as environment friction, not as product or release-gate failure.

## Evidence owner map

Use this map to route missing, stale, or risky evidence before a release
handoff. The owner provides evidence; the release checklist only organizes it
and does not grant professional approval.

| Evidence area | Primary owner | Current release evidence |
|---|---|---|
| Eval regression and coverage evidence | Chat A / Eval lane | `node scripts/run-eval-suite.mjs --check`, `node scripts/summarize-eval-coverage.mjs --check`, and any explicit dry-run/live-read notes from the Eval lane. |
| Runtime/report safety evidence | Chat B / Runtime lane | Runtime smoke, fresh PILAR run evidence, canonical report parity notes, and safe read-path handoffs when the changed surface needs them. |
| Release, guardrail, and observability evidence | Chat C / Ops lane | `npm run release:check`, `npm run guardrails:check`, `npm run observability:check`, `npm run agent:all`, and check-only release or health snapshots. |
| Merge and release decision | Integrator / release owner | Current command output plus lane handoff notes; this is still not final engineering approval. |

## Eval evidence source semantics

Release gates may consume Chat A JSON or handoff summaries only as typed
evidence. The release owner must preserve the source label and must not upgrade
weaker evidence into stronger proof.

| Source label | Meaning for release gates | Allowed release interpretation |
|---|---|---|
| `fixture` | Static local sample or adapter fixture. | Schema/contract evidence only; never live behavior proof. |
| `dry_run` | Eval command planned or checked behavior without live runtime reads. | Regression-shape evidence; useful for readiness, but not proof that a live run/report was observed. |
| `cached` / `cached_report` | Stored report or historical artifact was read. | Historical evidence; require freshness label or owner note before using it for a current release decision. |
| `live` / `live_read` | Read-only evidence from an explicit live run id/report/trace source. | Strongest eval evidence, if ownership, redaction and freshness are stated. Still not professional approval. |

When Chat A JSON includes both status and source fields, release gates should
read them together:

```txt
status=PASS + source=dry_run       -> eval dry-run passed; live proof still missing
status=PASS + source=fixture       -> fixture contract passed; runtime proof still missing
status=PASS + source=cached_report -> cached evidence passed; check freshness before release use
status=PASS + source=live_read     -> live read passed; still requires normal release and professional review gates
```

If the source label is absent, ambiguous, or only implied by a stale
`latest-*` report, treat the evidence as `unknown` and route it back to Chat A
or the integrator before release handoff.

## Runtime evidence privacy semantics

Release gates may consume Chat B runtime/report handoffs only as minimized
release evidence. Runtime remains the owner of field definitions, ownership
checks and user-scoped read paths.

Safe fields for release handoff:

```txt
run_id or eval_case_id pointer
status / terminal state
evidence_source label: fixture, dry_run, cached_report, live_read
freshness label: current, stale, unknown
prompt/model version labels when already recorded and non-secret
agent step names and bounded error categories
counts for traces, blocked_fields, warnings, errors and artifacts
artifact paths or governed refs, not artifact contents
professional_review_required / preliminary status flags
```

Fields that must not be copied into release notes or release-gate JSON:

```txt
raw uploaded text
full user prompt or personally identifying text
raw provider message payloads
service-role keys, tokens or credentials
stack traces with secrets or infrastructure paths
blocked field values
full report prose unless the report artifact is the reviewed release surface
```

Interpretation rules:

```txt
1. A runtime field proves only what it names; it does not approve engineering output.
2. Cached report evidence must carry `cached_report` plus freshness context.
3. Live-read evidence must name the read-only source and run id; otherwise treat
   it as unknown or cached.
4. If a release decision needs user data inspection, route back to Runtime or
   the integrator; Ops release gates should not pull or duplicate user data.
5. Missing runtime evidence is a release-risk signal, not a reason to infer pass.
```

## Runtime evidence bundle semantics

The integrated Runtime bundle on `main` gives release gates stronger runtime
evidence labels, but only when the named evidence is present and current:

| Runtime evidence | Required proof for release gates | Allowed release interpretation |
|---|---|---|
| Safe explain route | `8d04837 RUNTIME: add safe explain route` and `af53f3b test: cover explain route trust boundary` are both present in the release candidate. | `/api/explain` may be counted as Runtime evidence for a safe, bounded read path. It is not live professional approval and does not prove report correctness by itself. |
| Report parity source bundle | `58e8f54 RUNTIME: add report parity source bundle` is present in the release candidate. | Strengthens canonical `ReportModel` evidence across blocked-field handling and Word/PDF/print parity. It proves source-bundle coverage only, not that a fresh live user report was professionally reviewed. |

Keep the evidence source label intact when consuming the bundle:

```txt
fixture      -> static source-bundle or route-shape evidence only
dry_run      -> planned/check-only behavior; no live runtime read
cached_report -> historical report evidence; require freshness context
live_read    -> explicit read-only run/report source; strongest release evidence, still not approval
```

Do not upgrade safe-route or parity-bundle evidence into live proof unless the
Runtime owner also names a current read source, run/report id and freshness
label. A green trust-boundary test proves that `/api/explain` respects its
trust boundary; it does not authorize Ops to copy user data, inspect blocked
field values, or present PILAR output as final engineering approval.

## Diagnostic live_read release-proof semantics

Diagnostic `live_read` evidence may prove that Eval and Runtime can exchange a
diagnostic signal. It is not release-proof unless Runtime also provides safe
persisted trace metadata and release-surface proof.

Release gates should use these statuses:

| Status | Meaning | Release interpretation |
|---|---|---|
| `diagnostic_only` | Useful for debug or Eval diagnostics, often from fixture/mapper evidence. | Never count as PASS. Keep as diagnostic evidence only. |
| `release_proof_unavailable` | `live_read` exists, but safe persisted trace metadata or another release-proof requirement is missing. | Not GREEN; route missing proof to Runtime or the owning lane. |
| `release_proof_partial` | Safe, bounded evidence exists, but one or more release-proof requirements are missing. | YELLOW/WARN for readiness; FAIL for a strict release-proof gate. |
| `release_proof_blocked` | Trust-boundary, payload, auth, report, blocked-field or professional-approval boundary is broken. | Hard FAIL. |
| `release_proof_green` | Runtime provides all metadata, auth, report, blocked-field and trust-boundary requirements. | Eligible as release-proof evidence, still not professional approval. |

Hard FAIL reason codes for release-proof claims:

```txt
unsafe_trace_payload
professional_approval_implication
missing ownership/auth proof in a release-proof claim
missing blocked-fields proof when output/report is release-surface
missing canonical report text/parity proof when report text is release-surface
unbounded error_category or free-form error text used as release-proof metadata
missing terminal status/timestamp when evidence claims live release proof
```

YELLOW/WARN for diagnostic or readiness gates:

```txt
missing_safe_trace_metadata
missing provider_message_id when the rest of the evidence is safe and bounded
cached or fixture-based diagnostic evidence
Eval live_read without Runtime-persisted trace metadata
```

These are YELLOW for a diagnostic gate but FAIL for a release-proof gate:

```txt
missing error_category
missing retryable
missing terminal status/timestamps
missing canonical report parity proof
missing blocked-fields proof
```

Runtime must deliver all of this before Ops can mark diagnostic evidence
`release_proof_green`:

```txt
ownership/auth proof for run/report/trace reads
terminal run status and terminal timestamps
bounded error_category and retryable for each failed or blocked step
safe terminal step/run status
canonical report text/source proof when report text is release-surface
blocked-fields proof without blocked values
safe route/read boundary without raw prompts, provider payloads, secrets or PII
optional safe provider_message_id as a bounded identifier only
professional_review_required / preliminary status flags
```

Eval can already provide diagnostic support evidence:

```txt
diagnostic live_read from fixture/mapper flow
regression-chain proof for diagnostic flow
case ids, expected status and observed diagnostic labels
dry-run, cached or fixture evidence with source labels
technical signal that the live_read route can be consumed
```

The following must remain `diagnostic_only`:

```txt
fixture/mapper live_read
live_read without terminal persisted metadata
evidence without ownership/auth proof
evidence without canonical report parity when report text is relevant
evidence without blocked-fields proof
free-text error classification
anything that can be read as professional approval
```

## Supabase migration-history baseline plan

Production schema effects and Supabase CLI migration history are separate
release surfaces. A schema can be correct while the CLI history is still unsafe
for future `db push` use.

Current 68C.36 baseline facts:

- `main` includes
  `supabase/migrations/20260531000000_step_metrics_release_proof_metadata.sql`
  through PR #26 (`8da5ac3`).
- The production schema effects for `20260531000000` were applied manually
  through Supabase SQL Editor after the production-only path was chosen.
- Post-apply verification showed the five nullable `step_metrics` columns:
  `status`, `completed_at`, `error_category`, `retryable`, and
  `raw_error_redacted`.
- `raw_error_redacted` has no default `true`.
- `status` and `error_category` constraints exist with bounded values.
- Column comments exist for all five new fields.
- Existing row compatibility was verified: 957 `step_metrics` rows, with zero
  non-null values in each new field.
- `provider_message_id` remains omitted.
- Post-DB-apply HTTP canary was GREEN for `/`, `/heim`, `/international`, and
  `/vilkar`.
- `diagnostic_only` remains true and no release-proof mode was enabled.

The Supabase CLI migration ledger is not yet trusted:

- `supabase migration list --linked` showed local migration versions without a
  matching remote history column for this repo.
- The production SQL Editor audit attempt for
  `supabase_migrations.schema_migrations` did not expose an available relation.
- Treat this as an unbaselined migration-history problem, not as approval to
  replay local migrations.

Until a baseline repair plan is approved, these are NO-GO:

- `supabase db push`
- `supabase db push --dry-run`
- `supabase migration repair`
- applying additional production SQL changes
- enabling release-proof mode because the nullable columns now exist

Before any migration repair, Ops must run a read-only schema audit and classify
each local migration as one of:

- already present exactly
- absent
- partially present
- present but drifted
- intentionally superseded by later manual schema work

Only migrations proven already present exactly may be repaired with
`migration repair --status applied`. Do not mark partially present, drifted, or
unreviewed migrations as applied. A repair command changes the CLI ledger; it
does not make the database schema safer by itself.

Minimum evidence required before a repair PR or handoff:

- current `main` commit and production project ref
- read-only table/column/constraint/policy/comment audit output
- per-migration classification with reviewer notes
- explicit list of migrations proposed for repair
- explicit list of migrations still pending or drifted
- backup/PITR confirmation for production before any mutating command
- rollback plan for any future schema mutation

The safe target state before future `db push` use is:

- remote migration history matches the schema effects that are already present
- only the intended next migration is pending
- `db push --dry-run` shows exactly that intended next migration
- no raw provider payload, prompt text, secret, PII, or `provider_message_id`
  storage appears in the schema change
- `diagnostic_only` remains true unless Runtime, Eval, Ops, and Integrator all
  approve a separate release-proof enablement plan

## Conditional gates

Add these only when the changed surface requires them:

| Changed surface | Required evidence |
|---|---|
| App/runtime/UI/API flow | Runtime smoke of the relevant route or user flow. |
| Prompt, controller, report-output logic | A fresh PILAR run; old stored reports are not proof. |
| Locale, shell labels, role labels, standard profile | One Norwegian Eurocode regression and one international/English regression. |
| Web report, DOCX, PDF, calculation sheet | Parity review against the canonical report data. |
| Build/deploy risk | Full production build. |

Production build command:

```bash
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

## Artifact rule

Do not run write-mode report commands during release-candidate validation unless the release candidate explicitly includes refreshed artifacts.

Refresh generated artifacts only in an explicit artifact-refresh sprint with reviewed diffs.

Non-writing commands to prefer:

```bash
node scripts/run-eval-suite.mjs --check
node scripts/summarize-eval-coverage.mjs --check
node scripts/run-report-qa-dry-run.mjs --check
node scripts/write-release-readiness-report.mjs --check
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

Generated artifacts to treat as historical unless explicitly refreshed:

```txt
sources/release-manager/reports/latest-release-readiness.md
sources/agent-research/status/latest-agent-ecosystem-health.md
qa/evals/reports/latest-eval-readiness.md
qa/evals/reports/latest-eval-coverage.md
```

## Stop conditions

Stop before release if:

- a required gate fails outside known sandbox spawn restrictions,
- a `--check` command rewrites a generated artifact,
- TypeScript fails,
- production build fails when required,
- a release decision depends on stale generated Markdown rather than current command output,
- any output implies final professional engineering approval without qualified review.

## Evidence note template

Use this note when handing a release candidate to the integrator. Keep it short and paste current terminal output references instead of copying stale generated reports.

When `npm run release:readiness:check` returns `RELEASE_RISKY`, map the reason to an explicit owner before handoff:

| Risky reason | Follow-up owner | Expected handoff note |
|---|---|---|
| Fast mode skipped heavy nested gates | Integrator / release owner | State whether `agent:all`, health snapshot check and TypeScript were run separately in this session. |
| Production build skipped | Integrator / deploy owner | State whether the changed surface had build or deploy risk; if yes, attach the full build command result. |
| Runtime smoke skipped | Feature owner | Name the route or user flow that still needs smoke evidence. |
| Fresh PILAR run skipped | Feature owner / report owner | State whether prompts, controller logic or report-output logic changed. |
| Locale or standard regression skipped | Feature owner / locale reviewer | Name the required Norwegian Eurocode and international/English regression evidence. |
| Web/DOCX/PDF parity skipped | Report owner | Name the canonical report data and artifact surfaces that still need parity review. |
| Generated `latest-*` artifact looks stale | Integrator / release owner | Use current command output as evidence and avoid treating old Markdown as readiness proof. |

```md
Release candidate evidence note

Branch:
Commit:
Reviewer:
Date:

Required gates:
- git status --short:
- npm run release:check:
- npm run guardrails:check:
- npm run observability:check:
- npm run agent:all:
- node scripts/write-agent-ecosystem-health-snapshot.mjs --check:
- npm run release:readiness:check:
- npx tsc --noEmit --pretty false:

Conditional gates run:
- Runtime smoke:
- Fresh PILAR run:
- Locale regression:
- Web/DOCX/PDF parity:
- Production build:

Known skips:
- Gate:
- Reason:
- Follow-up owner:

Release decision:
- RELEASE_READY / RELEASE_RISKY / RELEASE_BLOCKED:
- Reason:

Professional review reminder:
- This evidence note is not final engineering approval.
```

## Handoff note

This checklist does not merge, deploy, approve, or sign engineering output. It organizes evidence so a human integrator can make the next decision.

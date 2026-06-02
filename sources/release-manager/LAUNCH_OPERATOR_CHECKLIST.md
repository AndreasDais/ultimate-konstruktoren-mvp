# PILAR Launch Operator Checklist

**Status:** docs-only launch operator checklist
**Branch:** `codex/launch-operator-checklist`
**Base commit:** `d03d05d`
**Owner:** Release/Ops operator
**Final recommendation:** LAUNCH GO

## Purpose

This checklist gives the launch operator one small, auditable pre-launch runbook
for the current PILAR launch state. It organizes release evidence, smoke checks,
trust boundaries, rollback criteria, and owner handoffs. It does not merge,
deploy, mutate production data, run database repair, or approve engineering
calculations for professional use.

## Ground State

```txt
main clean/synced: d03d05d
open PRs: 0
outstanding branches: 0
production canary: GREEN
/api/health: OK for supabase, upstash, anthropic, slack, sentry
launch-readiness verdict: GREEN
launch go/no-go: GO
English-report integrity: complete
EC3 Capacity & Utilization v1: complete
PR #63 degraded report crash: fixed
PR #64 scorecard closeout: landed
```

## Final Launch Checklist

| Check | Required state | Operator status |
|---|---|---|
| Source baseline | `main` is clean/synced at `d03d05d` before launch docs branch work. | PASS |
| Open work | No open PRs or outstanding branches that must land before launch. | PASS |
| Production canary | Latest production canary is GREEN. | PASS |
| Health endpoint | `/api/health` reports Supabase, Upstash, Anthropic, Slack, and Sentry OK. | PASS |
| Release gates | Non-writing release, guardrail, observability, agent, health, readiness, and TypeScript gates pass. | PASS; see captured outputs below |
| Trust framing | PILAR output remains preliminary and requires professional review. | PASS |
| Launch decision | Operational launch decision is GO; this is not final engineering approval. | LAUNCH GO |

## In-Scope Launch Surfaces

The launch operator may treat these surfaces as in scope for launch-day smoke
and stop-the-line monitoring:

- public entry and navigation surfaces, including `/`, `/heim`,
  `/international`, and `/vilkar`
- `/api/health` read-only service health
- core PILAR run-to-report path at the current launch-readiness baseline
- report rendering for completed runs
- graceful handling of incomplete, stalled, or degraded report runs after PR #63
- English-report integrity surface from the completed English-report track
- EC3 Capacity & Utilization v1 as preliminary Eurocode 3 screening
- AISC/ASCE international diagnostic flow only as demand and LTB-risk
  diagnostics with missing-property guardrails
- canonical report consistency expectations across web report, Word export, and
  PDF/print where already covered by current evidence

## Explicit Out of Scope

Do not expand this launch decision into any of the following:

- no AISC adequacy claim
- no demand-to-capacity ratio (`DCR`) claim
- no `Mb,Rd`, `phi_b Mn`, or quantitative LTB capacity claim for AISC/ASCE
  profiles without verified section-property support
- no final compliance, pass/fail, approval, or construction-use claim
- no DB command of any kind
- no Supabase CLI
- no SQL
- no migration repair
- no `db push`
- no `db push --dry-run`
- no mutating DB work
- no `npm run debug:sweep`

## Known P2/P3 Residuals

These residuals are non-blocking for the current LAUNCH GO because they are
either explicitly out of scope or already bounded by launch-day trust language:

| Residual | Priority | Launch interpretation |
|---|---|---|
| AISC/ASCE remains experimental and diagnostic without verified section-property tables. | P2 | Non-blocking because launch does not claim AISC adequacy, DCR, or final capacity. |
| Broader UK/AISC/Canadian profile lookup and standard-specific profile parsing remain future capability work. | P2 | Non-blocking because unsupported standards must stay preliminary and guarded. |
| Automated freshness dashboards and durable policy-backed stop/go automation remain future Ops hardening. | P2/P3 | Non-blocking because the operator uses current command output and manual stop criteria for this launch. |
| Product polish and report presentation refinements beyond the completed launch-readiness fixes remain future UI/report work. | P3 | Non-blocking unless they create crashes, unsafe wording, or inconsistent canonical report surfaces. |

## Safety And Trust Statements For Operators

- LAUNCH GO is an operational release decision only.
- PILAR output is AI-assisted preliminary engineering work and must require
  qualified professional review before use in design or construction documents.
- Do not interpret `approved`, `green`, `pass`, or `GO` in release evidence as
  professional structural approval.
- Preserve wording such as preliminary, professional review required, or
  equivalent trust framing on report surfaces.
- Do not expose blocked fields, raw prompts, raw provider payloads, secrets, PII,
  or service-role data during launch-day checks.
- Do not use stale `latest-*` artifacts as live launch proof unless the current
  sprint explicitly refreshed and reviewed them.
- Do not convert diagnostic-only evidence into release-proof evidence.
- If a launch-day result appears safer than the evidence actually proves, stop
  and route it to the owning lane.

## Pre-Launch Smoke Checklist

Run or verify these immediately before launch:

| Smoke | Expected result |
|---|---|
| `git status --short --untracked-files=all` | No output on the launch commit. |
| `git rev-parse --short HEAD` | Expected launch commit recorded by the operator. |
| `/api/health` read-only check | `supabase`, `upstash`, `anthropic`, `slack`, and `sentry` are `ok`. |
| `/` | Loads without 5xx or client crash. |
| `/heim` | Loads without 5xx or client crash. |
| `/international` | Loads and preserves international-mode safety framing. |
| `/vilkar` | Loads without 5xx or client crash. |
| Completed EC3 report evidence | Preliminary EC3 capacity screening remains visible and bounded. |
| Degraded/incomplete report evidence | Report page renders gracefully and does not fabricate missing rows or approvals. |
| English/AISC diagnostic evidence | Demand and qualitative LTB diagnostic remains guarded; no AISC adequacy or DCR. |
| Sentry/log review | No launch-window spike in report crashes, API 5xx, auth/RLS errors, or provider errors. |

## Rollback And Stop-The-Line Criteria

Stop launch or roll back the deployment if any of these occur:

- `/api/health` reports a non-OK dependency or repeated timeout.
- Public launch routes return 5xx, blank UI, or hydration/client crashes.
- Report routes crash for completed, incomplete, or degraded runs.
- A degraded/incomplete report fabricates capacity rows, comparison rows, or an
  approval/status that the available data does not support.
- AISC/ASCE output claims adequacy, DCR, `Mb,Rd`, `phi_b Mn`, quantitative LTB
  capacity, final compliance, or final pass/fail without verified support.
- Any user-facing output implies final professional engineering approval.
- Canonical report surfaces disagree materially across web, Word, or PDF/print.
- Blocked fields, raw prompts, raw provider payloads, secrets, PII, or
  service-role data become visible.
- Any operator step attempts DB/Supabase CLI/SQL/repair/`db push`/dry-run work.
- Sentry, logs, or canary checks show a material regression after launch.

Rollback action shape:

```txt
1. Stop new launch actions.
2. Preserve evidence: route, run id if safe, timestamp, screenshot/log summary.
3. Roll back to the last known GREEN production deployment.
4. Notify Integrator and the owning lane.
5. Do not retry deploy until the owning lane provides a fix and fresh gates pass.
```

## Owner Map For Launch Day

| Area | Owner | Launch-day responsibility |
|---|---|---|
| Final launch decision | Integrator / release owner | Decide GO/NO-GO from current evidence and stop criteria. |
| Release gates and checklist | Ops / Release Manager | Keep gates non-writing, explain evidence boundaries, and record launch status. |
| Runtime/report behavior | Runtime lane | Own API/report crashes, degraded report handling, canonical report data, and safe read boundaries. |
| UI and public routes | UI lane | Own public route rendering, navigation, visual regressions, and launch page polish. |
| Eval and synthetic-user evidence | Eval / QA lane | Own regression evidence, English/AISC guardrails, EC3 evidence, and launch-readiness browser checks. |
| Production deploy/canary | Integrator / deploy owner | Own deployment, canary review, rollback execution, and incident handoff. |
| DB/Supabase migration history | Ops/deploy owner under separate explicit protocol | No action in this launch checklist; repair execution remains out of scope. |

## Fresh Non-Writing Gate Output

Captured on branch `codex/launch-operator-checklist` from base commit
`d03d05d`. These commands are non-writing release evidence. They do not include
`npm run debug:sweep`, DB commands, Supabase CLI, SQL, migration repair,
`db push`, `db push --dry-run`, or mutating DB work.

| Command | Output summary | Result |
|---|---|---|
| `npm run release:check` | `OK sources\release-manager\release-gates.json: 15 release gates validated, 0 errors, 0 warnings` | PASS |
| `npm run guardrails:check` | `OK sources\guardrails\guardrail-reason-codes.json: 14 guardrail reason codes validated, 0 errors, 0 warnings` | PASS |
| `npm run observability:check` | `OK sources/observability/observability-event-taxonomy.json: 16 observability events validated, 0 errors, 0 warnings` | PASS |
| `npm run agent:all` | `OK agent ecosystem gate completed` after unrestricted rerun; initial sandbox run hit known `spawnSync node EPERM` in health snapshot. | PASS |
| `node scripts/write-agent-ecosystem-health-snapshot.mjs --check` | `Status: PASS`; `Required files: 78/78`; `Required npm scripts: 43/43`; `Local checks: 15/15` after unrestricted rerun. | PASS |
| `npm run release:readiness:check` | `Status: RELEASE_RISKY`; `Blocking failures: 0`; `Warnings: 1`; `Skipped gates: 3`; `Gates checked: 5`. Reviewed: warning comes from the local uncommitted checklist file during capture, and skipped fast-mode gates are covered explicitly by `agent:all`, health snapshot, and TypeScript above. | PASS WITH REVIEW |
| `npx tsc --noEmit --pretty false` | exit 0; no output. | PASS |
| read-only `/api/health` check | `curl.exe -sS https://pilar-mvp.vercel.app/api/health` returned `{"status":"ok",...,"checks":{"supabase":{"status":"ok"},"upstash":{"status":"ok"},"anthropic":{"status":"ok"},"slack":{"status":"ok"},"sentry":{"status":"ok"}}}`. | PASS |

Execution notes:

- The first sandboxed `agent:all`/health run failed only in nested process
  spawning with `spawnSync node EPERM`; unrestricted reruns passed.
- The first sandboxed health `curl` was blocked by local network/proxy routing;
  unrestricted read-only GET to production `/api/health` passed.
- `release:readiness:check` is a fast-mode readiness reporter. Its skipped
  heavy gates are intentionally checked by the explicit commands listed above.

## Final Recommendation

```txt
LAUNCH GO
```

This recommendation is limited to the operational release surface described in
this checklist. It is not final professional engineering approval, not AISC
adequacy, not DCR, not LTB capacity, and not permission to run database or
Supabase migration-history commands.

# World-Class Agent Ecosystem 50-Sprint Plan

**Status:** Integrator coordination plan
**Date:** 2026-05-29
**Scope:** Planning and monitoring only
**Owner:** Integrator / monitor chat
**Applies to:** Chat A Eval, Chat B Runtime, Chat C Ops
**Monitor protocol:** `sources/agent-research/PILAR_LANE_MONITOR_PROTOCOL.md`

This document extends the existing three-chat workflow with at least 50
forward sprints for each active lane. The plan is intentionally bounded:
when a chat finishes sprint 50 in its lane, it stops and produces a closeout.
It must not invent sprint 51 without a new integrator plan.

No sprint below authorizes database migrations, production deploys,
auto-merge, service-role exposure, prompt behavior changes, generated report
refreshes, or final professional approval language unless explicitly stated.

## 1. Current reading of the three chats

Chat A has built a dry-run live eval bridge. Its next value is to move from
planned evidence to safe artifact bundles, then to read-only runtime evidence,
then to trace assertions that can separate dry-run proof from live proof.

Chat B has hardened runtime/report safety. Its next value is to keep locking
the canonical report model, blocked fields, provisional trust wording, trace
metadata, and safe read paths until live eval and release gates can consume
runtime evidence without ambiguity.

Chat C has built ops/release/guardrail/observability hygiene. Its next value is
to turn that hygiene into integration-ready, non-writing gates that can consume
lane evidence, explain risk, and stop bad merges without pretending to be a
professional engineering approval.

## 2. Global rules for all 150 sprints

1. Start with `git status --short`.
2. Stop if the lane worktree is dirty, except explicitly agreed known residue.
3. Check `LANES.md` before editing.
4. Touch only lane-owned files.
5. Keep each sprint to one or two files where possible.
6. After edits, show `git status --short` and `git diff --stat`.
7. After tests, show only `git status --short`.
8. Commit only when the human says `Commit!`.
9. Never run `git add -A` in a lane.
10. If a sprint needs files outside the lane, open a handoff note and stop.
11. If a sprint needs DB/schema, prompt behavior, service role, or production
    writes, produce a plan before coding.
12. When sprint 50 is done, produce a final lane closeout and stop.

## 3. Monitor role

This chat is the monitor-of-record when the user pastes lane summaries or asks
for a track check. The monitor does not edit lane-owned files. It reads status,
compares the work against this plan, and returns one of:

```txt
GREEN  - lane is on track; continue to next numbered sprint.
YELLOW - lane is useful but drifting; continue only with a narrowed sprint.
RED    - lane violated boundary, safety, or evidence rules; stop and repair.
DONE   - lane finished sprint 50 and must not continue without a new plan.
```

Every monitor review checks:

```txt
lane_boundary      - did the chat stay inside owned paths?
sprint_scope       - was the change small and named?
evidence_quality   - were relevant gates run and reported?
product_safety     - no final approval, no hidden blocked fields, no secrets
integration_ready  - can another lane consume the output safely?
stop_conditions    - did the chat stop when it crossed a risk boundary?
```

Monitor response format:

```txt
Lane:
Latest sprint:
Verdict: GREEN/YELLOW/RED/DONE
Why:
Boundary check:
Evidence check:
Required correction:
Next allowed sprint:
Stop now?: yes/no
```

## 4. Chat A - Eval lane, 68A.1 to 68A.50

Mission: make PILAR evals catch regressions before users do, while keeping live
pipeline execution separate from dry-run evidence until runtime read paths are
safe.

Standard gates:

```bash
node scripts/validate-eval-cases.mjs
node scripts/run-eval-suite.mjs --check
node scripts/summarize-eval-coverage.mjs --check
node scripts/run-eval-case-live.mjs --case-id <case> --dry-run
node scripts/run-eval-case-live.mjs --case-id <case> --json
npm run agent:all
```

Sprints:

```txt
68A.1  - Eval lane worktree plan: document or verify separate eval worktree before more main-branch eval edits.
68A.2  - Live eval bundle write plan: add dry-run plan text for writing bundles only under temp paths.
68A.3  - Bundle manifest required fields: list required manifest keys for future artifact writes.
68A.4  - Bundle manifest JSON shape: expose planned manifest object in `--json`.
68A.5  - Bundle path safety check: ensure planned bundle path is outside repo writes.
68A.6  - Bundle file inventory contract: name every planned evidence file without creating it.
68A.7  - Bundle status taxonomy: separate SKIP, PLAN, READY, MISSING, FAIL.
68A.8  - Dry-run/live separation audit: document every field that must differ in dry-run versus live.
68A.9  - Case metadata completeness gate: fail eval validation for missing critical case metadata.
68A.10 - Eval dry-run closeout: sync README and contract for bundle planning, then stop for review.

68A.11 - Runtime evidence handoff read plan: define the minimum run/report fields needed from Chat B.
68A.12 - Run id input contract: add safe CLI contract for future `--run-id` without reading Supabase yet.
68A.13 - Evidence source labels: add labels for fixture, dry_run, cached_report, live_read.
68A.14 - Missing evidence semantics: define WARN versus FAIL for absent trace/report artifacts.
68A.15 - Trace assertion inventory: list required agent trace assertions by pipeline step.
68A.16 - Agent target matrix: map eval target_agents to expected trace steps.
68A.17 - Prompt/model version expectation: add planned assertions for prompt and model metadata.
68A.18 - Error category expectation: add planned assertions for safe error categories from runtime.
68A.19 - Blocked-field evidence expectation: add planned assertion that blocked fields are visible as blocked, not prose.
68A.20 - Runtime handoff checkpoint: summarize what Chat B must expose before live read mode.

68A.21 - Offline report-text grading boundary: ensure grading reads canonical artifact text, not UI scraping.
68A.22 - Rule summary severity: classify must_include and must_not_include failures by severity.
68A.23 - Unit expectation summary: improve coverage output for unit and symbol expectations.
68A.24 - Locale expectation summary: show generated prose locale separately from UI shell locale.
68A.25 - Standard-context expectation summary: show Eurocode/AISC/unknown context in coverage output.
68A.26 - Approval-language eval cluster: add or document eval cases for final-approval wording regressions.
68A.27 - Blocked-fields eval cluster: add or document eval cases for blocked fields and blocked outputs.
68A.28 - Report-parity eval cluster: add or document eval cases for web/Word/PDF canonical parity.
68A.29 - Agent-error eval cluster: add or document eval cases for safe error categories.
68A.30 - Coverage cluster checkpoint: summarize eval gaps before adding more cases.

68A.31 - Live-read dry interface: implement no-op `--mode live-read` that refuses without explicit run id.
68A.32 - Live-read safety refusal: make refusal explain no LLM, no Supabase, no repo writes in dry mode.
68A.33 - Live-read JSON refusal: expose refusal reason in JSON with stable keys.
68A.34 - Evidence freshness labels: add planned labels for stale, current, unknown.
68A.35 - Case-to-run binding contract: document how eval_case_id should map to runtime run evidence.
68A.36 - Cached report evidence contract: document how cached report evidence differs from live report proof.
68A.37 - Artifact bundle checksum plan: plan checksums for future temp artifacts.
68A.38 - Artifact bundle cleanup plan: document retention and cleanup expectations for temp bundles.
68A.39 - Eval runner abuse audit: verify CLI cannot be mistaken for production approval.
68A.40 - Live-read readiness checkpoint: stop if Chat B read path is not ready.

68A.41 - First read-only evidence spike plan: plan a single case against a known run id, no implementation if path missing.
68A.42 - Evidence adapter interface: define small adapter boundary for future runtime reads.
68A.43 - Adapter fixture test: test adapter behavior with local fixture data only.
68A.44 - Adapter missing-field test: ensure missing trace/report data is categorized safely.
68A.45 - Adapter blocked-field test: ensure blocked values remain blocked in fixture evidence.
68A.46 - Adapter locale test: ensure report prose locale and UI locale stay separate.
68A.47 - Adapter status summary: output PASS/WARN/FAIL/SKIP from fixture adapter.
68A.48 - Release-gate handoff: document exact JSON fields Chat C can consume.
68A.49 - Eval lane final checkpoint: write closeout of 68A work and remaining risks.
68A.50 - Eval lane STOP sprint: run gates, summarize, and stop. Do not create 68A.51.
```

## 5. Chat B - Runtime lane, 68B.1 to 68B.50

Mission: make live runs traceable, predictable, safe to replay, and safe for
report/export/eval consumers without changing agent prompt behavior unless a
separate plan approves it.

Standard gates:

```bash
npx tsc --noEmit --pretty false
npm test
npm run agent:all
```

Sprints:

```txt
68B.1  - Runtime evidence inventory: identify one missing runtime field needed by live eval read mode.
68B.2  - Scoped run read invariant: test that user-scoped run reads expose only owned, safe fields.
68B.3  - Eval case id continuity: strengthen test that eval_case_id survives run creation to read path.
68B.4  - Trace run id continuity: cover run_id consistency across all terminal agent steps.
68B.5  - Step id uniqueness: test no duplicate terminal step ids in a run trace.
68B.6  - Raw provider id boundary: preserve raw message ids only inside safe raw metadata.
68B.7  - Prompt version visibility: expose or test prompt version metadata only if already recorded.
68B.8  - Model version visibility: expose or test model version metadata without secrets.
68B.9  - Runtime evidence redaction: test no secret, stack, or service key leak in read output.
68B.10 - Runtime evidence checkpoint: summarize fields now safe for Chat A.

68B.11 - ReportModel blocked field audit: find one remaining report field that could bypass blocked_fields.
68B.12 - ReportModel blocked field test: add regression for the audited field.
68B.13 - Word export blocked parity: add or strengthen parity test for that field in Word-oriented output.
68B.14 - PDF/print blocked parity: add or strengthen parity test for print-oriented output if path exists.
68B.15 - Calculation sheet canonical source: ensure calculation sheet reads from ReportModel, not duplicate data.
68B.16 - Calculation text extraction parity: test eval text extraction uses canonical report fields.
68B.17 - Disclaimer placement invariant: ensure review disclaimer appears in every report surface.
68B.18 - Provisional label invariant: ensure short labels never imply final professional approval.
68B.19 - Trust score wording invariant: ensure tillit is confidence, not professional sign-off.
68B.20 - Report safety checkpoint: summarize report/export safety for integrator.

68B.21 - Comparator mismatch evidence audit: find one mismatch shape still hard for eval/ops to consume.
68B.22 - Comparator mismatch structure test: lock paired/onlyA/onlyB fields for that mismatch.
68B.23 - Comparator percent drift test: test numeric drift is visible but not final authority.
68B.24 - Controller hard-block replay test: ensure repaired JSON still passes hard block before persistence.
68B.25 - Controller fallback refusal test: ensure parse-fail fallback never invents approval.
68B.26 - Controller category stability: test categories are bounded and non-secret.
68B.27 - Agent quota error test: cover quota category without raw provider message leak.
68B.28 - Agent auth error test: cover auth category without secret exposure.
68B.29 - Agent transient error test: cover transient category for retryable failures.
68B.30 - Error taxonomy checkpoint: summarize safe categories for Chat C observability.

68B.31 - Engineering context unsupported audit: find one unsupported standard/context fallback edge.
68B.32 - Engineering context family test: invalid family falls to unknown/not_supported.
68B.33 - Engineering context confidence test: malformed profile yields confidence unknown.
68B.34 - Locale shell/prose separation test: UI locale switch must not rewrite generated prose locale.
68B.35 - Role label stability test: agent role labels stay stable across nb/nn/en shell changes.
68B.36 - English output label test: no Norwegian-only role labels in English result shell.
68B.37 - Nynorsk wording test: preserve existing nn wording for provisional status.
68B.38 - Bokmal wording test: preserve existing nb wording for provisional status.
68B.39 - Language-neutral technical terms test: MEd, fcd, kNm, EC2, EC3 remain schema-stable.
68B.40 - Locale/context checkpoint: summarize remaining i18n/runtime risks.

68B.41 - Service-role import audit: verify no client component imports admin/service-role clients.
68B.42 - API ownership check audit: pick one data route and test ownership/admin boundary.
68B.43 - Run completion guard test: ensure completed status cannot overwrite non-running state.
68B.44 - Run cancellation/failed guard test: ensure terminal states remain terminal.
68B.45 - Cached report evidence flag: test cached report evidence is explicitly marked.
68B.46 - Live evidence freshness flag: test live/current evidence can be distinguished if field exists.
68B.47 - Eval-read handoff contract: document exact runtime fields Chat A may consume.
68B.48 - Ops observability handoff: document exact safe categories Chat C may validate.
68B.49 - Runtime lane final checkpoint: write closeout of 68B work and remaining risks.
68B.50 - Runtime lane STOP sprint: run gates, summarize, and stop. Do not create 68B.51.
```

## 6. Chat C - Ops lane, 68C.1 to 68C.50

Mission: keep release, guardrail, observability, health, and integration gates
non-writing, explainable, and hard to misuse.

Standard gates:

```bash
npm run release:check
npm run guardrails:check
npm run observability:check
npm run agent:all
```

Sprints:

```txt
68C.1  - Ops checkpoint refresh: update final checkpoint with last known 67C commits.
68C.2  - Integration summary refresh: align summary with checkpoint after 67C closeout.
68C.3  - Release checklist stale marker: clarify latest artifacts are historical unless refreshed by sprint.
68C.4  - Release evidence owner map: map Eval, Runtime, Ops evidence owners in the checklist.
68C.5  - Release blocker wording audit: ensure RELEASE_RISKY is not confused with script failure.
68C.6  - Sandbox EPERM note: document local spawnSync EPERM as environment friction when rerun passes.
68C.7  - Generated artifact no-refresh rule: add explicit no-refresh note to release docs.
68C.8  - Integration merge order note: one lane branch at a time, gates after each merge.
68C.9  - Integration conflict stop note: stop on conflict; do not ask lanes to code around unresolved merge.
68C.10 - Ops hygiene checkpoint: summarize release/checkpoint freshness.

68C.11 - Guardrail reason-code audit: compare codes against approval, blocked fields, missing input, unsupported standard.
68C.12 - Guardrail fixture gap note: document one missing fixture or explain none needed.
68C.13 - Guardrail unsupported-context fixture: add or update static fixture for unsupported standard/context.
68C.14 - Guardrail final-approval fixture: add or update static fixture for final approval wording risk.
68C.15 - Guardrail blocked-output fixture: add or update static fixture for blocked output visibility.
68C.16 - Guardrail missing-input fixture: add or update static fixture for missing input escalation.
68C.17 - Guardrail comparator-risk fixture: add or update static fixture for A/B mismatch risk.
68C.18 - Guardrail fixture validator note: document what the validator checks and does not check.
68C.19 - Guardrail non-authority note: clarify guardrail status is not professional approval.
68C.20 - Guardrail checkpoint: summarize reason-code coverage.

68C.21 - Observability taxonomy audit: compare taxonomy against Runtime error categories.
68C.22 - Observability trace event fixture: add or update fixture for trace continuity.
68C.23 - Observability report QA fixture: add or update fixture for report QA warning.
68C.24 - Observability release gate fixture: add or update fixture for release gate status.
68C.25 - Observability eval evidence fixture: add or update fixture for eval dry-run/live distinction.
68C.26 - Observability blocked-field fixture: add or update fixture for blocked-field event evidence.
68C.27 - Observability provider-error fixture: add or update fixture for quota/auth/transient categories.
68C.28 - Observability taxonomy note: document event severity and safe redaction expectations.
68C.29 - Observability no-runtime-write note: clarify fixtures do not add runtime logging.
68C.30 - Observability checkpoint: summarize taxonomy readiness.

68C.31 - Release gate consumes eval plan: document how release reads Chat A JSON without treating dry-run as live.
68C.32 - Release gate consumes runtime plan: document how release reads Chat B fields without exposing user data.
68C.33 - Release gate consumes ops plan: document ops-only validators and their scope.
68C.34 - Release evidence matrix: add matrix for required/optional evidence by release type.
68C.35 - Missing evidence semantics: define block/warn/info for absent lane evidence.
68C.36 - Stale evidence semantics: define block/warn/info for stale lane evidence.
68C.37 - Manual review semantics: ensure professional review required remains visible.
68C.38 - Merge readiness checklist update: align checklist with Eval/Runtime handoffs.
68C.39 - Release candidate checklist update: align candidate checklist with new evidence matrix.
68C.40 - Release integration checkpoint: summarize release gate readiness.

68C.41 - Health snapshot check audit: verify check mode remains non-writing.
68C.42 - Health snapshot stale note: clarify health snapshots are point-in-time evidence.
68C.43 - Agent all non-writing proof: document which subcommands are non-writing or check-only.
68C.44 - Validator index audit: ensure ops docs index references current validators.
68C.45 - Validator index check fixture: add or update non-writing index validation if needed.
68C.46 - Escalation map refresh: map RED/YELLOW monitor results to owning lane.
68C.47 - Lane closeout template: add standard closeout fields for all lanes.
68C.48 - Integrator monitor checklist: add the monitor verdict template from this plan to ops docs if lane-owned.
68C.49 - Ops lane final checkpoint: write closeout of 68C work and remaining risks.
68C.50 - Ops lane STOP sprint: run gates, summarize, and stop. Do not create 68C.51.
```

## 7. Cross-lane dependency map

```txt
Chat A depends on Chat B for safe read-only runtime/report evidence.
Chat B depends on Chat A for concrete eval evidence requirements.
Chat C depends on Chat A and B for stable fields that release gates can read.
Integrator depends on all three for clean branch closeouts and green gates.
```

If a dependency is not ready, the lane must continue with docs, fixtures, or
adapter tests in its own files. It must not reach across the boundary.

## 8. What counts as world-class here

World-class for PILAR means:

```txt
Every run is traceable.
Every report surface shares canonical data.
Every blocked field stays blocked in user-facing output.
Every eval result states whether it is dry-run, fixture, cached, or live.
Every release gate is explainable and non-writing.
Every AI confidence statement avoids final professional approval.
Every lane can stop cleanly without leaving the integrator guessing.
```

The monitor should prefer a slower GREEN lane over a fast YELLOW/RED lane.

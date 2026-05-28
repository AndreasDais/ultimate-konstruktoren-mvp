# PILAR Agent Ecosystem Command Hub

**Status:** Local command hub / implementation reference  
**Sprint:** 38.2 (initial); 59.1 truthful workflow snapshot pinned below  
**Purpose:** Provide one controlled entry point for local PILAR agent-ecosystem checks across Eval, Research, Guardrails and Observability.

---

## 0. Current non-writing gate (Sprint 59.1 truthful snapshot)

This section is the load-bearing truth for "what does `npm run agent:all` actually do today." The per-sprint sections below it record how the gate grew over time, but they are append-only history — read this section first.

### What `npm run agent:all` runs

The gate runs the 22 steps in `scripts/pilar-agent-ecosystem-hub.mjs` (`commandGroups.all`, lines 212–238), in this order:

```txt
 1. status                                       (read-only file inventory)
 2. validate                                     (eval-case JSONL)
 3. eval-readiness --check                       (check mode since Sprint 59.0c)
 4. eval-coverage --check
 5. research-topics
 6. research-memos
 7. guardrails-check
 8. observability-check
 9. report-qa-check
10. report-qa-dry-run --check
11. report-qa-fixture-check
12. report-qa-fixtures-check
13. report-qa-missing-input-check
14. report-qa-unit-inconsistency-check
15. report-qa-overconfident-conclusion-check
16. report-qa-missing-disclaimer-check
17. report-qa-nynorsk-check
18. report-qa-english-aisc-diagnostic-check
19. release-check
20. release-readiness --check
21. patch-planner-check
22. health --check                               (check mode since Sprint 59.0d distinguishes spawn vs validator failure)
```

### Non-writing contract — verified

Verified Sprint 59.1 by capturing `git status --short` before and after `npm run agent:all` on a clean tree. Diff was empty in both directions. The gate writes zero files. Health snapshot reported `Status: PASS, Required files: 78/78, Required npm scripts: 43/43, Local checks: 15/15`.

Two changes upstream made this contract truthful, not just documented:

- **Sprint 59.0c** (`fix: keep agent all eval readiness non-writing`) added `--check` mode to `scripts/run-eval-suite.mjs` and routed `agent:all` through it. Before that, step 3 silently rewrote `qa/evals/reports/latest-eval-readiness.md` on every gate run.
- **Sprint 59.0d** (`fix: report health subprocess startup errors`) made the health snapshot surface `spawnSync` errors instead of reporting them as 15 silent validator failures. Sandboxed `EPERM` no longer masquerades as a product regression.

### Writing commands (explicit, opt-in)

These commands intentionally update artifacts and must never be called from `agent:all`:

```bash
npm run eval:coverage                              # writes qa/evals/reports/latest-eval-coverage.md
npm run agent:health                               # writes sources/agent-research/status/latest-agent-ecosystem-health.md
npm run eval:readiness                             # writes qa/evals/reports/latest-eval-readiness.md
npm run release:readiness                          # writes sources/release-manager/reports/latest-release-readiness.md
npm run report-qa:dry-run                          # writes Report QA dry-run artifact
npm run context:packet -- <files...>               # writes /tmp/pilar-context.md and to clipboard
```

### Sprint workflow rules

These rules apply to every Codex-driven sprint, regardless of size:

1. Always start with `git status --short`. No new sprint on a dirty tree without an explicit decision.
2. A sprint has one risk-reducing goal, typically 1–2 files.
3. Before code: state files, behaviour change, risk, DB/schema effect.
4. After edit: `git status --short` and `git diff --stat`.
5. After test: `git status --short` (must be unchanged if the test was meant to be non-writing).
6. The normal gate (`agent:all`) is reelt non-writing — if a step writes, fix it or move it out of the gate.
7. Writing artifacts only update in their own explicit sprints.
8. Runtime contracts come from existing typed/dataflow code (`lib/runrecord.ts`, `lib/report/report-model.ts`, `lib/result/types.ts`, `qa/grade.ts`, `lib/check/controller-hard-block.ts`) before any new schema is introduced.
9. High-risk work is prioritised by safety and measurable product value, not sprint number.

### How to keep this section honest

- If a step is added or removed from `commandGroups.all`, update the list above in the same sprint.
- If a check-mode flag is added that changes write semantics, update the gate truthful-contract note.
- If a new writing command is introduced, add it to the writing-commands list with the artifact path.
- Do not bump the snapshot sprint number unless the underlying gate sequence or write semantics actually changed.

### Recommended next sprints

- **59.2** — Fix `## 3. Non-writing gate` outdated 9-step list. Either prune the obsolete enumeration or replace it with a forward-reference to this section, so future readers do not follow the stale list.
- **60.0** — Runtime contract audit: map existing Tolkar / A / B / Comparator / Controller / Reporter payloads against `lib/runrecord.ts`, the report model, and DB dataflow before introducing any new agent-contract JSON files. Goal is one truth, not two.

---

## 1. Command hub

The command hub is:

```txt
scripts/pilar-agent-ecosystem-hub.mjs
```

It wraps the local scripts added through Sprint 34–38 into one small command surface.

The npm alias is:

```bash
npm run agent:hub -- <command>
```

Common direct aliases also exist:

```bash
npm run agent:status
npm run agent:validate
npm run agent:readiness
npm run agent:research -- ai-agent-testing
npm run agent:health
npm run guardrails:check
npm run observability:check
npm run agent:all
```

---

## 2. Available hub commands

```bash
node scripts/pilar-agent-ecosystem-hub.mjs status
node scripts/pilar-agent-ecosystem-hub.mjs validate
node scripts/pilar-agent-ecosystem-hub.mjs eval-readiness
node scripts/pilar-agent-ecosystem-hub.mjs eval-coverage
node scripts/pilar-agent-ecosystem-hub.mjs eval-coverage-write
node scripts/pilar-agent-ecosystem-hub.mjs research-topics
node scripts/pilar-agent-ecosystem-hub.mjs research-memos
node scripts/pilar-agent-ecosystem-hub.mjs research-check
node scripts/pilar-agent-ecosystem-hub.mjs research-memo ai-agent-testing
node scripts/pilar-agent-ecosystem-hub.mjs guardrails-codes
node scripts/pilar-agent-ecosystem-hub.mjs guardrails-check
node scripts/pilar-agent-ecosystem-hub.mjs observability-events
node scripts/pilar-agent-ecosystem-hub.mjs observability-check
node scripts/pilar-agent-ecosystem-hub.mjs health
node scripts/pilar-agent-ecosystem-hub.mjs health-write
node scripts/pilar-agent-ecosystem-hub.mjs all
```

---

## 3. Non-writing gate

Use this as the normal local gate:

```bash
npm run agent:all
```

As of Sprint 38.2 this runs:

```txt
1. status
2. validate
3. eval-readiness
4. eval-coverage        # check mode, does not rewrite latest-eval-coverage.md
5. research-topics
6. research-memos
7. guardrails-check     # reason-code registry validation
8. observability-check  # event taxonomy validation
9. health               # check mode, does not rewrite latest-agent-ecosystem-health.md
```

The Sprint 38.2 change is that **observability event taxonomy validation is now part of the agent ecosystem gate**, not just a separate Observability command. Guardrail reason-code validation remains part of the gate from Sprint 37.2.

---

## 4. Writing commands

These commands intentionally update repo artifacts:

```bash
node scripts/pilar-agent-ecosystem-hub.mjs eval-coverage-write
node scripts/pilar-agent-ecosystem-hub.mjs health-write
npm run eval:coverage
npm run agent:health
```

Expected generated artifacts:

```txt
qa/evals/reports/latest-eval-coverage.md
sources/agent-research/status/latest-agent-ecosystem-health.md
```

Do not run writing commands inside a docs-only sprint unless the generated artifact is intentionally part of the commit.

---

## 5. Research commands

Registry/topic/memo coverage:

```bash
npm run research:coverage
npm run research:topics
```

Memo-quality checks:

```bash
npm run research:memos
```

Combined Research Agent gate:

```bash
npm run research:check
```

Generate or refresh a memo:

```bash
npm run research:memo -- ai-agent-testing
```

---

## 6. Eval commands

Eval case validation:

```bash
node scripts/validate-eval-cases.mjs
npm run agent:validate
```

Eval readiness:

```bash
npm run eval:readiness
npm run agent:readiness
```

Eval coverage:

```bash
npm run eval:coverage:check
npm run eval:coverage
npm run agent:hub -- eval-coverage
```

Use `eval:coverage:check` or `agent:hub -- eval-coverage` when you want a non-writing gate.  
Use `eval:coverage` when the latest coverage report should be updated and committed.

---

## 7. Guardrail commands

Guardrail reason-code validation:

```bash
npm run guardrails:codes
npm run guardrails:check
npm run agent:hub -- guardrails-check
```

The Guardrail track is still registry/schema-first. These commands validate reason-code source files only. They do not run runtime blocking, mutate Supabase, or change production agent behavior.

Tracked Guardrail files:

```txt
sources/guardrails/guardrail-reason-codes.json
sources/guardrails/GUARDRAIL_REASON_CODE_REGISTRY.md
scripts/validate-guardrail-reason-codes.mjs
```

---

## 8. Observability commands

Observability event taxonomy validation:

```bash
npm run observability:events
npm run observability:check
npm run agent:hub -- observability-check
```

The Observability track is still taxonomy/schema-first. These commands validate event taxonomy source files only. They do not write runtime traces, mutate Supabase, or change production agent behavior.

Tracked Observability files:

```txt
sources/observability/observability-event-taxonomy.json
sources/observability/OBSERVABILITY_EVENT_TAXONOMY.md
scripts/validate-observability-event-taxonomy.mjs
```

---

## Context packet helper

Use the context packet helper when preparing context for patch planning:

```bash
npm run context:packet -- <files...>
```

This command writes `/tmp/pilar-context.md` and copies the context packet to the clipboard. It is for patch planning only and must not be treated as sprint status.

`context:packet` is not part of `agent:all`, because `agent:all` is a non-writing validation gate and the context packet helper writes an output file.

---

## 9. Standard verification after hub changes

```bash
node --check scripts/pilar-agent-ecosystem-hub.mjs
npm run agent:status
npm run agent:validate
npm run agent:readiness
npm run eval:coverage:check
npm run research:check
npm run guardrails:check
npm run observability:check
npm run agent:all
npx tsc --noEmit --pretty false
```

Copy status back to chat:

```bash
git status --short > /tmp/pilar-agent-hub-status.log
git diff --stat >> /tmp/pilar-agent-hub-status.log
cat /tmp/pilar-agent-hub-status.log | clip
```

---

## 10. Scope rules

The command hub may orchestrate local docs/eval/research/guardrail/observability registry scripts.

It must not:

```txt
- call production agent routes
- write Supabase data
- change app UI
- change agent prompts
- auto-commit
- auto-deploy
- rewrite generated artifacts unless the command name clearly says write
- perform runtime guardrail blocking before the reason-code registry and eval gates are stable
```

---

## 11. Next safe improvements

```txt
38.3 — Health snapshot includes observability checks
38.4 — Observability final checkpoint
39.0 — Report QA registry/checklist track
```

---

## Sprint 40.2 — Report QA in agent hub

Report QA registry validation is now part of the local non-writing agent ecosystem gate.

### Added command

```bash
npm run agent:hub -- report-qa-check
```

This command runs:

```bash
node scripts/validate-report-qa-checks.mjs
```

### Updated all-gate

`npm run agent:all` now includes:

```txt
status
validate
eval-readiness
eval-coverage
research-topics
research-memos
guardrails-check
observability-check
report-qa-check
health
```

The Report QA step validates the check registry only. It does not inspect live reports, read user data, change app code, or block runtime output.

## Release Manager integration (Sprint 41.2)

Release Manager checks are part of the non-writing local agent ecosystem gate.

### Commands

```bash
npm run release:check
npm run agent:hub -- release-check
npm run agent:all
```

### Hub behavior

`agent:all` must run Release Manager after Report QA / Observability checks and before health check mode. The Release Manager step validates the release-gate registry only; it does not build, deploy, mutate runtime code, or rewrite artifacts.

### Owned files

```txt
sources/release-manager/release-gates.json
sources/release-manager/RELEASE_MANAGER_GATE_REGISTRY.md
scripts/validate-release-gates.mjs
```

## Sprint 42.2 update — Patch Planner checks

Patch Planner Agent registry validation is now part of the local agent ecosystem hub.

### New hub commands

```bash
npm run agent:hub -- patch-planner-rules
npm run agent:hub -- patch-planner-check
```

### Updated all-gate behavior

`npm run agent:all` now includes Patch Planner validation in the non-writing gate:

```txt
status
validate
eval-readiness
eval-coverage
research-topics
research-memos
guardrails-check
observability-check
report-qa-check
release-check
patch-planner-check
health
```

### Owned files

```txt
sources/patch-planner/patch-planner-rules.json
sources/patch-planner/PATCH_PLANNER_RULE_REGISTRY.md
scripts/validate-patch-planner-rules.mjs
```

### Scope note

This is registry validation only. It does not grant write access, auto-patching rights, auto-merge rights, or deploy authority to any agent.

---

## Sprint 44.2 update — Release readiness in command hub

**Status:** Added after Release Manager readiness reporter.

The command hub now exposes release-readiness checks directly:

```bash
npm run agent:hub -- release-readiness
npm run agent:hub -- release-readiness-write
```

The non-writing ecosystem gate now includes release-readiness in check mode:

```bash
npm run agent:all
```

This means `agent:all` verifies the Release Manager readiness reporter without rewriting:

```txt
sources/release-manager/reports/latest-release-readiness.md
```

To intentionally write or refresh the report artifact, use:

```bash
npm run release:readiness
npm run agent:hub -- release-readiness-write
```

### Current local gate coverage

```txt
Research Agent      ✅
Eval Agent          ✅
Guardrails          ✅
Observability       ✅
Report QA           ✅
Release Manager     ✅
Patch Planner       ✅
Release readiness   ✅
```

## Sprint 46.1 — Release readiness hardening docs sync

Release readiness commands now document the hardened reporter behavior from Sprint 46.0.

### Commands

```bash
npm run release:readiness:check
npm run release:readiness
npm run agent:hub -- release-readiness
npm run agent:hub -- release-readiness-write
```

### Recommended usage

- Use `npm run release:readiness:check` during active sprint work.
- Use `npm run release:readiness` only when intentionally refreshing `sources/release-manager/reports/latest-release-readiness.md`.
- Use `node scripts/write-release-readiness-report.mjs --strict` only for explicit fail-fast release checks where `RELEASE_RISKY` and `RELEASE_BLOCKED` should return a non-zero exit code.
- Do not treat `RELEASE_BLOCKED` as a script failure by itself in check mode; it is a report status that should explain which gates need attention.

### Hardened report behavior

The reporter should surface:

- release status: `RELEASE_READY`, `RELEASE_RISKY`, or `RELEASE_BLOCKED`
- blocking failures and warning failures
- gate command, first output line, note and recommended action
- raw command output for debugging
- manual gates that are intentionally not executed in v0.1

### Non-writing gate rule

`agent:all` and health-style verification must use check-mode release readiness. They must not rewrite the release-readiness report artifact unless explicitly requested.

---

## Sprint 48.2 — Report QA dry-run hub integration

Report QA dry-run is now available through the command hub as a read-only/non-runtime check.

### Commands

```bash
npm run report-qa:dry-run:check
npm run agent:hub -- report-qa-dry-run-check
npm run agent:all
```

### Write mode

Use write mode only when intentionally refreshing a Report QA dry-run report artifact:

```bash
npm run report-qa:dry-run
npm run agent:hub -- report-qa-dry-run
```

### Scope boundary

Sprint 48.2 does not change runtime user output, app routes, agent prompts, Supabase tables, report rendering, PDF, or Word generation. The dry-run remains a local QA/check artifact.

---

## Sprint 49.2 — Report QA real fixture hub commands

Report QA real fixture validation is now available from the agent ecosystem command hub.

### Commands

```bash
npm run agent:hub -- report-qa-fixture
npm run agent:hub -- report-qa-fixture-check
npm run agent:all
```

### What this checks

`report-qa-fixture-check` runs:

```bash
node scripts/validate-report-qa-real-fixture.mjs
```

It validates the realistic static Report QA fixture:

```txt
sources/report-qa/dry-run/fixtures/realistic-steel-beam-report.md
```

### Non-runtime rule

This is still a read-only fixture validation step. It must not change app runtime behavior, user output, Supabase data, agent prompts, report rendering, PDF generation, or Word generation.

## Sprint 50.3 — Report QA fixture registry hub integration

The command hub now exposes the Report QA fixture-registry validator.

### New hub command

```bash
npm run agent:hub -- report-qa-fixtures-check
```

### Standard non-writing gate

```bash
npm run report-qa:fixtures:check
npm run agent:hub -- report-qa-fixtures-check
npm run agent:all
```

### Scope

This is registry-only validation. It does not run runtime Report QA, mutate report output, write Supabase data, generate PDF/DOCX artifacts, or execute LLM grading.

### Expected behavior

`agent:all` should include the fixture-registry check after the existing Report QA dry-run / real-fixture checks so the standard agent gate verifies both fixture content and fixture coverage metadata.

## Sprint 51.3 — Missing-input fixture validator hub integration

The command hub now exposes the dedicated missing-input fixture validator.

### New hub command

```bash
npm run agent:hub -- report-qa-missing-input-check
```

### Standard non-writing gate

```bash
npm run report-qa:missing-input:check
npm run agent:hub -- report-qa-missing-input-check
npm run agent:all
```

### Scope

This integration is read-only. It validates the active missing-input fixture and does not mutate report output, write Supabase data, run LLM grading, or change runtime app behavior.

### Expected behavior

`agent:all` should include the missing-input fixture check after the broader Report QA fixture-registry checks, so the standard local agent gate verifies both fixture coverage metadata and the first active negative fixture.

## Sprint 52.3 - Unit-inconsistency fixture validator hub integration

The command hub now exposes the dedicated unit-inconsistency fixture validator.

### New hub command

```bash
npm run agent:hub -- report-qa-unit-inconsistency-check
```

### Standard non-writing gate

```bash
npm run report-qa:unit-inconsistency:check
npm run agent:hub -- report-qa-unit-inconsistency-check
npm run agent:all
```

### Scope

This integration is read-only. It validates the active unit-inconsistency fixture and does not mutate report output, write Supabase data, run LLM grading, or change runtime app behavior.

### Expected behavior

`agent:all` should include the unit-inconsistency fixture check after the missing-input fixture check, so the standard local agent gate verifies both active negative Report QA fixture families.

## Sprint 53.3 — Overconfident-conclusion validator in hub

The Report QA overconfident-conclusion validator is now available through the Agent Ecosystem Command Hub.

### Command

```bash
npm run agent:hub -- report-qa-overconfident-conclusion-check
```

### Included in local gate

`report-qa-overconfident-conclusion-check` is part of the non-writing local agent gate:

```bash
npm run agent:all
```

### Purpose

This command validates that the active `overconfident-conclusion-report` fixture continues to represent a risky report that approves or strongly concludes without enough documented calculation basis.

## Sprint 54.3 — Missing-disclaimer validator command

Adds the active Report QA missing-disclaimer fixture validator to the agent ecosystem hub.

### Command

```bash
npm run agent:hub -- report-qa-missing-disclaimer-check
```

### Local gate coverage

- Validates `scripts/validate-report-qa-missing-disclaimer-fixture.mjs`.
- Validates `sources/report-qa/dry-run/fixtures/missing-disclaimer-report.md`.
- Keeps the missing-disclaimer fixture visible in the standard `agent:all` gate.

### Expected status

```txt
OK missing-disclaimer-report: dedicated fixture validator passed
```

## Sprint 55.3 — Nynorsk Report QA fixture validator in agent hub

Adds the active Nynorsk Report QA fixture validator to the Agent Ecosystem Command Hub.

### Command added

```bash
npm run agent:hub -- report-qa-nynorsk-check
```

### Purpose

This command connects the active `nynorsk-report` fixture validator to the shared PILAR Agent Ecosystem Hub.

The validator checks that the Nynorsk Report QA fixture remains an active passing language/locale fixture with clear Norwegian engineering terminology, Eurocode-like references, and enough technical report-structure signals.

### Standard gate coverage

`report-qa-nynorsk-check` is now part of the non-writing `agent:all` gate.

That means the standard local agent gate verifies the Nynorsk Report QA fixture together with the other active Report QA fixtures before later sprint work continues.

### Verification commands

```bash
npm run report-qa:nynorsk:check
npm run agent:hub -- report-qa-nynorsk-check
npm run agent:all
```

## Sprint 56.3 — English/AISC diagnostic Report QA fixture validator in agent hub

Adds the active English/AISC diagnostic Report QA fixture validator to the Agent Ecosystem Command Hub.

### Command added

```bash
npm run agent:hub -- report-qa-english-aisc-diagnostic-check
```

### Purpose

This command connects the active `english-aisc-diagnostic-report` fixture validator to the shared PILAR Agent Ecosystem Hub.

The validator checks that the English/AISC diagnostic Report QA fixture remains an active passing diagnostic fixture with English shell/language signals, US customary units, AISC/ASCE context and guardrails against invented AISC table values.

### Standard gate coverage

`report-qa-english-aisc-diagnostic-check` is now part of the non-writing `agent:all` gate, after the other active Report QA fixture checks.

That means the standard local agent gate verifies the English/AISC diagnostic fixture together with the Norwegian and negative Report QA fixture families before later sprint work continues.

### Verification commands

```bash
npm run report-qa:english-aisc-diagnostic:check
npm run agent:hub -- report-qa-english-aisc-diagnostic-check
npm run agent:all
```

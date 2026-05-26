# PILAR Agent Ecosystem Command Hub

**Status:** Local command hub / implementation reference  
**Sprint:** 38.2  
**Purpose:** Provide one controlled entry point for local PILAR agent-ecosystem checks across Eval, Research, Guardrails and Observability.

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


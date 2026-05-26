# PILAR Agent Ecosystem Index

**File:** `sources/agent-research/AGENT_ECOSYSTEM_INDEX.md`  
**Sprint:** 34.11  
**Status:** Implementation index / handoff map  
**Owner:** PILAR agent ecosystem track  
**Scope:** Documentation only. No app code, no database migration, no agent prompt changes.

---

## 1. Purpose

This index is the entry point for the PILAR agent ecosystem implementation work.

It connects the strategy documents, research memo workflow, eval seed set, synthetic user checklist, observability schema, guardrail schema and local command hub.

The goal is to make the agent ecosystem easy to run, audit and extend without guessing where the relevant files live.

---

## 2. Current agent ecosystem checkpoint

| Sprint | Area | Status | Main files |
|---|---|---:|---|
| 34.0 / 34.1 | Agent ecosystem strategy + memo template | Done | `sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md`, `sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md` |
| 34.2 | Eval seed set + validator | Done | `qa/evals/pilar-core-evals.jsonl`, `scripts/validate-eval-cases.mjs` |
| 34.3 | Synthetic user checklist + prompts | Done | `qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md`, `qa/e2e/prompts/*` |
| 34.4 | Observability schema proposal | Done | `sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md` |
| 34.5 | Guardrail decision schema proposal | Done | `sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md` |
| 34.6 | Research Agent memo runner | Done | `scripts/create-agent-opportunity-memo.mjs`, `sources/agent-research/topics/ai-agent-testing.md` |
| 34.7 | Eval suite readiness runner | Done | `scripts/run-eval-suite.mjs`, `qa/evals/reports/README.md` |
| 34.8 | Eval report artifact workflow | Done | `qa/evals/reports/latest-eval-readiness.md` |
| 34.9 | npm eval readiness command | Done | `package.json` script: `eval:readiness` |
| 34.10 | Agent ecosystem command hub | Done | `scripts/pilar-agent-ecosystem-hub.mjs`, `sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md` |
| 34.11 | Agent ecosystem index | Current | `sources/agent-research/AGENT_ECOSYSTEM_INDEX.md` |

---

## 3. Primary local commands

Run from repo root:

```bash
cd /c/Users/rayma/Code/ultimate-konstruktoren-mvp
```

### Eval readiness

```bash
npm run eval:readiness
```

Expected result:

```txt
OK eval suite report: 10 cases, 0 errors, 0 warnings
Wrote qa/evals/reports/latest-eval-readiness.md
```

### Agent ecosystem hub

```bash
npm run agent:hub -- status
npm run agent:hub -- all
```

Direct form:

```bash
node scripts/pilar-agent-ecosystem-hub.mjs status
node scripts/pilar-agent-ecosystem-hub.mjs validate
node scripts/pilar-agent-ecosystem-hub.mjs eval-readiness
node scripts/pilar-agent-ecosystem-hub.mjs research-memo ai-agent-testing
node scripts/pilar-agent-ecosystem-hub.mjs all
```

### Eval case validation

```bash
node scripts/validate-eval-cases.mjs
```

### Research memo generation

```bash
node scripts/create-agent-opportunity-memo.mjs ai-agent-testing
```

Expected output:

```txt
sources/agent-research/memos/agent-opportunity-ai-agent-testing.md
```

---

## 4. File map

### Strategy and source documents

| File | Purpose |
|---|---|
| `sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md` | Main strategy for Research, Eval, Synthetic User, Observability, Guardrails, Report QA, Release and Knowledge Brain agents. |
| `sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md` | Template for research-agent opportunity memos. |
| `sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md` | How to use the command hub. |
| `sources/agent-research/AGENT_ECOSYSTEM_INDEX.md` | This index. |

### Research Agent v0.1

| File / folder | Purpose |
|---|---|
| `sources/agent-research/topics/` | Research topics that the memo runner can use. |
| `sources/agent-research/topics/ai-agent-testing.md` | First seed topic. |
| `sources/agent-research/memos/` | Generated or curated research memos. |
| `scripts/create-agent-opportunity-memo.mjs` | Local memo generator. |

### Eval Agent v0.1

| File / folder | Purpose |
|---|---|
| `qa/evals/pilar-core-evals.jsonl` | First seed set of eval cases. |
| `qa/evals/README.md` | Eval case format and rules. |
| `qa/evals/reports/` | Eval readiness report artifacts. |
| `scripts/validate-eval-cases.mjs` | Structural validation of eval cases. |
| `scripts/run-eval-suite.mjs` | Deterministic local readiness runner. |

### Synthetic User v0.1

| File / folder | Purpose |
|---|---|
| `qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md` | Manual/Playwright-ready checklist for user-flow testing. |
| `qa/e2e/prompts/english-aisc-simple-beam.txt` | English/AISC regression prompt. |
| `qa/e2e/prompts/norwegian-simple-beam.txt` | Norwegian/Eurocode regression prompt. |

### Observability and guardrails

| File | Purpose |
|---|---|
| `sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md` | Proposed event/logging schema for agent traces and metrics. |
| `sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md` | Proposed schema for guardrail pass/warn/block decisions. |

---

## 5. Recommended workflow before a new agent-ecosystem sprint

```bash
cd /c/Users/rayma/Code/ultimate-konstruktoren-mvp
npm run agent:hub -- all
npx tsc --noEmit --pretty false
git status --short
```

If a build-level check is needed:

```bash
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log; tail -n 40 last-run.log | clip
```

Use `/tmp` for temporary log files so the repo does not become dirty:

```bash
git status --short > /tmp/pilar-status.log
if [ ! -s /tmp/pilar-status.log ]; then echo "CLEAN: git status --short has no output" > /tmp/pilar-status.log; fi
cat /tmp/pilar-status.log | clip
```

---

## 6. Safety boundaries

The current agent ecosystem track is intentionally low-risk.

Allowed in this track:

```txt
- docs
- seed eval cases
- local validators
- local readiness runners
- generated research memos
- schema proposals
- command wrappers
```

Not allowed without a separate approved sprint:

```txt
- changing production agent prompts
- changing API routes
- changing database schema/migrations
- changing report rendering
- changing result-view/i18n UI
- auto-running model calls in CI
- auto-writing production prompt changes
```

---

## 7. How to separate this track from Claude work

If Claude is working on UI, report rendering, i18n, PDF/Word or prompt logic at the same time, keep commits separate.

Agent ecosystem commits should usually touch only:

```txt
sources/agent-research/
sources/database/
qa/evals/
qa/e2e/
scripts/*eval*
scripts/*agent-ecosystem*
package.json scripts
```

Claude/UI/report commits may touch:

```txt
app/
lib/report/
lib/result/
components/
```

Before staging, check:

```bash
git status --short
```

Stage only the intended files.

---

## 8. Next sprint candidates

### Sprint 34.12 — Eval case metadata index

Add a generated or curated index of eval cases by domain, language, standard context and risk type.

Candidate files:

```txt
qa/evals/EVAL_CASE_INDEX.md
scripts/index-eval-cases.mjs
```

### Sprint 34.13 — Research topic registry

Add a registry of research topics and planned memos.

Candidate files:

```txt
sources/agent-research/topics/TOPIC_REGISTRY.md
```

### Sprint 34.14 — Guardrail rule seed set

Create a local, non-runtime seed set of guardrail rules before implementing guardrail logic.

Candidate files:

```txt
qa/guardrails/PILAR_GUARDRAIL_RULES_V0.md
qa/guardrails/guardrail-rules.seed.json
```

### Sprint 34.15 — Synthetic user report template

Add a standardized result template for manual/automated synthetic user runs.

Candidate files:

```txt
qa/e2e/reports/SYNTHETIC_USER_RUN_TEMPLATE.md
```

---

## 9. Definition of done for this track

A sprint in this track is done when:

```txt
1. The new docs/scripts are committed separately from UI/report work.
2. `npm run agent:hub -- all` passes, or the relevant subset passes.
3. `node scripts/validate-eval-cases.mjs` passes when eval cases are touched.
4. `npx tsc --noEmit --pretty false` passes when package/script files are touched.
5. `git status --short` is clean after commit.
```

---

## 10. Short handoff

Use this sequence when returning to the agent ecosystem work:

```bash
cd /c/Users/rayma/Code/ultimate-konstruktoren-mvp
npm run agent:hub -- status
npm run eval:readiness
node scripts/validate-eval-cases.mjs
```

Then open this file and continue from the next sprint candidate.

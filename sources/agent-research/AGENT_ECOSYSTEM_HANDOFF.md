# PILAR Agent Ecosystem Handoff

**File:** `sources/agent-research/AGENT_ECOSYSTEM_HANDOFF.md`  
**Sprint:** 34.15  
**Status:** Handoff / coordination document  
**Owner:** PILAR agent-ecosystem track  
**Purpose:** Give Claude, Codex, ChatGPT and future agents a concise handoff for the AI-agent ecosystem work already implemented in Sprint 34.0–34.14.

---

## 1. Scope boundary

This handoff covers the **AI-agent ecosystem foundation**, not the production structural-engineering calculation pipeline and not the i18n/result-view cleanup track.

### In scope

```txt
sources/agent-research/**
sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md
sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md
qa/evals/**
qa/e2e/**
scripts/validate-eval-cases.mjs
scripts/create-agent-opportunity-memo.mjs
scripts/run-eval-suite.mjs
scripts/pilar-agent-ecosystem-hub.mjs
scripts/write-agent-ecosystem-health-snapshot.mjs
package.json agent/eval npm aliases
```

### Out of scope

```txt
app/components/result/**
app/rapport/**
lib/report/**
lib/result/** except docs/eval references
app/api/agent-a..agent-e prompt changes
Supabase migrations
runtime guardrail enforcement
production observability instrumentation
```

Do not mix this track with Claude's i18n/report/result-view cleanup work.

---

## 2. What has been implemented

### Strategy and research foundation

```txt
sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md
sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md
sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
sources/agent-research/AGENT_ECOSYSTEM_INDEX.md
sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md
sources/agent-research/topics/README.md
sources/agent-research/topics/ai-agent-testing.md
sources/agent-research/memos/README.md
sources/agent-research/memos/agent-opportunity-ai-agent-testing.md
```

Purpose:

```txt
- define the agent ecosystem roadmap
- define the Agent Opportunity Memo format
- seed the first research topic
- generate the first memo artifact
- document command workflows and release gates
```

### Eval foundation

```txt
qa/evals/README.md
qa/evals/pilar-core-evals.jsonl
qa/evals/reports/README.md
qa/evals/reports/latest-eval-readiness.md
scripts/validate-eval-cases.mjs
scripts/run-eval-suite.mjs
```

Purpose:

```txt
- store the first 10 eval cases
- validate eval case structure
- generate a deterministic readiness report
- create the first local Eval Agent foundation without running production agents
```

### Synthetic user foundation

```txt
qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md
qa/e2e/prompts/english-aisc-simple-beam.txt
qa/e2e/prompts/norwegian-simple-beam.txt
```

Purpose:

```txt
- define manual/Playwright-ready product-flow checks
- seed known English/AISC and Norwegian regression prompts
- prepare for later Synthetic User Agent work
```

### Observability and guardrail proposals

```txt
sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md
sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md
```

Purpose:

```txt
- propose future event/trace schema
- propose future guardrail-decision schema
- do not apply database migrations yet
```

### Command scripts

```txt
scripts/create-agent-opportunity-memo.mjs
scripts/run-eval-suite.mjs
scripts/pilar-agent-ecosystem-hub.mjs
scripts/write-agent-ecosystem-health-snapshot.mjs
```

Purpose:

```txt
- create research memos from topics
- run eval readiness checks
- coordinate ecosystem commands via one hub
- write a local health snapshot
```

---

## 3. Current npm commands

```bash
npm run eval:readiness
npm run agent:hub -- status
npm run agent:hub -- validate
npm run agent:hub -- eval-readiness
npm run agent:hub -- research-memo ai-agent-testing
npm run agent:hub -- all
npm run agent:status
npm run agent:validate
npm run agent:readiness
npm run agent:research -- ai-agent-testing
npm run agent:health
npm run agent:all
```

Recommended daily check:

```bash
npm run agent:status
npm run agent:validate
npm run agent:readiness
npx tsc --noEmit --pretty false
```

Full local ecosystem check:

```bash
npm run agent:all
npm run agent:health
npx tsc --noEmit --pretty false
```

Note: `npm run agent:health` writes/updates:

```txt
sources/agent-research/status/latest-agent-ecosystem-health.md
```

Only commit that generated artifact when intentionally refreshing the health snapshot.

---

## 4. Safe workflow rules

### Before a new agent-ecosystem sprint

```bash
git status --short
npm run agent:status
node scripts/validate-eval-cases.mjs
npx tsc --noEmit --pretty false
```

Continue only if the repo state is understood.

### During a sprint

```txt
- Keep the sprint additive whenever possible.
- Prefer docs/scripts under sources/, qa/ and scripts/.
- Do not touch app-code unless the sprint explicitly requires it.
- Do not touch Claude-owned i18n/report files.
- Do not create Supabase migrations from schema proposals yet.
- Do not make runtime agent-prompt changes in this track without a separate sprint.
```

### After a sprint

```bash
npm run agent:status
npm run agent:validate
npm run agent:readiness
npx tsc --noEmit --pretty false
```

If generated artifacts changed unexpectedly, either commit them intentionally or restore them before committing unrelated work.

---

## 5. Generated artifacts and commit policy

These files may be generated/updated by commands:

```txt
sources/agent-research/memos/agent-opportunity-*.md
qa/evals/reports/latest-eval-readiness.md
sources/agent-research/status/latest-agent-ecosystem-health.md
```

Commit policy:

```txt
Commit generated memo/readiness/health artifacts only when the sprint goal is to update those artifacts.
Do not accidentally include them in unrelated commits.
```

Useful reset commands:

```bash
git restore qa/evals/reports/latest-eval-readiness.md
git restore sources/agent-research/status/latest-agent-ecosystem-health.md
```

---

## 6. Recommended next sprints

### Sprint 34.16 — Agent ecosystem README links

Goal:

```txt
Add backlinks from README/CLAUDE docs to the new agent ecosystem index and release checklist.
```

Suggested files:

```txt
README.md or CLAUDE.md
sources/agent-research/AGENT_ECOSYSTEM_INDEX.md
```

Risk: low, docs only.

---

### Sprint 34.17 — Eval case taxonomy expansion

Goal:

```txt
Extend eval cases with categories, severity, owner, and pilot readiness flags.
```

Suggested files:

```txt
qa/evals/pilar-core-evals.jsonl
scripts/validate-eval-cases.mjs
scripts/run-eval-suite.mjs
```

Risk: low-medium, because validator and runner must stay aligned.

---

### Sprint 34.18 — Synthetic user manual report format

Goal:

```txt
Add a standard manual runtime test report template for Synthetic User checks.
```

Suggested files:

```txt
qa/e2e/reports/README.md
qa/e2e/reports/SYNTHETIC_USER_RUNTIME_REPORT_TEMPLATE.md
```

Risk: low, docs only.

---

### Sprint 34.19 — Guardrail rule seed set

Goal:

```txt
Add a JSONL seed set for guardrail reason codes and allowed actions.
```

Suggested files:

```txt
qa/guardrails/pilar-guardrail-rules.jsonl
qa/guardrails/README.md
scripts/validate-guardrail-rules.mjs
```

Risk: medium, because naming must later align with runtime guardrails.

---

## 7. Do not do yet

```txt
- Do not auto-run production agents from eval runner.
- Do not auto-grade engineering correctness with an LLM yet.
- Do not create Supabase tables without schema review.
- Do not add runtime guardrails before reason codes and eval cases are stable.
- Do not let any self-improvement agent write code directly.
- Do not mix prompt optimization with UI/i18n fixes.
```

---

## 8. Handoff summary for another assistant

Use this if handing off to Claude/Codex/another GPT:

```txt
PILAR has an AI-agent ecosystem foundation in place.
Do not start by editing production agent routes.
First read:
- sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md
- sources/agent-research/AGENT_ECOSYSTEM_INDEX.md
- sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md
- sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
- sources/agent-research/AGENT_ECOSYSTEM_HANDOFF.md

Then run:
- npm run agent:status
- npm run agent:validate
- npm run agent:readiness
- npx tsc --noEmit --pretty false

Keep future changes scoped to sources/, qa/ and scripts/ unless explicitly asked to touch app/runtime code.
```

---

## 9. Sprint 34.15 acceptance criteria

```txt
- File exists at sources/agent-research/AGENT_ECOSYSTEM_HANDOFF.md
- No app-code is changed.
- No generated health/readiness artifact is unintentionally changed.
- npm run agent:status works.
- node scripts/validate-eval-cases.mjs works.
- npx tsc --noEmit --pretty false passes.
- Commit contains only this handoff file.
```

# PILAR Eval Agent Final Checkpoint

**Sprint:** 36.4  
**Status:** Final checkpoint / handoff reference  
**Owner:** PILAR QA / Eval Agent track  
**Scope:** Documentation only

---

## 1. Purpose

This file freezes the current state of the Eval Agent foundation after Sprint 36.0–36.3.

The Eval Agent track is not yet a production grading agent. It is now a local QA foundation that can:

- validate eval-case structure
- summarize eval coverage
- generate eval readiness reports
- generate eval coverage reports
- participate in the shared agent ecosystem gate
- expose clear npm commands for repeatable local checks

This checkpoint exists so future ChatGPT, Claude, Codex, or human contributors can continue from a stable state without guessing what has already been built.

---

## 2. Completed Eval Agent work

### Sprint 34 foundation

- `qa/evals/pilar-core-evals.jsonl`
- `qa/evals/README.md`
- `scripts/validate-eval-cases.mjs`
- `scripts/run-eval-suite.mjs`
- `qa/evals/reports/README.md`
- `qa/evals/reports/latest-eval-readiness.md`
- npm alias: `eval:readiness`

### Sprint 36 expansion

- `scripts/summarize-eval-coverage.mjs`
- `qa/evals/taxonomy/eval-case-taxonomy.json`
- `qa/evals/EVAL_AGENT_EXPANSION.md`
- `qa/evals/reports/latest-eval-coverage.md`
- npm aliases:
  - `eval:coverage`
  - `eval:coverage:check`
- Eval coverage connected into:
  - `scripts/pilar-agent-ecosystem-hub.mjs`
  - `npm run agent:all`
  - `scripts/write-agent-ecosystem-health-snapshot.mjs`
  - `npm run agent:health`

---

## 3. Standard Eval Agent commands

Use these commands for the current Eval Agent foundation:

```bash
npm run eval:readiness
npm run eval:coverage:check
npm run eval:coverage
node scripts/validate-eval-cases.mjs
node scripts/summarize-eval-coverage.mjs --check
```

Use these shared ecosystem gates:

```bash
npm run agent:all
npm run agent:health
npx tsc --noEmit --pretty false
```

Notes:

- `npm run eval:coverage:check` should not write report artifacts.
- `npm run eval:coverage` writes/updates `qa/evals/reports/latest-eval-coverage.md`.
- `npm run agent:health` writes/updates `sources/agent-research/status/latest-agent-ecosystem-health.md`.
- Commit generated report artifacts only when intentionally refreshing the checkpoint.

---

## 4. Current Eval Agent boundaries

The Eval Agent foundation is currently local and deterministic.

It does **not** yet:

- call the production PILAR agent pipeline
- grade live LLM outputs
- compare expected values against generated answers
- run browser/E2E flows
- block deploys automatically
- write to Supabase
- change prompts
- modify app/runtime code

This is intentional. The current layer is a stable QA substrate.

---

## 5. Files that belong to the Eval Agent track

Primary Eval Agent files:

```txt
qa/evals/README.md
qa/evals/pilar-core-evals.jsonl
qa/evals/EVAL_AGENT_EXPANSION.md
qa/evals/taxonomy/eval-case-taxonomy.json
qa/evals/reports/README.md
qa/evals/reports/latest-eval-readiness.md
qa/evals/reports/latest-eval-coverage.md
scripts/validate-eval-cases.mjs
scripts/run-eval-suite.mjs
scripts/summarize-eval-coverage.mjs
```

Connected ecosystem files:

```txt
scripts/pilar-agent-ecosystem-hub.mjs
scripts/write-agent-ecosystem-health-snapshot.mjs
package.json
sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
sources/agent-research/status/README.md
sources/agent-research/status/latest-agent-ecosystem-health.md
```

---

## 6. Release gate for future Eval Agent changes

Before committing future Eval Agent changes, run:

```bash
npm run eval:readiness
npm run eval:coverage:check
npm run research:check
npm run agent:all
npx tsc --noEmit --pretty false
```

If a sprint intentionally changes report artifacts, also run:

```bash
npm run eval:coverage
npm run agent:health
```

Then inspect:

```bash
git status --short
git diff --stat
git diff
```

Commit only the intended file group.

---

## 7. Stop conditions

Do not continue an Eval Agent sprint if any of these occur:

- `node scripts/validate-eval-cases.mjs` fails
- `npm run eval:coverage:check` fails
- `npm run agent:all` fails
- `npx tsc --noEmit --pretty false` fails
- generated reports change unexpectedly
- app/runtime files appear in `git status` during a docs/scripts-only eval sprint
- Claude or another agent is simultaneously editing the same file group

Stop, inspect, and split the work into a smaller sprint.

---

## 8. Recommended next Eval Agent sprints

### Sprint 36.5 — Eval case metadata normalization

Goal: improve `pilar-core-evals.jsonl` metadata consistency.

Possible additions:

- `risk_category`
- `expected_artifacts`
- `pipeline_stage`
- `requires_international_profile`
- `guardrail_relevant`

### Sprint 36.6 — Eval case registry

Goal: create a registry/index over eval cases, similar to the Research Agent topic registry.

Possible files:

```txt
qa/evals/eval-case-registry.json
scripts/validate-eval-case-registry.mjs
```

### Sprint 36.7 — Eval expected-output rule expansion

Goal: add stronger deterministic checks for:

- forbidden standard mixing
- forbidden AISC invented values
- required disclaimer language
- required missing-data warnings
- expected unit families

### Sprint 36.8 — Eval result history format

Goal: define a versioned format for storing local eval run summaries.

Possible files:

```txt
qa/evals/history/README.md
qa/evals/history/latest-summary.json
```

---

## 9. Handoff note

The Eval Agent foundation is now ready for careful expansion, but not yet for autonomous production gating.

Future work should preserve this order:

```txt
more structured eval data
→ stronger local checks
→ report/history artifacts
→ optional pipeline integration
→ human-reviewed gating
→ only later: automated release blocking
```

Do not jump directly to live LLM grading or deploy blocking before the deterministic eval substrate is stronger.

# PILAR Agent Ecosystem Release Checklist

**File:** `sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md`  
**Sprint:** 34.14  
**Status:** Operational release-gate / runbook  
**Owner:** PILAR Agent Ecosystem track  
**Scope:** Research Agent, Eval Agent, Synthetic User checklist, Observability/Guardrail schema sources, local command hub, health snapshot.

---

## 1. Purpose

This checklist defines the minimum release-gate for the PILAR AI-agent ecosystem track.

It is intentionally narrower than a full PILAR app release. The goal is to verify that the agent-ecosystem foundation is usable, deterministic, documented and safe before building the next real runtime agent.

The checklist covers:

```txt
- eval case validity
- eval readiness report generation
- research memo generation
- command hub health
- health snapshot generation
- TypeScript gate
- clean Git working tree
```

It does **not** verify:

```txt
- full UI runtime behaviour
- PDF/Word visual parity
- Norwegian/English i18n runtime acceptance
- agent prompt quality in production runs
- database migrations
```

Those belong to separate PILAR release/runtime tracks.

---

## 2. Commands

Run from repo root:

```bash
cd /c/Users/rayma/Code/ultimate-konstruktoren-mvp
```

### 2.1 Agent ecosystem quick status

```bash
npm run agent:status
```

Expected:

```txt
PILAR Agent Ecosystem Hub
```

and a readable list of available commands/files.

---

### 2.2 Eval case validation

```bash
npm run agent:validate
```

Expected:

```txt
OK qa/evals/pilar-core-evals.jsonl: 10 eval cases validated
```

This verifies the JSONL eval case format.

---

### 2.3 Eval readiness report

```bash
npm run agent:readiness
```

Expected:

```txt
OK eval suite report: 10 cases, 0 errors, 0 warnings
Wrote qa/evals/reports/latest-eval-readiness.md
```

This verifies that the local eval suite can read the seed eval cases and write the latest readiness artifact.

---

### 2.4 Research memo generation

```bash
npm run agent:research -- ai-agent-testing
```

Expected:

```txt
OK wrote sources/agent-research/memos/agent-opportunity-ai-agent-testing.md
```

This verifies the read-only Research Agent memo workflow.

---

### 2.5 Health snapshot

```bash
npm run agent:health
```

Expected:

```txt
OK wrote sources/agent-research/status/latest-agent-ecosystem-health.md
Status: PASS
```

This verifies the local health snapshot workflow.

---

### 2.6 Full local agent ecosystem gate

```bash
npm run agent:all
```

Expected result:

```txt
- eval validation passes
- eval readiness passes
- research memo generation passes
```

If this fails, do not build the next agent sprint until the failure is understood.

---

### 2.7 TypeScript gate

```bash
npx tsc --noEmit --pretty false
```

Expected:

```txt
no TypeScript errors
```

Warnings from lint/build are not part of this gate unless they become errors.

---

### 2.8 Optional full build

Use this before merging a larger sprint or after any runtime/app-code change:

```bash
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log; tail -n 40 last-run.log | clip
```

Expected:

```txt
Compiled successfully
Finished TypeScript
Generating static pages ... done
```

Warnings about `middleware`/`proxy` or NFT tracing may still exist and should be tracked separately, not fixed inside the agent-ecosystem release sprint.

---

## 3. Git release gate

Before committing an agent-ecosystem sprint, check:

```bash
git status --short
```

Expected patterns:

```txt
M  package.json
A  scripts/<new-agent-script>.mjs
A  sources/agent-research/<new-doc>.md
```

Avoid staging unrelated UI, report, i18n or Claude-owned files.

Use explicit staging:

```bash
git add path/to/file1 path/to/file2 path/to/file3
```

Do **not** use broad staging during parallel Claude work:

```bash
git add -A
```

unless the whole working tree has been audited and belongs to the same sprint.

After commit, check clean status:

```bash
git status --short > /tmp/pilar-status.log
if [ ! -s /tmp/pilar-status.log ]; then echo "CLEAN: git status --short has no output" > /tmp/pilar-status.log; fi
cat /tmp/pilar-status.log | clip
```

---

## 4. Acceptance checklist

Before a new agent-ecosystem sprint is accepted:

```txt
[ ] npm run agent:status passes
[ ] npm run agent:validate passes
[ ] npm run agent:readiness passes
[ ] npm run agent:research -- ai-agent-testing passes
[ ] npm run agent:health passes
[ ] npm run agent:all passes
[ ] npx tsc --noEmit --pretty false passes
[ ] any generated readiness/health artifacts are reviewed
[ ] only intended files are staged
[ ] sprint is committed separately from Claude/UI/report/i18n work
[ ] repo returns to clean status after commit
```

---

## 5. Current agent ecosystem assets

### Source documents

```txt
sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md
sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md
sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
sources/agent-research/AGENT_ECOSYSTEM_INDEX.md
sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md
sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md
sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md
```

### Eval assets

```txt
qa/evals/README.md
qa/evals/pilar-core-evals.jsonl
qa/evals/reports/README.md
qa/evals/reports/latest-eval-readiness.md
```

### E2E / Synthetic User assets

```txt
qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md
qa/e2e/prompts/english-aisc-simple-beam.txt
qa/e2e/prompts/norwegian-simple-beam.txt
```

### Scripts

```txt
scripts/validate-eval-cases.mjs
scripts/run-eval-suite.mjs
scripts/create-agent-opportunity-memo.mjs
scripts/pilar-agent-ecosystem-hub.mjs
scripts/write-agent-ecosystem-health-snapshot.mjs
```

### NPM commands

```txt
npm run eval:readiness
npm run agent:hub -- status
npm run agent:status
npm run agent:validate
npm run agent:readiness
npm run agent:research -- ai-agent-testing
npm run agent:health
npm run agent:all
```

---

## 6. Stop conditions

Stop and do not start the next agent sprint if:

```txt
- eval cases fail validation
- eval readiness report cannot be generated
- health snapshot reports FAIL
- TypeScript fails
- Git working tree contains unknown modified files
- Claude or another tool is actively editing the same file group
- a generated artifact unexpectedly changes app/runtime files
- a sprint requires DB migration before schema source has been reviewed
```

---

## 7. What not to do in this track

The agent ecosystem track should not silently touch:

```txt
app/
components/
lib/report/
lib/result/
supabase/
database migrations
agent production prompts
```

unless the sprint explicitly says so and the release gate includes runtime testing.

This separation is deliberate. The agent ecosystem should first become measurable and observable before it gets production authority.

---

## 8. Recommended next sprint after 34.14

Suggested next steps:

```txt
34.15 — Agent ecosystem release snapshot command
34.16 — Guardrail rules seed set
34.17 — Synthetic user report parser/checklist runner
34.18 — Observability event mock generator
```

Do not start runtime guardrails before the schema source, seed rules and eval-readiness flow are all stable.

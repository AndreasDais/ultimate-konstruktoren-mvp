# PILAR Research Topic Implementation Checklist

**File:** `sources/agent-research/topics/RESEARCH_TOPIC_IMPLEMENTATION_CHECKLIST.md`  
**Sprint:** 35.6  
**Status:** Implementation checklist / runbook  
**Owner:** PILAR Research Agent track  
**Scope:** Docs-only. No app-code, no prompts, no database schema, no production agent runtime.

---

## 1. Purpose

This checklist defines how to add, validate and maintain Research Agent topics in PILAR without turning the research workflow into ad-hoc notes.

A research topic should eventually support this loop:

```txt
research topic -> topic registry -> topic source file -> Agent Opportunity Memo -> memo quality check -> agent ecosystem gate
```

The goal is not to build autonomous code-changing agents yet. The goal is to make research structured, repeatable, auditable and useful for later sprint planning.

---

## 2. Files involved

| Purpose | File or folder |
|---|---|
| Topic registry | `sources/agent-research/topics/topic-registry.json` |
| Topic documentation | `sources/agent-research/topics/<topic-slug>.md` |
| Registry documentation | `sources/agent-research/topics/RESEARCH_TOPIC_REGISTRY.md` |
| Memo template | `sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md` |
| Generated memos | `sources/agent-research/memos/` |
| Memo quality rules | `sources/agent-research/memos/MEMO_QUALITY_CHECKS.md` |
| Topic validator | `scripts/validate-agent-research-topics.mjs` |
| Memo validator | `scripts/validate-agent-research-memos.mjs` |
| Memo generator | `scripts/create-agent-opportunity-memo.mjs` |
| Agent hub | `scripts/pilar-agent-ecosystem-hub.mjs` |

---

## 3. When to add a new topic

Add a new Research Agent topic when at least one of these is true:

```txt
1. The topic could reduce engineering-output risk.
2. The topic could improve QA, evals, observability or guardrails.
3. The topic could produce useful structured data for PILAR Brain.
4. The topic could clarify a strategic build/no-build decision.
5. The topic could become a small, testable future sprint.
```

Do **not** add a topic if:

```txt
1. It is only a vague idea without a PILAR problem mapping.
2. It requires immediate production code changes before research.
3. It cannot be evaluated.
4. It overlaps with an active Claude/Codex implementation sprint.
5. It requires paid-standard interpretation without verified source input.
```

---

## 4. Topic implementation checklist

Use this checklist for every new topic.

### Step 1 — Pick a stable topic slug

Use lowercase kebab-case:

```txt
ai-agent-testing
llm-eval-grading
agent-observability
engineering-guardrails
```

Avoid vague slugs:

```txt
cool-agent-idea
stuff-to-research
maybe-future-ai
```

---

### Step 2 — Add or update the topic registry

Edit:

```txt
sources/agent-research/topics/topic-registry.json
```

Each topic should have enough metadata to be useful later:

```json
{
  "slug": "agent-observability",
  "title": "Agent observability for PILAR",
  "priority": "P1",
  "status": "proposed",
  "owner": "PILAR Research Agent",
  "problem": "PILAR needs better traceability across agent runs.",
  "expected_outputs": [
    "Agent Opportunity Memo",
    "data-to-log proposal",
    "eval criteria"
  ]
}
```

Keep registry changes small and reviewable.

---

### Step 3 — Create the topic source file

Create:

```txt
sources/agent-research/topics/<topic-slug>.md
```

Minimum structure:

```md
# <Topic title>

**Topic slug:**  
**Priority:** P0 / P1 / P2  
**Status:** proposed / active / deferred / completed  

## 1. Research question

## 2. PILAR problem mapping

## 3. External signals to investigate

## 4. Data PILAR should log

## 5. Eval criteria

## 6. Risks

## 7. Suggested next sprint
```

Do not include unsupported claims. Mark uncertain ideas as assumptions.

---

### Step 4 — Validate topics

Run:

```bash
npm run research:topics
```

or directly:

```bash
node scripts/validate-agent-research-topics.mjs
```

Warnings are acceptable for proposed topics if the missing file/memo is intentionally scheduled for later. Errors should be fixed before commit.

---

### Step 5 — Generate or update memo

For a topic that is ready to become actionable, generate a memo:

```bash
npm run research:memo -- <topic-slug>
```

Example:

```bash
npm run research:memo -- ai-agent-testing
```

This should write or refresh a memo under:

```txt
sources/agent-research/memos/
```

---

### Step 6 — Validate memo quality

Run:

```bash
npm run research:memos
```

or the combined research gate:

```bash
npm run research:check
```

A memo should not be used for implementation planning unless it includes:

```txt
- external signal or source section
- PILAR problem mapping
- proposed agent or no-build conclusion
- priority
- MVP scope
- data to log
- eval criteria
- risk section
- suggested next sprint or deferral reason
```

---

### Step 7 — Run agent ecosystem gate

Before committing topic/memo work:

```bash
npm run agent:all
npx tsc --noEmit --pretty false
```

Do not run `npm run agent:health` unless you intentionally want to refresh:

```txt
sources/agent-research/status/latest-agent-ecosystem-health.md
```

Use check-only workflows when possible.

---

## 5. Commit rule

Commit topic work separately from app-code, i18n, report rendering or agent-prompt changes.

Good commit examples:

```bash
git commit -m "docs: add research topic for agent observability"
git commit -m "feat: add research topic registry validation"
git commit -m "docs: add memo for engineering guardrails"
```

Avoid mixed commits such as:

```txt
research topic + result-view fix + report DOCX patch
```

---

## 6. Stop conditions

Stop and do not commit if:

```txt
1. topic registry validation fails with errors
2. memo quality check fails with errors
3. npm run agent:all fails
4. TypeScript fails
5. a generated health snapshot changed unintentionally
6. git status shows unrelated app-code files modified
```

If unrelated files are modified, do not stage them. Either let the owner commit them separately or restore them if they were accidental.

---

## 7. Relationship to future agents

Research topics are upstream of implementation. They should feed later work such as:

```txt
- Eval Agent improvements
- Synthetic User Agent scenarios
- Observability schema changes
- Guardrail reason-code registry
- Prompt optimizer proposals
- Knowledge Brain data model
```

A topic does not grant permission to implement production behavior. It only creates a structured evidence base for deciding what to build.

---

## 8. Standard command sequence

Use this sequence for topic-only work:

```bash
npm run research:topics
npm run research:memos
npm run research:check
npm run agent:all
npx tsc --noEmit --pretty false
```

Use this sequence to copy status without creating repo-local log files:

```bash
git status --short > /tmp/pilar-status.log
if [ ! -s /tmp/pilar-status.log ]; then echo "CLEAN: git status --short has no output" > /tmp/pilar-status.log; fi
cat /tmp/pilar-status.log | clip
```

---

## 9. Acceptance criteria for Sprint 35.6

Sprint 35.6 is accepted when:

```txt
- this checklist exists in sources/agent-research/topics/
- research topic validator still passes
- research memo validator still passes
- agent:all still passes
- TypeScript still passes
- repo is clean after commit
```

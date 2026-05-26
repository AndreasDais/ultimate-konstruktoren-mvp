# PILAR Research Agent Topic Registry

**Sprint:** 35.0  
**Status:** Source / registry  
**Owner:** PILAR Research & Agent Strategy Agent  
**Purpose:** Define which research topics the local Research Agent workflow may use, and what each topic is allowed to produce.

---

## 1. Why this exists

Sprint 34 built the first agent-ecosystem foundation:

- strategy source
- Agent Opportunity Memo template
- eval seed set
- synthetic-user checklist
- observability and guardrail schema proposals
- research memo runner
- eval readiness runner
- command hub
- health snapshot
- release checklist
- handoff and final checkpoint

Sprint 35 starts turning this into a controlled operating system for research topics.

The topic registry prevents ad-hoc research prompts from becoming uncontrolled implementation work. A topic may generate a memo, propose evals, or suggest a future sprint, but it must not edit production code directly.

---

## 2. Registry files

```txt
sources/agent-research/topics/topic-registry.json
sources/agent-research/topics/RESEARCH_TOPIC_REGISTRY.md
scripts/validate-agent-research-topics.mjs
```

---

## 3. Current topics

| Topic ID | Priority | Status | Purpose |
|---|---:|---:|---|
| `ai-agent-testing` | P0 | active | Research product/web testing agents and map them to PILAR synthetic-user QA. |
| `agent-observability` | P1 | proposed | Research traces, run quality analytics and silent-failure detection. |
| `guardrail-runtime-actions` | P1 | proposed | Research runtime guardrails for unsupported engineering claims and agent actions. |
| `report-qa-agent` | P1 | proposed | Research report QA checks for assumptions, units, exports and language shell parity. |

---

## 4. Topic lifecycle

```txt
proposed -> active -> memo_generated -> deferred / accepted / rejected
```

### Proposed

A topic is interesting, but not yet used for a memo.

### Active

A topic is safe to run through the Research Agent memo workflow.

### Memo generated

A memo exists in:

```txt
sources/agent-research/memos/
```

### Accepted

The memo produced a concrete next sprint that the owner wants to build.

### Deferred

The idea is useful, but not now.

### Rejected

The idea should not be built because it adds risk, complexity or weak product value.

---

## 5. Non-negotiable rules

A registered topic must:

1. map to a concrete PILAR product problem
2. have a priority: `P0`, `P1`, `P2` or `NO_BUILD`
3. declare risk: `low`, `medium` or `high`
4. list expected outputs
5. define allowed next step
6. define blocked actions
7. stay read-only/suggest-only unless a later sprint explicitly changes that

A registered topic must not:

1. auto-edit app code
2. auto-edit production prompts
3. auto-run database migrations
4. remove warnings or disclaimers
5. mark engineering output as final approved
6. mix i18n/report work with agent ecosystem work

---

## 6. Commands

Validate registry:

```bash
node scripts/validate-agent-research-topics.mjs
```

Generate an existing memo:

```bash
node scripts/create-agent-opportunity-memo.mjs ai-agent-testing
```

Run current agent ecosystem checks:

```bash
npm run agent:status
npm run agent:validate
npm run agent:readiness
npm run agent:all
```

---

## 7. Next safe sprint candidates

```txt
Sprint 35.1 — Research topic npm aliases
Sprint 35.2 — Research memo quality validator
Sprint 35.3 — Guardrail reason-code registry
Sprint 35.4 — Observability event reason taxonomy
```

Do not jump to runtime agents until topic registry, memo quality checks and reason-code registries are stable.

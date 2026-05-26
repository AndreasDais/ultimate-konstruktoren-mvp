# Research Memo Quality Checks

**Status:** Sprint 35.2 source / QA reference  
**Track:** PILAR Agent Ecosystem / Research Agent  
**Purpose:** Define lightweight quality checks for Research Agent memos before they are used as sprint input.

---

## 1. Goal

Research Agent memos should be useful implementation inputs, not loose notes.

A memo should clearly answer:

```txt
1. What external signal was found?
2. What source/evidence supports it?
3. What concrete PILAR problem does it map to?
4. What agent or workflow is proposed?
5. Is it P0, P1, P2 or NO_BUILD?
6. What is the MVP scope?
7. What data must be logged?
8. How should the idea be evaluated?
9. What are the risks?
10. What is the recommended sprint or next step?
```

---

## 2. Local checker

Sprint 35.2 adds:

```txt
scripts/validate-agent-research-memos.mjs
```

Run:

```bash
node scripts/validate-agent-research-memos.mjs
```

The checker scans:

```txt
sources/agent-research/memos/*.md
```

excluding:

```txt
README.md
.gitkeep
```

---

## 3. What the checker validates

The checker looks for:

```txt
- Markdown title
- external signal / market pattern
- sources or URLs
- PILAR problem mapping
- proposed agent or explicit NO_BUILD
- priority: P0/P1/P2/NO_BUILD
- MVP scope
- data to log
- eval criteria
- risk section
- sprint suggestion / next step
- human review / read-only / suggest-only limitation
```

Missing title is an error. Most other misses are warnings in v0.1, because early memos may be incomplete but still useful.

---

## 4. Acceptance

A memo is good enough for planning when:

```txt
- checker exits 0
- no error-level issue
- warnings are reviewed
- the memo has enough detail to become a scoped sprint
```

A memo is not good enough when:

```txt
- it has no clear proposed agent/workflow
- it has no source/evidence
- it has no PILAR mapping
- it has no eval criteria
- it suggests code/database changes without human review
```

---

## 5. Future improvement

Later versions can add:

```txt
- JSON frontmatter
- source freshness checks
- topic registry cross-check
- automatic link from topic-registry.json to memo files
- stricter error gates before Sprint 36+
```

For now, Sprint 35.2 remains lightweight and local.

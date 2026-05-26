# Registry-to-Memo Coverage Check

**File:** `sources/agent-research/topics/REGISTRY_TO_MEMO_COVERAGE.md`  
**Sprint:** 35.9  
**Status:** Research Agent QA reference  
**Purpose:** Ensure that every Research Agent registry topic has both a topic file and an Agent Opportunity Memo.

---

## 1. Why this exists

The Research Agent track now has four layers:

```txt
topic-registry.json
→ topic markdown files
→ Agent Opportunity Memo files
→ quality checks / command hub
```

Without a coverage check, the registry can drift away from the actual topic and memo files. Sprint 35.9 closes that gap.

---

## 2. Coverage rule

For every topic in:

```txt
sources/agent-research/topics/topic-registry.json
```

there should be:

```txt
sources/agent-research/topics/<topic-id>.md
sources/agent-research/memos/agent-opportunity-<topic-id>.md
```

A topic may use explicit `topic_file` / `memo_file` fields if a different path is needed, but the default naming convention should be preferred.

---

## 3. Command

Run:

```bash
node scripts/validate-agent-research-topics.mjs
```

or:

```bash
npm run research:topics
npm run research:check
npm run agent:all
```

Expected healthy output:

```txt
OK registry-to-memo coverage: 4 topics, 4 topic files, 4 memo files, 0 errors, 0 warnings
```

Warnings are allowed for soft metadata issues or orphan documents. Errors should block the sprint.

---

## 4. What counts as an error

The validator should fail if:

```txt
- topic-registry.json is missing or invalid JSON
- the registry does not contain a topic array
- a registry topic has no stable id
- duplicate topic ids exist
- a registry topic is missing its topic markdown file
- a registry topic is missing its memo markdown file
```

---

## 5. What counts as a warning

The validator may warn if:

```txt
- a topic is missing optional title/name metadata
- a topic is missing optional priority/phase metadata
- a topic file does not mention its topic id
- a memo file is missing common memo signals such as priority, MVP, risk or source
- a topic or memo file exists but is not referenced by the registry
```

Warnings are not fatal in v0.1, but should be reviewed before release.

---

## 6. Scope limits

This check does not:

```txt
- perform web research
- judge whether sources are high quality
- validate engineering correctness
- modify app code
- create new topics or memos automatically
```

It is a coverage guard for the Research Agent documentation layer.

---

## 7. Next step

A later sprint can extend this into a stronger `research:check` gate that also validates:

```txt
- source URL count
- priority vocabulary
- MVP scope completeness
- eval criteria completeness
- sprint suggestion format
- human-review requirement
```

# PILAR Agent Ecosystem Command Hub

**File:** `sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md`  
**Status:** Implementation reference  
**Sprint:** 35.4  
**Purpose:** Document the local command hub for the PILAR agent-ecosystem track.

---

## 1. Purpose

The command hub is a local wrapper around the first PILAR agent-ecosystem workflows.

It is intentionally simple:

```txt
read local files
run local validation scripts
write deterministic Markdown artifacts
never call production APIs
never change app runtime logic
```

The hub lives here:

```txt
scripts/pilar-agent-ecosystem-hub.mjs
```

---

## 2. Commands

### 2.1 Direct Node commands

```bash
node scripts/pilar-agent-ecosystem-hub.mjs status
node scripts/pilar-agent-ecosystem-hub.mjs validate
node scripts/pilar-agent-ecosystem-hub.mjs eval-readiness
node scripts/pilar-agent-ecosystem-hub.mjs research-topics
node scripts/pilar-agent-ecosystem-hub.mjs research-memos
node scripts/pilar-agent-ecosystem-hub.mjs research-check
node scripts/pilar-agent-ecosystem-hub.mjs research-memo ai-agent-testing
node scripts/pilar-agent-ecosystem-hub.mjs health
node scripts/pilar-agent-ecosystem-hub.mjs all
```

### 2.2 NPM aliases

```bash
npm run agent:status
npm run agent:validate
npm run agent:readiness
npm run agent:research -- ai-agent-testing
npm run agent:health
npm run agent:all
npm run research:check
```

---

## 3. Command meanings

| Command | Meaning | Writes artifact? |
|---|---|---:|
| `status` | Checks that required agent-ecosystem files exist. | No |
| `validate` | Validates `qa/evals/pilar-core-evals.jsonl`. | No |
| `eval-readiness` | Runs readiness scan for the eval suite. | Yes: `qa/evals/reports/latest-eval-readiness.md` |
| `research-topics` | Validates the research topic registry. | No |
| `research-memos` | Validates generated Agent Opportunity Memos. | No |
| `research-check` | Runs topic-registry and memo-quality checks. | No |
| `research-memo <topic>` | Generates a memo for one topic. | Yes: `sources/agent-research/memos/agent-opportunity-<topic>.md` |
| `health` | Writes a health snapshot. | Yes: `sources/agent-research/status/latest-agent-ecosystem-health.md` |
| `all` | Runs status, eval validation, readiness and research checks. | Yes: readiness report |

---

## 4. Sprint 35.4 change

Before Sprint 35.4, `agent:all` covered:

```txt
status
validate
eval-readiness
```

After Sprint 35.4, `agent:all` also covers:

```txt
research-topics
research-memos
```

This means a single command now checks both the eval side and the Research Agent side:

```bash
npm run agent:all
```

---

## 5. Important generated artifacts

These files may change when commands are run:

```txt
qa/evals/reports/latest-eval-readiness.md
sources/agent-research/status/latest-agent-ecosystem-health.md
sources/agent-research/memos/agent-opportunity-*.md
```

Do not accidentally commit generated artifact changes unless the sprint intentionally refreshes them.

---

## 6. Safety rules

The hub must stay local and low-risk:

```txt
- no app runtime code changes
- no Supabase writes
- no production API calls
- no auto-merge
- no auto-deploy
- no prompt changes unless a sprint explicitly scopes them
```

The hub is allowed to:

```txt
- read local repo files
- run local validators
- write local Markdown reports
- fail fast when required files are missing
```

---

## 7. Recommended release check

Before moving to a real runtime agent sprint, run:

```bash
npm run agent:all
npm run research:check
npm run agent:status
npx tsc --noEmit --pretty false
```

Then verify Git status:

```bash
git status --short
```

If generated artifacts changed unintentionally, restore them before commit.

---

## 8. Next possible sprint

Recommended next sprint:

```txt
Sprint 35.5 — Add research checks to health snapshot
```

Goal:

```txt
Make `npm run agent:health` report topic-registry and memo-quality status explicitly.
```

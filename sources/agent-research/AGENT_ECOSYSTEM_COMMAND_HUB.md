# PILAR Agent Ecosystem Command Hub

**Status:** Sprint 34.10 source / local command reference  
**Owner:** PILAR AI-agent ecosystem track  
**Scope:** Local helper commands only. No production runtime changes.

## Purpose

This document describes the local command hub for the PILAR agent-ecosystem foundation.

The hub gives one entry point for the work introduced in Sprint 34:

```txt
Research Agent memo workflow
Eval case validation
Eval readiness reporting
Synthetic-user checklist references
Observability and guardrail schema references
```

The hub does not run the production PILAR agent pipeline. It is a local QA and coordination tool.

## Files

```txt
scripts/pilar-agent-ecosystem-hub.mjs
sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
```

Optional npm alias:

```txt
agent:hub = node scripts/pilar-agent-ecosystem-hub.mjs
```

## Commands

### Status

Checks that the Sprint 34 agent-ecosystem foundation files exist.

```bash
node scripts/pilar-agent-ecosystem-hub.mjs status
```

With npm alias:

```bash
npm run agent:hub -- status
```

### Validate eval cases

Runs the deterministic JSONL validation for `qa/evals/pilar-core-evals.jsonl`.

```bash
node scripts/pilar-agent-ecosystem-hub.mjs validate
```

Equivalent direct command:

```bash
node scripts/validate-eval-cases.mjs
```

### Eval readiness

Runs the eval readiness suite and writes the latest report artifact.

```bash
node scripts/pilar-agent-ecosystem-hub.mjs eval-readiness
```

Equivalent direct command:

```bash
npm run eval:readiness
```

### Research memo

Generates an Agent Opportunity Memo from a topic slug.

```bash
node scripts/pilar-agent-ecosystem-hub.mjs research-memo ai-agent-testing
```

Equivalent direct command:

```bash
node scripts/create-agent-opportunity-memo.mjs ai-agent-testing
```

### All local checks

Runs status, eval validation and eval readiness in sequence.

```bash
node scripts/pilar-agent-ecosystem-hub.mjs all
```

With npm alias:

```bash
npm run agent:hub -- all
```

## Git Bash workflow

Apply Sprint 34.10 ZIP:

```bash
cd /c/Users/rayma/Code/ultimate-konstruktoren-mvp
unzip -o ~/Downloads/PILAR_34.10_agent_ecosystem_command_hub.zip
```

Configure npm alias:

```bash
npm pkg set scripts.agent:hub="node scripts/pilar-agent-ecosystem-hub.mjs"
```

Verify:

```bash
node --check scripts/pilar-agent-ecosystem-hub.mjs
node scripts/pilar-agent-ecosystem-hub.mjs status
node scripts/pilar-agent-ecosystem-hub.mjs all
npm run agent:hub -- status
npx tsc --noEmit --pretty false
```

Copy status:

```bash
git status --short > /tmp/pilar-sprint34-10-status.log
git diff --stat >> /tmp/pilar-sprint34-10-status.log
cat /tmp/pilar-sprint34-10-status.log | clip
```

## Acceptance criteria

```txt
- node --check scripts/pilar-agent-ecosystem-hub.mjs passes
- status finds all required Sprint 34 foundation files
- validate passes
- eval-readiness writes latest eval readiness report
- npm run agent:hub -- status works after npm pkg set
- TypeScript passes
- no app/runtime files are touched
```

## Non-goals

```txt
- no production agent orchestration
- no database migration
- no browser automation
- no app UI changes
- no prompt changes
```

## Next possible sprint

```txt
Sprint 34.11 — Agent ecosystem daily snapshot
```

That sprint could generate a daily Markdown snapshot from:

```txt
agent hub status
eval readiness report
latest research memo list
known guardrail/observability schema docs
```

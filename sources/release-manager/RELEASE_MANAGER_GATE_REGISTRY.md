# PILAR Release Manager Gate Registry

**Status:** Release Manager Agent foundation v0.1  
**Sprint:** 41.0  
**Scope:** registry + validator only  
**Runtime impact:** none

## Purpose

This registry defines the local release gates that must be checked before a PILAR sprint can be called ready for merge or deployment.

Release Manager is intentionally read-only in this foundation sprint. It does not merge, deploy, modify prompts, modify database schemas or change application runtime logic.

## Decision vocabulary

Release Manager should eventually produce one of these decisions:

```txt
RELEASE_READY
RELEASE_RISKY
RELEASE_BLOCKED
```

In v0.1 this sprint only validates the gate registry. Later sprints can add a local command that reads test results and emits a release decision.

## Required gate types

The registry covers:

```txt
- clean Git working tree
- full agent ecosystem gate
- TypeScript gate
- production build gate
- health snapshot check mode
- eval readiness and eval coverage
- research checks
- guardrail checks
- observability checks
- report QA checks
- conditional runtime smoke tests
- conditional new-run proof for prompt/report-output changes
- conditional i18n regression checks
- generated artifact review
```

## Non-goals in 41.0

```txt
- no auto-merge
- no auto-deploy
- no runtime Release Manager API
- no Supabase migration
- no GitHub Actions changes
- no prompt changes
- no app/ or lib/ code changes
```

## Local validation

```bash
node scripts/validate-release-gates.mjs
```

Expected:

```txt
OK sources/release-manager/release-gates.json: 15 release gates validated, 0 errors, 0 warnings
```

## Standard release evidence commands

```bash
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

## Future sprints

```txt
41.1 — Release Manager npm aliases
41.2 — Connect Release Manager checks into agent hub
41.3 — Release decision report artifact
41.4 — Health snapshot includes Release Manager checks
41.5 — Release Manager final checkpoint
```

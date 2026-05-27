# PILAR Patch Planner Agent — Rule Registry

**Status:** Foundation registry  
**Sprint:** 42.0  
**Owner:** PILAR Patch Planner Agent track  
**Runtime effect:** None  

## Purpose

This registry defines the first rule set for a future PILAR Patch Planner Agent.

The Patch Planner Agent should help plan safe sprint patches, but in v0.1 it must remain a planning and validation layer only. It must not auto-edit production code, auto-merge, auto-deploy, or bypass human review.

## Why this exists

PILAR now has multiple local agent ecosystem gates:

```bash
npm run research:check
npm run eval:coverage:check
npm run guardrails:check
npm run observability:check
npm run report-qa:check
npm run release:check
npm run agent:all
npm run agent:health
```

The next risk is not lack of ideas. The risk is unsafe patch execution:

- too many files in one sprint
- broad TSX regex patches
- source-language replacement that breaks Norwegian mode
- patch scripts that silently do nothing
- generated artifacts committed accidentally
- new sprint started while a previous gate is red
- unrelated Claude/GPT changes mixed into one commit

The Patch Planner Agent should reduce this risk.

## Registry file

```txt
sources/patch-planner/patch-planner-rules.json
```

## Validator

```txt
scripts/validate-patch-planner-rules.mjs
```

Run:

```bash
node scripts/validate-patch-planner-rules.mjs
```

Expected:

```txt
OK sources/patch-planner/patch-planner-rules.json: 15 patch planner rules validated, 0 errors, 0 warnings
```

## Rule categories

Initial categories:

```txt
planning
scope
release_gate
evidence
artifact_workflow
patch_safety
rollback
observability
i18n
domain_safety
git_hygiene
verification
authority
```

## Severity model

```txt
block = Patch Planner must stop and require a fix or more context.
warn  = Patch Planner may continue, but must surface risk clearly.
info  = Advisory rule.
```

## V0.1 behavior

Patch Planner v0.1 should be able to:

```txt
- validate this registry
- classify a proposed sprint against these rules
- produce a safe sprint plan
- list expected files and excluded files
- produce test and rollback commands
- refuse to create a new sprint when core gates are red
```

It should not:

```txt
- auto-edit app/lib/runtime code
- auto-merge
- auto-deploy
- bypass TypeScript/build gates
- patch TSX with broad regex
- mix unrelated file groups
```

## Stop conditions

The Patch Planner must stop if:

```txt
- TypeScript is failing
- agent:all is failing
- required file context is missing
- same file has failed patching twice
- user has parallel uncommitted changes in unrelated files
- planned patch mixes unrelated systems
```

## Relationship to existing tracks

Patch Planner should protect, not replace, the current gates:

```txt
Research Agent       -> proposes opportunities and priorities
Eval Agent           -> measures behavior and coverage
Guardrails           -> reason-code and future decision safety
Observability        -> event taxonomy and future traces
Report QA            -> report-quality check registry
Release Manager      -> release gate registry
Patch Planner        -> safe patch planning before changes happen
```

## Next sprint candidates

```txt
Sprint 42.1 — Patch Planner npm aliases
Sprint 42.2 — Connect Patch Planner checks into agent hub
Sprint 42.3 — Health snapshot includes Patch Planner checks
Sprint 42.4 — Patch Planner final checkpoint
Sprint 42.5 — Patch plan template generator
```

## Sprint 57.2 — Sprint patch workflow discipline

Sprint 57.2 connects the accepted sprint patch workflow document to the Patch Planner documentation layer.

The workflow document is tracked at:

```txt
sources/patch-planner/PILAR_SPRINT_PATCH_WORKFLOW.md
```

Patch Planner planning should treat this document as the operator workflow baseline for local PILAR sprint patches, especially the status-only clipboard rule, guarded `git apply --check` usage, small ZIP patch preference, commit gates and stop conditions.

This sprint is documentation-only. Health snapshot coverage and machine validation can be handled in a later smaller sprint after the registry documentation link is committed cleanly.

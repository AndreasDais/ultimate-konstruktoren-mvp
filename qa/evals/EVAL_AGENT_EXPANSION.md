# Sprint 36.0 — Eval Agent Expansion

**Status:** Implementation source / QA foundation  
**Scope:** Eval Agent track only  
**Runtime impact:** None  

## Purpose

Sprint 36.0 expands the Eval Agent foundation from a simple seed set into a small coverage-aware workflow.

The goal is not to run the full PILAR agent pipeline yet. The goal is to make the current eval set easier to inspect and expand safely.

## Added files

```txt
scripts/summarize-eval-coverage.mjs
qa/evals/taxonomy/eval-case-taxonomy.json
qa/evals/EVAL_AGENT_EXPANSION.md
```

## What the new coverage script does

`scripts/summarize-eval-coverage.mjs` reads:

```txt
qa/evals/pilar-core-evals.jsonl
qa/evals/taxonomy/eval-case-taxonomy.json
```

It checks:

```txt
- valid JSONL parsing
- duplicate or missing case_id
- domain coverage
- standard/profile coverage
- display language coverage
- expected rule-list presence
- manual review distribution
```

By default it writes:

```txt
qa/evals/reports/latest-eval-coverage.md
```

Use `--check` when you want to verify without writing a generated artifact.

## Commands

```bash
node --check scripts/summarize-eval-coverage.mjs
node scripts/summarize-eval-coverage.mjs --check
node scripts/summarize-eval-coverage.mjs
node scripts/validate-eval-cases.mjs
npm run agent:all
npx tsc --noEmit --pretty false
```

## Acceptance criteria

```txt
- summarize-eval-coverage.mjs passes node --check
- coverage script can run in --check mode
- eval validator remains green
- agent:all remains green
- TypeScript remains green
- no app code is changed
```

Warnings are allowed in v0.1 if they describe missing metadata or future coverage gaps. Errors are not allowed.

## Design rule

This sprint must stay offline and deterministic. It must not call OpenAI/Anthropic APIs, Supabase, browser automation or production routes.

Future sprint candidates:

```txt
36.1 — Eval coverage npm alias
36.2 — Eval case metadata normalizer
36.3 — Eval report comparison baseline
36.4 — Rules-only grader output format
```

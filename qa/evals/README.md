# PILAR eval case seed set

**Status:** Seed data / implementation reference  
**Sprint:** 34.2  
**Purpose:** Give PILAR a small, explicit eval-set before building the full Eval Agent.

This folder contains rule-readable eval cases for the PILAR core pipeline. The goal is not to replace the existing live QA agent in `qa/`, but to add a lightweight benchmark source that can later feed:

- Eval Agent
- Synthetic User Agent
- Guardrail Agent
- Report QA Agent
- Release Manager Agent

## Files

```txt
qa/evals/pilar-core-evals.jsonl
scripts/validate-eval-cases.mjs
scripts/grade-eval-artifact.mjs
scripts/run-eval-case-live.mjs
```

## Run validation

```bash
node scripts/validate-eval-cases.mjs
```

The validator only checks schema shape, duplicate IDs and basic consistency. It does not run the PILAR app or call an LLM.
Critical case metadata such as `version`, `title`, `domain`, and
`standard_context` must be non-empty strings.

## Grade one saved text artifact

Use the offline artifact grader when you have a saved text artifact and want to
apply one eval case's deterministic text rules:

```bash
node scripts/grade-eval-artifact.mjs --case-id pilar_eval_irrelevant_input_football_004 --artifact /tmp/pilar-artifact.txt
node scripts/grade-eval-artifact.mjs --case-id pilar_eval_irrelevant_input_football_004 --text "..."
node scripts/grade-eval-artifact.mjs --case-id pilar_eval_irrelevant_input_football_004 --artifact /tmp/pilar-artifact.txt --json
```

## List eval cases

The artifact grader can also list cases without grading an artifact:

```bash
node scripts/grade-eval-artifact.mjs --list-cases
node scripts/grade-eval-artifact.mjs --list-cases --json
node scripts/grade-eval-artifact.mjs --list-cases --ids-only --display-language en
node scripts/grade-eval-artifact.mjs --list-cases --count --tag i18n
```

Supported list filters:

```txt
--priority <P0|P1|...>
--domain <domain>
--standard-context <standard_context>
--display-language <nb|nn|en>
--target-agent <agent>
--tag <tag>
```

Listing is read-only. It is meant to help parallel agents find relevant eval
cases for patch planning and artifact grading; it does not run the live PILAR
pipeline or update generated reports.

The grader checks:

```txt
must_include
must_not_include
unit_expectations
required_warnings_if_missing
```

It intentionally skips `numeric_expectations` and `safety_checks` until those
have case-specific deterministic graders. It does not call LLMs, read Supabase,
create runs, refresh report artifacts, or prove that the live PILAR pipeline
passes the eval case.

## Plan one live eval run

Use the live eval runner in dry-run mode to inspect the planned evidence bundle
for one case before any future live pipeline execution exists:

```bash
node scripts/run-eval-case-live.mjs --case-id pilar_eval_prompt_leakage_uk_en_012 --dry-run
node scripts/run-eval-case-live.mjs --case-id pilar_eval_prompt_leakage_uk_en_012 --json
```

The runner currently performs case lookup and prints the case metadata
(`priority`, `domain`, `standard_context`, `display_language`, `target_agents`),
planned `/tmp` artifact-bundle path, dry-run eval status, bundle status
taxonomy, manifest preview, planned file inventory, trace requirement, explicit
`dry_run: true` flag, rule/trace summary counts, and offline grading commands
for that bundle. It does not call LLMs, read Supabase, execute the pipeline, or
write files.

Dry-run bundle planning has these invariants:

```txt
run_status=SKIP
eval_status=SKIP
bundle_status=PLAN
planned_file_inventory[].written=false
live_pipeline_execution=false
supabase_reads=false
repo_writes=false
```

Treat `dry_run=true` or `bundle_status=PLAN` as patch-planning evidence only.
It is not proof that PILAR generated, graded, persisted, or professionally
approved a real report. See
`sources/agent-research/eval/DRY_RUN_LIVE_SEPARATION_AUDIT.md` for the field
differences required before future live proof can be consumed.

## Live-read contract preflight

Before changing the live-read dry interface, run the Eval-lane preflight:

```bash
node scripts/run-eval-case-live.mjs --check-live-read-contract
```

This is a non-writing check. It is intentionally not part of `agent:all`, and
it must not be added to `package.json` until a later coordination sprint says
so. The preflight only locks the current refusal and plan-shape contract:

```txt
--mode live_read without --run-id refuses
evidence_source=dry_run
requested_evidence_source=live_read
evidence_request_contract.live_read_enabled=false
planned_action.supabase_reads=false
planned_action.llm_calls=false
planned_action.repo_writes=false
professional_approval=false
missing_required_report=FAIL
missing_required_trace=WARN by default
missing_required_trace=FAIL with --require-trace
```

Passing this preflight does not read Supabase, call an LLM, execute the PILAR
pipeline, write artifact files, or prove professional engineering approval. It
only proves that the current CLI still refuses unsupported live-read proof and
keeps live-read requests in dry-run planning mode.

## Case format

Each line in `pilar-core-evals.jsonl` is one JSON object.

Required top-level fields:

```txt
case_id
version
title
priority
domain
standard_context
display_language
input_text
expected
grader
manual_review_required
tags
```

Expected fields:

```txt
must_include
must_not_include
unit_expectations
required_warnings_if_missing
safety_checks
```

Optional expected fields:

```txt
numeric_expectations
notes
```

## Design principles

1. Start with a tiny benchmark that is easy to inspect.
2. Keep cases human-readable.
3. Mark high-risk engineering cases for manual review.
4. Include both Norwegian/Eurocode and English/AISC regression.
5. Separate shell-language problems from technical answer-language problems.
6. Do not encode paid-standard table values unless they are provided as input.

## Relationship to existing QA

The existing `qa/test-agent.ts` flow is a live pipeline/golden-test system. These eval cases are a source dataset that can later be converted into live tests, rule graders or LLM-assisted graders.

Use this seed set to decide what PILAR should measure before building more automation.

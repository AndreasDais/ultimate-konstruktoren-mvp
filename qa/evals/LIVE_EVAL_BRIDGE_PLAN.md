# PILAR Live Eval Bridge Plan

**Status:** Chat A working plan  
**Lane:** Live Eval Bridge / Eval Intelligence  
**Runtime impact:** None in this plan  

This plan moves Chat A from offline eval tooling toward a cautious live eval
bridge. The goal is a closed loop where one eval case can eventually be run
through PILAR, linked to traces, graded deterministically, and used as release
evidence.

## North star

```txt
eval case -> live/non-live run -> RunRecord + traces -> artifact bundle ->
deterministic grading -> release evidence
```

The bridge must not turn offline eval readiness into fake production proof. It
should make the difference explicit:

- offline corpus checks prove the eval cases are valid and inspectable
- live eval evidence proves one concrete run produced auditable output

## Chat A scope

Allowed by default:

```txt
qa/evals/**
qa/**
scripts/*eval*
```

Avoid unless a later sprint explicitly expands scope:

```txt
app/**
lib/agents/**
lib/report/**
lib/result/**
supabase/**
package.json
scripts/pilar-agent-ecosystem-hub.mjs
```

## Safety rules

1. Start with one `case_id`, not a batch runner.
2. Keep live evals out of `agent:all`.
3. Do not add LLM grading in the first bridge.
4. Do not write generated reports unless the sprint explicitly says so.
5. Prefer scratch output under `/tmp` for any future runner artifacts.
6. Preserve `eval_case_id` as the link between JSONL cases and runtime runs.
7. Treat stored old reports as historical artifacts, not proof of new behavior.

## Phase plan

### A1 - Contract first

Document the minimum input/output contract for a future single-case live eval
runner.

Expected input:

```txt
case_id
optional: profile/filter flags
optional: scratch output path
```

Expected output:

```txt
case_id
run_id
run_status
artifact paths or extracted text
rule-grade summary
trace assertion summary
manual_review_required
```

### A2 - Artifact bundle shape

Define the smallest comparable artifact bundle without changing runtime code:

```txt
runrecord summary
web/full report text or model excerpt
trace event summary
step message metadata summary
```

This phase should name the shape before any script depends on it.

### A3 - Saved artifact adapter

Extend the existing offline grader path so it can grade a saved bundle or text
artifact consistently. This should still require no Supabase and no network.

### A4 - Single-case live runner draft

Only after A1-A3 are stable, add a draft runner that accepts one `case_id` and
prints what it would do unless explicitly enabled. No batch mode.

### A5 - Trace assertions

Add deterministic trace checks for one run:

```txt
expected agents emitted completion or clear stop/fail signal
step metadata includes model and prompt version
fallback/retry/error categories are visible without secrets
```

## Coordination with other lanes

Chat B can continue runtime reliability work independently. Chat A should only
depend on B when a future live runner needs a stable artifact or trace read path.

Chat C can continue release/ops work independently. Chat A should produce clear
evidence files or command output that C can later reference from release gates.

## First useful sprint after this plan

Create a minimal `LIVE_EVAL_RUNNER_CONTRACT.md` or equivalent section that
defines the single-case runner contract in enough detail to implement safely.
Keep it docs-only unless the repo is clean and the exact script boundary is
obvious.

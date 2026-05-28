# Eval-to-Runtime Gap Report

**Status:** Working gap report  
**Lane:** Chat A / Eval Intelligence  
**Runtime impact:** None  

This report separates what the current eval corpus proves from what still
requires a live PILAR pipeline run. It should prevent a common mistake: treating
offline eval-case validation as proof that the production agent pipeline passes
those cases.

## Current eval layers

| Layer | Files | What it proves | What it does not prove |
|---|---|---|---|
| Eval corpus | `qa/evals/pilar-core-evals.jsonl` | Cases are explicit, inspectable, and rule-readable. | The live agents produced the expected output. |
| Corpus validation | `scripts/validate-eval-cases.mjs` | Required fields, tag shape, target agents, and basic metadata are valid. | Any engineering answer is correct. |
| Readiness summary | `scripts/run-eval-suite.mjs --check` | The corpus has deterministic check inventory and no readiness errors. | Any live run passed those checks. |
| Coverage summary | `scripts/summarize-eval-coverage.mjs --check` | Domain, language, standard context, and target-agent coverage are visible. | Coverage is sufficient for release by itself. |
| Live golden path | `qa/test-agent.ts`, `qa/grade.ts`, `qa/run-pipeline.ts` | Existing golden cases can run through the live pipeline and be graded. | The JSONL eval corpus is automatically executed there. |

## Runtime surfaces already available

PILAR now has enough trace infrastructure to build a future eval-to-runtime
bridge without inventing a parallel trace format:

| Surface | Use for future eval bridge |
|---|---|
| `calculation_runs.eval_case_id` | Link non-live/eval runs back to a JSONL case id. |
| `runrecord` view | Read one joined pipeline run for deterministic grading. |
| `trace_events` view | Inspect chronological agent events for a run. |
| `step_messages` | Inspect raw SDK envelope metadata and prompt/runtime parameters. |
| `qa/grade.ts` | Existing deterministic live-run grader for golden cases. |

## Main gaps

### G1: JSONL cases do not execute the live pipeline

The JSONL corpus currently validates shape and coverage. It does not create a
PILAR run, wait for all agents, fetch a `RunRecord`, or compare outputs against
the case expectations.

**Bridge candidate:** add a separate runner later, for example
`scripts/run-eval-case-live.mjs`, that accepts one `case_id`, creates an eval
run with `eval_case_id`, and writes only to a scratch report path unless
explicitly told otherwise.

### G2: Rule lists are not yet applied to live outputs

`must_include`, `must_not_include`, `unit_expectations`,
`numeric_expectations`, and `safety_checks` are counted and summarized, but
they are not yet applied to actual report text, structured outputs, PDF, or Word
artifacts.

**Bridge candidate:** first implement a pure function that accepts a saved
artifact bundle plus one eval case and returns rule results. Keep it separate
from LLM grading.

### G3: Artifact parity remains manual

The corpus has report/PDF/Word parity cases, but no automatic artifact diff. The
future bridge needs a canonical artifact bundle:

```txt
web report text/model
full report text/model
calculation sheet model
Word export text
PDF/print text or render extract
```

Until that bundle exists, artifact parity evals are planning coverage, not live
proof.

### G4: Trace assertions are not connected to cases

`trace_events`, `step_messages`, and `eval_case_id` make trace assertions
possible, but no eval runner checks them yet.

Useful future trace assertions:

- every expected agent emitted a completion event
- every agent message recorded model, temperature, prompt version, and max tokens
- stored reports are not used as proof of new prompt behavior
- retries and fallback paths are visible in trace data

### G5: LLM grading should remain out of the first bridge

The first eval-to-runtime bridge should be deterministic. LLM-assisted grading
can come later, after the rule-only bridge is trusted.

## Recommended bridge sequence

1. **Rules-only artifact grader function**
   - Input: one eval case plus saved output text/model.
   - Output: pass/warn/fail rule results.
   - No network calls and no DB writes.

2. **Single-case live runner**
   - Input: one `case_id`.
   - Creates or reuses a non-live eval run with `eval_case_id`.
   - Fetches `RunRecord`.
   - Writes scratch output only unless explicitly asked.

3. **Trace assertion layer**
   - Reads `trace_events` and `step_messages`.
   - Verifies the run is auditable.
   - Does not duplicate trace storage.

4. **Artifact parity adapter**
   - Extracts comparable text/model from web report, PDF, Word, and calculation
     sheet.
   - Applies the same rule grader to every artifact.

5. **Batch runner**
   - Runs selected cases by tag, priority, or target agent.
   - Defaults to a small set. Full batch should be explicit.

## Non-goals for the next sprint

- Do not add LLM grading.
- Do not add a second trace writer.
- Do not make `agent:all` execute live evals.
- Do not refresh generated reports unless the sprint explicitly requests it.
- Do not treat offline readiness as live pipeline proof.

## Candidate next sprint

**67A.7 - Rules-only artifact grader design**

Scope:

```txt
qa/evals/**
scripts/*eval*
```

Goal:

Document or implement a tiny pure rule-grader interface for applying one eval
case to one saved text artifact. Keep it independent from Supabase, live agents,
and generated report refreshes.


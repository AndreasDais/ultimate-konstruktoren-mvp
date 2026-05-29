# Error Category Expectation

**Sprint:** 68A.18  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Planning contract  

This contract defines the safe `error_category` evidence Eval should expect in
future `live_read` trace metadata. It does not authorize Supabase reads, LLM
calls, live pipeline execution, runtime logging changes, or repo artifact
writes.

## Purpose

Error categories should let Eval, Runtime, and Ops distinguish why an agent step
failed without exposing raw provider messages, stack traces, credentials, user
data, or service-role details.

## Expected safe categories

Runtime may choose exact names later, but Eval should only consume bounded,
redacted categories equivalent to:

| Category | Meaning | Eval use |
|---|---|---|
| `none` | Step completed or skipped without an error | Accepted for successful terminal steps |
| `quota` | Provider or account quota/rate-limit failure | Useful for transient infrastructure diagnosis |
| `auth` | Provider auth/config failure without exposing credentials | Blocks live proof; safe for ops routing |
| `transient` | Retryable network, timeout, or upstream availability issue | Warning or missing evidence unless final proof was requested |
| `model_output` | Model response could not be parsed or failed bounded output checks | Important for report/trace quality gates |
| `validation` | Runtime rejected unsafe, incomplete, or schema-invalid data | Important for blocked-output and report safety checks |
| `unsupported_context` | Engineering context, standard, or request type was unsupported | Should stay explicit, not hidden as success |
| `blocked` | Controller or guardrail intentionally blocked output | Must preserve blocked-field evidence |
| `internal` | Redacted internal failure with no safe public detail | Allowed only when no secret or stack detail leaks |
| `unknown` | Runtime cannot safely classify the error yet | `WARN` unless a release gate requires explainability |
| `not_applicable` | Step did not run or does not have an error concept | Accepted for skipped or process-only evidence |

Eval should reject categories that contain free-form provider text or local
implementation details, even when the high-level meaning looks useful.

## Required fields

Failed or blocked trace steps should expose:

```txt
run_id
step_id
step_name
status
error_category
error_public_summary
retryable
raw_error_redacted
```

Field expectations:

| Field | Expected shape | Missing classification |
|---|---|---|
| `error_category` | One bounded category or explicit `unknown` | `WARN` for failed steps; `FAIL` if the case is checking safe error routing |
| `error_public_summary` | Short redacted explanation, safe for logs and release gates | `WARN` unless the category is `internal` or `unknown` |
| `retryable` | Boolean or explicit `unknown` | `WARN` for quota/transient cases |
| `raw_error_redacted` | Boolean confirming raw provider detail was removed | `FAIL` if false or absent when raw-looking text is present |

## Classification rules

Eval should classify error evidence as:

| Condition | Classification |
|---|---|
| Dry-run output has no error evidence | `PLAN` |
| Successful step has `error_category=none` or `not_applicable` | `PASS` |
| Failed step has a bounded category and redacted summary | `PASS` or `WARN`, depending on case requirements |
| Failed step lacks `error_category` | `WARN` by default |
| Error category is free-form provider text | `FAIL` |
| Error summary includes secrets, service-role data, stack traces, or raw provider payload | `FAIL` |
| Controller-blocked output lacks `blocked` or equivalent category | `FAIL` when blocked behavior is under test |
| Unsupported engineering context is hidden behind `none` or success | `FAIL` |

Missing error categories should not turn a failed runtime step into a passed
eval. They should remain visible as `WARN`, `MISSING`, or `FAIL` depending on
whether the caller requested live proof, release proof, or process-only review.

## Step expectations

| Step | Error evidence expectation |
|---|---|
| `tolkar` | Unsupported, irrelevant, or incomplete input should stay explicit without fake calculation proof |
| `konstruktor_a` | Parse/model-output failures should not be converted into engineering approval |
| `konstruktor_b` | Independent failure should not overwrite A's trace or summary |
| `samanliknar` | Comparator mismatch and parse failures should be separated from provider/runtime failures |
| `kontrollor` | Blocked and validation failures should preserve controller intent and blocked-field evidence |
| `rapportor` | Missing report generation should be visible without inventing user-facing report text |
| `pipeline` | Terminal summary should aggregate failed/blocked categories without raw error payloads |

## Bundle mapping

Future bundles should place error category evidence in
`step-metadata-summary.json` and aggregate only counts or missing categories in
`trace-events-summary.json`.

```json
{
  "run_id": "uuid",
  "steps": [
    {
      "step_name": "kontrollor",
      "status": "blocked",
      "error_category": "blocked",
      "error_public_summary": "output blocked by controller",
      "retryable": false,
      "raw_error_redacted": true
    }
  ]
}
```

`report-text.txt` must never contain raw error payloads. If a report surface
shows an error, Eval should grade the user-facing text separately from the
machine-readable `error_category`.

## Stop conditions

Eval must stop short of live proof when:

```txt
error evidence belongs to a different run id
error_category is absent for failed or blocked live proof and no safe fallback exists
raw provider text appears in category or summary fields
stack traces, secrets, service keys, or local file paths appear in evidence
unsupported_context is reported as success
blocked output is reported without blocked-field evidence
```

These rules keep runtime failures explainable enough for world-class eval and
ops gates without turning error evidence into a leakage channel.

# Blocked Field Evidence Expectation

**Sprint:** 68A.19  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Planning contract  

This contract defines how Eval should expect blocked-field evidence to appear
in future `live_read`, cached-report, and fixture evidence. It does not
authorize Supabase reads, LLM calls, live pipeline execution, report rendering
changes, prompt changes, or repo artifact writes.

## Purpose

PILAR must respect controller `blocked_fields` in every user-facing output.
Eval therefore needs proof that blocked values are visible as blocked evidence,
not silently converted into normal report prose, hidden success language, or
final professional approval.

## Required evidence

When a controller or guardrail blocks output, future evidence should expose:

```txt
run_id
eval_case_id
blocked_fields
blocked_field_count
blocking_source
blocking_reason_codes
report_text
report_block_markers
manual_review_required
```

Field expectations:

| Field | Expected shape | Missing classification |
|---|---|---|
| `blocked_fields` | Machine-readable list or object naming blocked fields | `FAIL` when blocked output is indicated |
| `blocked_field_count` | Number matching the blocked field collection | `WARN` if derivable, `FAIL` if contradictory |
| `blocking_source` | Bounded label such as `kontrollor`, `guardrail`, or `runtime_validation` | `WARN` unless source identity is under test |
| `blocking_reason_codes` | Redacted reason-code list or explicit `unknown` | `WARN`; `FAIL` if release/ops proof requires reason-code routing |
| `report_block_markers` | User-facing markers that show values were withheld or blocked | `FAIL` when report proof is requested |
| `manual_review_required` | Boolean that remains true for high-risk blocked cases | `FAIL` if false while blocked fields exist |

The exact runtime shape may evolve, but Eval must be able to distinguish
`blocked and preserved` from `missing`, `leaked`, and `not applicable`.

## User-facing report rule

For report evidence, Eval should check both sides of the boundary:

```txt
blocked field identity is visible enough for audit
blocked field value is absent from report prose unless safely masked
report text states the limitation or withheld-field condition
report text does not claim final approval or completed capacity verification
```

Safe examples are markers such as `blocked`, `withheld`, `not shown`,
`manglar`, `ikkje vurdert`, `cannot verify`, or an equivalent localized marker.
Unsafe examples are raw blocked values, hidden unsafe conclusions, or prose that
uses the blocked value as if it were verified.

## Classification rules

Eval should classify blocked-field evidence as:

| Condition | Classification |
|---|---|
| Dry-run output has no blocked-field evidence | `PLAN` |
| Case has no blocked-output expectation and no blocked fields appear | `SKIP` |
| Blocked fields exist and report markers preserve the limitation | `PASS` or `WARN`, depending on completeness |
| Blocked fields exist but `report_block_markers` are absent | `FAIL` when report proof is requested |
| Blocked output is indicated but `blocked_fields` is absent | `FAIL` |
| Report text leaks a blocked value as ordinary prose | `FAIL` |
| Report text claims final approval despite blocked fields | `FAIL` |
| `manual_review_required=false` while blocked fields exist | `FAIL` for high-risk engineering cases |
| Blocked field source is unknown but values remain blocked | `WARN` |

Consumers must not convert blocked-field uncertainty into `PASS`. If Eval
cannot prove blocked values stayed blocked, release and ops consumers should
treat the evidence as unavailable or failing, depending on release risk.

## Step expectations

| Step | Blocked-field expectation |
|---|---|
| `tolkar` | Missing or irrelevant input may explain why later fields are blocked, but should not invent engineering values |
| `konstruktor_a` | Candidate output should not treat blocked or missing upstream data as verified capacity proof |
| `konstruktor_b` | Independent candidate output should preserve its own missing/blocked assumptions separately from A |
| `samanliknar` | Comparator should surface disagreement caused by blocked or missing fields without hiding it as match |
| `kontrollor` | Controller should be the primary source for `blocked_fields`, hard-block decisions, and review-required status |
| `rapportor` | Reporter should preserve blocked markers in canonical report text and avoid leaking blocked values |
| `pipeline` | Terminal summary should aggregate blocked status without implying professional approval |

## Bundle mapping

Future bundles should map blocked evidence like this:

| Bundle file | Blocked-field evidence |
|---|---|
| `runrecord-summary.json` | `manual_review_required`, target agents, high-level blocked status |
| `report-text.txt` | Canonical report text with blocked values omitted or safely marked |
| `trace-events-summary.json` | Controller/reporter step status and missing blocked-field evidence |
| `step-metadata-summary.json` | Redacted `blocked` or `validation` error category when applicable |
| `grade-result.json` | Deterministic blocked-field assertion results |

Example planned shape:

```json
{
  "blocked_fields": [
    {
      "field": "capacity_conclusion",
      "source": "kontrollor",
      "reason_codes": ["missing_profile_data"],
      "report_marker_present": true,
      "value_leaked": false
    }
  ],
  "blocked_field_count": 1,
  "manual_review_required": true
}
```

## Stop conditions

Eval must stop short of live proof when:

```txt
blocked evidence belongs to a different run id
blocked output is indicated but blocked_fields is absent
blocked values appear in report text as verified prose
blocked fields are hidden behind generic success or approval language
manual_review_required is false for a high-risk blocked engineering case
the runtime read path cannot prove report text came from canonical report data
```

These rules keep blocked-field regressions visible across Eval, Runtime, and
Ops without making Eval a second source of report truth.

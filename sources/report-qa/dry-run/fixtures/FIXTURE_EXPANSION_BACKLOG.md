# Report QA Fixture Expansion Backlog

**Sprint:** 50.0  
**Status:** backlog / planning artifact  
**Owner:** Report QA track

---

## Backlog table

| Priority | Fixture id proposal | File proposal | Purpose | Expected result |
|---:|---|---|---|---|
| P0 | minimal-valid-report | minimal-valid-report.md | Baseline acceptable report | mostly_pass |
| P0 | missing-input-report | missing-input-report.md | Catch confident answer with missing data | fail_or_warn |
| P0 | unit-inconsistency-report | unit-inconsistency-report.md | Catch mixed units and unclear formulas | fail_or_warn |
| P0 | overconfident-conclusion-report | overconfident-conclusion-report.md | Catch final-compliance language | fail_or_warn |
| P0 | missing-disclaimer-report | missing-disclaimer-report.md | Catch report that lacks AI/engineering disclaimer and responsible engineer limitation | fail_or_warn | active |
| P1 | norwegian-nynorsk-report | norwegian-nynorsk-report.md | Check Norwegian/Nynorsk shell and role labels | mostly_pass_or_warn |
| P1 | english-aisc-diagnostic-report | english-aisc-diagnostic-report.md | Check international shell and AISC guardrails | mostly_pass_or_warn |
| P2 | concrete-example-report | concrete-example-report.md | Avoid steel-only overfitting | mostly_pass_or_warn |
| P2 | load-combination-mismatch-report | load-combination-mismatch-report.md | Catch characteristic/design load confusion | fail_or_warn |
| P3 | pdf-word-parity-placeholder | pdf-word-parity-placeholder.md | Prepare later artifact parity scope | planned_not_active |

---

## Candidate metadata for future registry

Each fixture should eventually carry metadata like:

```json
{
  "id": "missing-input-report",
  "title": "Missing input report",
  "path": "sources/report-qa/dry-run/fixtures/missing-input-report.md",
  "fixture_type": "negative",
  "standard_profile": "norway_eurocode",
  "language": "nn",
  "expected_result": "fail_or_warn",
  "mapped_checks": [
    "missing_data_acknowledged",
    "conclusion_strength_appropriate",
    "warnings_visible"
  ]
}
```

---

## Notes for authors

A good fixture should be short enough to review, but realistic enough that it resembles a PILAR report.

Avoid making every fixture fail everything. Each fixture should be designed to test a small, understandable failure mode.

Do not add LLM-generated grading in the fixture layer yet. Keep validation deterministic until the fixture bank is stable.

## Sprint 51.0 status update

`missing-input-report` is now active.

This fixture checks whether Report QA catches reports that move too far toward approval even though required engineering inputs are missing or uncertain.

## Sprint 52.0 status — unit inconsistency fixture activated

`unit-inconsistency-report` has been promoted from planned backlog item to active fixture coverage.

Active file:

```txt
sources/report-qa/dry-run/fixtures/unit-inconsistency-report.md
```

This establishes the first unit-consistency negative fixture family for Report QA.

## Sprint 53.0 status — overconfident conclusion fixture activated

`overconfident-conclusion-report` has been promoted from planned backlog item to active fixture coverage.

Active file:

```txt
sources/report-qa/dry-run/fixtures/overconfident-conclusion-report.md
```

This starts the overconfident-conclusion fixture family. The fixture focuses on reports that are polished and partly specified, but still approve the design more strongly than the documented checks support.

## Sprint 54.0 note — missing-disclaimer fixture activated

- Activated `missing-disclaimer-report` as the next negative Report QA fixture family.
- Purpose: verify that Report QA catches reports that present engineering conclusions without clear AI/engineering disclaimer, responsibility limits, or qualified engineer review requirement.
- Expected QA outcome: `fail_or_warn`.

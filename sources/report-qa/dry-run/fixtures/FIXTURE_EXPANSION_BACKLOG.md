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
| P1 | missing-disclaimer-report | missing-disclaimer-report.md | Catch missing professional-review language | fail_or_warn |
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

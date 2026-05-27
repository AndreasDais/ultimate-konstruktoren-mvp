# Report QA Fixture Registry

**Sprint:** 50.1  
**Status:** registry foundation  
**Owner:** Report QA track

## Purpose

This registry tracks Report QA dry-run fixtures before they are connected to stronger runtime-adjacent QA workflows.

The registry exists so PILAR can answer:

```txt
Which Report QA fixtures exist?
Which are active, planned or deferred?
Which risk areas do they cover?
Which language and standard context do they test?
Which Report QA checks are targeted?
```

## Files

```txt
sources/report-qa/dry-run/fixtures/fixture-registry.json
scripts/validate-report-qa-fixture-registry.mjs
sources/report-qa/dry-run/fixtures/FIXTURE_REGISTRY.md
```

## Validation

```bash
node scripts/validate-report-qa-fixture-registry.mjs
```

The validator checks:

- JSON parsing.
- Required fields.
- Unique kebab-case fixture ids.
- Valid status values.
- Known fixture families.
- Active fixture files exist.
- Planned/deferred fixture paths stay under `sources/report-qa/`.
- `checks_targeted` is non-empty.

## Status values

```txt
active   = fixture file exists and is part of current dry-run coverage
planned  = fixture family is planned, but file is not required yet
deferred = valuable later, but intentionally outside current implementation scope
```

## Current fixture coverage

The first registry includes active coverage for:

```txt
sample-report
realistic-steel-beam-report
```

It also records planned/deferred fixture families from Sprint 50.0:

```txt
minimal-valid-report
missing-input-report
unit-inconsistency-report
overconfident-conclusion-report
missing-disclaimer-report
nynorsk-report — active — `sources/report-qa/dry-run/fixtures/nynorsk-report.md` — expected `pass_or_warn`
english-aisc-diagnostic-report
concrete-example-report
load-combination-mismatch-report
pdf-word-parity-placeholder
```

## Safety constraints

This registry does not:

- call an LLM;
- modify report output;
- read Supabase;
- change app runtime;
- write generated artifacts;
- grade real user reports.

It is a planning and validation layer only.

## Next expected sprint

```txt
Sprint 50.2 — Report QA fixture registry npm aliases
```

## Sprint 51.0 active fixture

`missing-input-report` has been promoted from planned to active.

The fixture path is:

```txt
sources/report-qa/dry-run/fixtures/missing-input-report.md
```

Expected QA outcome: `fail_or_warn`.

## Sprint 52.0 — unit inconsistency fixture

Sprint 52.0 promotes `unit-inconsistency-report` from planned to active coverage.

The active fixture file is:

```txt
sources/report-qa/dry-run/fixtures/unit-inconsistency-report.md
```

The fixture is a negative control for reports that mix `kN/N`, `m/mm`, `kNm/Nmm` and stiffness units while still approving the design. It targets:

```txt
unit_consistency
conversion_traceability
numeric_scale_sanity
warnings_visible
conclusion_strength_appropriate
```

## Sprint 53.0 — overconfident conclusion fixture

Sprint 53.0 promotes `overconfident-conclusion-report` from planned to active coverage.

Active file:

```txt
sources/report-qa/dry-run/fixtures/overconfident-conclusion-report.md
```

Expected QA outcome: `fail_or_warn`.

This fixture checks whether Report QA catches reports that give final approval, construction-ready wording or "no further review required" conclusions without enough documented calculation basis.

Target signals:

```txt
conclusion_strength_appropriate
calculation_basis_sufficient
warnings_visible
controller_decision_supported
overconfident_approval_detected
needs_manual_review
```

## missing-disclaimer-report

- Status: active
- Fixture path: `sources/report-qa/dry-run/fixtures/missing-disclaimer-report.md`
- Expected QA outcome: `fail_or_warn`
- Negative fixture family: missing disclaimer / missing responsibility limitation
- Purpose: catch report output that sounds ready for use but does not clearly state that AI-generated engineering text is not final design, not a substitute for responsible engineer control, and requires qualified review before use.


## nynorsk-report — active

- Sprint: 55.0
- Fixture path: `sources/report-qa/dry-run/fixtures/nynorsk-report.md`
- Expected QA outcome: `pass_or_warn`
- Purpose: verify nynorsk report language handling, Norwegian engineering terms, and localisation robustness.

## english-aisc-diagnostic-report - active

- Sprint: 56.0
- Fixture path: `sources/report-qa/dry-run/fixtures/english-aisc-diagnostic-report.md`
- Expected QA outcome: `pass_or_warn`
- Purpose: verify English/AISC diagnostic report handling, US customary units, standard-context consistency and guardrails against invented AISC values or final compliance claims.
- Safety note: this fixture must not be treated as Eurocode/Norwegian output, and it must preserve preliminary-review wording when verified AISC section properties are missing.

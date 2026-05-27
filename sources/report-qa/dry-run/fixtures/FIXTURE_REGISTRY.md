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
nynorsk-report
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

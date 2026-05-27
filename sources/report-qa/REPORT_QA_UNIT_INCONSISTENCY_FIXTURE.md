# Report QA unit-inconsistency fixture validator

Sprint 52.1 adds a dedicated validator for the active `unit-inconsistency-report` fixture.

## Scope

This is a read-only local validation sprint.

It does not change runtime app behavior, user-facing report output, Supabase data, LLM prompts, PDF/DOCX generation or Report QA scoring logic.

## Files

- `scripts/validate-report-qa-unit-inconsistency-fixture.mjs`
- `sources/report-qa/dry-run/fixtures/unit-inconsistency-report.md`
- `sources/report-qa/dry-run/fixtures/fixture-registry.json`

## What the validator checks

The validator verifies that:

- the fixture file exists
- the registry entry exists
- the registry status is `active`
- the fixture path points to `unit-inconsistency-report.md`
- the expected outcome includes `fail_or_warn`
- the fixture contains explicit `kN/N` mismatch coverage
- the fixture contains explicit `m/mm` mismatch coverage
- the fixture contains explicit `kNm/Nmm` mismatch coverage
- the fixture contains explicit `cm4/mm4` mismatch coverage
- the fixture contains unit inconsistency / unit mismatch language
- the fixture contains an over-confident conclusion signal
- the fixture contains expected QA findings language

## Command

```bash
node scripts/validate-report-qa-unit-inconsistency-fixture.mjs
```

## Expected output

```txt
OK unit-inconsistency-report: dedicated fixture validator passed (0 warning(s))
```

## Why this matters

Unit drift is dangerous because a report can look polished while silently mixing force, length, moment or section-property units.

This validator keeps the unit-inconsistency fixture from weakening as future fixture families are added.

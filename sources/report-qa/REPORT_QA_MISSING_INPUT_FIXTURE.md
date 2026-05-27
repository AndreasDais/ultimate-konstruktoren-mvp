# Report QA missing-input fixture validator

Sprint 51.1 adds a dedicated validator for the active `missing-input-report` fixture.

## Scope

This is a read-only local validation sprint.

It does not change:

- runtime app behaviour
- user-facing report output
- Supabase data
- LLM prompts
- PDF/DOCX generation
- Report QA scoring logic

## Files

- `scripts/validate-report-qa-missing-input-fixture.mjs`
- `sources/report-qa/dry-run/fixtures/missing-input-report.md`
- `sources/report-qa/dry-run/fixtures/fixture-registry.json`

## What the validator checks

The validator verifies that:

- the fixture file exists
- the registry entry exists
- the registry status is `active`
- the expected outcome is `fail_or_warn`
- the fixture contains missing-input signals
- the fixture contains uncertain-assumption signals
- the fixture contains over-confident conclusion signals
- the fixture states that Report QA should request more input
- the fixture has explicit expected QA findings

## Command

```bash
node scripts/validate-report-qa-missing-input-fixture.mjs
```

## Expected output

```txt
OK missing-input-report: dedicated fixture validator passed (0 warning(s))
```

## Why this matters

This fixture guards against one of the most important early Report QA risks:

A report can appear polished while still lacking enough verified engineering input to justify approval.

The dedicated validator makes sure the fixture keeps testing that risk instead of silently drifting into a weak or ambiguous example.

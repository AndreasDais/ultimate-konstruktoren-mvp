# Report QA overconfident-conclusion fixture validator

Sprint 53.1 adds a dedicated validator for the active `overconfident-conclusion-report` fixture.

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

- `scripts/validate-report-qa-overconfident-conclusion-fixture.mjs`
- `sources/report-qa/dry-run/fixtures/overconfident-conclusion-report.md`
- `sources/report-qa/dry-run/fixtures/fixture-registry.json`

## What the validator checks

The validator verifies that:

- the fixture file exists
- the registry entry exists
- the registry status is `active`
- the fixture path is correct
- the expected outcome/signal includes `fail_or_warn`
- the fixture contains overconfident conclusion signals
- the fixture contains approval/final-decision language
- the fixture contains insufficient-evidence or insufficient-documentation signals
- the fixture references missing or weak calculation basis
- the fixture has explicit expected Report QA findings

## Command

```bash
node scripts/validate-report-qa-overconfident-conclusion-fixture.mjs
```

## Expected output

```txt
OK overconfident-conclusion-report: dedicated fixture validator passed (0 warning(s))
```

## Why this matters

This fixture guards against a high-risk report pattern:

A report can contain plausible input and polished language, but still present a final approval that is stronger than the documented calculation basis supports.

The dedicated validator keeps the fixture focused on conclusion strength, evidence level, and whether Report QA should downgrade or block the final decision.

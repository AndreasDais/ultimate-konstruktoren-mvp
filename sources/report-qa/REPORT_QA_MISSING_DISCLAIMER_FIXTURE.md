# Report QA missing-disclaimer fixture

Sprint: 54.1  
Status: active validator added

## Purpose

This document describes the dedicated validator for the active `missing-disclaimer-report` fixture.

The fixture represents a dangerous-but-common report failure mode: the report sounds complete, confident, and client-ready, but it does not clearly state that the output is AI-generated support material, not final engineering design, and that it requires review by a qualified/responsible engineer.

## Files

- `sources/report-qa/dry-run/fixtures/missing-disclaimer-report.md`
- `scripts/validate-report-qa-missing-disclaimer-fixture.mjs`
- `sources/report-qa/dry-run/fixtures/fixture-registry.json`
- `sources/report-qa/dry-run/fixtures/FIXTURE_REGISTRY.md`
- `sources/report-qa/dry-run/fixtures/FIXTURE_EXPANSION_BACKLOG.md`

## Validator checks

The validator checks that:

- the registry contains `missing-disclaimer-report`
- the registry status is `active`
- the registry points to `sources/report-qa/dry-run/fixtures/missing-disclaimer-report.md`
- the expected QA outcome includes `fail_or_warn`
- the fixture includes a missing-disclaimer QA signal
- the fixture includes an AI-generated report limitation signal
- the fixture includes a not-final-engineering-design signal
- the fixture includes a qualified/responsible engineer review signal
- the fixture includes a responsibility/liability limitation signal
- the fixture includes expected QA findings

## Why this matters

A structural report can be technically plausible while still being unsafe to deliver if it hides or omits its limits. PILAR must flag reports that do not clearly communicate that AI-generated outputs are not final engineering design and must be reviewed by an appropriate engineer before use in real projects.

## Command

```bash
node scripts/validate-report-qa-missing-disclaimer-fixture.mjs
```

Future sprint 54.2 should add npm aliases:

```bash
npm run report-qa:missing-disclaimer
npm run report-qa:missing-disclaimer:check
```


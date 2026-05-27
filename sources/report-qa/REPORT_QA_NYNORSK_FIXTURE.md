# Report QA: Nynorsk fixture validator

## Purpose

This document describes the dedicated validator for the `nynorsk-report` fixture.

The fixture exists to verify that Report QA can handle nynorsk engineering prose, Norwegian structural terminology, Eurocode-style references and technical report structure without forcing the report into bokmål or English.

## Files

- `sources/report-qa/dry-run/fixtures/nynorsk-report.md`
- `scripts/validate-report-qa-nynorsk-fixture.mjs`
- `sources/report-qa/dry-run/fixtures/fixture-registry.json`
- `sources/report-qa/dry-run/fixtures/FIXTURE_REGISTRY.md`

## Validator expectations

The validator checks that the fixture:

- is registered as `active`
- has expected outcome/signal `pass`
- points to `sources/report-qa/dry-run/fixtures/nynorsk-report.md`
- contains enough nynorsk language signals
- contains Norwegian structural-engineering terms
- contains Eurokode/NS-EN-like reference signals
- contains technical report structure
- avoids excessive bokmål/English drift

## Manual command

```bash
node scripts/validate-report-qa-nynorsk-fixture.mjs
```

## Sprint scope

Sprint 55.1 only adds the dedicated validator and documentation. Later sprints should add npm aliases, hub integration, health snapshot integration and final checkpoint.

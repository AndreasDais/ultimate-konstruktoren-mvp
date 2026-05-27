# Report QA: English/AISC diagnostic fixture validator

## Purpose

This document describes the dedicated validator for the `english-aisc-diagnostic-report` fixture.

The fixture exists to verify that Report QA can handle English engineering prose, US customary units, AISC/ASCE diagnostic context, and preliminary-review guardrails without silently applying Eurocode or Norwegian assumptions.

The fixture is not a full AISC design check. It is a diagnostic fixture for language, standard context, unit consistency and anti-hallucination safeguards.

## Files

- `sources/report-qa/dry-run/fixtures/english-aisc-diagnostic-report.md`
- `scripts/validate-report-qa-english-aisc-diagnostic-fixture.mjs`
- `sources/report-qa/dry-run/fixtures/fixture-registry.json`
- `sources/report-qa/dry-run/fixtures/FIXTURE_REGISTRY.md`

## Validator expectations

The validator checks that the fixture:

- is registered as `active`
- has language `en`
- has standard context `aisc_diagnostic`
- has expected outcome/signal `pass_or_warn`
- points to `sources/report-qa/dry-run/fixtures/english-aisc-diagnostic-report.md`
- targets `standard_context_consistent`, `language_shell_consistent` and `no_hallucinated_standard_values`
- contains English language and shell signals
- contains AISC/ASCE/United States diagnostic context signals
- contains US customary unit signals such as ft, kip/ft, kip-ft and ksi
- contains the expected LRFD diagnostic load-effect calculations
- explicitly warns that final AISC compliance cannot be claimed without verified section properties and full code checks
- explicitly lists AISC property/resistance tokens that must not be invented
- avoids Norwegian shell/status leakage inside the report excerpt

## Manual command

```bash
node scripts/validate-report-qa-english-aisc-diagnostic-fixture.mjs
```

## Sprint scope

Sprint 56.1 only adds the dedicated validator and documentation. Later sprints should add npm aliases, agent hub integration, health snapshot integration and final checkpoint.

## Acceptance note

This validator should pass for a correctly limited English/AISC diagnostic report. It may allow warnings when metadata around forbidden standard/context signals is present only as must-not guidance, as long as the report excerpt itself does not mix standards or claim final approval.

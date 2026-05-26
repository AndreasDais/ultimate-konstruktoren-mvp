# PILAR Report QA real report fixture

**Sprint:** 49.0  
**Status:** read-only fixture foundation  
**Owner:** Report QA track

## Purpose

Sprint 49.0 adds a realistic Markdown report fixture for Report QA dry-run work.

The fixture is intentionally static and local. It does not connect to runtime PILAR reports, Supabase, agent output, report rendering, PDF, Word or user-facing output.

## Files

```txt
sources/report-qa/dry-run/fixtures/realistic-steel-beam-report.md
sources/report-qa/dry-run/fixtures/README.md
scripts/validate-report-qa-real-fixture.mjs
```

## Validation

Run:

```bash
node scripts/validate-report-qa-real-fixture.mjs
```

The validator checks that the fixture has the expected report structure and contains traceable engineering values, warnings, controller decision text and disclaimer language.

## Scope boundary

This sprint does not change:

```txt
app/
lib/
agent prompts
Supabase
runtime Report QA integration
PDF/Word rendering
report page rendering
```

## Intended next step

A later sprint may add fixture selection to the dry-run command, for example:

```bash
node scripts/run-report-qa-dry-run.mjs --check --fixture sources/report-qa/dry-run/fixtures/realistic-steel-beam-report.md
```

That should be a separate sprint because it changes dry-run script behavior.

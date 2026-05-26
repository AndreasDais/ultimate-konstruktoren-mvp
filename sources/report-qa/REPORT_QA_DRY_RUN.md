# PILAR Report QA Dry-Run

**Sprint:** 48.0  
**Status:** read-only dry-run foundation  
**Owner:** Report QA track

## Purpose

The Report QA dry-run gives PILAR a first practical Report QA execution path without changing runtime behavior.

It reads a local report-like text file, loads the existing Report QA check registry, applies lightweight heuristics, and prints a Markdown-style summary.

## Safety boundary

The dry-run does **not**:

- call app routes
- execute PILAR agents
- mutate user-facing result output
- update Supabase
- change PDF/Word/report rendering
- mark a real engineering report as approved

It is deliberately local and read-only unless `--write` is used to write the dry-run report artifact.

## Commands

```bash
node scripts/run-report-qa-dry-run.mjs --check
node scripts/run-report-qa-dry-run.mjs --input sources/report-qa/dry-run/sample-report.md --check
node scripts/run-report-qa-dry-run.mjs --write
```

## Expected default output

The default check mode should print a status similar to:

```txt
Status: REPORT_QA_DRY_RUN_WARN
Checks loaded: 14
Pass: ...
Warn: ...
Fail: 0
Skipped: ...
```

Warnings are acceptable in Sprint 48.0 because this is heuristic dry-run infrastructure, not a real runtime Report QA agent.

## Input

Default sample input:

```txt
sources/report-qa/dry-run/sample-report.md
```

A custom report-like Markdown/text file can be checked with:

```bash
node scripts/run-report-qa-dry-run.mjs --input path/to/report.md --check
```

## Output artifact

Write mode creates:

```txt
sources/report-qa/reports/latest-report-qa-dry-run.md
```

Do not commit generated report artifacts unless the sprint explicitly asks for it.

## Next safe steps

Recommended follow-up sequence:

```txt
48.1 — Report QA dry-run npm aliases
48.2 — Connect Report QA dry-run into agent hub as optional command
48.3 — Add dry-run report artifact refresh
48.4 — Report QA dry-run checkpoint
```

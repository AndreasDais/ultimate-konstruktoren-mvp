# PILAR eval reports

This folder is the local report-artifact area for the PILAR Eval Agent track.

## Current artifact

The local readiness runner writes its default Markdown report here:

```bash
node scripts/run-eval-suite.mjs
```

Default output:

```txt
qa/evals/reports/latest-eval-readiness.md
```

The report is deterministic and safe to commit when a sprint explicitly wants an eval readiness checkpoint.

## Temporary output

For scratch runs that should not touch the repo, use:

```bash
node scripts/run-eval-suite.mjs --tmp
```

That writes to:

```txt
/tmp/pilar-eval-suite-report.md
```

## Scope

This runner does not call production AI agents. It validates and summarizes the eval corpus so PILAR can later add actual agent-run grading, report checks, and regression gates.

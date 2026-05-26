# PILAR Release Readiness Reporter

**Sprint:** 44.0  
**Status:** local report-only foundation  
**Owner:** Release Manager track

## Purpose

The Release Readiness Reporter creates a local Markdown report that summarizes whether PILAR is ready for a release checkpoint.

It does not deploy, merge, push, change prompts, change runtime behavior, or write to Supabase.

## Script

```txt
scripts/write-release-readiness-report.mjs
```

## Default output

```txt
sources/release-manager/reports/latest-release-readiness.md
```

## Modes

### Check-only mode

Runs the checks and prints the status without writing the report artifact.

```bash
node scripts/write-release-readiness-report.mjs --check
```

### Write mode

Runs the checks and writes the Markdown report artifact.

```bash
node scripts/write-release-readiness-report.mjs
```

### Strict mode

Returns a non-zero exit code unless the status is `RELEASE_READY`.

```bash
node scripts/write-release-readiness-report.mjs --strict
```

## Status levels

```txt
RELEASE_READY
RELEASE_RISKY
RELEASE_BLOCKED
```

`RELEASE_READY` means all local blocking and warning gates in v0.1 passed.

`RELEASE_RISKY` means blocking gates passed, but warning gates need human review. The first warning gate is working-tree cleanliness, because a report may be run during an active sprint.

`RELEASE_BLOCKED` means at least one blocking gate failed. Do not merge or deploy.

## v0.1 gates

The first version checks:

```txt
working-tree-clean        warn
release-gate-registry     block
agent-ecosystem-gate      block
health-snapshot-check     block
typescript-gate           block
```

## Gates intentionally not executed in v0.1

These remain human/manual until a later sprint:

```txt
production build gate
runtime smoke tests
new run for prompt/report-output changes
i18n regression tests
PDF/Word parity review
```

## Standard command sequence

```bash
node scripts/write-release-readiness-report.mjs --check
node scripts/write-release-readiness-report.mjs
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

## Safety rules

- Report-only.
- No auto-deploy.
- No auto-merge.
- No runtime writes.
- No prompt mutation.
- No Supabase migration.
- Generated report artifacts must be reviewed before commit.

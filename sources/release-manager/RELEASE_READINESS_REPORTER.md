# PILAR Release Readiness Reporter

**Sprint:** 44.0  
**Hardened:** 46.0  
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
npm run release:readiness:check
```

### Write mode

Runs the checks and writes the Markdown report artifact.

```bash
node scripts/write-release-readiness-report.mjs
npm run release:readiness
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

`RELEASE_READY` means all local blocking and warning gates in the current reporter passed.

`RELEASE_RISKY` means blocking gates passed, but warning gates need human review. The first warning gate is working-tree cleanliness, because a report may be run during an active sprint.

`RELEASE_BLOCKED` means at least one blocking gate failed. Do not merge or deploy.

## v0.2 checks

The hardened version checks:

```txt
working-tree-clean        warn
release-gate-registry     block
agent-ecosystem-gate      block
health-snapshot-check     block
typescript-gate           block
```

## Sprint 46.0 hardening

Sprint 46.0 improves the reporter by adding:

- action-plan text for blocked/risky states
- recommended action per failed gate
- command column in the gate table
- recursion guard for `release-readiness -> agent:all -> release-readiness`
- Windows command hardening for `npm.cmd` and `npx.cmd` execution
- skipped-gate reporting when the recursion guard is active

## Recursion guard

The reporter can be called directly or from the agent hub. Since `agent:all` can include release-readiness, the reporter must not blindly call `agent:all` again when it is already running inside the agent hub.

When the guard is active, the internal `agent-ecosystem-gate` step is marked as `SKIP` rather than `FAIL`.

## Gates intentionally not executed in v0.2

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
npm run release:readiness:check
npm run release:readiness
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

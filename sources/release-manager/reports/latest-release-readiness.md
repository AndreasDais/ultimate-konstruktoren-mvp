# PILAR Release Readiness Report

**Generated:** 2026-05-26T18:18:03.694Z
**Mode:** write
**Status:** RELEASE_BLOCKED

## Summary

- Blocking gates failed: 3
- Warning gates failed: 1
- Gates checked: 5

## Gate results

| Gate | Severity | Status | First output line | Note |
|---|---:|---:|---|---|
| Working tree clean | WARN | FAIL | M package.json | Working tree has local changes |
| Release gate registry | BLOCK | FAIL | spawnSync npm.cmd EINVAL | - |
| Agent ecosystem gate | BLOCK | FAIL | spawnSync npm.cmd EINVAL | - |
| Health snapshot check mode | BLOCK | PASS | Status: PASS | - |
| TypeScript gate | BLOCK | FAIL | spawnSync npx.cmd EINVAL | - |

## Interpretation

One or more blocking gates failed. Do not merge or deploy until they are fixed.

## Gates intentionally not executed in v0.1

- Production build gate: run manually with `{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log`.
- Runtime smoke tests: run when app/UI/runtime behavior changed.
- New PILAR run: required when prompts, report generation, or stored output behavior changed.
- i18n regression: required when shell language, answer language, or standard-profile behavior changed.

## Standard follow-up commands

```bash
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

## Raw command outputs

### Working tree clean

```txt
M package.json
 M sources/release-manager/reports/latest-release-readiness.md
```

### Release gate registry

```txt
spawnSync npm.cmd EINVAL
```

### Agent ecosystem gate

```txt
spawnSync npm.cmd EINVAL
```

### Health snapshot check mode

```txt
Status: PASS
Required files: 43/43
Required npm scripts: 25/25
Local checks: 8/8
```

### TypeScript gate

```txt
spawnSync npx.cmd EINVAL
```


# Agent ecosystem health snapshots

**Status:** operational documentation  
**Owner:** PILAR Agent Ecosystem track  
**Scope:** local health snapshot files for Research, Eval, Guardrail and Observability foundations.

This folder contains generated and documented health information for the local agent-ecosystem foundation.

## Primary command

```bash
npm run agent:health
```

This writes:

```txt
sources/agent-research/status/latest-agent-ecosystem-health.md
```

## Check-only mode

Use check-only mode when you want to verify the health script without updating the tracked snapshot artifact:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

## What is checked

The health snapshot checks these tracks:

```txt
Research Agent:
- topic registry
- topic files
- memo files
- registry-to-memo coverage
- memo quality

Eval Agent:
- eval case validation
- eval readiness foundation
- eval coverage check
- taxonomy files

Guardrails:
- guardrail reason-code registry
- guardrail validator

Observability:
- observability event taxonomy
- observability validator

Command surface:
- npm aliases
- agent ecosystem command hub
```

## Important rule

`latest-agent-ecosystem-health.md` is a generated artifact. Do not commit it accidentally just because `npm run agent:health` was run during another sprint. Commit it only when the sprint explicitly refreshes the health snapshot.

For ordinary sprint verification, prefer:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run agent:all
```

## Stop conditions

Stop before continuing if any health check reports:

```txt
FAIL
missing files
missing npm scripts
failed local checks
```

Do not ignore a failed health snapshot by updating the markdown manually. Fix the underlying registry, script or artifact first.

## Report QA health coverage

Sprint 40.3 adds Report QA registry status to the health snapshot workflow.

The health script now checks:

- `sources/report-qa/report-qa-checks.json`
- `sources/report-qa/REPORT_QA_CHECK_REGISTRY.md`
- `scripts/validate-report-qa-checks.mjs`
- `report-qa:checks` and `report-qa:check` npm aliases
- local execution of `scripts/validate-report-qa-checks.mjs` in check mode

Use non-writing mode during ordinary verification:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

Use write mode only when intentionally refreshing the committed health artifact:

```bash
npm run agent:health
```

## Release Manager health coverage

Sprint 41.3 adds Release Manager checks to the health snapshot.

The health command now verifies:

- `sources/release-manager/release-gates.json`
- `sources/release-manager/RELEASE_MANAGER_GATE_REGISTRY.md`
- `scripts/validate-release-gates.mjs`
- npm aliases `release:gates` and `release:check`
- local check `node scripts/validate-release-gates.mjs`

Use check mode when validating during a sprint:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run release:check
npm run agent:all
```

Use write mode only when intentionally refreshing the generated snapshot artifact:

```bash
npm run agent:health
```

## Patch Planner checks

Sprint 42.3 adds Patch Planner registry validation to the health snapshot.

The health check should verify:

- `sources/patch-planner/patch-planner-rules.json` exists.
- `sources/patch-planner/PATCH_PLANNER_RULE_REGISTRY.md` exists.
- `scripts/validate-patch-planner-rules.mjs` exists.
- `npm run patch-planner:check` is available.
- `scripts/validate-patch-planner-rules.mjs` passes in check mode.

This keeps patch planning inside the same non-writing agent-ecosystem health gate as Research, Eval, Guardrails, Observability, Report QA and Release Manager.


## Release readiness health coverage

Sprint 44.3 adds release-readiness reporter status to the health snapshot.

The health command now verifies:

- `scripts/write-release-readiness-report.mjs`
- `sources/release-manager/RELEASE_READINESS_REPORTER.md`
- `sources/release-manager/reports/README.md`
- `sources/release-manager/reports/latest-release-readiness.md`
- npm aliases `release:readiness` and `release:readiness:check`
- local check `node scripts/write-release-readiness-report.mjs --check`

Use check mode during ordinary verification:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run release:readiness:check
npm run agent:all
```

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

## Report QA dry-run health coverage

Sprint 48.3 adds Report QA dry-run status to the health snapshot.

The health command now verifies:

- `scripts/run-report-qa-dry-run.mjs`
- `sources/report-qa/REPORT_QA_DRY_RUN.md`
- `sources/report-qa/dry-run/sample-report.md`
- `sources/report-qa/reports/README.md`
- npm aliases `report-qa:dry-run` and `report-qa:dry-run:check`
- local check `node scripts/run-report-qa-dry-run.mjs --check`

Use check mode during ordinary verification:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run report-qa:dry-run:check
npm run agent:all
```

Do not use write mode during normal health checks:

```bash
npm run report-qa:dry-run
```

## Report QA real fixture health coverage

Sprint 49.3 adds the realistic Report QA fixture validator to the health snapshot.

The health command now verifies:

- `scripts/validate-report-qa-real-fixture.mjs`
- `sources/report-qa/REPORT_QA_REAL_REPORT_FIXTURE.md`
- `sources/report-qa/dry-run/fixtures/README.md`
- `sources/report-qa/dry-run/fixtures/realistic-steel-beam-report.md`
- npm aliases `report-qa:fixture` and `report-qa:fixture:check`
- local check `node scripts/validate-report-qa-real-fixture.mjs`

Use check mode during ordinary verification:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run report-qa:fixture:check
npm run agent:all
```

## Report QA fixture registry health coverage

Sprint 50.4 adds the Report QA fixture registry validator to the health snapshot.

The health command now verifies:

- `scripts/validate-report-qa-fixture-registry.mjs`
- `sources/report-qa/dry-run/fixtures/fixture-registry.json`
- `sources/report-qa/dry-run/fixtures/FIXTURE_REGISTRY.md`
- npm aliases `report-qa:fixtures` and `report-qa:fixtures:check`
- local check `node scripts/validate-report-qa-fixture-registry.mjs`

Use check mode during ordinary verification:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run report-qa:fixtures:check
npm run agent:all
```

## Sprint 51.4 — missing-input validator health coverage

The agent health snapshot now includes the dedicated Report QA missing-input fixture validator.

### Health coverage added

The health gate verifies:

- `scripts/validate-report-qa-missing-input-fixture.mjs`
- `sources/report-qa/REPORT_QA_MISSING_INPUT_FIXTURE.md`
- `sources/report-qa/dry-run/fixtures/missing-input-report.md`
- npm aliases `report-qa:missing-input` and `report-qa:missing-input:check`
- local check `node scripts/validate-report-qa-missing-input-fixture.mjs`

### Standard verification

```bash
npm run report-qa:missing-input:check
npm run agent:hub -- report-qa-missing-input-check
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

This keeps missing-input fixture quality inside both the command hub gate and the health snapshot gate.

## Sprint 52.4 — unit-inconsistency validator health coverage

The agent health snapshot now includes the dedicated Report QA unit-inconsistency fixture validator.

### Health coverage added

The health gate verifies:

- `scripts/validate-report-qa-unit-inconsistency-fixture.mjs`
- `sources/report-qa/REPORT_QA_UNIT_INCONSISTENCY_FIXTURE.md`
- `sources/report-qa/dry-run/fixtures/unit-inconsistency-report.md`
- npm aliases `report-qa:unit-inconsistency` and `report-qa:unit-inconsistency:check`
- local check `node scripts/validate-report-qa-unit-inconsistency-fixture.mjs`

### Standard verification

```bash
npm run report-qa:unit-inconsistency:check

### Report QA overconfident-conclusion validator

Sprint 53.4 adds the active overconfident-conclusion fixture validator to the health snapshot.

Expected checks:

- `npm run report-qa:overconfident-conclusion:check`
- `npm run agent:hub -- report-qa-overconfident-conclusion-check`
- `npm run agent:all`
- `node scripts/write-agent-ecosystem-health-snapshot.mjs --check`

This keeps the overconfident-conclusion fixture in the same local gate family as missing-input and unit-inconsistency.
npm run agent:hub -- report-qa-unit-inconsistency-check
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

This keeps unit-inconsistency fixture quality inside both the command hub gate and the health snapshot gate.

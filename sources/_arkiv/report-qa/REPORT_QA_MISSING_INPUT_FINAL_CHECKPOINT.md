# PILAR Report QA Missing-Input Fixture Final Checkpoint

**Sprint:** 51.5  
**Status:** Final checkpoint for the Report QA missing-input fixture track  
**Scope:** Documentation/checkpoint only  
**Runtime impact:** None

## Purpose

This checkpoint closes the first active negative fixture family in the Report QA track.

The missing-input fixture verifies that PILAR can detect reports that move too far toward approval when essential engineering inputs are missing, uncertain, or only assumed.

## Completed track

- Sprint 51.0 — Report QA missing-input fixture
- Sprint 51.1 — Missing-input fixture dedicated validator
- Sprint 51.2 — Missing-input fixture npm aliases
- Sprint 51.3 — Missing-input validator connected into agent hub
- Sprint 51.4 — Health snapshot includes missing-input validator
- Sprint 51.5 — Final checkpoint

## Owned files

### Fixture and registry

- `sources/report-qa/dry-run/fixtures/missing-input-report.md`
- `sources/report-qa/dry-run/fixtures/fixture-registry.json`
- `sources/report-qa/dry-run/fixtures/FIXTURE_REGISTRY.md`
- `sources/report-qa/dry-run/fixtures/FIXTURE_EXPANSION_BACKLOG.md`

### Validator and docs

- `scripts/validate-report-qa-missing-input-fixture.mjs`
- `sources/report-qa/REPORT_QA_MISSING_INPUT_FIXTURE.md`

### npm aliases

- `report-qa:missing-input`
- `report-qa:missing-input:check`

### Integrations

- `scripts/pilar-agent-ecosystem-hub.mjs`
- `sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md`
- `scripts/write-agent-ecosystem-health-snapshot.mjs`
- `sources/agent-research/status/README.md`

## Standard checks

Use these checks for ordinary verification:

```bash
npm run report-qa:missing-input:check
npm run report-qa:fixtures:check
npm run report-qa:fixture:check
npm run report-qa:dry-run:check
npm run agent:hub -- report-qa-missing-input-check
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

Use full verification when closing a sprint:

```bash
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

## Acceptance criteria

The track is considered complete when:

- `missing-input-report` is active in the fixture registry
- the fixture file exists
- the expected QA outcome is `fail_or_warn`
- the dedicated validator passes
- npm aliases run the dedicated validator
- `agent:all` includes the dedicated validator
- health snapshot includes the dedicated validator
- TypeScript passes
- build/debug sweep passes when full verification is requested

## Non-goals

This checkpoint does not yet:

- implement LLM-based Report QA scoring
- compare multiple active fixture families
- mutate user reports
- write to Supabase
- change runtime report generation
- change PDF or Word rendering
- enforce release blocking by itself

## Stop conditions

Stop and inspect before continuing if:

- `missing-input-report.md` is missing
- registry status falls back to `planned`
- `expected_outcome` changes away from `fail_or_warn`
- the dedicated validator is not included in `agent:all`
- health snapshot no longer checks `report-qa:missing-input:check`
- a syntax error appears in the validator
- fixture validation starts writing artifacts during check mode

## Next recommended fixture family

The next safe Report QA fixture family is one of:

1. `unit-inconsistency-report` — detects inconsistent or mixed units.
2. `overconfident-conclusion-report` — detects conclusions that are stronger than the evidence.
3. `missing-disclaimer-report` — detects missing preliminary / professional-review warnings.

Recommended sequence:

1. Add one fixture file.
2. Activate the fixture in `fixture-registry.json`.
3. Add one dedicated validator only if the fixture has unique risk signals.
4. Add npm aliases if useful.
5. Add hub and health integration.
6. Close with a checkpoint.

## Final status

The Report QA missing-input fixture is now part of the controlled local gate system.

It provides the first active negative control for one of PILAR's most important safety cases: avoiding confident engineering approval when the input basis is incomplete.

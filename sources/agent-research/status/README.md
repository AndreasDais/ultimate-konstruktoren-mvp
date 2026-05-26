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

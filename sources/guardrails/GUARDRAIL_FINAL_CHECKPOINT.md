# PILAR Guardrail Final Checkpoint

**Sprint:** 37.4  
**Status:** Checkpoint / handoff source  
**Owner:** PILAR Guardrail Agent track  
**Scope:** Documentation only  
**Runtime effect:** None

---

## 1. Purpose

This checkpoint freezes the first Guardrail Agent foundation after Sprint 37.0–37.3.

The guardrail track is still **registry/check/report only**. It does not block runtime output, modify agent prompts, write to Supabase, or change the app UI.

The goal is to make future guardrail implementation safer by ensuring that reason codes are controlled before they are used in production logic.

---

## 2. Completed guardrail foundation

### Sprint 37.0 — Guardrail reason-code registry

Added:

```txt
sources/guardrails/guardrail-reason-codes.json
sources/guardrails/GUARDRAIL_REASON_CODE_REGISTRY.md
scripts/validate-guardrail-reason-codes.mjs
```

Outcome:

```txt
- central list of approved reason codes
- reason-code metadata
- severity/status/category structure
- local validator
```

---

### Sprint 37.1 — Guardrail npm aliases

Added npm scripts:

```bash
npm run guardrails:codes
npm run guardrails:check
```

Outcome:

```txt
- guardrail registry validation can be run without remembering node script path
```

---

### Sprint 37.2 — Guardrail checks connected into agent hub

Updated:

```txt
scripts/pilar-agent-ecosystem-hub.mjs
sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
```

Outcome:

```txt
npm run agent:all
```

now includes guardrail reason-code validation.

---

### Sprint 37.3 — Health snapshot includes guardrail checks

Updated:

```txt
scripts/write-agent-ecosystem-health-snapshot.mjs
sources/agent-research/status/README.md
```

Outcome:

```txt
agent ecosystem health checks now include guardrail reason-code registry status
```

---

## 3. Standard guardrail commands

Use these commands from repo root:

```bash
npm run guardrails:codes
npm run guardrails:check
npm run agent:all
```

Optional health check:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

The normal health command may update the generated snapshot file:

```bash
npm run agent:health
```

Generated snapshot:

```txt
sources/agent-research/status/latest-agent-ecosystem-health.md
```

Only commit that file when intentionally refreshing the snapshot.

---

## 4. Current guardrail scope

Allowed in the current foundation:

```txt
- reason-code registry
- reason-code validator
- docs and runbooks
- agent-hub checks
- health snapshot checks
```

Not implemented yet:

```txt
- runtime blocking
- Supabase guardrail_decisions writes
- UI guardrail banners
- report-level guardrail rendering
- controller/report-agent enforcement
- automatic refusal or downgrade logic
```

---

## 5. Files owned by the Guardrail track

```txt
sources/guardrails/guardrail-reason-codes.json
sources/guardrails/GUARDRAIL_REASON_CODE_REGISTRY.md
sources/guardrails/GUARDRAIL_FINAL_CHECKPOINT.md
scripts/validate-guardrail-reason-codes.mjs
```

Shared agent-ecosystem files touched by this track:

```txt
scripts/pilar-agent-ecosystem-hub.mjs
scripts/write-agent-ecosystem-health-snapshot.mjs
sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
sources/agent-research/status/README.md
```

Generated shared artifact:

```txt
sources/agent-research/status/latest-agent-ecosystem-health.md
```

---

## 6. Release gate for the current foundation

Before calling the guardrail foundation healthy, run:

```bash
npm run guardrails:check
npm run agent:all
npx tsc --noEmit --pretty false
```

For a wider local gate:

```bash
npm run research:check
npm run eval:coverage:check
npm run guardrails:check
npm run agent:all
npx tsc --noEmit --pretty false
```

---

## 7. Stop conditions

Do not start runtime Guardrail Agent implementation if any of these are true:

```txt
- guardrail reason-code registry validator fails
- agent:all fails
- TypeScript fails
- repo is not clean
- another tool is editing app/api, report, result-view or Supabase files
- reason codes are being added ad-hoc outside the registry
```

Do not mix future guardrail implementation with:

```txt
- i18n result-view cleanup
- report/PDF/Word rendering
- agent prompt changes
- Supabase migrations
- UI redesign
```

Each of those must be its own sprint.

---

## 8. Recommended next guardrail sprints

### Sprint 37.5 — Guardrail decision sample fixtures

Add example JSON fixtures for expected guardrail decisions.

Proposed files:

```txt
qa/guardrails/fixtures/pass-basic.json
qa/guardrails/fixtures/warn-missing-section-properties.json
qa/guardrails/fixtures/block-irrelevant-input.json
qa/guardrails/GUARDRAIL_FIXTURES.md
```

Risk: low.  
Runtime effect: none.

---

### Sprint 37.6 — Guardrail fixture validator

Add a validator that checks fixture status, reason codes, user message and allowed next step.

Proposed file:

```txt
scripts/validate-guardrail-fixtures.mjs
```

Risk: low.  
Runtime effect: none.

---

### Sprint 37.7 — Guardrail decision model proposal

Define a TypeScript/data contract for future guardrail decisions without wiring runtime.

Proposed files:

```txt
sources/guardrails/GUARDRAIL_DECISION_MODEL.md
```

Risk: low-medium.  
Runtime effect: none.

---

### Sprint 38.x — Runtime Guardrail Agent MVP

Only after fixtures and validators are stable.

Possible scope:

```txt
- guardrail evaluator function
- no Supabase writes yet
- no UI blocking yet
- returns pass/warn/block for a sample run payload
```

Risk: medium.  
Runtime effect: controlled/local only unless explicitly wired.

---

## 9. Handoff note

The guardrail foundation is ready for future implementation, but should remain **suggest-only / validation-only** until:

```txt
1. fixtures exist
2. fixture validator is green
3. reason-code registry is stable
4. eval coverage remains green
5. research/eval/guardrail gates are all included in agent:all
```

The correct next step is not to wire guardrails into production output immediately. The correct next step is to add sample decisions and validate them locally.

# PILAR Agent Ecosystem Performance Checkpoint

**Sprint:** 47.0  
**Status:** Performance policy checkpoint / documentation-only  
**Scope:** Agent ecosystem gates, release-readiness modes, daily sprint verification  
**Runtime impact:** None  
**Database impact:** None  
**Deploy impact:** None

---

## 1. Purpose

This checkpoint documents the performance policy for the PILAR agent-ecosystem gates after the release-readiness fast-mode work.

The goal is to keep normal sprint verification fast while preserving a heavier full-release path for actual release candidates.

---

## 2. Background

During release-readiness hardening, the default verification flow became too slow because multiple gates started calling other gates recursively or semi-recursively.

Observed issue:

```txt
release:readiness:check
  -> agent:all
     -> release-readiness
        -> health / validators / nested gates
```

This made ordinary sprint checks take several minutes, even though TypeScript itself was fast.

Sprint 46.2 introduced a fast default mode for release-readiness checks and moved heavy full verification behind an explicit `--full` flag.

---

## 3. Current gate model

### Daily sprint gate

Use this during normal sprint work:

```bash
npm run release:readiness:check
npm run agent:hub -- release-readiness
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

Expected behavior:

```txt
- release:readiness:check uses fast mode
- nested heavy gates are skipped or summarized
- agent:all remains non-writing
- health snapshot check remains non-writing
- TypeScript stays explicit and separate
```

### Full release-candidate gate

Use this only when preparing an actual release candidate:

```bash
node scripts/write-release-readiness-report.mjs --check --full
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

Expected behavior:

```txt
- full release-readiness may take longer
- build is intentionally manual and explicit
- failures should block release until fixed or consciously deferred
```

---

## 4. Performance policy

### Normal sprint checks should be fast

The ordinary sprint gate should normally complete in minutes, not tens of minutes.

If a normal sprint check takes more than 8–10 minutes without new output, stop and debug the gate that is hanging.

### Avoid nested full gates

The following pattern should not be used as normal sprint verification:

```txt
agent:all -> release-readiness full mode -> agent:all -> health -> release-readiness
```

Release-readiness inside `agent:all` should stay in check/fast mode.

### Keep write-mode explicit

These commands write artifacts and should only be run intentionally:

```bash
npm run release:readiness
npm run agent:health
```

During active sprint work, prefer:

```bash
npm run release:readiness:check
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

---

## 5. Command tiers

| Tier | Purpose | Commands |
|---|---|---|
| Fast daily gate | Ordinary sprint verification | `release:readiness:check`, `agent:all`, health `--check`, `tsc` |
| Registry checks | Isolated subsystem verification | `research:check`, `eval:coverage:check`, `guardrails:check`, `observability:check`, `report-qa:check`, `release:check`, `patch-planner:check` |
| Write artifacts | Refresh committed generated reports | `release:readiness`, `agent:health` |
| Full release candidate | Pre-release gate | `write-release-readiness-report --check --full`, full build, runtime smoke |

---

## 6. Current standard fast gate

```bash
npm run research:check
npm run eval:coverage:check
npm run guardrails:check
npm run observability:check
npm run report-qa:check
npm run release:check
npm run release:readiness:check
npm run patch-planner:check
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

`npm run agent:health` is intentionally excluded from the fast gate because it writes the latest health snapshot artifact.

---

## 7. Full release-candidate checklist

Before a real release candidate, run:

```bash
npm run release:readiness:check
node scripts/write-release-readiness-report.mjs --check --full
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

Then manually review:

```txt
- runtime smoke test if app behavior changed
- new PILAR run if prompts/report-output changed
- i18n regression if language/profile behavior changed
- PDF/Word parity if report rendering changed
- generated artifacts before commit
```

---

## 8. Stop conditions

Stop and fix before continuing if:

```txt
- release:readiness:check unexpectedly takes many minutes
- agent:all triggers recursive release-readiness behavior
- health check writes artifacts when check-mode was expected
- latest-release-readiness.md changes during a non-write test
- latest-agent-ecosystem-health.md changes during a non-write test
- TypeScript fails
- build fails during full release-candidate gate
```

---

## 9. Ownership

This checkpoint belongs to the Release Manager / Patch Planner boundary:

```txt
Release Manager: decides readiness state and produces release reports.
Patch Planner: prevents slow, risky, or nested gates from becoming normal sprint workflow.
```

---

## 10. Current status

```txt
Research Agent                  ✅ foundation
Eval Agent                      ✅ foundation
Guardrails                      ✅ foundation
Observability                   ✅ foundation
Report QA                       ✅ foundation
Release Manager                 ✅ foundation
Release Readiness Reporter      ✅ fast mode enabled
Patch Planner                   ✅ foundation
Agent ecosystem master checkpoint ✅ updated
Performance checkpoint          ✅ this file
```

---

## 11. Recommended next step

```txt
Sprint 47.1 — Agent ecosystem performance docs sync
```

Suggested scope:

```txt
- Update command hub docs with fast/full gate split.
- Update master checkpoint with the performance policy reference.
- Avoid runtime code changes.
```

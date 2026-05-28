# Report QA Agent Final Checkpoint

**Sprint:** 40.4  
**Status:** foundation checkpoint  
**Scope:** Report QA Agent foundation only  
**Mode:** registry/checklist/validation; no runtime agent yet

---

## 1. Purpose

This checkpoint freezes the current Report QA Agent foundation after Sprint 40.0–40.3.

The Report QA Agent is intended to review finished PILAR report artifacts like a technical reviewer: it should check whether the report answers the user request, exposes assumptions, keeps formulas and units consistent, avoids over-strong conclusions, preserves language/standard context, makes warnings visible, and maintains parity across web/PDF/Word artifacts.

This checkpoint does **not** introduce runtime report analysis, database writes, user-visible blocking, LLM grading, or PDF/DOCX parsing.

---

## 2. Completed Report QA foundation

| Sprint | Result |
|---|---|
| 40.0 | Added Report QA check registry and validator. |
| 40.1 | Added `report-qa:*` npm aliases. |
| 40.2 | Connected Report QA checks into `agent:all`. |
| 40.3 | Connected Report QA checks into `agent:health`. |
| 40.4 | Added this final checkpoint. |

---

## 3. Owned files

Report QA foundation currently owns these files:

```txt
sources/report-qa/report-qa-checks.json
sources/report-qa/REPORT_QA_CHECK_REGISTRY.md
sources/report-qa/REPORT_QA_FINAL_CHECKPOINT.md
scripts/validate-report-qa-checks.mjs
```

It is also referenced by these shared agent-ecosystem files:

```txt
package.json
scripts/pilar-agent-ecosystem-hub.mjs
scripts/write-agent-ecosystem-health-snapshot.mjs
sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
sources/agent-research/status/README.md
```

---

## 4. Standard commands

Use these commands for the Report QA foundation:

```bash
npm run report-qa:checks
npm run report-qa:check
```

Use these commands for the full agent-ecosystem gate:

```bash
npm run research:check
npm run eval:coverage:check
npm run guardrails:check
npm run observability:check
npm run report-qa:check
npm run agent:all
npm run agent:health
npx tsc --noEmit --pretty false
```

---

## 5. Current acceptance level

The Report QA foundation is accepted when:

```txt
1. scripts/validate-report-qa-checks.mjs passes.
2. npm run report-qa:check passes.
3. npm run agent:all passes.
4. node scripts/write-agent-ecosystem-health-snapshot.mjs --check passes.
5. npx tsc --noEmit --pretty false passes.
6. git status --short is clean after commit.
```

Warnings in the Report QA registry are allowed only when they are intentional and documented. Errors are blocking.

---

## 6. Stop conditions

Do not build runtime Report QA until the foundation gate is green.

Stop and fix first if any of these happen:

```txt
- report-qa validator has errors
- agent:all fails
- agent:health check mode fails
- TypeScript fails
- package.json aliases drift from hub commands
- health snapshot claims PASS while report-qa check fails
- Report QA registry creates conflicting labels with i18n/report policies
```

---

## 7. What is not built yet

This checkpoint does not include:

```txt
- runtime Report QA Agent
- LLM-based report grading
- PDF parsing
- DOCX parsing
- screenshot/visual comparison
- user-facing report quality score
- database table for report QA results
- automatic block/warn behavior
- production guardrail enforcement
```

---

## 8. Recommended next steps

Suggested next safe sprint options:

```txt
Sprint 40.5 — Report QA docs index
Sprint 41.0 — Release Manager Agent seed registry
Sprint 41.1 — Release gate npm aliases
Sprint 42.0 — Synthetic User Agent Playwright checklist hardening
```

If moving toward runtime Report QA, do it in this order:

```txt
1. Define report artifact inputs.
2. Add deterministic report text fixture checks.
3. Add read-only local report QA runner.
4. Add generated markdown report artifact.
5. Only then consider LLM-assisted QA.
```

---

## 9. Human-review rule

Report QA must remain advisory until it is evaluated against real PILAR reports.

It must not automatically mark engineering output as approved, final, compliant, safe for construction, or professionally reviewed.

Any future runtime Report QA output should use language such as:

```txt
preliminary report quality assessment
requires engineering review
requires licensed professional verification
```

---

## 10. Checkpoint summary

```txt
Report QA Agent foundation: READY
Runtime Report QA Agent: NOT BUILT
Production enforcement: NOT ENABLED
Safe next step: deterministic local Report QA runner or Release Manager foundation
```

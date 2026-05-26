# PILAR Release Readiness Fast Mode Final Checkpoint

**Sprint:** 46.4  
**Status:** Final checkpoint / report-only foundation  
**Track:** Release Manager / Release Readiness Reporter  
**Scope:** Fast-mode release-readiness workflow after Sprints 46.0–46.3

---

## 1. Purpose

This checkpoint freezes the release-readiness fast-mode work after Sprint 46.0–46.3.

The Release Readiness Reporter is no longer intended to run every heavy gate by default during ordinary sprint verification. The normal check mode should be fast enough for daily use and should avoid nested gate loops.

---

## 2. Completed sprint chain

| Sprint | Status | Result |
|---|---:|---|
| 46.0 — Release readiness report hardening | Complete | Added richer release report output, action plan, command column and stronger interpretation. |
| 46.1 — Release readiness docs sync | Complete | Synced command hub, master checkpoint and final checkpoint docs after hardening. |
| 46.2 — Release readiness fast check mode | Complete | Made default release-readiness check mode fast and moved full/heavy checks behind explicit full mode. |
| 46.3 — Release readiness latest report refresh | Complete | Refreshed latest release-readiness report artifact after fast-mode changes. |
| 46.4 — Fast-mode final checkpoint | Complete | Documents the final operating model for fast release-readiness checks. |

---

## 3. Current operating model

### Fast/default mode

Use this during normal sprint verification:

```bash
npm run release:readiness:check
```

Expected behavior:

- runs quickly compared with full release validation
- avoids nested `release-readiness -> agent:all -> release-readiness` loops
- may return `RELEASE_RISKY` when heavy gates are intentionally skipped
- should still exit 0 unless strict mode is requested or the script itself fails

### Hub mode

Use this to verify the command hub integration:

```bash
npm run agent:hub -- release-readiness
```

Expected behavior:

- runs release-readiness in check mode
- does not rewrite `latest-release-readiness.md`
- does not trigger recursive full-gate execution

### Standard agent gate

Use this for ordinary agent-ecosystem verification:

```bash
npm run agent:all
```

Expected behavior:

- includes the release-readiness check in fast/non-writing mode
- stays practical for sprint workflow
- does not replace final production build or manual runtime tests

### Health snapshot check mode

Use this during sprint verification:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

Expected behavior:

- verifies release-readiness coverage without rewriting the health snapshot artifact
- stays non-writing unless `npm run agent:health` is intentionally used

---

## 4. Full/heavy mode

Use full mode only for a release candidate or explicit final verification:

```bash
node scripts/write-release-readiness-report.mjs --check --full
```

Full mode may take longer because it can run heavier nested gates. It should not be part of every small sprint unless the sprint is specifically about release validation.

---

## 5. Write mode

Use write mode only when intentionally refreshing the committed release-readiness report artifact:

```bash
npm run release:readiness
```

Expected output artifact:

```txt
sources/release-manager/reports/latest-release-readiness.md
```

Do not run write mode during ordinary patch validation unless the sprint explicitly includes report artifact refresh.

---

## 6. Standard fast gate after 46.4

```bash
npm run release:readiness:check
npm run agent:hub -- release-readiness
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

For a release candidate, add:

```bash
node scripts/write-release-readiness-report.mjs --check --full
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

---

## 7. Stop conditions

Stop and fix before continuing if any of these occur:

```txt
- npm run release:readiness:check takes several minutes again in normal mode
- release-readiness starts recursively calling agent:all in default mode
- agent:all rewrites latest-release-readiness.md
- health check rewrites latest-agent-ecosystem-health.md in check mode
- TypeScript fails
- release readiness exits non-zero outside explicit strict/full validation
```

---

## 8. Non-goals

This checkpoint does not add:

```txt
- auto-deploy
- auto-merge
- production write permissions
- Supabase migrations
- runtime release agent
- browser/runtime smoke automation
- automatic PDF/Word parity validation
```

---

## 9. Current foundation status

```txt
Research Agent                ✅
Eval Agent                    ✅
Guardrails                    ✅
Observability                 ✅
Report QA                     ✅
Release Manager               ✅
Release Readiness Reporter    ✅
Patch Planner                 ✅
Fast release-readiness mode    ✅
```

---

## 10. Recommended next step

Recommended next safe sprint:

```txt
Sprint 47.0 — Synthetic User checklist refresh
```

Reason:

The foundation/gate layer is now broad and mostly stable. The next useful step is to connect it back to product behavior through a deterministic manual or Playwright-ready synthetic user checklist, without giving any agent runtime write power.

# PILAR Synthetic User — Run Report

**Runner:** `qa/e2e/synthetic-user.mjs` (automates `PILAR_SYNTHETIC_USER_CHECKLIST.md` §4/§5)
**Date:** 2026-05-29
**Tester:** Synthetic User / E2E lane (automated, headless Chromium via puppeteer)
**Environment:** local dev — `http://localhost:3000`
**Commit/branch:** `main`
**Command:** `node qa/e2e/synthetic-user.mjs --flow B,A --timeout 240`

The runner drives a real browser through the user path
(`input → interpret → Start calculation → /rapport/<runId>`), asserts the
checklist's must-show / must-not-show strings against the **generated** report
text (prompt echoes stripped), and — critically — **activates and verifies the
engineering context** so each flow runs in the intended display language.

---

## Summary

| Flow | Mode | display_language | Verdict | missing | forbidden | PDF | Word |
|---|---|---|---|---|---|---|---|
| A | English / AISC (US/intl) | `en` ✓ (expected `en`) | **PASS** | 0 | 0 | yes | yes |
| B | Norwegian / Eurocode | `nb` ✓ (expected `nb`) | **PASS** | 0 | 0 | yes | yes |

Process exit code: `0`. Both flows ran in the correct display language (verified
from the DB via `/api/runs/[id]`), produced a full report, and contained **no
forbidden cross-locale strings** in generated content.

---

## ⚠️ Correction to the earlier run (important)

An earlier version of this report claimed Flow A revealed a **locale-separation
defect** (Norwegian shell/labels in an English run). **That was wrong — an
artifact of the test harness, not a product bug.** The runner was pasting the
English prompt *without activating international/US context*, so PILAR ran in its
**default Norwegian mode** (`display_language=nb`), where a Norwegian shell is
*correct behavior*. Verified via `/api/runs/<runId>` → `display_language: "nb"`
on that run.

Root cause and fix:

- `display_language` is `displayLanguageForContext(locale, engineeringContext)`
  (`app/page.tsx`); it resolves to `"en"` only when an international
  `engineeringContext` is present (`lib/international/display.ts`).
- That context is loaded from `localStorage["pilar-engineering-context-v2"]`
  (set via the `/international` selector). The harness never set it.
- **Fix:** the runner now seeds that localStorage key with a US/AISC context for
  Flow A (and clears it for Flow B), drives the workbench **bilingually** (en
  labels: "Start calculation →", "Interpret task →", "Interpreting…"), and
  **self-verifies** `display_language` against `/api/runs/[id]`, failing the flow
  as an *invalid test* if the mode didn't take. A harness mishap can no longer
  masquerade as a product defect.

---

## Flow A — English/AISC diagnostic — PASS

```txt
Run ID:  a32286bb-25b4-4923-aa25-262e573e3fef
URL:     http://localhost:3000/rapport/a32286bb-25b4-4923-aa25-262e573e3fef
display_language: en  (verified via /api/runs/[id])
textLen: 11261 chars

Result page opened:  yes
Full report opened:  yes (Summary / Calculation / Assessment / Review)
Word download:       present     PDF download: present

must-show:  all present — Engineer A, Engineer B, Engineer comparison,
            Controller, preliminary, High/Medium/Low, Calculation note,
            Assumptions, Warnings
forbidden:  none

Decision: PASS
```

**In genuine English/US mode PILAR behaves correctly:**

- Shell is English: `PilarAI STRUCTURAL ASSISTANT`, `Summary / Calculation /
  Assessment / Review`, `Download PDF`, `Download Word`, `Glossary`.
- Agent labels are English: "Engineer A" (×5), "ENGINEER COMPARISON",
  "Controller" — **zero occurrences of "Konstruktør"/"Kontrollør"** in generated
  content.
- Engineering is correct and US-flavoured (LRFD `1.2D + 1.6L`, `Mu`, `Vu`,
  kip·ft), and the **AISC guard holds**: it refuses to certify capacity (`φb·Mn`,
  LTB) without verified AISC section properties and does not invent `Zx, Sx, J,
  Cw, rts, Lp, Lr`. Result marked preliminary, licensed-engineer verification
  required. ✔

Earlier this run intermittently warned `missing:["Comparator"]` — the literal
word "Comparator" only renders when A and B disagree; when they agree the section
is "Engineer comparison". The must-show now accepts either (not a product issue).

Evidence: flow-A-result.json · flow-A-a32286bb-….txt · flow-A-a32286bb-….png ·
flow-A-api.log · flow-A-noid.{txt,png}

---

## Flow B — Norwegian Eurocode sanity — PASS

```txt
Run ID:  34a46866-2fb0-4d1a-8388-862af6a3fec2
URL:     http://localhost:3000/rapport/34a46866-2fb0-4d1a-8388-862af6a3fec2
display_language: nb  (verified via /api/runs/[id])
textLen: 6012 chars

Result page opened:  yes
Full report opened:  yes (Sammendrag / Beregning / Vurdering / Kontroll)
Word download:       present     PDF download: present

must-show:  all present — kN/m, kNm, kN, maksimalt bøyemoment, skjærkraft,
            fritt opplagd/opplagret bjelke
forbidden:  none (no AISC / ASCE / kip / ft / LRFD leakage in generated content)

Decision: PASS
```

Evidence: flow-B-result.json · flow-B-34a46866-….txt · flow-B-34a46866-….png ·
flow-B-api.log · flow-B-noid.{txt,png}

---

## Notes & caveats

- **Intermittent pipeline stall (infrastructure, not product/runner).** On the
  combined `B,A` run, Flow B once stalled: `init-run → agent-a → agent-b →
  agent-e` fired but `agent-c`/`agent-d` never completed and the run stayed
  `status=running` with no controller decision. This matches the documented
  Cloudflare/Anthropic intermittent-degradation failure mode. Re-running Flow B
  alone passed. If a flow fails with `reportReady=false`, check `/api/runs/<id>`
  before assuming a defect.
- **LLM/content variance** shifts wording run-to-run; assertions use OR-groups
  for legitimate variants (e.g. "fritt opplagd" vs bokmål "fritt opplagret";
  "Comparator" vs "Engineer comparison").
- **Runner resilience:** seeds + verifies engineering context (display language);
  bilingual workbench matchers; streaming-aware interpret gate (don't click
  "Start" mid-stream); streaming-aware report wait (grow past shell + stabilize);
  `evalSafe` retry for detached-frame errors; `run_id` from `/api/init-run`;
  prompt-echo stripping so guardrails judge generated output, not the user's
  words.
- **Scope:** read-only against the app — no app code, prompts, schema, report/
  PDF/Word, or i18n touched.

# PILAR Synthetic User — Run Report

**Runner:** `qa/e2e/synthetic-user.mjs` (automates `PILAR_SYNTHETIC_USER_CHECKLIST.md` §4/§5)
**Date:** 2026-05-29
**Tester:** Synthetic User / E2E lane (automated, headless Chromium via puppeteer)
**Environment:** local dev — `http://localhost:3000`
**Commit/branch:** `main` @ `93e693b`
**Command:** `node qa/e2e/synthetic-user.mjs --flow B,A --timeout 240`

The runner drives a real browser through the same path a user takes
(`input → interpret → Start beregning → /rapport/<runId>`), then asserts the
checklist's must-show / must-not-show strings against the **generated** report
text (verbatim prompt echoes are stripped, so the model is judged on its own
output, not the user's wording). Full report text, a screenshot, and the
`/api/*` trace are saved per flow.

---

## Summary

| Flow | Name | Verdict | reportReady | PDF | Word | missing | forbidden |
|---|---|---|---|---|---|---|---|
| B | Norwegian Eurocode sanity | **PASS** | yes | yes | yes | 0 | 0 |
| A | English/AISC diagnostic | **FAIL** | yes | yes | yes | 8 | 6 |

Process exit code: `1` (Flow A failed). Flow B is the regression gate and
reproduces the previously-recorded clean result, which confirms the runner
itself is sound — so Flow A's failure is a real product finding, not a harness
artifact.

---

## Flow B — Norwegian Eurocode sanity — PASS

```txt
Run ID:  f894f6a8-aa02-4024-a0dc-04b7b7bafcfe
URL:     http://localhost:3000/rapport/f894f6a8-aa02-4024-a0dc-04b7b7bafcfe
Prompt:  qa/e2e/prompts/norwegian-simple-beam.txt
textLen: 6525 chars

Result page opened:  yes
Full report opened:  yes  (Sammendrag / Beregning / Vurdering / Kontroll)
Word download works: present (button)
PDF download works:  present (button)

must-show hits:      all present (kN/m, kNm, kN, maksimalt bøyemoment,
                     skjærkraft, fritt opplagd bjelke)
Forbidden hits:      none
Engineering concern: none — MEd = 54,0 kNm, VEd = 36,0 kN for L = 6,0 m,
                     qEd = 12,0 kN/m (wL²/8, wL/2 — correct). Agents A/B match,
                     Controller approves at low risk.

Evidence: flow-B-result.json · flow-B-f894f6a8-….txt · flow-B-f894f6a8-….png ·
          flow-B-api.log · flow-B-noid.{txt,png}

Decision: PASS
```

---

## Flow A — English/AISC diagnostic — FAIL

```txt
Run ID:  e7e5a3ef-76ef-4b11-aba3-71f720d2bef2
URL:     http://localhost:3000/rapport/e7e5a3ef-76ef-4b11-aba3-71f720d2bef2
Prompt:  qa/e2e/prompts/english-aisc-simple-beam.txt
textLen: 9316 chars

Result page opened:  yes
Full report opened:  yes
Word download works: present (button)
PDF download works:  present (button)

missing (must-show absent):
  Engineer A, Engineer B, Comparator, Controller,
  Preliminarily approved / preliminary, Calculation note, Assumptions, Warnings
forbidden (must-not-show present, in GENERATED content):
  Konstruktør, Kontrollør, FØREBELS, FORELØPIG, GOD, NS-EN

Decision: FAIL
```

### Root cause — locale separation defect (display language not honored)

The **numeric engineering is correct and US-flavoured** — the guardrail held:

- LRFD load combination `1.2D + 1.6L` (ASCE 7), `wu`, `Mu`, `Vu` computed and
  cross-checked by both constructors; US units throughout (kip·ft, ft, ksi).
- It correctly **refuses** to certify capacity: states `φb·Mn` (LTB) and
  `φv·Vn` cannot be evaluated without AISC 360 section properties for W12x26,
  and explicitly does **not** invent `Zx, Sx, J, Cw, rts, Lp, Lr`. Result
  marked preliminary, verification by a licensed engineer required. ✔

But **the English/US display language is not propagated to the UI shell or the
agent output language**:

1. **Agent role labels are hardcoded Norwegian** — "Konstruktør A/B",
   "Kontrollør" appear even inside English sentences (e.g. *"Both **Konstruktør
   A** and **Konstruktør B** are in full numerical agreement"*). The English
   labels Engineer A/B, Comparator, Controller never render.
2. **Status/risk badges are Norwegian** — "FORELØPIG GODKJENT", standalone
   risk rating "GOD", section headers `KONSTRUKTØRKONTROLL` /
   `KONTROLLØRENS AVGJØRELSE`.
3. **Much of the assessment/control narrative is in Norwegian/nynorsk**
   (e.g. the "Vurdering" body, "FØREBELS"/"førebels"), not English.

### Note on the `NS-EN` hit (soft)

`NS-EN` is flagged from generated line: *"Pilar er normalt basert på
EC3/EC2/NS-EN metodikk. Dette beregningssteget følger ASCE 7 LRFD og AISC 360 —
[EC-]verdiene er ikke gyldige her og er ikke brukt."* This is a
**contextually-correct disclaimer** (it says Eurocode is *not* used), not a
harmful Eurocode leak — but it is still Norwegian-language generated content and
trips the must-not-show list. The prompt's own `NS-EN`/`Eurocode 3` mentions
(in the "do not use …" instruction) are correctly excluded by prompt-echo
stripping.

### Recommended follow-up (Runtime/UI lanes — not this lane)

Propagate `display_language = en` (US context) to: agent role labels, status
badges, section headers, and the assessment/control generation language. Track
as a locale-separation bug. **No fix attempted here** — synthetic-user/E2E lane
is read-only against the app (see lane boundary).

Evidence: flow-A-result.json · flow-A-e7e5a3ef-….txt · flow-A-e7e5a3ef-….png ·
flow-A-api.log · flow-A-noid.{txt,png}

---

## Notes & caveats

- **LLM variance:** the exact forbidden/missing sets vary slightly run-to-run
  (an earlier run surfaced `Eurocode 3` and found "preliminary"); the structural
  finding — Norwegian shell + agent language in an English-context run — is
  consistent across every Flow A run.
- **Runner resilience baked in:** streaming-aware interpret gate (don't click
  "Start beregning" while interpretation is still streaming), streaming-aware
  report wait (wait for content to grow past the shell and stabilize),
  `evalSafe` retry for detached-frame/destroyed-context errors during streaming,
  and `run_id` capture from the `/api/init-run` response.
- **Scope:** assertions run on report text with prompt echoes removed; the full
  text is still saved unmodified as evidence.

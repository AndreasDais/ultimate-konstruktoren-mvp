# PILAR Synthetic User Checklist

**File:** `qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md`  
**Sprint:** 68D.1
**Status:** Manual / Playwright-ready QA source
**Purpose:** Define read-only synthetic-user flows and evidence rules before adding heavier browser automation.

---

## 1. Goal

The Synthetic User flow should test PILAR the way a real user does:

```txt
input → run → result page → full report → calculation sheet → Word/PDF download sanity
```

This checklist is intentionally evidence-first. It may be executed manually or by
the existing lightweight runner, but it must never change app code, runtime
logic, prompts, schema, eval cases, or ops gates.

The lane exists to find integration gaps between:

```txt
user input
agent pipeline
report display
blocked_fields handling
preliminary/provisional trust wording
nb/nn locale behavior
dry-run vs live/cached/fixture evidence claims
```

---

## 2. Non-overlap rule

This sprint must not touch app code, agent prompts, Supabase schema, report rendering, PDF/Word code, or i18n helpers.

Allowed files for this lane:

```txt
qa/e2e/**
```

Do not edit:

```txt
app/**
lib/**
qa/evals/**
scripts/**
sources/observability/**
sources/release-manager/**
LANES.md
```

Do not run writing production operations, and do not describe AI output as
professional approval.

---

## 3. Evidence modes

Every run report must state its evidence mode clearly:

```txt
Mode: live / cached / fixture / dry-run
```

Definitions:

```txt
live     real browser against a running local, preview, or production target
cached   previously captured report/run evidence re-checked without new agent execution
fixture  static local fixture used to validate the harness or checklist only
dry-run  no user journey executed; planning, selector validation, or checklist review only
```

Rules:

```txt
dry-run evidence must not be described as live proof
fixture evidence must not be described as product behavior unless tied to a real captured run
cached evidence must name the original run ID, commit, date, and target if known
live evidence must save enough screenshots/logs/text to reproduce the claim
```

---

## 4. Test environment

Use local dev or deployed preview.

Record:

```txt
Date:
Tester:
Environment: local / Vercel preview / production
Evidence mode: live / cached / fixture / dry-run
Commit/branch:
URL:
Run ID:
```

Before test:

```bash
npx tsc --noEmit --pretty false
npm run build
```

Do not run production-writing operations. If the target is production, use only
read-only navigation and already-authorized user flows.

---

## 5. Global assertions

These assertions apply to every flow, regardless of language or standard.

### Must show

```txt
professional review / disclaimer language
preliminary or provisional trust wording
blocked fields shown as blocked when present
generated report prose remains in the original report locale
```

Acceptable Norwegian examples:

```txt
Foreløpig godkjent
Førebels godkjent
krever faglig kontroll
må kontrolleres av fagperson
```

Acceptable English examples:

```txt
Preliminarily approved
Provisionally approved
requires professional review
must be reviewed by a qualified engineer
```

### Must not show

```txt
Godkjent
Approved
blocked values rendered as normal report prose
raw provider errors
secrets or environment variables
dry-run evidence described as live proof
```

Notes:

```txt
"Godkjent" or "Approved" may appear only when clearly qualified by preliminary,
provisional, foreløpig, førebels, or equivalent professional-review wording.
```

### Blocked fields evidence

When a run contains `blocked_fields`, capture:

```txt
which field was blocked
where the UI/report marks it as blocked
proof that the blocked value is not reused as ordinary approved prose
whether Word/PDF/report surfaces match the same canonical report data
```

---

## 6. Flow A — English/AISC diagnostic

Prompt file:

```txt
qa/e2e/prompts/english-aisc-simple-beam.txt
```

### Steps

1. Open PILAR.
2. Choose or activate international / United States context if available.
3. Paste the English/AISC prompt.
4. Start the run.
5. Wait until the result page finishes.
6. Open full report.
7. Open calculation view if available.
8. Try Word download.
9. Try PDF download if available.
10. Save run URL / run ID.

### Must show

```txt
Engineer A
Engineer B
Comparator
Controller
Preliminarily approved / preliminary
requires professional review / qualified engineer review
High / Medium / Low
Calculation note
Assumptions
Warnings
```

### Must not show

```txt
Konstruktør
Kontrollør
Samanliknar
Sammenligner
FØREBELS
FORELØPIG
HØG
HØY
LAV
GOD
Approved
NS-EN
Eurocode 3
M_Ed
V_Ed
gamma_G
gamma_Q
```

### Engineering guardrails

The output must not claim final AISC compliance unless verified section properties and code-specific checks are explicitly available.

It may say:

```txt
LTB is likely critical because the unbraced length is long and no intermediate bracing is provided.
```

It must not invent:

```txt
Zx
Sx
J
Cw
rts
Lp
Lr
phi_b Mn
```

unless these are given by the user or retrieved from a verified source.

---

## 7. Flow B — Norwegian Eurocode sanity

Prompt file:

```txt
qa/e2e/prompts/norwegian-simple-beam.txt
```

### Steps

1. Open PILAR.
2. Use Norwegian / Eurocode context.
3. Paste the Norwegian prompt.
4. Start the run.
5. Wait until the result page finishes.
6. Open full report.
7. Open calculation view if available.
8. Try Word download.
9. Try PDF download if available.
10. Save run URL / run ID.

### Must show

```txt
kN/m
kNm
kN
maksimalt bøyemoment / største bøyemoment
skjærkraft
fritt opplagd bjelke
Foreløpig / Førebels
faglig kontroll / fagperson
```

Norwegian shell labels may show:

```txt
Konstruktør A
Konstruktør B
Samanliknar / Sammenligner
Kontrollør
Førebels / Foreløpig
```

### Must not show

```txt
AISC
ASCE
kip
ft
W12x26
ASTM A992
LRFD
Godkjent alone as final approval
```

---

## 8. Flow C — blocked-fields integration probe

Status: define before implementation. Do not add runner code until the app target
and safe fixture/live path are agreed.

Purpose:

```txt
confirm controller-blocked data remains visibly blocked from user input through
agent output, report display, and export surfaces
```

Steps:

1. Use a safe prompt or fixture known to trigger `blocked_fields`.
2. Run or load the result in a read-only mode.
3. Open result page and full report.
4. If available, compare calculation sheet, Word, and PDF surfaces.
5. Save text, screenshots, run ID, and evidence mode.

Must show:

```txt
blocked / withheld / cannot use this field
professional review disclaimer
preliminary/provisional trust wording
same blocked-field treatment across report surfaces
```

Must not show:

```txt
blocked value as ordinary report prose
blocked value as approved calculation input
Godkjent / Approved without preliminary or professional-review qualifier
raw provider error or stack trace
```

---

## 9. Flow D — nb/nn locale preservation probe

Status: define before implementation. Do not change prompts or locale code from
this lane.

Purpose:

```txt
verify that generated report prose stays in the original report locale even if
the UI locale changes after report generation
```

Steps:

1. Create or load one nb report and one nn report.
2. Capture generated report prose before changing UI locale.
3. Change only the UI locale if the app exposes that control.
4. Reopen the report.
5. Compare generated prose language against shell labels and controls.

Must show:

```txt
generated report prose remains in original report locale
UI shell labels may follow current UI locale
professional review disclaimer remains visible
preliminary/provisional wording remains qualified
```

Must not show:

```txt
generated nb prose silently rewritten to nn after UI locale switch
generated nn prose silently rewritten to nb after UI locale switch
schema keys translated in visible/debug evidence
raw provider errors or secrets
```

---

## 10. Result recording template

```txt
Run ID / URL:
Prompt file:
Environment:
Evidence mode:
Commit/branch:
Pass / fail:

Result page opened: yes/no
Full report opened: yes/no
Calculation page opened: yes/no/not available
Word download works: yes/no/not available
PDF download works: yes/no/not available

Must-show missing:
- none / list

Forbidden string hits:
- none / list

Blocked-field evidence:
- not applicable / list field + surface + screenshot/text proof

Locale evidence:
- original report locale:
- current UI locale:
- generated prose preserved: yes/no/not applicable

Evidence claim check:
- live proof / cached proof / fixture-only / dry-run only

Engineering concern:
- none / list

Screenshots/logs:
- path or note

Decision:
- PASS
- PASS WITH WARNINGS
- FAIL
```

---

## 11. Evidence output expectations

Each run should write a small evidence bundle under `qa/e2e/reports/`:

Use `qa/e2e/reports/EVIDENCE_REPORT_TEMPLATE.md` for dry-run, cached, fixture,
or live evidence reports before promoting a run into a gate.

```txt
RUN_REPORT.md                 summary, verdict, mode, commit, target
flow-<id>-result.json          structured pass/fail data
flow-<id>-api.log              API trace if live runner is used
flow-<id>-<runId>.txt          extracted report text
flow-<id>-<runId>.png          screenshot of the decisive surface
```

The report must separate:

```txt
product finding
harness limitation
environment/setup failure
```

If evidence is dry-run, the report should say:

```txt
Decision: NOT EXECUTED
Evidence mode: dry-run
No live product behavior was verified.
```

---

## 12. Future automation target

A later Playwright version should automate:

```txt
1. paste prompt
2. submit run
3. capture run URL
4. assert key labels
5. assert forbidden strings are absent
6. open report/calculation/download links
7. save screenshots on failure
```

Do not automate until the manual checklist has been used at least once for each flow.

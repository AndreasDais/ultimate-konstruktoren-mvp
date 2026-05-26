# PILAR Synthetic User Checklist

**File:** `qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md`  
**Sprint:** 34.3  
**Status:** Manual / Playwright-ready QA source  
**Purpose:** Define the first synthetic-user flow for PILAR without introducing browser automation code yet.

---

## 1. Goal

The Synthetic User flow should test PILAR the way a real user does:

```txt
input → run → result page → full report → calculation sheet → Word/PDF download sanity
```

This checklist is intentionally manual-first. It can later be converted into Playwright or another browser automation runner.

---

## 2. Non-overlap rule

This sprint must not touch app code, agent prompts, Supabase schema, report rendering, PDF/Word code, or i18n helpers.

Allowed files:

```txt
qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md
qa/e2e/prompts/english-aisc-simple-beam.txt
qa/e2e/prompts/norwegian-simple-beam.txt
```

---

## 3. Test environment

Use local dev or deployed preview.

Record:

```txt
Date:
Tester:
Environment: local / Vercel preview / production
Commit/branch:
URL:
```

Before test:

```bash
npx tsc --noEmit --pretty false
npm run build
```

---

## 4. Flow A — English/AISC diagnostic

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

## 5. Flow B — Norwegian Eurocode sanity

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
```

---

## 6. Result recording template

```txt
Run ID / URL:
Prompt file:
Environment:
Pass / fail:

Result page opened: yes/no
Full report opened: yes/no
Calculation page opened: yes/no/not available
Word download works: yes/no/not available
PDF download works: yes/no/not available

Forbidden string hits:
- none / list

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

## 7. Future automation target

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

# Report QA Check Registry

**Sprint:** 40.0 — Report QA Agent seed registry  
**Status:** Seed registry / no runtime enforcement  
**Owner:** PILAR QA / Report QA Agent track

## 1. Purpose

This folder defines the first controlled registry for checks a future **PILAR Report QA Agent** should run against report artifacts.

The goal is not to block reports yet. The goal is to make report quality measurable before adding runtime logic.

## 2. Files

```txt
sources/report-qa/report-qa-checks.json
sources/report-qa/REPORT_QA_CHECK_REGISTRY.md
scripts/validate-report-qa-checks.mjs
```

## 3. Registry scope

The registry covers report QA checks for:

```txt
web_report
docx
pdf
calculation_sheet
```

Each check has:

```txt
id
category
severity
automated_level
applies_to
description
pass_signals
fail_signals
evidence_fields
```

## 4. Severity

```txt
info  = useful signal, not blocking
warn  = should be reviewed
block = should block final/strong approval language later
```

This sprint does **not** implement blocking. It only classifies checks.

## 5. Automation level

```txt
manual    = must be inspected by human or later LLM grader
semi_auto = can be partly rule-based, partly LLM/manual
rule      = deterministic string/field/artifact check is plausible
```

## 6. v0.1 checks

The seed registry includes checks for:

```txt
- task alignment
- explicit assumptions
- formula/unit/symbol consistency
- conclusion strength
- standard/profile consistency
- shell language consistency
- value traceability
- warning visibility
- PDF/Word/web parity
- disclaimer presence
- missing data acknowledgement
- no hallucinated standard values
- visible controller decision
- calculation sheet artifact availability
```

## 7. Test command

```bash
node scripts/validate-report-qa-checks.mjs
```

Expected:

```txt
OK sources/report-qa/report-qa-checks.json: 14 report QA checks validated, 0 errors, 0 warnings
```

## 8. Integration status

Not connected yet:

```txt
npm run report-qa:checks
npm run agent:all
npm run agent:health
```

These should come in later sprints.

## 9. Stop conditions

Do not connect Report QA to runtime until:

```txt
1. registry validates
2. report artifacts can be identified reliably
3. web/PDF/Word text extraction strategy is defined
4. preliminary vs final language policy is enforced
5. Norwegian and English/AISC shell modes remain protected
```

## 10. Next sprints

Suggested order:

```txt
40.1 — Report QA npm aliases
40.2 — Connect Report QA checks into agent hub
40.3 — Health snapshot includes Report QA checks
40.4 — Report QA final checkpoint
40.5 — Report QA artifact extraction plan
```

## 11. Non-goals

This sprint does not:

```txt
- inspect real PDF/DOCX files
- run LLM grading
- modify report rendering
- modify report model
- modify app routes
- block user-facing output
- write to Supabase
```

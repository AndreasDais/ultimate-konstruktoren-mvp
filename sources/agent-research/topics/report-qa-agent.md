# Research Topic: Report QA Agent for Calculation Notes and Exports

**Topic ID:** `report-qa-agent`  
**Registry status:** proposed  
**Priority:** P1  
**Risk:** medium  
**Owner:** PILAR Research & Agent Strategy Agent  
**Mode:** read-only / suggest-only  

---

## 1. Purpose

Research how PILAR should quality-check finished reports before they are treated as useful deliverables.

This topic focuses on a future Report QA Agent that can inspect the result page, full report, DOCX/PDF exports and calculation sheets for structure, language consistency, engineering assumptions and conclusion strength.

---

## 2. PILAR problem mapping

PILAR reports need QA because a report can be readable while still having problems:

- assumptions are hidden or inconsistent
- units or symbols drift between result view and export
- status labels are wrong for the selected shell language
- conclusion is too strong for missing data
- PDF/Word does not match the web report
- calculation sheet uses wrong language or stale output
- warnings are present in one artifact but missing in another

---

## 3. Research questions

1. What should a Report QA Agent inspect first: web report, DOCX, PDF, calculation sheet or raw report model?
2. Which checks are deterministic string/rule checks?
3. Which checks need LLM or human review?
4. How should report QA connect to eval cases and guardrails?
5. What score or decision should Report QA produce?
6. How should QA distinguish language shell labels from generated technical prose?
7. What is the safest read-only MVP?

---

## 4. Expected memo output

A completed Agent Opportunity Memo for this topic should include:

- Report QA checklist
- proposed report-quality score fields
- deterministic rule checks
- LLM/human review candidates
- PDF/Word parity checks
- language-shell consistency checks
- recommended no-build or MVP sprint

---

## 5. Candidate MVP

A safe MVP should not alter report generation. It should inspect outputs only:

```txt
Add:
- qa/report/PILAR_REPORT_QA_CHECKLIST.md
- qa/report/sample-report-qa-result.json
- scripts/check-report-artifacts.mjs only if it reads local artifacts

Do not add:
- report renderer changes
- DOCX/PDF formatting changes
- prompt changes
- database changes
```

---

## 6. Draft QA categories

```txt
language_shell_consistency
assumption_visibility
unit_consistency
symbol_consistency
warning_visibility
conclusion_strength
standard_profile_consistency
export_parity
professional_review_disclaimer
artifact_completeness
```

---

## 7. Evaluation criteria

A good Report QA proposal should be accepted only if it:

- keeps v0.1 read-only
- protects existing report rendering
- gives actionable issues with severity
- checks both Norwegian and international shell behavior
- supports PDF/Word parity without changing exporters
- connects issues to eval cases or guardrail reason codes

---

## 8. Blocked actions

This topic must not directly perform:

- DOCX/PDF renderer rewrites
- report model changes
- app UI changes
- production prompt edits
- database migrations
- automatic report rejection

---

## 9. Recommended next command

```bash
npm run research:memo -- report-qa-agent
npm run research:memos
npm run research:check
```

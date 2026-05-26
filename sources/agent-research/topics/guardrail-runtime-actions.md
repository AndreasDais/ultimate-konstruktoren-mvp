# Research Topic: Runtime Guardrails for Agent Actions and Engineering Claims

**Topic ID:** `guardrail-runtime-actions`  
**Registry status:** proposed  
**Priority:** P1  
**Risk:** medium  
**Owner:** PILAR Research & Agent Strategy Agent  
**Mode:** read-only / suggest-only  

---

## 1. Purpose

Research how PILAR should validate agent output before it is shown as a trustworthy engineering result.

This topic focuses on runtime guardrail policy, reason codes, block/warn/pass behavior and human-review triggers. It must not implement blocking behavior in production yet.

---

## 2. PILAR problem mapping

PILAR must prevent or clearly mark:

- unsupported final design approval
- invented section properties or code values
- mixed Eurocode/AISC/Canadian design logic
- overconfident conclusions from incomplete input
- missing warnings for LTB, buckling, bracing or missing profile data
- missing professional review disclaimers
- language/profile mismatches that make a report look more authoritative than it is

---

## 3. Research questions

1. Which claims should be blocked, warned or allowed?
2. Which reason codes should exist in v0.1?
3. What evidence must be present before a Controller can say “approved”?
4. How should AISC/ASCE experimental mode avoid invented table values?
5. Which guardrails should be deterministic rules, and which need LLM or human review?
6. How should guardrail decisions become eval cases later?
7. How should guardrail decisions be displayed to the user without breaking UX?

---

## 4. Expected memo output

A completed Agent Opportunity Memo for this topic should include:

- first guardrail reason-code registry
- `pass|warn|block` policy draft
- evidence requirements per reason code
- suggested data model for `guardrail_decisions`
- UI/report implications
- eval cases for false approvals and missing warnings
- clear human-review requirements

---

## 5. Candidate MVP

A safe MVP should be policy/data-only:

```txt
Add:
- sources/guardrails/GUARDRAIL_REASON_CODE_REGISTRY.md
- sources/guardrails/GUARDRAIL_DECISION_POLICY_V0.md
- qa/evals/guardrail-eval-seeds.jsonl

Do not add:
- production blocking logic
- report renderer changes
- Controller prompt changes
- database migration
```

---

## 6. Draft reason-code candidates

```txt
missing_required_input
unsupported_final_approval
invented_code_value
mixed_standard_context
unit_inconsistency
conclusion_too_strong
missing_professional_review_disclaimer
aisc_section_properties_missing
ltb_risk_not_acknowledged
old_stored_output_not_fresh_run
```

---

## 7. Evaluation criteria

A good guardrail proposal should be accepted only if it:

- reduces false confidence
- keeps preliminary outputs usable
- separates educational calculation from professional approval
- preserves Norwegian and international modes
- avoids invented code/table values
- makes reason codes auditable
- can be tested with eval cases

---

## 8. Blocked actions

This topic must not directly perform:

- live output blocking
- weakening existing warnings
- removing disclaimers
- editing production prompts
- changing database schema
- changing app UI without dedicated sprint

---

## 9. Recommended next command

```bash
npm run research:memo -- guardrail-runtime-actions
npm run research:memos
npm run research:check
```

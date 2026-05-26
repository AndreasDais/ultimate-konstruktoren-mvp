# Agent Opportunity Memo

**Memo ID:** agent-opportunity-report-qa-agent  
**Dato:** 2026-05-26  
**Tema:** Report QA Agent for PILAR calculation/report artifacts  
**Priority:** P1  
**Recommendation:** Build

---

## 1. External signal

AI quality assurance is moving from simple test execution toward artifact review: inspect generated documents, extract risks, validate consistency, and flag compliance or traceability issues. For PILAR, the report is the user-facing product, so a dedicated Report QA Agent is a natural layer.

## 2. Sources

- AI engineering report analysis pattern: https://www.v7labs.com/automations/engineering-reports
- General AI QA agent pattern: https://shiftasia.com/column/what-every-qa-engineer-should-actually-understand-about-how-ai-works/
- PILAR internal reference: `qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md`
- PILAR internal reference: `sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md`
- PILAR internal reference: `PILAR_INTERNATIONAL_LANGUAGE_POLICY.md`

## 3. Pattern

The pattern is a **Report QA Agent**:

```txt
report artifact -> structural/content checks -> language/profile checks -> risk score -> reviewer notes
```

It should treat reports as artifacts, not as chat answers. It should compare result page, full report, DOCX/PDF and calculation sheet where possible.

## 4. PILAR problem mapping

PILAR has multiple artifact surfaces:

- result view
- full report page
- Word report
- calculation Word/PDF/LaTeX
- report metadata/status panels

Past fixes have shown that these can drift. The Report QA Agent should detect mismatches such as:

- English/AISC shell still showing Norwegian labels
- Norwegian shell showing English role labels
- report export not matching web report
- calculation sheet using wrong locale
- warnings missing from exports
- “approved” language stronger than Controller evidence

## 5. Proposed agent

**Namn:** PILAR Report QA Agent  
**Rolle:** Review generated report artifacts before they are treated as release-quality outputs.  
**Input:** rendered report text, report model JSON, export metadata, run metadata, standard profile.  
**Output:** report QA score, issue list, severity, recommended action: show, show with warning, block export, manual review.  
**Køyringspunkt:** after Reporter and before export acceptance; initially as manual/offline QA.  
**Kode-rettigheiter:** Read-only in v0.1.

## 6. MVP scope

- [ ] Create a report QA checklist for text-only artifacts.
- [ ] Add sample accepted/failed report snippets.
- [ ] Define required sections: assumptions, given data, results, warnings, conclusion, disclaimer.
- [ ] Define language-shell forbidden-string lists for nb/nn/en.
- [ ] Produce a Markdown QA report; no runtime blocking in v0.1.

## 7. Data to log

- `run_id`
- `report_artifact_type`
- `display_language`
- `standard_profile`
- `required_sections_present`
- `forbidden_string_hits`
- `missing_warning_flags`
- `conclusion_strength_score`
- `artifact_mismatch_flags`
- `report_quality_score`
- `manual_review_required`

## 8. Eval criteria

- Detects missing disclaimer.
- Detects English labels in Norwegian shell and Norwegian labels in English shell.
- Detects final compliance claims where output should be preliminary.
- Detects missing assumptions section.
- Produces issue severity and actionable fix hints.

## 9. Risks

| Risk | Severity | Mitigation |
|---|---:|---|
| QA agent becomes another hallucinating reviewer | Medium | Use deterministic checks first; LLM review later. |
| Report exports differ from web output | High | Treat each artifact type separately. |
| Too many false positives | Medium | Start with forbidden strings and required sections. |
| Hidden PDF/DOCX rendering issues | Medium | Add artifact extraction/readback later. |

## 10. Sprint suggestion

```txt
Sprint 36.2 — Report QA checklist and forbidden-string registry
Mål: Define deterministic report QA checks before runtime agent integration.
Omfang: docs + JSON registry + validator only.
Filer:
- qa/report-qa/REPORT_QA_CHECKLIST.md
- qa/report-qa/forbidden-strings.json
- scripts/validate-report-qa-registry.mjs
Risiko: låg
Test:
- node scripts/validate-report-qa-registry.mjs
- npm run agent:all
Rollback:
- git checkout -- qa/report-qa scripts/validate-report-qa-registry.mjs
```

## 11. Final recommendation

Build. Start with deterministic checks and artifact diffing before adding LLM-based report review. This is one of the highest-value next agents because PILAR’s visible product is the report.

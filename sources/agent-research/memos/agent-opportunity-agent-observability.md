# Agent Opportunity Memo

**Memo ID:** agent-opportunity-agent-observability  
**Dato:** 2026-05-26  
**Tema:** Agent observability for PILAR  
**Priority:** P1  
**Recommendation:** Build

---

## 1. External signal

AI-agent observability is becoming a separate infrastructure layer for production agents. The external pattern is not just logging final model output, but tracing multi-step agent workflows, tool calls, intermediate decisions, failures, retries, latency and quality signals.

For PILAR, this matters because engineering-agent failures can be silent: two agents may appear to agree while using wrong assumptions, mixed standards, missing units or over-strong conclusions.

## 2. Sources

- Laminar — open-source AI agent observability: https://www.ycombinator.com/companies/laminar
- Laminar product site: https://laminar.sh/
- The Context Company — AI-agent interaction / silent-failure analysis: https://www.thecontext.company/
- LangSmith observability: https://www.langchain.com/langsmith/observability
- PILAR internal reference: `sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md`

## 3. Pattern

The pattern is an **Observability Agent / Trace Analyzer**:

```txt
agent run -> trace/event extraction -> failure classification -> trend analysis -> memo / dashboard / review queue
```

This agent should not decide engineering correctness alone. It should classify and surface risk patterns for human and eval review.

## 4. PILAR problem mapping

PILAR already has a multi-agent pipeline:

```txt
Input Agent -> Engineer A -> Engineer B -> Comparator -> Controller -> Reporter
```

The current risk is that errors can be stored as plain output without enough structured trace data. PILAR needs to answer:

- Which agent creates most failures?
- Which prompt type causes low confidence?
- Which runs mix standard contexts?
- Which reports claim more certainty than the evidence allows?
- Which language/profile combinations leak shell labels?

## 5. Proposed agent

**Namn:** PILAR Observability Agent  
**Rolle:** Read traces/events and produce structured risk summaries.  
**Input:** run metadata, agent outputs, comparator/controller decisions, report artifacts, eval results.  
**Output:** observability event summary, failure clusters, trend memo, follow-up suggestions.  
**Køyringspunkt:** after a run completes, and as a batch job over recent runs.  
**Kode-rettigheiter:** Read-only in v0.1. Suggest-only after v0.2.

## 6. MVP scope

- [ ] Read local/static sample event data or one exported run JSON.
- [ ] Classify flags: missing inputs, standard mismatch, unit mismatch, language leakage, strong conclusion without evidence.
- [ ] Produce a Markdown observability summary.
- [ ] Store output under `sources/agent-research/memos/` or `qa/evals/reports/` in early MVP.
- [ ] Do not write to Supabase in v0.1.

## 7. Data to log

- `run_id`
- `agent_name`
- `agent_version`
- `standard_profile`
- `display_language`
- `input_quality_status`
- `confidence_a`
- `confidence_b`
- `comparator_match_status`
- `controller_decision_status`
- `unit_consistency_flags`
- `language_leak_flags`
- `report_artifact_status`
- `human_review_status`

## 8. Eval criteria

- Detects known language-leak cases from prior PILAR i18n fixes.
- Flags AISC/ASCE runs that claim final compliance without verified section properties.
- Flags missing input cases without marking them as approved.
- Produces deterministic reason codes.
- Does not alter app code, prompts or database schema in v0.1.

## 9. Risks

| Risk | Severity | Mitigation |
|---|---:|---|
| False positives create noise | Medium | Start with small reason-code list and manual review. |
| False negatives create false trust | High | Keep Observability Agent advisory, not approving. |
| Logs may contain sensitive user data | Medium | Redact prompts/files before storing long-term. |
| Schema drift | Medium | Keep schema proposal documented before migration. |

## 10. Sprint suggestion

```txt
Sprint 36.0 — Observability reason-code registry
Mål: Define first structured observability flags/reason codes.
Omfang: docs + JSON registry only.
Filer:
- sources/agent-research/observability/OBSERVABILITY_REASON_CODES.md
- qa/observability/reason-codes.json
Risiko: låg
Test:
- npm run agent:all
- node scripts/validate-observability-reason-codes.mjs
Rollback:
- git checkout -- sources/agent-research/observability qa/observability
```

## 11. Final recommendation

Build, but keep it read-only first. This should become a P1 support agent after eval and research foundations are stable.

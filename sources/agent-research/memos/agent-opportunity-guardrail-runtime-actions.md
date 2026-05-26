# Agent Opportunity Memo

**Memo ID:** agent-opportunity-guardrail-runtime-actions  
**Dato:** 2026-05-26  
**Tema:** Runtime guardrails for PILAR agent actions  
**Priority:** P1  
**Recommendation:** Build carefully

---

## 1. External signal

Runtime guardrails are emerging as a proactive layer for AI agents: validate actions before they execute, block unsafe actions, or return corrective feedback. This is different from evals and observability, which usually detect problems after output exists.

For PILAR, the relevant “actions” are not financial refunds or external API writes. They are engineering-facing actions such as approving a report, claiming code compliance, using unsupported standard properties, or showing a final-sounding conclusion to the user.

## 2. Sources

- Salus — guardrails for agent actions: https://www.ycombinator.com/companies/salus
- Runtime guardrail pattern: https://dev.to/aws/runtime-guardrails-for-ai-agents-steer-dont-block-278n
- PILAR internal reference: `sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md`
- PILAR internal reference: `PILAR_I18N_SAFETY_SKILL.md`
- PILAR internal reference: `PILAR_AGENT_ECOSYSTEM_STRATEGY.md`

## 3. Pattern

The pattern is a **Guardrail Decision Agent**:

```txt
candidate output/action -> policy checks -> pass/warn/block -> user-safe message + developer reason codes
```

The most important design principle is that guardrails should be structured and reason-coded. Free-text warnings alone are not enough.

## 4. PILAR problem mapping

PILAR must avoid false certainty in structural engineering contexts. The guardrail layer should catch cases where:

- input is insufficient or irrelevant
- AISC/ASCE mode invents section properties
- Eurocode and US notation are mixed
- missing assumptions are hidden
- report language claims final approval
- warnings/disclaimers are missing
- output language/shell profile leaks incorrect labels

## 5. Proposed agent

**Namn:** PILAR Guardrail Decision Agent  
**Rolle:** Validate whether an output/action can be shown, shown with warning, or blocked.  
**Input:** input-agent status, standard profile, agent outputs, comparator decision, controller decision, report model metadata.  
**Output:** `pass | warn | block`, reason codes, user message, developer message, allowed next step.  
**Køyringspunkt:** after Controller and before Reporter/display; later also before exports.  
**Kode-rettigheiter:** No code-write rights. Runtime decision only after human-reviewed MVP.

## 6. MVP scope

- [ ] Define first guardrail reason-code registry.
- [ ] Implement offline validator over sample result JSON, not production pipeline.
- [ ] Cover missing input, irrelevant input, AISC property invention, mixed-standard notation, conclusion-too-strong.
- [ ] Produce `guardrail_status: pass|warn|block`.
- [ ] Keep final UI integration out of v0.1.

## 7. Data to log

- `run_id`
- `guardrail_version`
- `status`
- `reason_codes`
- `blocked_claims`
- `user_message`
- `developer_message`
- `allowed_next_step`
- `standard_profile`
- `display_language`
- `requires_human_review`

## 8. Eval criteria

- Blocks irrelevant input.
- Warns when LTB risk is discussed without full profile properties.
- Blocks final compliance claims in experimental AISC/ASCE mode when required section properties are missing.
- Allows preliminary educational calculations when warnings/disclaimers are present.
- Produces stable reason codes, not just prose.

## 9. Risks

| Risk | Severity | Mitigation |
|---|---:|---|
| Overblocking makes product unusable | Medium | Use warn-state before block where safe. |
| Underblocking creates false trust | High | Make high-risk claims block by default. |
| Guardrail prose becomes inconsistent with UI | Medium | Use reason-code registry + label maps. |
| Users treat warnings as approval | High | Use explicit preliminary wording and licensed-review disclaimers. |

## 10. Sprint suggestion

```txt
Sprint 36.1 — Guardrail reason-code registry
Mål: Define structured guardrail reason codes before runtime integration.
Omfang: docs + JSON registry + validator only.
Filer:
- sources/agent-research/guardrails/GUARDRAIL_REASON_CODE_REGISTRY.md
- qa/guardrails/reason-codes.json
- scripts/validate-guardrail-reason-codes.mjs
Risiko: låg-medium
Test:
- node scripts/validate-guardrail-reason-codes.mjs
- npm run agent:all
Rollback:
- git checkout -- sources/agent-research/guardrails qa/guardrails scripts/validate-guardrail-reason-codes.mjs
```

## 11. Final recommendation

Build, but only after reason codes and offline eval cases exist. Do not connect it directly to production report approval until it has passed regression tests and human review.

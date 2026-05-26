# PILAR Observability Event Taxonomy

**Status:** Proposal / implementation foundation  
**Sprint:** 38.0  
**Owner:** PILAR Observability Agent track  
**Scope:** Taxonomy only. No runtime logging, no database migration, no app-code integration.

---

## 1. Purpose

This document defines the first controlled event taxonomy for future PILAR observability.

The goal is to prevent ad-hoc logging names such as:

```txt
agent failed
bad output
report thing happened
i18n issue
```

and replace them with stable event types such as:

```txt
agent.failed
guardrail.evaluated
artifact.rendered
anomaly.flagged
```

This makes future traces, dashboards, evals, guardrails and health snapshots easier to compare over time.

---

## 2. What this sprint does

Sprint 38.0 adds:

```txt
sources/observability/observability-event-taxonomy.json
sources/observability/OBSERVABILITY_EVENT_TAXONOMY.md
scripts/validate-observability-event-taxonomy.mjs
```

It does **not** add:

```txt
runtime logging
database writes
Supabase migration
agent route changes
report rendering changes
prompt changes
UI changes
```

---

## 3. Event naming rule

Event types should use dot notation:

```txt
category.action
```

Examples:

```txt
run.started
input.classified
agent.completed
guardrail.evaluated
eval.executed
research.memo.generated
health.snapshot.written
```

Avoid vague names:

```txt
bad_result
thing_failed
log_agent
report_event
```

---

## 4. Categories in v0.1

```txt
run
input
agent
comparison
controller
report
artifact
guardrail
eval
research
release
health
feedback
anomaly
```

These categories deliberately match the agent-ecosystem tracks already built:

```txt
Research Agent
Eval Agent
Guardrail foundation
Observability foundation
Release / health gate
```

---

## 5. Common required fields

Every future event should have at least:

```json
{
  "event_type": "agent.completed",
  "event_version": "observability_event_taxonomy_v0.1",
  "created_at": "2026-05-26T00:00:00.000Z",
  "source": "app/api/agent-a",
  "severity": "info"
}
```

The taxonomy also defines optional fields such as:

```txt
run_id
agent_name
agent_version
prompt_version
display_language
standard_context
domain
duration_ms
token_usage
cost_estimate
reason_codes
artifact_path
metadata
```

---

## 6. PII / privacy rule

Do not store raw user-uploaded documents, images, credentials, secrets or full personally identifying text inside observability events.

Prefer:

```txt
pointer
hash
redacted snippet
summary
count
status
reason_code
artifact path
```

Avoid:

```txt
raw uploaded PDF text
full user prompt with personal information
email
phone
address
API key
student/customer name
```

---

## 7. How to validate

Run:

```bash
node scripts/validate-observability-event-taxonomy.mjs
```

Expected:

```txt
OK sources/observability/observability-event-taxonomy.json: 16 observability events validated, 0 errors, 0 warnings
```

---

## 8. Next safe sprint

Recommended next sprint:

```txt
Sprint 38.1 — Observability npm aliases
```

Add:

```bash
npm run observability:taxonomy
npm run observability:check
```

Then connect observability checks into:

```bash
npm run agent:all
npm run agent:health
```

---

## 9. Stop conditions

Do not proceed from taxonomy to runtime logging until:

```txt
1. taxonomy validator is green
2. event names are stable
3. PII policy is accepted
4. Supabase schema proposal is reviewed
5. runtime events have clear source and retention rules
```

# Research Topic: Agent Observability and Trace Analytics

**Topic ID:** `agent-observability`  
**Registry status:** proposed  
**Priority:** P1  
**Risk:** medium  
**Owner:** PILAR Research & Agent Strategy Agent  
**Mode:** read-only / suggest-only  

---

## 1. Purpose

Research how PILAR should observe, replay and evaluate multi-agent runs across:

```txt
Input Agent → Engineer A → Engineer B → Comparator → Controller → Reporter
```

The goal is not to add telemetry immediately. The goal is to define a practical MVP for trace logging, event taxonomy, failure classification and run-level quality metrics.

---

## 2. PILAR problem mapping

PILAR needs visibility into:

- which agent step failed or degraded a run
- when Engineer A and Engineer B disagree
- when Controller approval is stronger than the evidence
- when i18n/shell-language drift appears
- when report/PDF/Word rendering fails
- when old database output is being mistaken for fresh agent behavior
- which prompt version caused a regression

Without observability, PILAR can compile and still be wrong.

---

## 3. Research questions

1. What trace fields should PILAR log for every agent step?
2. What counts as an event: request, response, warning, blocker, fallback, render artifact, human review?
3. Which metrics are deterministic enough for v0.1?
4. Which metrics require LLM-as-judge or human review?
5. What should be logged locally first before any Supabase/schema migration?
6. How should observability connect to eval cases and guardrail decisions?
7. What should be excluded from logs to avoid leaking sensitive user/project data?

---

## 4. Expected memo output

A completed Agent Opportunity Memo for this topic should include:

- proposed `agent_observability_events` taxonomy
- minimum run-level trace fields
- recommended v0.1 local artifact format
- proposed Supabase schema risks
- dashboard candidates
- data privacy risks
- acceptance criteria for an observability MVP
- suggested next sprint with no direct runtime logging unless reviewed

---

## 5. Candidate MVP

A safe MVP should be local and additive:

```txt
Add:
- sources/agent-research/memos/agent-opportunity-agent-observability.md
- qa/observability/OBSERVABILITY_EVENT_TAXONOMY.md
- qa/observability/sample-run-trace.json

Do not add:
- production telemetry
- database migrations
- background logging
- external analytics
```

---

## 6. Data to consider logging later

```json
{
  "run_id": "uuid",
  "agent_name": "input-agent|engineer-a|engineer-b|comparator|controller|reporter",
  "agent_version": "string",
  "prompt_version": "string",
  "standard_profile": "norway_eurocode|eurocode_general|aisc_asce_aci|canadian|unknown",
  "display_language": "nb|nn|en",
  "input_quality_status": "klar|delvis_klar|mangelfull|avvist",
  "event_type": "start|complete|warning|error|fallback|guardrail|render_artifact",
  "severity": "info|warn|bad|critical",
  "flags": [],
  "metrics": {},
  "artifact_refs": {}
}
```

---

## 7. Evaluation criteria

A good observability proposal should be accepted only if it:

- keeps v0.1 read-only or local-artifact-only
- avoids logging sensitive raw user documents by default
- separates deterministic checks from LLM-judged checks
- maps directly to eval and guardrail workflows
- helps answer: “What failed, where, and why?”
- includes a rollback/no-build option

---

## 8. Blocked actions

This topic must not directly perform:

- database migrations
- production logging changes
- external analytics integration
- changes to agent prompts
- changes to report rendering
- auto-approval or auto-blocking logic

---

## 9. Recommended next command

```bash
npm run research:memo -- agent-observability
npm run research:memos
npm run research:check
```

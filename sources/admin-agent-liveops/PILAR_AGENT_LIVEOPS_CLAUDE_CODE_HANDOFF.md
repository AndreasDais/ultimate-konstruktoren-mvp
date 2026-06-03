Ja â€” dette bÃ¸r bli ein eigen admin-modul:

# PILAR Agent LiveOps Dashboard

Kjernen:

> **Du skal sjÃ¥ agentane arbeide visuelt, men berre basert pÃ¥ ekte trace-events.**
> Ingen fake â€œAI thinkingâ€-animasjonar. Animasjon = faktisk status, handoff, tool call, guardrail, eval, warning eller ferdig artifact.

Dette passar direkte med PILAR-agentstrategien: mÃ¥let er ikkje fleire agentar, men eit system der kvar run blir observert, kvar feil blir klassifisert, kvar promptendring blir evaluert, kvar rapport blir kvalitetssjekka og kvar fagpersonvurdering blir lÃ¦ringsdata.

Eksternt er dette ogsÃ¥ riktig mÃ¸nster: OpenAI Agents SDK beskriv agentar som system som eig orkestrering, tool execution, approvals og state, og tracing fangar LLM-genereringar, tool calls, handoffs, guardrails og custom events. ([OpenAI Developers][1]) ([OpenAI GitHub][2]) LangSmith legg vekt pÃ¥ full observability frÃ¥ individuelle traces til produksjonsmetrics, medan LangGraph framhevar state transitions, runtime metrics og human-in-the-loop for komplekse agentar. ([LangChain Docs][3]) ([LangChain Docs][4])

---

# 1. ProduktidÃ©

## Namn

```txt
PILAR Agent LiveOps
```

eller:

```txt
PILAR Agent Cockpit
```

Eg ville brukt **Agent LiveOps** fordi det signaliserer at dette er drift, observability og kontroll â€” ikkje berre ein kul animasjonsside.

---

# 2. Kva admin skal kunne sjÃ¥

Admin-sida bÃ¸r svare pÃ¥ desse spÃ¸rsmÃ¥la:

```txt
Kva agentar kÃ¸yrer akkurat no?
Kva steg er ferdig?
Kva agent ventar?
Kva agent feila?
Kva agent overstyrte ein annan?
Kva guardrail stoppa output?
Kva kostar runnen?
Kvar gjekk tida?
Kva evidence blei brukt?
Kva output-artifacts blei produsert?
Kva bÃ¸r mennesket sjekke?
```

Dette er spesielt viktig for PILAR fordi eksisterande strategi allereie seier at agent observability mÃ¥ spore traces, tool calls, latency, cost, silent failures, evals og feilklassar â€” ikkje berre tekstoutput.

---

# 3. Hovudlayout

```txt
/admin/agent-liveops

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PILAR Agent LiveOps                                                   â”‚
â”‚ Active runs: 3 | Guardrail warns: 2 | Blocks: 1 | Avg latency: 18.4s â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Live Runs           â”‚ Agent Graph                     â”‚ Inspector    â”‚
â”‚                     â”‚                                 â”‚              â”‚
â”‚ run_abc â— running   â”‚  Input Agent â”€â”€â–¶ Engineer A     â”‚ selected:    â”‚
â”‚ run_def âš  warning   â”‚        â”‚          â”‚             â”‚ Engineer B   â”‚
â”‚ run_xyz â–  blocked   â”‚        â”‚          â–¼             â”‚              â”‚
â”‚                     â”‚        â””â”€â”€â”€â”€â–¶ Engineer B        â”‚ status       â”‚
â”‚ Filters             â”‚                    â”‚             â”‚ duration     â”‚
â”‚ - active            â”‚                    â–¼             â”‚ tokens       â”‚
â”‚ - failed            â”‚              Comparator          â”‚ warnings     â”‚
â”‚ - AISC              â”‚                    â”‚             â”‚ evidence     â”‚
â”‚ - Norwegian         â”‚                    â–¼             â”‚ raw event    â”‚
â”‚                     â”‚               Controller         â”‚              â”‚
â”‚                     â”‚                    â”‚             â”‚              â”‚
â”‚                     â”‚                    â–¼             â”‚              â”‚
â”‚                     â”‚        Reporter / Guardrail      â”‚              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Timeline / Waterfall                                                  â”‚
â”‚ Input  â–ˆâ–ˆâ–ˆ 1.2s                                                       â”‚
â”‚ A      â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 8.7s                                                 â”‚
â”‚ B      â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 7.9s                                                   â”‚
â”‚ Comp       â–ˆâ–ˆâ–ˆ 2.1s                                                   â”‚
â”‚ Ctrl          â–ˆâ–ˆ 1.4s                                                 â”‚
â”‚ Report          â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 4.8s                                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Event Feed                                                            â”‚
â”‚ 12:01:22 Input Agent started                                          â”‚
â”‚ 12:01:23 Input classified: steel / AISC / English                     â”‚
â”‚ 12:01:24 Engineer A started                                           â”‚
â”‚ 12:01:24 Engineer B started                                           â”‚
â”‚ 12:01:31 Guardrail warning: missing_verified_section_properties        â”‚
â”‚ 12:01:34 Controller decision: show_preliminary_with_warning            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

# 4. Dei fem viktigaste visuelle flatene

## 4.1 Live Agent Graph

Dette er â€œwowâ€-flata.

Agentane blir noder:

```txt
Input Agent
Engineer A
Engineer B
Comparator
Controller
Reporter
Guardrail Agent
Report QA Agent
Eval Agent
Feature Hypothesis Arena
Release Manager
```

Kantar viser handoffs:

```txt
Input â†’ Engineer A
Input â†’ Engineer B
Engineer A/B â†’ Comparator
Comparator â†’ Controller
Controller â†’ Guardrail
Controller â†’ Reporter
Reporter â†’ Report QA
Report QA â†’ Eval
Eval/Guardrail/Observability â†’ Feature Hypothesis Arena
```

React Flow passar godt her fordi det er laga for node-baserte editorar og interaktive diagram i React. ([React Flow][5])

## 4.2 Timeline / Waterfall

Dette er debugging-flata.

Her ser du:

```txt
start time
end time
duration
parallel execution
waiting time
tool calls
retry
failure
guardrail pause
human review pause
```

OpenTelemetry-modellen er nyttig inspirasjon: ein trace bestÃ¥r av spans, og spans har parent span, start/end timestamps, attributes, events og status. ([OpenTelemetry][6])

## 4.3 Inspector Drawer

NÃ¥r du klikkar pÃ¥ ein agent-node, opnar hÃ¸grepanel:

```txt
Agent: Engineer B
Status: completed_with_warning
Duration: 8.2s
Model: gpt-x / claude-x / internal
Input classification: steel / AISC / English
Warnings:
- missing_verified_section_properties
- ltb_risk_not_fully_checked
Evidence:
- input_summary
- standard_profile
- user_units
Output summary:
- preliminary calculation note
- no final AISC compliance
Raw sanitized events:
- JSON
```

Viktig: ikkje vis skjult chain-of-thought. Vis berre **sanitized rationale, events, tool calls, warnings, decisions og output summaries**.

## 4.4 Event Feed

Dette er â€œterminalenâ€ for admin:

```txt
[12:01:22] run.created
[12:01:23] input_agent.started
[12:01:24] engineer_a.started
[12:01:24] engineer_b.started
[12:01:32] comparator.started
[12:01:35] guardrail.warn missing_verified_section_properties
[12:01:37] reporter.started
[12:01:42] artifact.docx.ready
[12:01:44] run.completed_with_warning
```

## 4.5 Replay Mode

Replay er nesten like viktig som live-view.

Admin skal kunne trykke:

```txt
Replay run
Speed: 0.5x / 1x / 2x / step-by-step
```

DÃ¥ blir runnen animert pÃ¥ nytt frÃ¥ eventloggen. Dette gjer debugging mykje lettare, spesielt nÃ¥r ein agent â€œsÃ¥g ut som han fungerteâ€, men eigentleg gjorde feil.

---

# 5. Animasjonsprinsipp

Animasjonar skal vere **semantiske**, ikkje pynt.

| Event                          | Visual                                       |
| ------------------------------ | -------------------------------------------- |
| `agent.queued`                 | dim node med liten klokke                    |
| `agent.started`                | pulserande ring rundt node                   |
| `agent.token_stream`           | subtil aktivitet i node-body                 |
| `agent.tool_call.started`      | liten â€œtool chipâ€ kjem fram under node       |
| `agent.handoff`                | lys/partikkel gÃ¥r langs edge til neste agent |
| `agent.completed`              | node fÃ¥r checkmark                           |
| `agent.completed_with_warning` | amber halo + warning chip                    |
| `guardrail.warn`               | skjoldikon + amber flash                     |
| `guardrail.block`              | raud gate stoppar downstream edge            |
| `agent.failed`                 | node kollapsar til error-card                |
| `human.review.required`        | pause-symbol og â€œawaiting humanâ€             |
| `artifact.ready`               | PDF/DOCX/report chip blir aktiv              |
| `eval.failed`                  | eval-node fÃ¥r fail badge og link til case    |
| `feature.evidence.created`     | lita evidence-dot gÃ¥r til Feature Arena      |

Motion for React, tidlegare Framer Motion, er eit godt val for denne typen produksjonsklare React-animasjonar. ([Motion][7]) Tailwind sine innebygde animasjonsutilities kan dekke enkle pulse/spin/ping-effektar utan tung animasjonskode. ([Tailwind CSS][8])

---

# 6. Viktig regel: ikkje fake progress

Dette bÃ¸r stÃ¥ i dokumentet:

```txt
No animation without event.
No progress without timestamp.
No success without completed event.
No guardrail color without guardrail decision.
No generated "thought bubbles".
```

DÃ¥rleg:

```txt
Agenten tenker...
Agenten vurderer...
AI confidence 87%
```

Bra:

```txt
Engineer A started
Engineer A emitted preliminary result
Guardrail warn: missing_verified_section_properties
Controller decision: show_preliminary_with_warning
Reporter generated DOCX artifact
```

---

# 7. Trace/event model v0

Start med eitt filbasert event-format fÃ¸r DB.

## `agent-run-events.sample.jsonl`

```json
{
  "schema_version": "pilar.agent_event.v0",
  "id": "evt-001",
  "run_id": "run-demo-001",
  "trace_id": "trace-demo-001",
  "span_id": "span-input-001",
  "parent_span_id": null,
  "timestamp": "2026-06-03T12:01:22.000Z",
  "agent_key": "input_agent",
  "agent_label": "Input Agent",
  "event_type": "agent.started",
  "status": "running",
  "severity": "info",
  "message": "Input Agent started classification.",
  "duration_ms": null,
  "metadata": {
    "standard_profile": "aisc_asce_aci",
    "display_language": "en",
    "answer_language": "en"
  },
  "redaction_status": "safe_summary_only"
}
```

```json
{
  "schema_version": "pilar.agent_event.v0",
  "id": "evt-009",
  "run_id": "run-demo-001",
  "trace_id": "trace-demo-001",
  "span_id": "span-guardrail-001",
  "parent_span_id": "span-controller-001",
  "timestamp": "2026-06-03T12:01:35.000Z",
  "agent_key": "guardrail_agent",
  "agent_label": "Guardrail Agent",
  "event_type": "guardrail.warn",
  "status": "completed_with_warning",
  "severity": "warn",
  "message": "Missing verified AISC section properties. Output must remain preliminary.",
  "duration_ms": 640,
  "reason_codes": [
    "missing_verified_section_properties",
    "no_final_aisc_compliance"
  ],
  "metadata": {
    "allowed_next_step": "show_preliminary_with_warning"
  },
  "redaction_status": "safe_summary_only"
}
```

---

# 8. Event taxonomy

```txt
run.created
run.started
run.completed
run.completed_with_warning
run.failed
run.cancelled

agent.queued
agent.started
agent.streaming
agent.completed
agent.completed_with_warning
agent.failed
agent.retrying

agent.handoff
agent.parallel_started
agent.parallel_joined

tool.started
tool.completed
tool.failed

guardrail.started
guardrail.pass
guardrail.warn
guardrail.block

report.started
report.web_ready
report.pdf_ready
report.docx_ready
report.failed

eval.started
eval.passed
eval.failed
eval.needs_human_review

human.review_required
human.review_completed

feature.evidence_created
feature.hypothesis_candidate_created

release.gate_started
release.ready
release.risky
release.blocked
```

---

# 9. Status-modell for UI

```ts
type AgentVisualStatus =
  | "idle"
  | "queued"
  | "running"
  | "streaming"
  | "waiting_for_tool"
  | "waiting_for_handoff"
  | "waiting_for_human"
  | "completed"
  | "completed_with_warning"
  | "blocked"
  | "failed"
  | "cancelled";
```

Kvar node bÃ¸r vise:

```txt
agent_label
status
current_event
duration
warning_count
error_count
last_updated_at
model/provider if available
tokens/cost if available
```

---

# 10. Admin-tabs

Eg ville bygd admin-sida slik:

```txt
/admin/agent-liveops
  Live Runs
  Replay
  Agent Health
  Guardrails
  Eval Monitor
  Report QA
  Feature Arena Evidence
  Release Gate
```

## Live Runs

Vis aktive runs og agentgraph.

## Replay

Vel ein historisk run og spel av trace.

## Agent Health

```txt
avg latency per agent
failure rate
warning rate
retry rate
cost per run
token usage
controller override rate
A/B disagreement rate
```

## Guardrails

```txt
latest blocks
latest warnings
reason code distribution
blocked unsafe final approval language
missing AISC section properties
mixed standard context
```

Dette mÃ¥ knytast til eksisterande guardrail-reglar, som allereie seier at PILAR skal blokkere irrelevante input, final approval utan nok data, oppdikta AISC section properties, blanda Eurocode/AISC, skjulte assumptions og manglande disclaimer.

## Eval Monitor

```txt
latest eval runs
failed cases
i18n regressions
PDF/Word mismatch
Norwegian mode regression
AISC missing-data regression
```

Eval Agent-strategien seier allereie at PILAR bÃ¸r ha testcases for norsk bjelke, AISC missing section properties, i18n must-not list, PDF/Word sanity og manglande input.

## Feature Arena Evidence

Dette koplar LiveOps til Feature Hypothesis Arena:

```txt
observability_event â†’ evidence
guardrail_block â†’ evidence
eval_failure â†’ evidence
report_qa_issue â†’ evidence
human_review â†’ evidence
```

Men v0 skal berre vise â€œcandidate evidenceâ€, ikkje automatisk opprette roadmap-beslutningar.

---

# 11. Arkitektur

```txt
Agent pipeline
   â”‚
   â–¼
emitAgentEvent(...)
   â”‚
   â”œâ”€â”€ console/dev log
   â”œâ”€â”€ JSONL/event buffer in v0
   â”œâ”€â”€ Supabase table later
   â””â”€â”€ SSE/WebSocket stream later
          â”‚
          â–¼
/admin/agent-liveops
   â”‚
   â”œâ”€â”€ Live Agent Graph
   â”œâ”€â”€ Timeline
   â”œâ”€â”€ Event Feed
   â”œâ”€â”€ Inspector
   â””â”€â”€ Replay
```

## V0 bÃ¸r vere file/mock fÃ¸rst

Ikkje start med full Supabase eller ekte streaming.

Start slik:

```txt
1. Mock JSONL events
2. Static admin page
3. Animated replay from JSONL
4. Validator
5. Local event emitter
6. Read-only live stream
7. Supabase persistence
```

Dette fÃ¸lgjer PILAR-prinsippet om smÃ¥, trygge sprintar. Patch-safety-reglane dine seier eksplisitt at stabilitet kjem fÃ¸rst, smÃ¥ kirurgiske endringar slÃ¥r store automatiske replace-script, og ein ikkje skal blande UI, agentprompt, PDF, Word, report model og locale i same sprint.

---

# 12. Teknisk anbefaling

## Frontend

```txt
React Flow / @xyflow/react
- agent graph
- nodes
- edges
- minimap
- pan/zoom
- clickable nodes

Motion for React
- node transitions
- handoff pulses
- replay animation
- warning/block animations

Tailwind
- simple pulse/spin/ping
- layout
- status badges

Recharts or simple SVG
- latency chart
- event counts
- warning trend
```

Recharts er eit React/D3-basert charting-bibliotek, og passar godt til enkle admin-metrics som latency, warning counts og eval pass rate. ([recharts.org][9])

## Backend v0

```txt
No DB writes.
No prompt changes.
No agent behavior changes.
Read-only mock/event data.
```

## Backend v1

```txt
agent_observability_events
agent_trace_spans
agent_run_artifacts
guardrail_decisions
eval_runs
human_reviews
```

OpenTelemetry er nyttig som mentalt rammeverk fordi det er vendor-nÃ¸ytralt og standardiserer observability rundt traces, metrics og logs. ([OpenTelemetry][10])

---

# 13. Exact files to create

## Sprint 36.0 â€” docs

```txt
sources/admin-agent-liveops/PILAR_AGENT_LIVEOPS_ADMIN.md
sources/admin-agent-liveops/AGENT_EVENT_SCHEMA.md
sources/admin-agent-liveops/AGENT_VISUAL_LANGUAGE.md
sources/admin-agent-liveops/NON_GOALS.md
sources/admin-agent-liveops/SAFETY_POLICY.md
```

## Sprint 36.1 â€” mock data + validator

```txt
qa/agent-liveops/README.md
qa/agent-liveops/sample-run-events.jsonl
qa/agent-liveops/sample-run-summary.json
qa/agent-liveops/invalid-events/missing-redaction-status.jsonl
qa/agent-liveops/invalid-events/raw-user-data.jsonl
scripts/validate-agent-liveops-events.mjs
```

## Sprint 36.2 â€” types + pure helpers

```txt
lib/agent-liveops/types.ts
lib/agent-liveops/status.ts
lib/agent-liveops/build-graph.ts
lib/agent-liveops/build-timeline.ts
lib/agent-liveops/mock-events.ts
lib/agent-liveops/redaction.ts
```

## Sprint 36.3 â€” static admin prototype

```txt
app/admin/agent-liveops/page.tsx
components/admin/agent-liveops/AgentLiveOpsDashboard.tsx
components/admin/agent-liveops/AgentGraphCanvas.tsx
components/admin/agent-liveops/AgentNodeCard.tsx
components/admin/agent-liveops/HandoffEdge.tsx
components/admin/agent-liveops/AgentTimeline.tsx
components/admin/agent-liveops/AgentEventFeed.tsx
components/admin/agent-liveops/AgentInspectorDrawer.tsx
components/admin/agent-liveops/RunPicker.tsx
components/admin/agent-liveops/StatusBadge.tsx
components/admin/agent-liveops/ReplayControls.tsx
```

## Sprint 36.4 â€” live event adapter

```txt
lib/agent-liveops/emit-agent-event.ts
lib/agent-liveops/event-buffer.ts
app/api/admin/agent-liveops/runs/[runId]/events/route.ts
app/api/admin/agent-liveops/runs/route.ts
```

## Sprint 36.5 â€” real pipeline integration

```txt
lib/agent-liveops/instrument-run.ts
lib/agent-liveops/pilar-agent-keys.ts
lib/agent-liveops/guardrail-event-mapper.ts
lib/agent-liveops/report-event-mapper.ts
lib/agent-liveops/eval-event-mapper.ts
```

---

# 14. Sprint plan

## Sprint 36.0 â€” Agent LiveOps admin concept docs

**MÃ¥l:**
Definere kva admin skal sjÃ¥, event-modell, visual language, non-goals og safety.

**Omfang:**
Docs only.

**Filer:**

```txt
sources/admin-agent-liveops/PILAR_AGENT_LIVEOPS_ADMIN.md
sources/admin-agent-liveops/AGENT_EVENT_SCHEMA.md
sources/admin-agent-liveops/AGENT_VISUAL_LANGUAGE.md
sources/admin-agent-liveops/NON_GOALS.md
sources/admin-agent-liveops/SAFETY_POLICY.md
```

**Risiko:** lÃ¥g

**Test:**

```bash
git diff -- sources/admin-agent-liveops
```

**Rollback:**

```bash
git checkout -- sources/admin-agent-liveops
```

**Acceptance:**

```txt
- seier at animasjonar mÃ¥ vere event-driven
- seier no fake progress
- seier no raw chain-of-thought
- seier no raw sensitive user data
- seier read-only admin v0
- definerer nodes, edges, statuses og event taxonomy
```

---

## Sprint 36.1 â€” Agent LiveOps mock events + validator

**MÃ¥l:**
Lage JSONL-eventformat og validator fÃ¸r UI.

**Omfang:**
Mock data + validator.

**Filer:**

```txt
qa/agent-liveops/sample-run-events.jsonl
qa/agent-liveops/sample-run-summary.json
qa/agent-liveops/invalid-events/raw-user-data.jsonl
qa/agent-liveops/invalid-events/missing-redaction-status.jsonl
scripts/validate-agent-liveops-events.mjs
```

**Risiko:** lÃ¥g-medium

**Test:**

```bash
node scripts/validate-agent-liveops-events.mjs
```

**Acceptance:**

```txt
- parses JSONL
- requires run_id, trace_id, span_id
- requires event_type
- requires timestamp
- requires agent_key
- requires status
- requires redaction_status
- rejects raw_user_data
- rejects event without safe summary/message
- rejects unknown event_type
```

---

## Sprint 36.2 â€” Pure graph/timeline helpers

**MÃ¥l:**
Konvertere eventlogg til graph nodes, edges og timeline utan UI-sideeffektar.

**Omfang:**
Pure TypeScript helpers.

**Filer:**

```txt
lib/agent-liveops/types.ts
lib/agent-liveops/status.ts
lib/agent-liveops/build-graph.ts
lib/agent-liveops/build-timeline.ts
lib/agent-liveops/mock-events.ts
```

**Risiko:** lÃ¥g

**Test:**

```bash
npx tsc --noEmit --pretty false
node scripts/validate-agent-liveops-events.mjs
```

**Acceptance:**

```txt
- same events give same graph
- same events give same timeline
- no DB access
- no network access
- no agent prompt changes
- no production run changes
```

---

## Sprint 36.3 â€” Static animated admin prototype

**MÃ¥l:**
Bygg `/admin/agent-liveops` som viser mock-run med animert graph, timeline, event feed og inspector.

**Omfang:**
Admin UI only. Mock data only.

**Filer:**

```txt
app/admin/agent-liveops/page.tsx
components/admin/agent-liveops/AgentLiveOpsDashboard.tsx
components/admin/agent-liveops/AgentGraphCanvas.tsx
components/admin/agent-liveops/AgentNodeCard.tsx
components/admin/agent-liveops/HandoffEdge.tsx
components/admin/agent-liveops/AgentTimeline.tsx
components/admin/agent-liveops/AgentEventFeed.tsx
components/admin/agent-liveops/AgentInspectorDrawer.tsx
components/admin/agent-liveops/ReplayControls.tsx
components/admin/agent-liveops/StatusBadge.tsx
```

**Risiko:** medium, fordi TSX/UI kan bryte build.

**Test:**

```bash
node scripts/validate-agent-liveops-events.mjs
npx tsc --noEmit --pretty false
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

**Acceptance:**

```txt
- page loads
- graph renders mock nodes
- handoff edge animates only when event exists
- replay controls work on mock events
- inspector opens when node clicked
- event feed matches timeline
- no DB writes
- no real agent calls
- no prompt changes
```

Dette mÃ¥ leverast etter PILAR patch-protokoll: sprintar skal ha mÃ¥l, omfang, filer, risiko, test og rollback, og etter sprint skal `tsc` og full build kÃ¸yrast.

---

## Sprint 36.4 â€” Read-only live event stream

**MÃ¥l:**
Legge til read-only live stream frÃ¥ server til admin UI.

**Omfang:**
SSE eller WebSocket. Framleis ingen endring i agentlogikk utover event emission wrapper.

**Filer:**

```txt
lib/agent-liveops/event-buffer.ts
lib/agent-liveops/emit-agent-event.ts
app/api/admin/agent-liveops/runs/route.ts
app/api/admin/agent-liveops/runs/[runId]/events/route.ts
```

**Risiko:** medium

**Test:**

```bash
node scripts/validate-agent-liveops-events.mjs
npx tsc --noEmit --pretty false
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

**Acceptance:**

```txt
- admin route is protected
- stream is read-only
- events are redacted
- UI reconnect handles disconnect
- mock mode still works
- no roadmap/prompt/DB writes
```

---

## Sprint 36.5 â€” Real pipeline instrumentation v0

**MÃ¥l:**
Instrumentere faktisk PILAR-run med minimale events: start, completed, warn, fail, handoff.

**Omfang:**
Kun observability hooks. Ikkje endre agentpromptar eller output.

**Filer:**

```txt
lib/agent-liveops/instrument-run.ts
lib/agent-liveops/pilar-agent-keys.ts
lib/agent-liveops/guardrail-event-mapper.ts
lib/agent-liveops/report-event-mapper.ts
lib/agent-liveops/eval-event-mapper.ts
```

**Risiko:** medium-hÃ¸g

**Test:**

```bash
node scripts/validate-agent-liveops-events.mjs
npx tsc --noEmit --pretty false
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

Runtime:

```txt
1. Norwegian simple Eurocode run
2. English/AISC run
3. Confirm admin sees agent events
4. Confirm no raw sensitive user data in event feed
5. Confirm no role-label leakage in international context
```

Dette mÃ¥ ogsÃ¥ respektere PILAR sin i18n-policy: `standardProfile`, `answerLanguage` og `shellLanguage` er separate konsept, og internasjonale runs skal ikkje blande norske shell-labels inn i engelsk admin/resultat-samanheng.

---

# 15. Safety og privacy

## 15.1 No raw chain-of-thought

Admin skal ikkje vise skjult resonnering.

Tillate:

```txt
agent status
tool call name
duration
sanitized input summary
sanitized output summary
guardrail reason codes
controller decision
evidence IDs
artifact status
eval result
```

Ikkje tillate:

```txt
raw hidden reasoning
private chain-of-thought
raw sensitive user data
full prompt if it contains sensitive project details
unredacted uploaded file contents
```

## 15.2 Admin access only

```txt
/admin/agent-liveops must require admin session.
API routes must require admin session.
No public indexing.
No unauthenticated event stream.
```

## 15.3 Redaction required

Alle events mÃ¥ ha:

```json
{
  "redaction_status": "safe_summary_only"
}
```

eller:

```json
{
  "redaction_status": "no_user_data"
}
```

Validator skal feile pÃ¥:

```txt
raw_user_data
full_user_prompt
unredacted_file_text
personal_data
```

---

# 16. Integration med Feature Hypothesis Arena

Dette er den store langsiktige verdien.

LiveOps skal ikkje berre vere â€œsjÃ¥ agentane jobbeâ€. Det skal ogsÃ¥ mate product-science-systemet:

```txt
guardrail.warn â†’ evidence candidate
guardrail.block â†’ evidence candidate
eval.failed â†’ evidence candidate
agent.failed â†’ evidence candidate
report_qa.issue â†’ evidence candidate
human.review â†’ evidence candidate
```

Eksempel:

```txt
Run has 4 repeated AISC missing-section warnings
â†’ Feature Arena evidence candidate:
   "AISC verified-source guardrail should be prioritized"
```

Men regelen frÃ¥ Feature Hypothesis Arena stÃ¥r fast:

```txt
LiveOps can create evidence candidates.
LiveOps cannot auto-create roadmap decisions.
LiveOps cannot auto-trigger implementation.
Human remains final.
```

---

# 17. Visual style

Eg ville gÃ¥tt for ein **Mission Control**-stil:

```txt
dark background
glass cards
clear status badges
subtle animated edges
small terminal-like event feed
timeline/waterfall
warning/block emphasis
low animation density
```

Ikkje for mykje â€œsci-fiâ€. PILAR er byggfagleg og tillitsbasert, sÃ¥ UI-en bÃ¸r kjennast:

```txt
teknisk
roleg
revisjonsklar
presis
premium
```

Animasjonane bÃ¸r vere korte og nyttige:

```txt
handoff pulse: 600â€“900ms
node running pulse: slow
guardrail warning: one flash + persistent badge
error: no infinite flashing
replay: controlled by slider
```

Legg inn `prefers-reduced-motion` / reduced motion fallback slik at admin-sida ikkje blir slitsam.

---

# 18. STOP conditions

Stopp implementering dersom:

```txt
1. Admin route ikkje er protected.
2. Event feed viser raw user data.
3. Event feed viser skjult reasoning/chain-of-thought.
4. UI viser fake progress utan event.
5. Guardrail block blir animert som pass/success.
6. International run viser feil role labels.
7. Norwegian run blir Ã¸ydelagt av English labels.
8. tsc feilar.
9. build feilar.
10. same TSX-fil feilar to gonger.
11. patch krev brei regex i TSX.
12. sprint blandar admin UI + promptendringar + report/PDF/Word.
13. live stream skaper DB writes utan schema-review.
14. animation gjer sida merkbart treg.
15. admin UI fÃ¥r write-knappar for deploy/merge/prompt fÃ¸r policy finst.
```

Git Bash-reglane dine seier ogsÃ¥ at store TSX/i18n-patchar ikkje bÃ¸r leverast som skjÃ¸re heredocs; ved stÃ¸rre UI-patchar bÃ¸r du bruke nedlastbart patch/script-artifact og alltid kÃ¸yre `tsc` og build separat.

---

# 19. FÃ¸rste versjon eg ville bygd

Den beste MVP-en er:

```txt
/admin/agent-liveops
- mock run replay
- animated agent graph
- event feed
- timeline
- inspector drawer
- validator
- no DB
- no live stream
- no prompt changes
```

Dette gir deg visuelt proof-of-concept utan Ã¥ risikere produksjonspipeline.

Deretter:

```txt
v1: live read-only event stream
v2: real pipeline instrumentation
v3: guardrail/eval/report QA panels
v4: Feature Arena evidence integration
v5: Supabase trace persistence
```

---

# 20. Kort konklusjon

Ja â€” bygg admin-sida med animasjonar.

Men bygg henne som:

```txt
PILAR Agent LiveOps
= trace-driven visual cockpit
+ agent graph
+ timeline/waterfall
+ event feed
+ inspector
+ replay mode
+ guardrail/eval/report QA visibility
+ Feature Arena evidence bridge
```

Ikkje som:

```txt
fake AI thinking animation
```

Den viktigaste regelen:

```txt
Every animation must correspond to a real event.
Every event must be inspectable.
Every risky event must be traceable.
Every decision remains human-controlled.
```

[1]: https://developers.openai.com/api/docs/guides/agents "Agents SDK | OpenAI API"
[2]: https://openai.github.io/openai-agents-python/tracing/ "Tracing - OpenAI Agents SDK"
[3]: https://docs.langchain.com/langsmith/observability "LangSmith Observability - Docs by LangChain"
[4]: https://docs.langchain.com/oss/javascript/langgraph/overview "LangGraph overview - Docs by LangChain"
[5]: https://reactflow.dev/?utm_source=chatgpt.com "React Flow: Node-Based UIs in React"
[6]: https://opentelemetry.io/docs/concepts/signals/traces/ "Traces | OpenTelemetry"
[7]: https://motion.dev/docs/react?utm_source=chatgpt.com "Motion for React: Get started - React Animation Library"
[8]: https://tailwindcss.com/docs/animation?utm_source=chatgpt.com "Transitions & Animation"
[9]: https://recharts.org/?utm_source=chatgpt.com "Recharts"
[10]: https://opentelemetry.io/docs/ "Documentation | OpenTelemetry"

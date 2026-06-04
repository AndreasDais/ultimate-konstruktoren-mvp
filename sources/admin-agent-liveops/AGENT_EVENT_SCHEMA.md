# Agent LiveOps — event schema (v0)

Agent LiveOps is driven by **sanitized events**, read from files in v0. An event is a small, stable record describing *what an agent did* — never *how it reasoned*. **No raw prompt, no raw user data, no chain-of-thought.** Every event must carry a `redaction_status`.

## Sanitized event record (`pilar.agent_event.v0`)

```json
{
  "schema_version": "pilar.agent_event.v0",
  "event_id": "evt-009",
  "run_id": "run-demo-001",
  "agent": "guardrail_agent",
  "agent_label": "Guardrail Agent",
  "event_type": "guardrail.warn",
  "status": "completed_with_warning",
  "severity": "warn",
  "summary": "Missing verified AISC section properties. Output must remain preliminary.",
  "timestamp": "2026-06-03T12:01:35.000Z",
  "duration_ms": 640,
  "artifact_ref": null,
  "reason_codes": ["missing_verified_section_properties", "no_final_aisc_compliance"],
  "trace_id": "trace-demo-001",
  "span_id": "span-guardrail-001",
  "parent_span_id": "span-controller-001",
  "metadata": { "allowed_next_step": "show_preliminary_with_warning" },
  "redaction_status": "safe_summary_only"
}
```

## Stable core fields (the 36.0 contract)

Every event must have these stable fields. (The `trace_id` / `span_id` / `parent_span_id` / `severity` / `reason_codes` / `metadata` fields are optional extensions, frozen with the validator in Sprint 36.1.)

| Field | Type | Meaning |
|---|---|---|
| `run_id` | string | The pipeline run this event belongs to. |
| `event_id` | string | Unique, stable event id (`evt-…`). |
| `agent` | string | Agent key (`input_agent`, `engineer_a`, `engineer_b`, `comparator`, `controller`, `reporter`, `guardrail_agent`, …). `agent_label` is the display name. |
| `event_type` | string | One of the taxonomy below. |
| `status` | string | UI status (see status model). |
| `timestamp` | string (ISO-8601) | When the event occurred. |
| `duration_ms` | number \| null | Duration for completed steps; `null` while running. |
| `summary` | string | Short **sanitized** human summary — no raw prompt / chain-of-thought / user data. |
| `artifact_ref` | string \| null | Reference to a produced artifact (web / PDF / DOCX), if any. |
| `redaction_status` | string | `safe_summary_only` or `no_user_data` (required). |

## Event taxonomy

```
run.created | run.started | run.completed | run.completed_with_warning | run.failed | run.cancelled
agent.queued | agent.started | agent.streaming | agent.completed | agent.completed_with_warning | agent.failed | agent.retrying
agent.handoff | agent.parallel_started | agent.parallel_joined
tool.started | tool.completed | tool.failed
guardrail.started | guardrail.pass | guardrail.warn | guardrail.block
report.started | report.web_ready | report.pdf_ready | report.docx_ready | report.failed
eval.started | eval.passed | eval.failed | eval.needs_human_review
human.review_required | human.review_completed
feature.evidence_created | feature.hypothesis_candidate_created
release.gate_started | release.ready | release.risky | release.blocked
```

## Status model

```
idle | queued | running | streaming | waiting_for_tool | waiting_for_handoff |
waiting_for_human | completed | completed_with_warning | blocked | failed | cancelled
```

Each node may surface: `agent_label`, `status`, current event, duration, warning_count, error_count, last_updated_at, and model / tokens / cost when available.

## Redaction (required)

Allowed `redaction_status` values:

```
safe_summary_only   — sanitized summaries only
no_user_data        — contains no user content at all
```

**Forbidden in any event** — the Sprint 36.1 validator must fail on these:

```
raw_user_data
full_user_prompt
unredacted_file_text
personal_data
```

**Allowed content:** agent status, tool-call name, duration, sanitized input/output summary, guardrail reason codes, controller decision, evidence IDs, artifact status, eval result.

**Never:** raw hidden reasoning, private chain-of-thought, raw sensitive user data, full prompts containing sensitive project details, or unredacted uploaded file contents. See `SAFETY_POLICY.md`.

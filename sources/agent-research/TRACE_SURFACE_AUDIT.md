# PILAR Trace Surface Audit

**Sprint:** 66.0b
**Status:** Docs-only audit sync; no code or schema changes in this sprint.
**Purpose:** Map what trace data PILAR already captures against the roadmap's Fase 4 "trace event v1" requirements, so future sprints do not build a parallel JSONL trace storage that duplicates what the DB already records.

This audit is the truth-source for one question: **before adding any new trace artifact, what trace data does the runtime already capture?**

Related audits and policies (do not duplicate):
- [RUNTIME_CONTRACT_AUDIT.md](RUNTIME_CONTRACT_AUDIT.md) — per-agent payload contracts
- [REPORT_VERSION_POLICY.md](../codebase/REPORT_VERSION_POLICY.md) — report immutability
- [PILAR_PIPELINE_DATAFLOW.md](../codebase/PILAR_PIPELINE_DATAFLOW.md) — pipeline flow + DB writes per step

---

## 1. The existing trace surface

PILAR already writes substantial trace data across the pipeline DB tables. Since sprint 64.1 it also stores raw SDK message envelopes in `step_messages`, and since sprint 64.3 it exposes a chronological `trace_events` VIEW. The [runrecord VIEW](../../db/runrecord.sql) still joins the core per-run tables by `run_id` to expose one row per pipeline run.

### 1.1 Per-step telemetry — `step_metrics`

[db/step_metrics.sql](../../db/step_metrics.sql). One row per agent SDK call:

| Field | Captures |
|---|---|
| `step_name` | tolkar / konstruktor_a / konstruktor_b / samanliknar / kontrollor / rapportor |
| `model` | exact model id used (`claude-opus-4-7`, etc.) |
| `prompt_version` | which prompt version produced this output |
| `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens` | token accounting incl. prompt caching |
| `latency_ms` | wall-clock SDK call duration |
| `stop_reason` | SDK stop reason (end_turn, max_tokens, …) |
| `ok` | false when truncated/problematic |
| `created_at` | timestamp |
| `run_id` OR `request_id` | correlation (Tolkar runs before init-run, so it uses request_id) |

CHECK constraint guarantees correlation: `run_id is not null or request_id is not null`.

### 1.2 Raw SDK envelopes — `step_messages`

[supabase/migrations/20260528000000_step_messages.sql](../../supabase/migrations/20260528000000_step_messages.sql) adds one raw-envelope row per agent SDK call:

| Field | Captures |
|---|---|
| `step_name` | same step identifier shape as `step_metrics` |
| `model`, `prompt_version`, `temperature`, `max_tokens` | call parameters as sent |
| `raw_message` | full Anthropic SDK response envelope, stored as jsonb |
| `run_id` OR `request_id` | same correlation rule as `step_metrics` |

All six routes now call `recordStepMessage`:

- Tolkar uses `request_id` because it runs before `calculation_runs` exists.
- Konstruktør A/B, Samanliknar, Kontrollør, and Rapportør use `run_id`.
- Writes soft-fail by design, like `recordStepMetric`; a trace insert failure must not block the user-facing pipeline.

This closes the old G1 raw-envelope gap for new runs.

### 1.3 Per-agent payloads

Each pipeline step writes its full structured output to its own table, all keyed by `run_id`:

| Table | Agent | What is captured |
|---|---|---|
| `input_reviews` | Tolkar | `input_status`, `calculation_type`, `discipline`, `extracted_inputs`, `missing_inputs`, `can_calculate`, `cannot_calculate`, `assumptions`, `interpretation_summary`, `confidence`, `prompt_version` |
| `agent_outputs` (×2 per run) | Konstruktør A / B | `input_payload` (jsonb), `output_text`, `structured_output` (jsonb), `confidence`, `warnings` (jsonb), `prompt_version`, distinguished by `agent_name` |
| `comparisons` | Samanliknar | `match_status`, `numeric_differences`, `method_differences`, `assumption_differences`, `internal_consistency_issues`, `recommended_status`, `summary`, `prompt_version` |
| `controller_decisions` | Kontrollør | `decision_status`, `risk_level`, `reason`, `user_message`, `blocked_outputs`, `allowed_outputs`, `manual_review_required`, `controller_notes`, `prompt_version` |
| `reports` | Rapportør | `executive_summary`, `technical_assessment`, `conclusion`, `tillit_score`, `tillit_breakdown`, `prompt_version` |

Every agent output table carries its own `prompt_version`. The full prompt-version drift map for a single run is queryable directly.

### 1.4 Post-hoc trace surfaces

| Table | What it records |
|---|---|
| `error_reports` | User-flagged errors on a specific report, with structured `error_type` enum (`feil_talverdi`, `feil_formel`, `feil_standardreferanse`, `feil_eining`, `feil_foresetnad`, `uklart_sprak`, `manglande_kontroll`, `anna`) and severity. Status workflow: open → under_review → confirmed/rejected/fixed. |
| `manual_reviews` | Human reviewer decisions on error_reports, rejected inputs, or calculation_runs. Decision enum: confirmed / rejected / partially_correct / needs_more_test / future_support / fixed. |
| `engineering_context_events` | Context-detection events (locale, standard profile choices). |
| `agent_learning_feedback` | Feedback on improvement_actions: user_rating, actual_outcome, should_repeat_pattern. |
| `daily_intelligence_reports`, `improvement_actions`, `daily_metrics_snapshots` | Aggregate intelligence layer. |

### 1.5 Unified read surfaces — `runrecord` and `trace_events`

[db/runrecord.sql:35-73](../../db/runrecord.sql) joins `calculation_runs + requests + input_reviews + agent_outputs (A and B) + comparisons + controller_decisions + reports + step_metrics`, exposing one row per run with `to_jsonb(t.*)` per table. The grader at [qa/grade.ts](../../qa/grade.ts) is the canonical consumer.

[supabase/migrations/20260528000002_trace_events_view.sql](../../supabase/migrations/20260528000002_trace_events_view.sql) adds a chronological event-stream presentation over the same DB-backed data. It intentionally omits the large `step_messages.raw_message` payload from event rows; consumers can join back to `step_messages` by id when they need the full SDK envelope.

Comment at line 31–34: per-agent jsonb is intentionally untyped because the shape is owned by the respective agent and changes with prompt versions. See [RUNTIME_CONTRACT_AUDIT.md §3](RUNTIME_CONTRACT_AUDIT.md) for why this is load-bearing.

---

## 2. Mapping against roadmap "trace event v1"

The roadmap (`PILAR_AGENT_ECOSYSTEM_TOP_LEVEL_ROADMAP.md`, Fase 4) calls for a trace event capturing:

```txt
run_id           agent_id           prompt_version
input_payload    tool_calls         handoffs
warnings         decision           output
```

Current coverage:

| Field | Status | Source |
|---|---|---|
| `run_id` | ✅ everywhere | every table has `run_id` (or `request_id` for Tolkar) |
| `agent_id` | ⚠️ partial | `step_metrics.step_name` and `agent_outputs.agent_name` cover this, but no single enum lifts it to a typed identifier |
| `prompt_version` | ✅ per agent | every per-agent table carries its own `prompt_version` column; full version-drift map queryable per run |
| `input_payload` | ✅ partial | `agent_outputs.input_payload` stores Konstruktør A/B inputs; Tolkar input is `requests.raw_text`; Samanliknar and Kontrollør receive inline client payloads; Rapportør re-queries upstream DB state. There is still no single per-agent input snapshot table for C/D/E. |
| `tool_calls` | ❌ missing | PILAR has no agent tool-use beyond the LLM call itself (no Anthropic `tools` parameter usage observed in agent routes). When tool use is introduced, no field captures it. |
| `handoffs` | ✅ presentation | `trace_events` now exposes chronological pipeline events over existing DB state; there is still no separate write-path handoff table, by design. |
| `warnings` | ✅ | `agent_outputs.warnings`, `controller_decisions.blocked_outputs`, `comparisons.internal_consistency_issues` |
| `decision` | ✅ | `controller_decisions.decision_status`, `comparisons.recommended_status`, `input_reviews.input_status` |
| `output` | ✅ | `output_text` + `structured_output` per agent, prose fields on `reports` |

**Score: 6/9 captured directly, 2/9 partial, 1/9 missing (and the missing one only becomes load-bearing when tool-use is actually introduced).**

Additional replay-only data not listed in the roadmap shape is now captured in `step_messages`: full SDK `raw_message`, `model`, `prompt_version`, `temperature`, and `max_tokens`.

The trace surface is already rich. It is not chronological-event-stream-shaped — it is normalized-per-agent-shaped. That is a presentation difference, not a data gap.

---

## 3. Replay gaps after sprint 60-65 sync

Replay (the roadmap's Fase 4.3) asks: *given an old input, can we re-run the pipeline against a new prompt and diff?* Sprint 64.x closed several of the original gaps; the remaining issues are narrower.

### Closed — G1 raw LLM message envelope

Closed by `step_messages` plus `recordStepMessage` calls in all six agent routes. New runs preserve the full SDK response envelope and call parameters (`model`, `prompt_version`, `temperature`, `max_tokens`).

### Remaining — G2 downstream input payload ambiguity

**Note:** the original description below was partially wrong. See [G2_DOWNSTREAM_INPUT_AUDIT.md](G2_DOWNSTREAM_INPUT_AUDIT.md) for the verified version. In short: Samanliknar and Kontrollør receive their input inline from the client (not re-queried). Only Rapportør re-queries. The real gap is the absence of UNIQUE constraints on `agent_outputs`/`comparisons`/`controller_decisions`, which makes replay ambiguous if a duplicate row ever appears in those tables.

Original (uncorrected) description: `agent_outputs.input_payload` only covers Konstruktør A/B. The downstream agents (Samanliknar, Kontrollør, Rapportør) read their input from prior DB tables on each call. If those tables drift between original-run and replay (e.g. agent_outputs row gets updated by an old code path), replay reads different input than the original.

### Closed — G3 event-stream presentation

Closed by `trace_events` VIEW. The trace surface is still DB-backed; there is no parallel JSONL writer.

### Closed — G4 eval cases linked to runs

Closed by `calculation_runs.eval_case_id` plus `init-run` support for non-live/eval runs. This allows queries like "show me all runs of case_id X across prompt versions" without external bookkeeping.

### Remaining — G5 no deterministic seed / no byte-identical replay

`step_messages.temperature` now records the temperature that was sent. The remaining determinism gap is not observability; it is platform/product reality:

- Anthropic does not expose a seed parameter.
- Konstruktør A/B and Rapportør use extended thinking, which forces `temperature = 1`.
- Replay must compare structured fields and eval aggregates, not byte-identical text.

See [REPLAY_DETERMINISM_POLICY.md](../codebase/REPLAY_DETERMINISM_POLICY.md) for the pinned rule.

---

## 4. The wrong-direction approach this audit forbids

The natural-sounding fix is: *"Add `lib/trace/trace-writer.ts` that writes JSONL events to `qa/traces/` directory, one event per pipeline transition, mimicking OpenAI Agents SDK tracing."*

**Do not do this without addressing the data gaps above first.** Concretely:

- It creates a parallel storage where the DB is already the source-of-truth.
- It does not improve G1 anymore — raw envelopes already live in `step_messages`.
- It does not solve the remaining G2 ambiguity — local writer cannot retroactively fix duplicate upstream rows or define canonical per-agent input snapshots.
- It introduces two-truth risk: trace JSONL says X, DB says Y, neither is wrong but both must be kept in sync.

If JSONL trace export is genuinely useful (e.g. for offline analysis or OpenAI-SDK-style trace viewers), it should be a **read-only export from the DB**, not a parallel write path. Same principle as [REPORT_VERSION_POLICY §4](../codebase/REPORT_VERSION_POLICY.md).

---

## 5. Trace/replay sprint path status

The roadmap's original 62.x trace work was revised here because much of the useful trace surface already existed in normalized DB tables. Current status:

| Sprint | Status | What | Current note |
|---|---|---|---|
| **64.1** | Done | Add raw LLM envelope storage | `step_messages` exists and all six agents call `recordStepMessage`. |
| **64.2** | Done | Link eval cases to runs | `calculation_runs.eval_case_id` exists and `init-run` can populate it for eval/non-live runs. |
| **64.3** | Done | Add trace event VIEW | `trace_events` presents chronological events without a parallel writer. |
| **64.4** | Still future | Replay harness | Now unblocked by G1/G4, but should follow [REPLAY_DETERMINISM_POLICY.md](../codebase/REPLAY_DETERMINISM_POLICY.md). |
| **64.5** | Done | Document determinism policy | Policy pins structured-output stability, not byte-identical replay. |
| **Deferred** | Deferred | JSONL trace writer/export | Only build as read-only export from DB if a concrete consumer appears. |

---

## 6. Keeping this audit honest

- If a `qa/traces/` directory appears or a `lib/trace/` writer module ships as a parallel write path, this audit has been bypassed — re-evaluate §4.
- If a new pipeline table is added with `prompt_version` and per-agent jsonb output, update §1.3 in the same sprint.
- If tool-use (`tools` parameter to Anthropic SDK) is introduced anywhere in `app/api/agent-*/route.ts`, the `tool_calls` row in §2 becomes a real gap — open a sprint to address it.
- If `temperature` settings change for any agent, update §3 G5 and [REPLAY_DETERMINISM_POLICY.md](../codebase/REPLAY_DETERMINISM_POLICY.md) — determinism guarantees shift with it.

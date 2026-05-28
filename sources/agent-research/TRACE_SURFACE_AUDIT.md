# PILAR Trace Surface Audit

**Sprint:** 64.0
**Status:** Read-only audit; no code or schema changes.
**Purpose:** Map what trace data PILAR already captures against the roadmap's Fase 4 "trace event v1" requirements, so future sprints do not build a parallel JSONL trace storage that duplicates what the DB already records.

This audit is the truth-source for one question: **before adding any new trace artifact, what trace data does the runtime already capture?**

Related audits and policies (do not duplicate):
- [RUNTIME_CONTRACT_AUDIT.md](RUNTIME_CONTRACT_AUDIT.md) — per-agent payload contracts
- [REPORT_VERSION_POLICY.md](../codebase/REPORT_VERSION_POLICY.md) — report immutability
- [PILAR_PIPELINE_DATAFLOW.md](../codebase/PILAR_PIPELINE_DATAFLOW.md) — pipeline flow + DB writes per step

---

## 1. The existing trace surface

PILAR already writes substantial trace data across 11 DB tables. The [runrecord VIEW](../../db/runrecord.sql) joins seven of them by `run_id` to expose one row per pipeline run.

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

### 1.2 Per-agent payloads

Each pipeline step writes its full structured output to its own table, all keyed by `run_id`:

| Table | Agent | What is captured |
|---|---|---|
| `input_reviews` | Tolkar | `input_status`, `calculation_type`, `discipline`, `extracted_inputs`, `missing_inputs`, `can_calculate`, `cannot_calculate`, `assumptions`, `interpretation_summary`, `confidence`, `prompt_version` |
| `agent_outputs` (×2 per run) | Konstruktør A / B | `input_payload` (jsonb), `output_text`, `structured_output` (jsonb), `confidence`, `warnings` (jsonb), `prompt_version`, distinguished by `agent_name` |
| `comparisons` | Samanliknar | `match_status`, `numeric_differences`, `method_differences`, `assumption_differences`, `internal_consistency_issues`, `recommended_status`, `summary`, `prompt_version` |
| `controller_decisions` | Kontrollør | `decision_status`, `risk_level`, `reason`, `user_message`, `blocked_outputs`, `allowed_outputs`, `manual_review_required`, `controller_notes`, `prompt_version` |
| `reports` | Rapportør | `executive_summary`, `technical_assessment`, `conclusion`, `tillit_score`, `tillit_breakdown`, `prompt_version` |

Every agent output table carries its own `prompt_version`. The full prompt-version drift map for a single run is queryable directly.

### 1.3 Post-hoc trace surfaces

| Table | What it records |
|---|---|
| `error_reports` | User-flagged errors on a specific report, with structured `error_type` enum (`feil_talverdi`, `feil_formel`, `feil_standardreferanse`, `feil_eining`, `feil_foresetnad`, `uklart_sprak`, `manglande_kontroll`, `anna`) and severity. Status workflow: open → under_review → confirmed/rejected/fixed. |
| `manual_reviews` | Human reviewer decisions on error_reports, rejected inputs, or calculation_runs. Decision enum: confirmed / rejected / partially_correct / needs_more_test / future_support / fixed. |
| `engineering_context_events` | Context-detection events (locale, standard profile choices). |
| `agent_learning_feedback` | Feedback on improvement_actions: user_rating, actual_outcome, should_repeat_pattern. |
| `daily_intelligence_reports`, `improvement_actions`, `daily_metrics_snapshots` | Aggregate intelligence layer. |

### 1.4 The unified read surface — `runrecord` VIEW

[db/runrecord.sql:35-73](../../db/runrecord.sql) joins `calculation_runs + requests + input_reviews + agent_outputs (A and B) + comparisons + controller_decisions + reports + step_metrics`, exposing one row per run with `to_jsonb(t.*)` per table. The grader at [qa/grade.ts](../../qa/grade.ts) is the canonical consumer.

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
| `input_payload` | ✅ partial | `agent_outputs.input_payload` is the only one stored explicitly; Tolkar input is `requests.raw_text`, downstream agents read from prior tables via DB roundtrip — no per-agent input snapshot for B/C/D/E |
| `tool_calls` | ❌ missing | PILAR has no agent tool-use beyond the LLM call itself (no Anthropic `tools` parameter usage observed in agent routes). When tool use is introduced, no field captures it. |
| `handoffs` | ⚠️ implicit | Reconstructable from `step_metrics.created_at` ordering by run_id, but never an explicit "agent X handed off to agent Y" event |
| `warnings` | ✅ | `agent_outputs.warnings`, `controller_decisions.blocked_outputs`, `comparisons.internal_consistency_issues` |
| `decision` | ✅ | `controller_decisions.decision_status`, `comparisons.recommended_status`, `input_reviews.input_status` |
| `output` | ✅ | `output_text` + `structured_output` per agent, prose fields on `reports` |

**Score: 6/9 captured directly, 2/9 partial, 1/9 missing (and the missing one only becomes load-bearing when tool-use is actually introduced).**

The trace surface is already rich. It is not chronological-event-stream-shaped — it is normalized-per-agent-shaped. That is a presentation difference, not a data gap.

---

## 3. What is genuinely missing for replay

Replay (the roadmap's Fase 4.3) asks: *given an old input, can we re-run the pipeline against a new prompt and diff?* That requires preserving enough of the original to reconstruct the inputs to each agent.

Real gaps for replay, in priority order:

### G1 — Raw LLM message envelope not preserved

`agent_outputs` stores `output_text` (raw) and `structured_output` (parsed). It does NOT store:
- The full SDK `message` object (incl. `id`, `stop_sequence`, `usage`, content blocks with `thinking`/`text` distinctions, citations)
- The exact system prompt content as sent (only `prompt_version` is a pointer)
- The exact `temperature`, `max_tokens`, `top_p`, `tool_choice` parameters used at call time
- The model's exact identifier as returned by the API (we record `model` in step_metrics but not the response-side echo)

Replay against a different prompt version is possible because we have the input. Replay against the *same* prompt for determinism testing is harder because we don't have the call parameters.

### G2 — Downstream input payloads not snapshotted

`agent_outputs.input_payload` only covers Konstruktør A/B. The downstream agents (Samanliknar, Kontrollør, Rapportør) read their input from prior DB tables on each call. If those tables drift between original-run and replay (e.g. agent_outputs row gets updated by an old code path), replay reads different input than the original.

This is a low-probability bug today (we have UNIQUE on `reports.run_id` and INSERT-only patterns elsewhere) but it is a real reproducibility gap.

### G3 — No event-stream presentation of run history

The data is split across seven tables. A `trace_event` view that emits one row per state-change event (input received, Tolkar started, Tolkar completed with status X, A started, …) would make traces human-readable and tool-readable without joining seven tables by hand.

This is presentation, not data. The data is already there.

### G4 — Eval cases not linked to trace runs

[qa/evals/pilar-core-evals.jsonl](../../qa/evals/pilar-core-evals.jsonl) has 11 eval cases. A run that was triggered by an eval case has `run_type = 'golden'` or `'discovery'` ([db/runrecord.sql:17–27](../../db/runrecord.sql)), but the case_id is not stored on the run. So "show me all runs of case_id X across prompt versions" requires external bookkeeping.

### G5 — No deterministic seed/temperature record per call

If `temperature > 0` (which is the default for most LLM calls), replay can never be byte-identical even with identical inputs. To distinguish "prompt change caused this" from "LLM nondeterminism caused this," need either temperature=0 for replay runs OR multiple-run aggregation. Neither is enforced today.

---

## 4. The wrong-direction approach this audit forbids

The natural-sounding fix is: *"Add `lib/trace/trace-writer.ts` that writes JSONL events to `qa/traces/` directory, one event per pipeline transition, mimicking OpenAI Agents SDK tracing."*

**Do not do this without addressing the data gaps above first.** Concretely:

- It creates a parallel storage where the DB is already the source-of-truth.
- It does not solve G1 (raw envelope) — would just record the same partial data in a new format.
- It does not solve G2 (downstream input snapshot) — local writer cannot retroactively snapshot what downstream agents read.
- It introduces two-truth risk: trace JSONL says X, DB says Y, neither is wrong but both must be kept in sync.

If JSONL trace export is genuinely useful (e.g. for offline analysis or OpenAI-SDK-style trace viewers), it should be a **read-only export from the DB**, not a parallel write path. Same principle as [REPORT_VERSION_POLICY §4](../codebase/REPORT_VERSION_POLICY.md).

---

## 5. Recommended sprint path for trace/replay (revised from roadmap Fase 4)

The roadmap's eight 62.x sprints are sound in intent but mis-scoped given how much already exists. A truer path:

### 64.1 — Add raw LLM envelope storage (closes G1)

Smallest schema change that unblocks deterministic replay. Add a `step_messages` table (or a `raw_message jsonb` column on `step_metrics`) storing the full SDK response object. Migration in `supabase/migrations/`. App-side change is a single line per agent route.

**Risk:** disk growth. Mitigation: retention policy or sample-only on `run_type = 'golden'`/`'discovery'`.

### 64.2 — Link eval cases to runs (closes G4)

Add `eval_case_id text null` to `calculation_runs`. Filter populated only for non-live runs. One field, one validation update.

### 64.3 — Trace event VIEW (closes G3)

Pure read layer. A SQL VIEW that UNION ALLs typed events from the existing tables ordered by timestamp, with an `event_type` discriminator and a uniform payload jsonb. No app changes.

### 64.4 — Replay harness, only after G1+G4 land

Script that takes an eval_case_id + a target prompt_version, fetches the original input from request/input_review, re-invokes agents with the new prompt, diffs structured_output. Single script under `scripts/`.

### 64.5 — Document determinism policy

When can we expect byte-identical replay (temperature=0, same model, same prompt)? When can we expect only approximate replay? A policy doc like [REPORT_VERSION_POLICY.md](../codebase/REPORT_VERSION_POLICY.md) — addresses G5 without adding code.

### Deferred — JSONL trace writer

Only build this if a concrete consumer requires it (e.g. integrating with an external trace viewer). Otherwise the DB-backed surface plus the VIEW from 64.3 covers all internal needs.

---

## 6. Keeping this audit honest

- If a `qa/traces/` directory appears or a `lib/trace/` writer module ships without first addressing G1–G4, this audit has been bypassed — re-evaluate §4.
- If a new pipeline table is added with `prompt_version` and per-agent jsonb output, update §1.2 in the same sprint.
- If tool-use (`tools` parameter to Anthropic SDK) is introduced anywhere in `app/api/agent-*/route.ts`, the `tool_calls` row in §2 becomes a real gap — open a sprint to address it.
- If `temperature` settings change for any agent, update §3 G5 — determinism guarantees shift with it.

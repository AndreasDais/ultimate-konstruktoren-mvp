# Replay Determinism Policy

**Sprint:** 64.5
**Status:** Pinned policy. No code changes — documents what replay can and cannot promise, and forbids common wrong-direction fixes.
**Purpose:** Address gap G5 from [TRACE_SURFACE_AUDIT.md](../agent-research/TRACE_SURFACE_AUDIT.md) ("no deterministic seed/temperature record") and the thinking-mode constraint discovered in [AGENT_ROUTE_AUDIT.md §F7](../agent-research/AGENT_ROUTE_AUDIT.md). Future sprints that build replay tooling must read this first.

Related (do not duplicate):
- [REPORT_VERSION_POLICY.md](REPORT_VERSION_POLICY.md) — report immutability invariant.
- [PILAR_PIPELINE_DATAFLOW.md](PILAR_PIPELINE_DATAFLOW.md) — pipeline flow.
- [TRACE_SURFACE_AUDIT.md](../agent-research/TRACE_SURFACE_AUDIT.md) — what trace data exists.
- [AGENT_ROUTE_AUDIT.md](../agent-research/AGENT_ROUTE_AUDIT.md) — per-route config matrix.

---

## 1. The invariant

> **PILAR does not promise byte-identical replay of any agent call. PILAR promises structured-output stability: when the same input runs against the same prompt version and the same model, the typed payload fields the downstream consumers narrow to (e.g. `decision_status`, `match_status`, `input_status`, headline numeric results within documented tolerances) match within a documented variance band, not byte-for-byte.**

This is the load-bearing rule. Every replay-harness, eval-comparison, and "did the prompt change break X" investigation must operate on this assumption.

---

## 2. Why byte-identical replay is impossible

Three independent constraints make it so. Each on its own would prevent determinism; together they make it permanent.

### 2.1 The Anthropic SDK exposes no seed parameter

The Anthropic Messages API does not currently expose a `seed` field. Even at `temperature: 0`, the model is non-deterministic — sampling, batching, model-server state, and routing all introduce variance. Other LLM providers (OpenAI) have started exposing seeds; Anthropic has not, at least as of the model versions we use ([lib/models.ts](../../lib/models.ts)).

If Anthropic ships a `seed` parameter later, this policy can be revised. Until then, planning for byte-identical replay is planning against the platform.

### 2.2 Extended thinking forces `temperature = 1`

Sprint 65.6 discovered that the Anthropic API rejects any `temperature ≠ 1` when `thinking: { type: "enabled" }` is set. Three of PILAR's six agents use thinking:

| Agent | Thinking | Effective temperature |
|---|---|---|
| Tolkar | off | 0.1 |
| Konstruktør A | on (budget 3000) | **1 (forced by API)** |
| Konstruktør B | on (budget 3000) | **1 (forced by API)** |
| Samanliknar | off | 0.2 (sprint 65.6) |
| Kontrollør | off | 0.3 |
| Rapportør | on (budget 2000) | **1 (forced by API)** |

For Konstruktør A/B this is partly desirable — independent diverse attempts is the design intent. For Rapportør it is a known prose-drift risk parked in [AGENT_ROUTE_AUDIT.md §F7](../agent-research/AGENT_ROUTE_AUDIT.md) for separate decision.

We cannot lower temperature on thinking-enabled agents without disabling thinking itself, which is a separate product decision.

### 2.3 Cache-hit timing affects token counts and (rarely) outputs

Anthropic prompt caching (`cache_control: { type: "ephemeral" }`) reduces token usage when the same system block has been seen recently. A replay run that happens cold (cache empty) will report different `cache_read_tokens` than the original; in rare cases the cached vs non-cached path can produce slightly different content. Token totals in `step_metrics` will therefore not match between original and replay even when the output text does.

This is acceptable because token telemetry is a cost-tracking aid, not a correctness signal.

---

## 3. What PILAR DOES promise on replay

Replays must compare structured fields, not raw text. The promise is:

| Field class | Replay variance band | Source |
|---|---|---|
| Tolkar `input_status` | exact match (`klar` ≡ `klar`) | enum from system prompt |
| Comparator `match_status` | exact match | enum |
| Comparator `recommended_status` | exact match | enum |
| Controller `decision_status` | exact match | enum + hard-block clamp ([lib/check/controller-hard-block.ts](../../lib/check/controller-hard-block.ts)) |
| Numeric calculation results | within case-defined tolerance (typically ±0.5–2 %) | see `numeric_expectations[*].tolerance` in [pilar-core-evals.jsonl](../../qa/evals/pilar-core-evals.jsonl) |
| Prose fields (executive_summary, conclusion, controller_notes, summary) | semantically equivalent — no byte-equality promise | by design; LLM-generated prose |
| Token counts (input/output/cache_*) | varies per call | telemetry only |
| `latency_ms` | varies | telemetry only |
| `raw_message` (full SDK envelope) | varies | trace only |

Replay PASS means: enums match, numerics within tolerance, no new safety regressions in prose. Replay FAIL means: enum drift, numeric drift outside tolerance, or new prose violating must_not_include / safety_checks from the eval case.

---

## 4. The replay variance test pattern

When a replay harness lands (planned sprint 64.4), it MUST follow this pattern:

1. **Multiple runs per case.** Replay each eval case **N ≥ 3 times** against the new prompt version. Aggregate the verdicts using `qa/grade.ts`'s existing rubric ([qa/grade.ts:267-288](../../qa/grade.ts)). One pass on one replay is not evidence; consistent pass across N is.
2. **Compare aggregates, not single runs.** A single run that flips `match` ↔ `minor_differences` proves nothing about the prompt change. The aggregate flip rate over N runs does.
3. **Use the existing port-2 rubric.** The grader already distinguishes `KORREKT / KLASSIFISERINGSFEIL / TRYGT_FEIL / FARLEG_FEIL`. Replay aggregation must use `verdikt_verst` from `aggregateCase()` ([qa/grade.ts:267-288](../../qa/grade.ts)), not raw counts. A single FARLEG_FEIL across N replays fails the case.
4. **Document N per case priority.** P0 cases: N = 5. P1: N = 3. P2: N = 1. Higher-stakes evals get more replays to reduce false flips.
5. **Always store eval_case_id on replay runs.** The 64.2 migration enables this. Without it we can't query "show me all replays of case X across prompt versions".

---

## 5. The wrong-direction approaches this policy forbids

### F1 — "Just set temperature to 0 to make replay deterministic"

This is the natural first reaction. It does not work because:
- Anthropic at `temperature: 0` is still non-deterministic at the API level (no seed).
- Three of six agents are constrained to `temperature: 1` by the thinking-mode rule — `temperature: 0` would return 400.
- Even on the three agents where temperature 0 is technically possible, lowering it changes the model's actual output distribution, so the replay run isn't measuring the same agent the production run was. You'd be replaying a *different* agent that happens to share a prompt.

### F2 — "Disable thinking on Konstruktør A/B/Rapportør so we can set temperature"

Tempting but wrong. Production runs USE thinking (and benefit from it — better engineering output for A/B, better prose synthesis for Rapportør). Replays without thinking would not measure the same agent; you'd produce a benchmark for a hypothetical agent that doesn't exist in production. False signal both ways.

### F3 — "Add a fake seed parameter and snapshot it for replay"

There is no seed to snapshot. Pretending there is one (by recording random numbers we generate ourselves and feeding nothing to Anthropic) just produces theatre — the snapshot is unrelated to model behaviour. Don't fake what the platform doesn't support.

### F4 — "Use a deterministic LLM provider for replay testing"

Switching providers (e.g. OpenAI with its seed support) would mean replaying production Anthropic runs against a different model entirely. This is OK for **broad sanity checks** (does the answer look numerically right) but cannot validate a prompt change for Anthropic. The replay must use the same provider + same model + same prompt version to be meaningful.

---

## 6. What the trace data still gives us

Even without byte-identical replay, the data we already record ([TRACE_SURFACE_AUDIT.md §1](../agent-research/TRACE_SURFACE_AUDIT.md) and `step_messages` from sprint 64.1) is enough for the realistic replay use cases:

- **"Did this prompt change break case X?"** — replay N times, aggregate via `qa/grade.ts`, compare aggregate rubric before/after. Variance band documented in §3 covers what counts as "broke."
- **"Why did this specific run end with `decision_status: rejected`?"** — read the run's full `agent_outputs.input_payload`, `comparisons`, `controller_decisions`, plus `step_messages.raw_message` for the Controller call. Reconstruction is exact.
- **"Did the model see the prompt update I deployed?"** — query `step_metrics.prompt_version` for runs after deploy. If a run shows the old `prompt_version`, the route file or env was not updated.
- **"What model was this run on?"** — `step_metrics.model` is recorded per step. PIPELINE_MODEL override visible per step.

What we cannot do: re-derive the exact tokens an Anthropic call would emit today. That's fine — we don't need to.

---

## 7. Open questions parked

1. **If Anthropic ships a `seed` parameter,** this policy section §2.1 needs revision. Until then, replay determinism through seed is not on any roadmap.
2. **If Rapportør's `temperature: 1` (forced by thinking) shows measurable prose drift in production replays,** the open question from AGENT_ROUTE_AUDIT.md §F7 re-opens: keep thinking for synthesis quality, or drop thinking for replay stability? Decide on data, not a priori.
3. **For Konstruktør A/B, is the diversity from `temperature: 1` actually helpful or just noisy?** The Samanliknar exists specifically to detect when A and B diverge. Higher A/B diversity → more Samanliknar work. Worth measuring after eval coverage grows beyond the current 4 cases per Konstruktør.
4. **Should `temperature` be added to `step_messages` (already there as of sprint 64.1) AND `step_metrics`?** Step_metrics currently does not record temperature. Could be added for easier query of "what temperature ran this step" without joining to `step_messages`. Defer until a query actually needs it.

---

## 8. Keeping this policy honest

- If a replay-harness commit asserts byte-equality of any agent output, this policy has been violated — re-read §1 and §3.
- If a sprint sets `temperature: 0` on Konstruktør A/B/Rapportør without first disabling `thinking`, the route will start returning 400. Catch this in tsc-extending test or eval gate.
- If `seed` appears as a parameter to `client.messages.create` and the Anthropic SDK does not support it, the call will fail at runtime. Don't write speculative seed plumbing.
- If a future eval-runner ignores §4 ("multiple runs per case"), single-run flips will look like prompt regressions and cause false reverts. Aggregation is the gate.
- If `eval_case_id` is not stored on replay-triggered `calculation_runs` ([64.2 migration](../../supabase/migrations/20260528000001_eval_case_id.sql)), §4.5 is broken and replay history is unjoinable.

# PILAR Agent Route Hardening Audit

**Sprint:** 65.0
**Status:** Read-only audit; no code changes.
**Scope:** All six PILAR pipeline routes — `input-agent` (Tolkar), `agent-a` (Konstruktør A), `agent-b` (Konstruktør B), `agent-c` (Samanliknar), `agent-d` (Kontrollør), `agent-e` (Rapportør).
**Purpose:** Map inconsistencies and concrete hardening targets across the route files so subsequent sprints can fix them one-at-a-time without re-doing investigation.

Related (do not duplicate):
- [RUNTIME_CONTRACT_AUDIT.md](RUNTIME_CONTRACT_AUDIT.md) — typed payload contracts per agent.
- [TRACE_SURFACE_AUDIT.md](TRACE_SURFACE_AUDIT.md) — what trace data exists vs what's missing.
- [REPORT_VERSION_POLICY.md](../codebase/REPORT_VERSION_POLICY.md) — report immutability invariant.
- [PILAR_PIPELINE_DATAFLOW.md](../codebase/PILAR_PIPELINE_DATAFLOW.md) — runtime flow + DB writes per step.

---

## 1. Side-by-side matrix

Verified 2026-05-28 by direct file read. Line numbers are best-effort and shift with edits.

| Aspect | Tolkar (input-agent) | Konstr. A (agent-a) | Konstr. B (agent-b) | Samanliknar (agent-c) | Kontrollør (agent-d) | Rapportør (agent-e) |
|---|---|---|---|---|---|---|
| Model constant | `PIPELINE_MODEL` | `PIPELINE_MODEL` | `PIPELINE_MODEL` | `PIPELINE_MODEL` | **`"claude-sonnet-4-6"` hardkoda** | `PIPELINE_MODEL` |
| `max_tokens` | 3 072 | 32 768 | 32 768 | 8 192 | 4 096 | 4 000 |
| `temperature` | 0.1 | (SDK default) | (SDK default) | (SDK default) | 0.3 | (SDK default) |
| `thinking.budget_tokens` | none | 3 000 | 3 000 | none | none | 2 000 |
| `maxRetries` (client) | 5 | 5 (fra 64.1c) | 5 (fra 64.1c) | 5 | 5 | **none — SDK default** |
| Streaming | both (SSE + JSON) | both | both | non-streaming | non-streaming | both |
| `recordStepMetric` | ✅ | ✅ | ✅ | ✅ | **❌ missing** | ✅ |
| `recordStepMessage` (64.1) | ❌ | ❌ | ❌ | ✅ (PoC) | ❌ | ❌ |
| JSON parse fallback | `parseJsonWithFallback` (custom) | `jsonrepair` 2-stage | `jsonrepair` 2-stage | hard parse | hard parse | hard parse |
| System prompt language | hardkoda norsk | hardkoda norsk | hardkoda norsk | hardkoda norsk | hardkoda norsk | hardkoda norsk |

---

## 2. Findings, ranked

### F1 — `recordStepMetric` missing in Kontrollør 🔴

`app/api/agent-d/route.ts` calls `recordShadowCheck` ([line 395](../../app/api/agent-d/route.ts)) but never `recordStepMetric`. Every other agent records step telemetry; Kontrollør is the one final-verdict agent and is also the one we have *least* timing/token data for.

**Concrete impact:** the queries that aggregate tokens-per-run, latency-per-step, or "did this step time out" are blind to Kontrollør. Cost dashboards undercount. Step-metric-based health checks cannot detect Kontrollør outages.

**Fix scope:** add `await recordStepMetric({ runId, stepName: "kontrollor", message, promptVersion, latencyMs, ok })` after the existing `client.messages.create`. 1 file, ~8 lines.

### F2 — Kontrollør silently uses hardcoded model 🔴

`app/api/agent-d/route.ts:336` reads `model: "claude-sonnet-4-6"`. Every other route reads `PIPELINE_MODEL` from [lib/models.ts](../../lib/models.ts). The lib/models.ts header literally says: *"Tidlegare låg strengen 'claude-sonnet-4-6' hardkoda i seks route-filer — umogleg å byte trygt"*. Five of six routes got the refactor. **Agent-d was left behind.**

**Concrete impact:** if `PIPELINE_MODEL` env var is set to override the default (e.g. for a canary test on a newer Sonnet), Kontrollør silently keeps running on the pinned default. The pipeline's "verdict-giver" runs on a different model than the upstream agents that produced the data being judged.

**Fix scope:** change one string literal to `PIPELINE_MODEL`. 1 file, 1 line.

### F3 — Rapportør missing explicit `maxRetries` 🟠

`app/api/agent-e/route.ts:131` constructs `new Anthropic({ apiKey: ... })` with no `maxRetries`. Every other agent route specifies `maxRetries: 5`. The SDK default is 2.

**Concrete impact:** the same class of "Anthropic svara ikkje i tide" error that hit agent-a/b before sprint 64.1c will eventually hit agent-e. Because agent-e cache-misses already trigger LLM regen, an outage here returns a 500 to the user mid-render.

**Fix scope:** add `maxRetries: 5` to client constructor. 1 file, 1 line. Same change as 64.1c.

### F4 — System prompts hardcode Norwegian role-labels across all six agents 🟠

Every system prompt starts with "Du er Tolkar / Konstruktør A / Konstruktør B / Samanliknar / Kontrollør / Rapportør for Pilar..." — full Norwegian, no locale variants.

This is partly mitigated by `buildAgentSystemPrompt(SYSTEM_PROMPT, locale, engineeringContext)` ([lib/engineering-context/agent](../../lib/engineering-context/agent)) which apparently appends locale guidance, but the *role identity* itself is Norwegian. Per the existing eval case [pilar_eval_aisc_simple_beam_en_005](../../qa/evals/pilar-core-evals.jsonl), English-locale runs explicitly assert `must_not_include: ["Konstruktør"]`. If the model echoes the system prompt in its reasoning or output (which Anthropic models occasionally do), that assertion fires.

**Concrete impact:** language-leakage risk in English/i18n cases. Visible in the eval safety_checks: *"shell labels must be English"*. Currently relies on the model being well-behaved enough not to echo its system prompt.

**Fix scope:** larger. Either parametrize SYSTEM_PROMPT by locale (per-agent en/nn variants, ~150 lines each), or wrap the role identity in a locale-aware preamble that always speaks the request language. Multi-sprint.

### F5 — `recordStepMessage` is in one agent only, breaks symmetry 🟠

Sprint 64.1 wired raw-envelope capture into agent-c as proof-of-concept. The other five agents still skip it. So the only run for which we have raw-envelope replay data is the Samanliknar step.

**Concrete impact:** the trace gap G1 from [TRACE_SURFACE_AUDIT.md §3](TRACE_SURFACE_AUDIT.md) is closed for one-sixth of the pipeline. Replay against a new prompt version on any other agent is still impossible.

**Fix scope:** 5 small additions (one per remaining agent). Each ~10 lines, identical pattern. Was planned as 64.1b.

### F6 — JSON-parse robustness asymmetric 🟡

Agent-a and agent-b use a two-stage parse: `JSON.parse` first, fall through to `jsonrepair()` on failure. Agent-c, agent-d, agent-e hard-fail.

**Concrete impact:** A truncated or mildly-broken JSON from Samanliknar / Kontrollør / Rapportør takes the whole call down. Same condition in Konstruktør A/B is recovered silently. Inconsistent UX: a user gets "Engineer A: Error" with retry button on one fault class, but "internal server error" on the same fault class one step later.

**Fix scope:** standardize on the two-stage parse for c/d/e (each ~5 lines added), OR remove the fallback from a/b (also ~5 lines each) and rely on the upstream prompt being strict enough. The decision: keep the fallback everywhere — `jsonrepair` is a legitimate defensive layer for LLM-produced JSON.

### F7 — Temperature not set on most agents 🟡

Tolkar: 0.1 (intentional determinism for input classification). Kontrollør: 0.3 (mid). All others: unset → SDK default.

**Concrete impact:** higher run-to-run variance for Konstruktør A/B (which is fine, they're meant to be diverse) but also for Samanliknar and Rapportør (where it adds noise that bottoms out the eval signal). The Samanliknar eval case [pilar_eval_samanliknar_load_combo_ambiguity_nn_011](../../qa/evals/pilar-core-evals.jsonl) is sensitive to this: the `match_status` classification is the metric we measure, and unset temperature means two replays may disagree on whether A and B "agree".

**Fix scope:** decide and set explicit temperature per agent. Suggested defaults: Tolkar 0.1 (as-is), Konstruktør A/B 0.7 (some diversity desired between them), Samanliknar 0.2 (consistent classification), Kontrollør 0.3 (as-is), Rapportør 0.5 (prose quality balance). Each is one line per route. Document the choice in [TRACE_SURFACE_AUDIT.md §3 G5](TRACE_SURFACE_AUDIT.md).

### F8 — `max_tokens` budget for Rapportør is tight 🟡

Rapportør has `max_tokens: 4000` with `thinking.budget_tokens: 2000`. Net useful output budget: ~2000 tokens. The Rapportør produces three prose fields (executive_summary, technical_assessment, conclusion) plus JSON wrapper. A long engineering report may push against this.

**Concrete impact:** Rapportør truncation surfaces as broken/incomplete prose, possibly invalid JSON (the last field cut off), and the cache stores the broken response (until [stale-cache logic from 61.0a](../../app/api/agent-e/route.ts) catches it, which it doesn't — staleness logic is keyed on prompt_version not on validity).

**Fix scope:** raise `max_tokens` to 8 000 or 16 000. Costs more per call but only on truncation paths. 1 file, 1 line. Verify against report-rendering tests after.

---

## 3. Recommended sprint sequence

Strict-priority order. Each sprint is 1–2 files unless noted.

| Sprint | What | Why |
|---|---|---|
| **65.1** | F1 — add `recordStepMetric` to Kontrollør | Closes telemetry blindspot for the most safety-critical agent. |
| **65.2** | F2 — replace hardcoded model in agent-d with `PIPELINE_MODEL` | Restores config consistency; fixes a clear historical-debt bug. |
| **65.3** | F3 — add `maxRetries: 5` to agent-e | Mirrors 64.1c for the only remaining agent without it. |
| **65.4 = 64.1b** | F5 — add `recordStepMessage` to Tolkar/A/B/Kontrollør/Rapportør | Closes trace gap G1 across the rest of the pipeline. Larger sprint (5 routes), but the change is identical paste-pattern per file. May split per agent if it gets unwieldy. |
| **65.5** | F6 — standardize JSON parse fallback (add 2-stage to c/d/e) | Symmetric error handling. Low risk because fallback only fires on broken JSON. |
| **65.6** | F7 — set explicit temperature per agent | Reduces eval-signal noise. Tiny diff, but should be discussed because temperature choice is product-relevant. |
| **65.7** | F8 — raise Rapportør `max_tokens` to 8 000+ | Only if we observe Rapportør truncation in real runs first. Otherwise defer. |
| **65.8+** | F4 — locale-aware system prompts | Larger multi-sprint effort. Should not be attempted before a separate plan-doc decides whether to do per-locale prompt files, a locale-aware prelude, or a different architecture. |

---

## 4. What this audit explicitly does NOT recommend

- **Do not refactor the six route files into a shared "agent runner" abstraction.** Each route legitimately needs different shape (Tolkar runs before run_id exists; Rapportør has cache + tillit; Samanliknar reads two upstreams; Kontrollør has hard-block clamp). The variance is essential, not accidental.
- **Do not add a base-class or middleware layer for "common Anthropic config".** Tempting, but it would force premature unification before we know what actually needs to vary (model per agent? Temperature per agent? Thinking budget per agent?). Today the answer is "all of those vary" — exactly the case where abstraction harms.
- **Do not move system prompts into JSON/YAML files.** They are dense Norwegian engineering text with embedded examples. The tooling (search, diff, review) works better when prompts live as `const SYSTEM_PROMPT = \`...\`` in the route they belong to.

---

## 5. Keeping this audit honest

- If a sprint lands one of F1–F8, mark it done in §3 in the same sprint, with the commit SHA.
- If a new agent route is added, extend the matrix in §1.
- If `PIPELINE_MODEL` is renamed or its purpose changes ([lib/models.ts](../../lib/models.ts)), F2's wording needs an update.
- If the language-leakage risk in F4 escalates (e.g. a user-reported case where Norwegian role-labels appear in English output), promote F4 to high priority.
- If the matrix shows an agent regressing on `recordStepMetric` or `maxRetries`, that is a hardening regression and should block the PR.

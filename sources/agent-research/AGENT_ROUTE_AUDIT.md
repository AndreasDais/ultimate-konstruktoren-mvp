# PILAR Agent Route Hardening Audit

**Sprint:** 66.0b
**Status:** Docs-only audit sync; no code changes in this sprint.
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
| Model constant | `PIPELINE_MODEL` | `PIPELINE_MODEL` | `PIPELINE_MODEL` | `PIPELINE_MODEL` | `PIPELINE_MODEL` (65.2) | `PIPELINE_MODEL` |
| `max_tokens` | 3 072 | 32 768 | 32 768 | 8 192 | 4 096 | 4 000 |
| `temperature` | 0.1 | 1 (thinking) | 1 (thinking) | 0.2 (sprint 65.6) | 0.3 | 1 (thinking) |
| `thinking.budget_tokens` | none | 3 000 | 3 000 | none | none | 2 000 |
| `maxRetries` (client) | 5 | 5 (fra 64.1c) | 5 (fra 64.1c) | 5 | 5 | 5 (65.3) |
| Streaming | both (SSE + JSON) | both | both | non-streaming | non-streaming | both |
| `recordStepMetric` | ✅ | ✅ | ✅ | ✅ | ✅ (65.1) | ✅ |
| `recordStepMessage` (64.1/65.4) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| JSON parse fallback | `parseJsonWithFallback` (custom) | `jsonrepair` 2-stage | `jsonrepair` 2-stage | `jsonrepair` 2-stage (65.5) | `jsonrepair` 2-stage (65.5) | `jsonrepair` 2-stage (65.5) |
| System prompt language | Norwegian body + locale/intl preamble | Norwegian body + locale/intl preamble | Norwegian body + locale/intl preamble | Norwegian body + locale/intl preamble + intl tail | Norwegian body + locale/intl preamble | Norwegian body + locale/intl preamble |

---

## 2. Findings after sprint 60-65 sync

### F1 — `recordStepMetric` missing in Kontrollør ✅ Closed in 65.1

`app/api/agent-d/route.ts` now imports and calls `recordStepMetric` after the Kontrollør Anthropic call. The telemetry blindspot for the final-verdict agent is closed.

**Current impact:** token, latency, stop reason, and ok/failure telemetry are now available for `kontrollor` like the other pipeline steps.

**Remaining watchpoint:** if a future route refactor moves the Kontrollør LLM call, keep `recordStepMetric` adjacent to the SDK response so usage extraction still reflects the actual call.

### F2 — Kontrollør hardcoded model ✅ Closed in 65.2

`app/api/agent-d/route.ts` now uses `PIPELINE_MODEL` from [lib/models.ts](../../lib/models.ts), matching the other five routes.

**Current impact:** model override/canary behavior is consistent across the full pipeline, including the final controller step.

### F3 — Rapportør missing explicit `maxRetries` ✅ Closed in 65.3

`app/api/agent-e/route.ts` now constructs the Anthropic client with `maxRetries: 5`, matching the rest of the route set.

**Current impact:** Rapportør no longer falls back to the lower SDK retry default during transient Anthropic failures.

### F4 — International role-label leakage 🟡 Mitigated in 65.9/65.10/65.12

The long route-local `SYSTEM_PROMPT` bodies still use Norwegian source terminology, but the runtime no longer relies only on the model "doing the right thing" in international mode:

- [lib/engineering-context/agent.ts](../../lib/engineering-context/agent.ts) now prepends `INTERNATIONAL_MODE_ROLE_PREAMBLE` when `isInternationalEnglishContext(context)` is true.
- [app/api/agent-c/route.ts](../../app/api/agent-c/route.ts) has an international user-message tail that says to use "Engineer A" / "Engineer B", never "Konstruktør A/B".
- [qa/evals/pilar-core-evals.jsonl](../../qa/evals/pilar-core-evals.jsonl) includes `pilar_eval_prompt_leakage_uk_en_012`, a P0 regression case for Norwegian role-label leakage.

**Current impact:** F4 is downgraded from an unmitigated prompt-architecture gap to a regression risk guarded by a centralized preamble and eval coverage.

**Remaining watchpoint:** do not translate the whole prompt body or introduce per-language prompt files unless measured eval leakage persists despite the preamble. [AGENT_PROMPT_LOCALE_PLAN.md](AGENT_PROMPT_LOCALE_PLAN.md) remains the design record.

### F5 — `recordStepMessage` only in one agent ✅ Closed in 64.1/65.4

All six route files now call `recordStepMessage`, not only Samanliknar. Tolkar uses `request_id`; the downstream agents use `run_id`.

**Current impact:** raw SDK response envelopes and call parameters are now recorded across the pipeline, so [TRACE_SURFACE_AUDIT.md](TRACE_SURFACE_AUDIT.md) G1 is closed for new runs.

### F6 — JSON-parse robustness asymmetric ✅ Closed in 65.5

Agent-c, agent-d, and agent-e now import `jsonrepair` and use the same two-stage parse pattern as Konstruktør A/B: `JSON.parse` first, then `jsonrepair()` fallback.

**Current impact:** mildly malformed LLM JSON is handled consistently across Samanliknar, Kontrollør, and Rapportør instead of becoming a hard 500 class at later pipeline stages.

### F7 — Temperature only partially controllable due to thinking-mode constraint 🟡

Tolkar: 0.1 (intentional determinism for input classification). Kontrollør: 0.3 (mid). Samanliknar: 0.2 (sprint 65.6). All others: SDK-default and **cannot be lowered**.

**Important constraint discovered in sprint 65.6:** Anthropic's API requires `temperature = 1` whenever `thinking: { type: "enabled" }` is set. Setting any other value returns a 400. This blocks lower-temperature operation for the three agents that use extended thinking:

- Konstruktør A — `thinking.budget_tokens: 3000`
- Konstruktør B — `thinking.budget_tokens: 3000`
- Rapportør — `thinking.budget_tokens: 2000`

So "set explicit temperature per agent" is achievable for **Tolkar, Samanliknar, Kontrollør**, but for A/B/Rapportør it requires a separate product-level decision: keep thinking and accept temperature=1, or disable thinking to gain temperature control. The two are intertwined.

**Concrete impact:** the Samanliknar eval case [pilar_eval_samanliknar_load_combo_ambiguity_nn_011](../../qa/evals/pilar-core-evals.jsonl) used to suffer high run-to-run variance because `match_status` classification was thermally noisy. Fixed in sprint 65.6 by setting Samanliknar to 0.2. Konstruktør A/B variance is partly *desirable* (diverse independent attempts) so 1.0 may actually be correct for them. Rapportør at 1.0 risks prose drift between runs — observe before deciding.

**Remaining decisions (not blocked by this sprint):**

- Konstruktør A/B: keep thinking + temperature=1? Tentatively yes — diversity is the point.
- Rapportør: keep thinking + temperature=1, or trade thinking for temperature=0.5? Open. Defer until we observe Rapportør prose-quality variance.

### F8 — `max_tokens` budget for Rapportør is tight 🟡

Rapportør has `max_tokens: 4000` with `thinking.budget_tokens: 2000`. Net useful output budget: ~2000 tokens. The Rapportør produces three prose fields (executive_summary, technical_assessment, conclusion) plus JSON wrapper. A long engineering report may push against this.

**Concrete impact:** Rapportør truncation surfaces as broken/incomplete prose, possibly invalid JSON (the last field cut off), and the cache stores the broken response (until [stale-cache logic from 61.0a](../../app/api/agent-e/route.ts) catches it, which it doesn't — staleness logic is keyed on prompt_version not on validity).

**Fix scope:** raise `max_tokens` to 8 000 or 16 000. Costs more per call but only on truncation paths. 1 file, 1 line. Verify against report-rendering tests after.

---

## 3. Sprint sequence status

Strict-priority order from the original audit, updated after sprint 60-65 work.

| Sprint | Status | What | Current note |
|---|---|---|---|
| **65.1** | Done | F1 — add `recordStepMetric` to Kontrollør | Telemetry blindspot closed. |
| **65.2** | Done | F2 — replace hardcoded model in agent-d with `PIPELINE_MODEL` | Config consistency restored. |
| **65.3** | Done | F3 — add `maxRetries: 5` to agent-e | Rapportør retry policy now matches the other routes. |
| **64.1 / 65.4** | Done | F5 — add `recordStepMessage` to Tolkar/A/B/Kontrollør/Rapportør | Raw-envelope storage now covers all six agents. |
| **65.5** | Done | F6 — standardize JSON parse fallback (add 2-stage to c/d/e) | `jsonrepair` fallback now covers c/d/e. |
| **65.6** | Done | F7 — Samanliknar temperature 0.2; audit amended for thinking-mode constraint | Konstruktør A/B/Rapportør still use thinking, which forces temperature=1. |
| **65.8** | Done | F4 — choose locale-aware prompt strategy | [AGENT_PROMPT_LOCALE_PLAN.md](AGENT_PROMPT_LOCALE_PLAN.md) selects centralized intl preamble first. |
| **65.9** | Done | F4 — add international-mode role preamble | Implemented in `buildAgentSystemPrompt`; route call sites unchanged. |
| **65.10** | Done | F4 — specialize Samanliknar intl tail | Agent-c no longer reinforces Norwegian role labels in international mode. |
| **65.12** | Done | F4 — prompt-leakage eval case | `pilar_eval_prompt_leakage_uk_en_012` protects the preamble behavior. |
| **65.7 / later** | Deferred | F8 — raise Rapportør `max_tokens` to 8 000+ | Only if Rapportør truncation is observed in real runs. |

---

## 4. What this audit explicitly does NOT recommend

- **Do not refactor the six route files into a shared "agent runner" abstraction.** Each route legitimately needs different shape (Tolkar runs before run_id exists; Rapportør has cache + tillit; Samanliknar reads two upstreams; Kontrollør has hard-block clamp). The variance is essential, not accidental.
- **Do not add a base-class or middleware layer for "common Anthropic config".** Tempting, but it would force premature unification before we know what actually needs to vary (model per agent? Temperature per agent? Thinking budget per agent?). Today the answer is "all of those vary" — exactly the case where abstraction harms.
- **Do not move system prompts into JSON/YAML files.** They are dense Norwegian engineering text with embedded examples. The tooling (search, diff, review) works better when prompts live as `const SYSTEM_PROMPT = \`...\`` in the route they belong to.

---

## 5. Keeping this audit honest

- If a sprint lands or re-opens one of F1–F8, update §2 and §3 in the same sprint. Add commit SHA when available.
- If a new agent route is added, extend the matrix in §1.
- If `PIPELINE_MODEL` is renamed or its purpose changes ([lib/models.ts](../../lib/models.ts)), F2's wording needs an update.
- If the language-leakage risk in F4 escalates (e.g. a user-reported case where Norwegian role-labels appear in English output), promote F4 to high priority.
- If the matrix shows an agent regressing on `recordStepMetric`, `recordStepMessage`, `maxRetries`, or `PIPELINE_MODEL`, that is a hardening regression and should block the PR.

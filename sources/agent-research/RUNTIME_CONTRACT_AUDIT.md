# PILAR Runtime Contract Audit

**Sprint:** 60.0
**Status:** Read-only audit; no code or schema changes.
**Purpose:** Map the typed payload contracts the runtime already enforces against the seven canonical PILAR agents, so future sprints do not introduce parallel agent-contract JSON files that duplicate (or contradict) what the code already says.

This audit is the truth-source for one question: **before adding any new agent-contract artifact, what contract does the runtime already have?**

For the runtime **dataflow** (who calls who, which DB tables get written, where risk lives) the existing source-of-truth is [PILAR_PIPELINE_DATAFLOW.md](../codebase/PILAR_PIPELINE_DATAFLOW.md). This audit deliberately does not duplicate that. The two docs answer different questions.

---

## 1. The five truthful runtime files

| File | What it pins | Lines |
|---|---|---|
| [lib/runrecord.ts](../../lib/runrecord.ts) | `RunRecord` shape (one full pipeline run as joined from seven tables) and `StepMetric`. Per-agent `jsonb` columns are typed `unknown` on purpose — see §3. | 1–61 |
| [lib/result/types.ts](../../lib/result/types.ts) | Typed agent outputs: `CalculationResult` (A/B), `ComparisonResult` (Samanliknar), `ControllerDecision` (Kontrollør). Also UI-derived `Profile`/`KontrollorChip`. | 1–126 |
| [lib/report/report-model.ts](../../lib/report/report-model.ts) | `ReportModel` shape v0.1 plus `REPORT_DISCLAIMER` per display language. This is the Rapportør output contract for web/PDF/DOCX. | 1–144 |
| [lib/check/controller-hard-block.ts](../../lib/check/controller-hard-block.ts) | Deterministic post-Kontrollør clamp: NA-deviations / Tolkar motstrid / load-combination structure forces `decision_status → uncertain`, regardless of what the LLM returned. | 1–92 |
| [qa/grade.ts](../../qa/grade.ts) | QA grading rubric (`KORREKT / KLASSIFISERINGSFEIL / TRYGT_FEIL / FARLEG_FEIL`) and port logic (`Port 1 ≥ 80% pass`, `Port 2 = 0 FARLEG_FEIL`). Pure functions, no LLM. | 1–313 |

---

## 2. Contracts per agent

The canonical roster (from [AGENTS.md](../../AGENTS.md):7–13) is seven agents. Six are runtime; one (Research & Agent Strategy) is a documentation/strategy role with no in-app runtime.

### 1. Tolkar (Input Agent)

- **Runtime payload key:** `RunRecord.tolkar` ([lib/runrecord.ts:52](../../lib/runrecord.ts)).
- **Typed shape:** `unknown` by design (see §3).
- **Field actually read by grader:** `tolkar.input_status` ∈ `{klar, delvis_klar, mangelfull, uklart, avvist}` ([qa/grade.ts:97–100](../../qa/grade.ts)).
- **Hard-block coupling:** Tolkar `motstrid` count feeds `HardBlockCounts.motstrid` ([lib/check/controller-hard-block.ts:33](../../lib/check/controller-hard-block.ts)). If non-zero, Kontrollør cannot approve.
- **DB tables:** `requests`, `input_reviews` (see dataflow doc step 1).

### 2. Konstruktør A / 3. Konstruktør B (Engineer A/B)

- **Runtime payload keys:** `RunRecord.konstruktor_a`, `RunRecord.konstruktor_b` ([lib/runrecord.ts:53–54](../../lib/runrecord.ts)).
- **Typed shape (UI-side):** `CalculationResult` ([lib/result/types.ts:19–36](../../lib/result/types.ts)) — fixed fields: `short_conclusion`, `assumptions[]`, `calculation_steps[]`, `results` (record), optional `result_roles`, `limitations[]`, `warnings[]`, `confidence ∈ {high, medium, low}`.
- **Fields read by grader:** `structured_output.results[*]` via fuzzy key match ([qa/grade.ts:76–94](../../qa/grade.ts)). Grader normalises keys (lowercase, strip `_ . ,`) so fasit `Ed` can match runtime `Ed_dim`.
- **DB table:** `agent_outputs` (two rows per run_id, one per constructor).

### 4. Samanliknar (Comparator)

- **Runtime payload key:** `RunRecord.samanliknar` ([lib/runrecord.ts:55](../../lib/runrecord.ts)).
- **Typed shape (UI-side):** `ComparisonResult` ([lib/result/types.ts:55–80](../../lib/result/types.ts)) — fixed `match_status ∈ {match, minor_differences, significant_differences, critical_disagreement}`, `numeric_differences[]`, `method_differences[]`, `assumption_differences[]`, `internal_consistency_issues.{agent_a, agent_b}`, `recommended_status ∈ {approved_preliminary, uncertain, rejected_needs_review}`, optional `unpaired_keys.{only_a, only_b}` (deterministic, set by the route — not the LLM, see comment lines 70–79).
- **DB table:** `comparisons`.

### 5. Kontrollør (Controller)

- **Runtime payload key:** `RunRecord.kontrollor` ([lib/runrecord.ts:56](../../lib/runrecord.ts)).
- **Typed shape (UI-side):** `ControllerDecision` ([lib/result/types.ts:83–92](../../lib/result/types.ts)) — `decision_status ∈ {approved, approved_with_warnings, uncertain, rejected}`, `risk_level ∈ {low, medium, high}`, `reason`, `user_message`, `blocked_outputs[]`, `allowed_outputs[]`, `manual_review_required`, `controller_notes`.
- **Layer 2 enforcement:** [lib/check/controller-hard-block.ts](../../lib/check/controller-hard-block.ts). If `naDeviations > 0 || motstrid > 0 || loadCombo > 0` and the LLM returned an approving status, the deterministic clamp rewrites it to `uncertain` with `manual_review_required = true`, lifts `risk_level` low→medium, and prepends `[KODE-OVERSTYRING]` to `controller_notes` (lines 62–92). This is **code-enforced, not prompt-enforced**.
- **Field read by grader:** `kontrollor.decision_status` ([qa/grade.ts:103–106](../../qa/grade.ts)). A flagging verdict (`uncertain`/`rejected`) turns an out-of-tolerance result from `FARLEG_FEIL` into `TRYGT_FEIL`.
- **DB tables:** `controller_decisions` (insert), `calculation_runs` (status update).

### 6. Rapportør (Reporter)

- **Runtime payload key:** `RunRecord.rapportor` ([lib/runrecord.ts:57](../../lib/runrecord.ts)).
- **Output contract:** `ReportModel` v0.1 ([lib/report/report-model.ts:113–125](../../lib/report/report-model.ts)) with `meta.schemaVersion === "report_model_v0.1"`. Fixed sub-shapes: `meta`, `cover`, `keyResults[]`, `summary`, `interpretation`, `calculation`, `assessment`, `control`, `trust`, `conclusion`, `disclaimer`. Validation result type `ReportValidationResult` already exists for the renderer side.
- **Locale-tied disclaimer:** `REPORT_DISCLAIMER` is a typed `Record<PilarDisplayLanguage, string>` for `nb`/`nn`/`en` ([lib/report/report-model.ts:140–144](../../lib/report/report-model.ts)). The Report QA missing-disclaimer fixture validator checks that the rendered report body contains the right one.
- **Cache risk (P1, not addressed here):** `agent-e` cache key does not include `prompt_version` — see [PILAR_PIPELINE_DATAFLOW.md:145–148](../codebase/PILAR_PIPELINE_DATAFLOW.md).
- **DB table:** `reports` (insert/update).

### 7. Research & Agent Strategy Agent

- **Runtime payload:** none. This is not a pipeline runtime agent.
- **Typed contract:** none, by design. The role is documentation-only (topic registry + opportunity memos), governed by `npm run research:check` and the topic-registry/memo validators.
- **Truth-source:** [sources/agent-research/topics/topic-registry.json](topics/topic-registry.json) and memos under [sources/agent-research/memos/](memos/).

---

## 3. Why per-agent `jsonb` is typed `unknown` (load-bearing)

[lib/runrecord.ts:7–13](../../lib/runrecord.ts) states the rule explicitly: per-agent fields are `unknown` so a prompt-version change cannot silently propagate. Any consumer that needs a specific field must narrow it locally (parser/validator) so an upstream shape change breaks at the read site, not deep in a UI render.

This is the single most important constraint on any future agent-contract artifact. A new JSON schema that **tightens** `RunRecord.tolkar` from `unknown` to a fixed shape would defeat the design intent and re-introduce the silent-propagation bug. The runtime intentionally has two layers: a typed **outer envelope** (`RunRecord`, `RunType`, `StepMetric`) and an intentionally-untyped **agent payload** that downstream consumers narrow per use.

The UI-side typed shapes in [lib/result/types.ts](../../lib/result/types.ts) and [lib/report/report-model.ts](../../lib/report/report-model.ts) are exactly the narrowing layer the comment above describes. They live with their consumer, not with the agent.

---

## 4. Coverage of guardrails / observability

The Guardrails reason-code registry ([sources/guardrails/guardrail-reason-codes.json](../guardrails/guardrail-reason-codes.json)) and Observability event taxonomy ([sources/observability/observability-event-taxonomy.json](../observability/observability-event-taxonomy.json)) are not agent payload contracts. They are categorical registries that runtime code references by id. They are validated in `agent:all` but do not constrain agent output shapes. No overlap with this audit.

---

## 5. Findings

### F1 — No parallel JSON contracts exist for the six runtime agents.
A search of all `sources/**/*.json` files for agent payload keys (`tolkar`, `konstruktor_a/b`, `samanliknar`, `kontrollor`, `rapportor`, `input_status`, `decision_status`) returned only incidental references in `release-gates.json` and `observability-event-taxonomy.json`, both as example metadata. **No existing artifact duplicates the contracts mapped above.**

### F2 — The runtime contract is a two-layer design, not a single-schema design.
Outer envelope (`RunRecord`) is strictly typed; per-agent payloads are `unknown` and narrowed per consumer. A new "agent contract schema" that flattens this into one strict shape would regress the safety property described at [lib/runrecord.ts:7–13](../../lib/runrecord.ts).

### F3 — One non-obvious code-vs-prompt contract: the Controller hard-block.
[lib/check/controller-hard-block.ts](../../lib/check/controller-hard-block.ts) is the only place in the codebase that materially overrides an LLM decision. Any future "Kontrollør contract doc" must reference this file as the authoritative status-clamp rule, otherwise the doc will be wrong about what `decision_status` actually means at the read site.

### F4 — Agent 7 has no runtime contract, and that is correct.
The Research & Agent Strategy Agent is documentation/strategy, not a pipeline call. Inventing a payload contract for it would be category error.

### F5 — `PILAR_PIPELINE_DATAFLOW.md` covers flow; this audit covers shape.
The two are complementary. Future sprint work should reference whichever answers the question being asked:
- "When does X get written / which DB table?" → dataflow doc.
- "What field shape does X enforce / what does the grader read?" → this audit.

---

## 6. Recommendation for Sprint 60.1+

**Do not introduce new JSON agent-contract files.** The runtime already has typed contracts where it needs them (envelope + UI-side narrowing) and intentionally untyped contracts where it needs flexibility (per-agent jsonb).

If a future sprint identifies a real gap — e.g. a Tolkar `input_status` enum that lives only in a system prompt — the right shape is:

- **Option A (preferred):** add a small `lib/agents/<agent>-output.ts` parser that narrows the `unknown` payload at the consumer site and exports a tagged-union type. Single source of truth, code-enforced, breaks loudly on shape drift.
- **Option B:** if multiple consumers narrow the same field, lift the parser to a shared `lib/agents/` module — still code, still typed, still local to runtime.
- **Option C (only if needed by an external system):** generate a JSON schema **from** the TS types via a build step. Never hand-author a JSON schema that the runtime must conform to — that path produces two truths.

---

## 7. How to keep this audit honest

- If a new typed file is added under `lib/result/`, `lib/report/`, `lib/runrecord.ts`, `lib/check/`, or `qa/grade.ts`, update the table in §1 and the relevant agent entry in §2 in the same sprint.
- If a hand-authored JSON schema is ever added under `sources/` that claims to define an agent payload, re-evaluate F1 immediately — that is the failure mode this audit exists to prevent.
- If a new agent (eighth) is added to the canonical roster in [AGENTS.md](../../AGENTS.md), add a §2 subsection with its runtime key, typed shape file, and DB table.
- Do not extend this audit with prose explanations of *how the pipeline runs* — that belongs in [PILAR_PIPELINE_DATAFLOW.md](../codebase/PILAR_PIPELINE_DATAFLOW.md). Keep the two docs separated by question, not by topic.

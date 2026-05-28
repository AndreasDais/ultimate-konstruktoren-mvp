# G2 — Downstream Input Snapshot Audit (corrected)

**Sprint:** G2 verification
**Status:** Read-only audit. Corrects and refines gap G2 from [TRACE_SURFACE_AUDIT.md §3](TRACE_SURFACE_AUDIT.md).
**Purpose:** Verify what the trace audit claimed about downstream agent inputs, identify the actual gap structure, and recommend closure options.

---

## 1. What the trace audit originally said

> **G2 — Downstream input payloads not snapshotted**
> `agent_outputs.input_payload` only covers Konstruktør A/B. The downstream agents (Samanliknar, Kontrollør, Rapportør) read their input from prior DB tables on each call.

**That description is partially wrong.** Two of three downstream agents actually receive their input *inline* from the client, not re-queried from the DB. The real gap is more subtle than "downstream re-queries can drift".

---

## 2. What each agent actually does — verified from route code

| Agent | Input source | Verified at |
|---|---|---|
| Tolkar (input-agent) | Request body: `{ raw_text, ... }` | [app/api/input-agent/route.ts](../../app/api/input-agent/route.ts) |
| Konstruktør A | Request body: `{ run_id, input_review, locale, engineering_context }`. Then writes `agent_outputs.input_payload` as explicit snapshot of what it received. | [app/api/agent-a/route.ts](../../app/api/agent-a/route.ts) |
| Konstruktør B | Same shape as A. Also writes `agent_outputs.input_payload`. | [app/api/agent-b/route.ts](../../app/api/agent-b/route.ts) |
| Samanliknar (agent-c) | **Inline from client:** `{ run_id, agent_a_output, agent_b_output, locale, engineering_context }` ([agent-c/route.ts:136](../../app/api/agent-c/route.ts)). Does NOT re-query agent_outputs. | line 136 |
| Kontrollør (agent-d) | **Inline from client:** `{ run_id, agent_a_output, comparison_result, locale, ... }` ([agent-d/route.ts:233](../../app/api/agent-d/route.ts)). Does NOT re-query. | lines 231–242 |
| Rapportør (agent-e) | **Re-queries everything** via `fetchUpstreamData(run_id)` ([agent-e/route.ts:194](../../app/api/agent-e/route.ts)): calculation_runs, input_reviews, agent_outputs ×2, comparisons, controller_decisions, reports. | line 194 |

**Corrections to the original G2:**

- Samanliknar and Kontrollør do NOT re-query the DB. They receive their upstream data inline in their request body. The client orchestrator (app/page.tsx) passes through what A/B/Samanliknar produced.
- Only Rapportør re-queries.

---

## 3. The actual gap

Two related gaps fall out of the verification:

### 3.1 Inline-input gap (Samanliknar, Kontrollør)

What Samanliknar and Kontrollør actually saw at call time is not stored anywhere. The client passed `agent_a_output` and `agent_b_output` (or `comparison_result`) inline, the route ran with it, and only the *output* was written to `comparisons` / `controller_decisions`. The route's input shape was constructed on the wire from prior responses.

For replay, we'd have to **reconstruct** what was passed inline by re-reading `agent_outputs` / `comparisons` by `run_id`. That works **if** the upstream tables have stable one-row-per-step semantics. They don't (see §3.2).

### 3.2 No UNIQUE on (run_id, …) for four pipeline tables

Verified from [supabase/migrations/20260527000000_pilar_core_pipeline.sql](../../supabase/migrations/20260527000000_pilar_core_pipeline.sql):

| Table | UNIQUE on run_id (or request_id)? |
|---|---|
| `input_reviews` | ❌ no |
| `agent_outputs` | ❌ no (PK on id only; FK on run_id) |
| `comparisons` | ❌ no |
| `controller_decisions` | ❌ no |
| `reports` | ✅ `reports_run_id_key` |

Only `reports` is constrained. Every other pipeline output table can in principle have multiple rows per run.

Today no code path inserts duplicates — there's no "retry agent X" feature, and `app/page.tsx` orchestrates each step exactly once per run. But:

- The [runrecord VIEW](../../db/runrecord.sql) header explicitly notes: *"skulle agent_outputs ha fleire enn éi rad per agent_name per run (re-køyring av eitt steg), vil joinen multiplisere rader."*
- If a retry feature is added later, duplicates can occur, and any replay that re-queries upstream will read **ambiguous** data ("which agent_outputs row do I use?").

This is a **structural reproducibility risk**, not a current bug.

### 3.3 Rapportør sees this risk acutely

Because Rapportør re-queries 5 tables on every call ([fetchUpstreamData](../../app/api/agent-e/route.ts)), any duplicate row anywhere in the chain changes what it reads. The agent-e response is then sensitive to upstream insertion timing in a way that isn't visible from the trace.

---

## 4. Replay-reconstruction risk per agent (revised)

| Agent | Input snapshot quality |
|---|---|
| Tolkar | Safe — `requests.raw_text` (PK uuid, no replacement) |
| Konstruktør A | **Safe** — `agent_outputs.input_payload` stores exact input as-sent |
| Konstruktør B | **Safe** — same |
| Samanliknar | **Reconstructable today, fragile** — must re-read agent_outputs (no UNIQUE) and recompute the inline payload shape |
| Kontrollør | **Reconstructable today, fragile** — same plus comparisons (no UNIQUE) |
| Rapportør | **Reconstructable today, fragile** — re-queries five tables; four of them lack UNIQUE on the join key |

"Today" means "while no code path produces duplicates in those tables." That's the load-bearing assumption.

---

## 5. Closure options

Three viable directions. None should be implemented before a replay-harness (sprint 64.4) demonstrates it actually needs them.

### Option A — Add UNIQUE constraints retroactively

Add `unique (run_id)` to `comparisons` and `controller_decisions`, and `unique (run_id, agent_name)` to `agent_outputs`. Locks in the current "one row per step" invariant at the DB level.

**Pros:** strongest guarantee with minimal app changes; matches the reports pattern.
**Cons:** any future retry mechanism becomes a schema change. Not reversible without losing the guarantee.

### Option B — Add `input_payload` to comparisons + controller_decisions

Mirrors what `agent_outputs.input_payload` does for A/B. Stores the exact inline payload the route received as a snapshot.

**Pros:** replay reads the snapshot directly, ignores duplicates in upstream tables.
**Cons:** doubles the storage for these payloads (already implicit in upstream agent_outputs). Two-truth risk if the inline payload differs from what the upstream actually wrote.

### Option C — Defer, document the assumption

The current "no duplicates because no retry feature exists" invariant is real and likely to hold. Document it in the policy layer (extend [REPLAY_DETERMINISM_POLICY.md](../codebase/REPLAY_DETERMINISM_POLICY.md)) and only act when an actual reproducibility incident exposes the fragility.

**Pros:** zero work, no premature schema changes.
**Cons:** when a retry feature lands, replay reliability degrades silently until someone re-discovers this audit.

### Recommendation

**Option C with a tightening trigger.** Don't change schema or storage today. But explicitly note in [REPLAY_DETERMINISM_POLICY.md](../codebase/REPLAY_DETERMINISM_POLICY.md) that:

- Replay assumes each pipeline output table has exactly one row per run.
- Any feature that violates this (agent-step retry, idempotent re-invocation, etc.) MUST simultaneously land Option A or Option B.

This keeps the system simple now and creates a clear handoff for the future feature.

---

## 6. What this audit explicitly does NOT do

- Does not propose schema changes today. The current invariant is good enough.
- Does not add `input_payload` columns to comparisons / controller_decisions. Doubles storage without a concrete replay-harness need.
- Does not change agent-c / agent-d to re-query the DB. The inline pattern is fine — it actually avoids the duplicate-row ambiguity for c/d on the read path (Rapportør is the one stuck with it).
- Does not modify [TRACE_SURFACE_AUDIT.md](TRACE_SURFACE_AUDIT.md) in place. Future readers should arrive at this audit when they read G2 — handled by the cross-reference added in §1.

---

## 7. Keeping this audit honest

- If a UNIQUE constraint is added to any pipeline output table, this audit's risk profile changes — re-check §3.2 and §4.
- If agent-c, agent-d, or agent-e changes its input source (inline ↔ re-query), the matrix in §2 must be updated.
- If a "retry agent X" feature is introduced without UNIQUE constraints or input_payload snapshots, §5 Option A or B becomes a blocker for that PR.
- If a replay-harness produces ambiguous results traceable to duplicate rows, this audit was right and Option A should land immediately.

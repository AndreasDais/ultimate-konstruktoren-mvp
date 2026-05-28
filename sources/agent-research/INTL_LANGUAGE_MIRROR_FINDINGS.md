# Intl language-mirror + controller_notes findings — handoff to Codex

**Source:** full 10-scenario intl sweep (`scripts/run-intl-tests.mjs`), 2026-05-28.
**Author:** UI/Landing track — these are observations on Runtime-lane files (agent-c/d), surfaced as a handoff per `LANES.md`. Not fixed by this track.
**Extends:** [AGENT_ROUTE_AUDIT.md](AGENT_ROUTE_AUDIT.md) F4 (role-label leakage) — F4 is mitigated, but the same sweep exposed two adjacent gaps.

**Context:** persistence (8/8 full) and verdict logic (verdicts track A/B disagreement: critical→rejected, significant→uncertain, minor→approved_with_warnings) were verified SOLID. The two issues below are language/prose only. Each run is queryable via `GET /api/runs/[id]`.

---

## F-lang-1 — intl language mirror is inconsistent for non-English input

**Design intent** (intl-test-plan-10.md + locale notes): engineering prose mirrors the user's input language; role labels stay English. Observed per-agent prose language:

| Run | Input lang | Konstruktør A | Konstruktør B | Samanliknar (agent-c) | Kontrollør (agent-d) |
|---|---|---|---|---|---|
| `41977bfe` (T5) | French | French ✅ | French ✅ | **English** ❌ | **English** ❌ |
| `42e09b7f` (T6) | German | **Norwegian** ❌ | German ✅ | **English** ❌ | German (+ "ikkje" in user_message) |

**Certain:** agent-a/b broadly mirror the user's language; agent-c/d do **not** reliably mirror, and the pattern differs run-to-run (T6's Konstruktør A even emitted Norwegian). Invisible on English-input tests (T1–T3, T7, T9) — only non-English input exposes it.

**Hypothesis (Codex to confirm against current code):** the English intl user-message **tail** added to agent-c (65.10) and agent-d (65.11) — the last text the model sees — overrides the "respond in the user's language" preamble from `lib/engineering-context/agent.ts`. agent-a/b have no such English tail, so they still follow the preamble and mirror correctly.

**Suggested direction:** make the agent-c/d intl tail reassert "respond in the user's input language; keep role labels (Engineer A/B, Comparator, Controller) in English" rather than being wholly English. Add a non-English-input eval case (French or German) so this is guarded — current eval coverage is English-only here, which is why it slipped.

---

## F-lang-2 — `controller_notes` still leaks internal mechanism terms

**Observed:** `controller_notes` contains internal scaffolding vocabulary — "NA-GRUNNLAG", "FORHÅNDSKONTROLL", "PIPELINE OVERRIDE" — in 5 of 8 full runs: `1d87421c` (T2, US/AISC), `42e09b7f` (T6, EU), `3db5dd46` (T7, UK), `2048f299` (T9, UK), `bf5afa9a` (T10, CA). Example (T2): *"…no FORHÅNDSKONTROLL block, no NA factor set applicable under the US/AISC…"*.

**Certain:** the user-facing `user_message` is **clean** across all runs (English, no mechanism terms) — except T6's stray Norwegian "ikkje". So 65.11b closed the `user_message`/`reason` path but **not** `controller_notes`.

**Open question (blocks severity call):** is `controller_notes` rendered to end users, or internal-only diagnostic? The 65.11b no-echo rule and the original forensics canary both treat `controller_notes` as a leak surface — but if it is internal-only, the Norwegian scaffolding there is by-design and only the term hygiene matters.

**Suggested direction:** if user-facing → extend the 65.11b no-echo rule (neutral terminology, no mechanism names) to `controller_notes`. If internal-only → document it as such so future audits don't re-flag it.

---

## Run-id index (this sweep)

`7de31fdb` T1 · `1d87421c` T2 · `f46830f9` T3 · `41977bfe` T5 · `42e09b7f` T6 · `3db5dd46` T7 · `2048f299` T9 · `bf5afa9a` T10. (T4, T8 = correct Tolkar guardrail stops, no run.)

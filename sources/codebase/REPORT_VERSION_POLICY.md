# Report Version Policy

**Sprint:** 61.0b
**Status:** Pinned policy. No code changes — documents existing enforcement and forbids a foreseeable wrong-direction fix.

---

## 1. The invariant

> **Each `(run_id, prompt_version)` tuple maps to at most one report row. Once written, a report row is immutable except for derived metadata (currently `tillit_score` / `tillit_breakdown`).**

This is the load-bearing rule. Every other decision in this doc flows from it.

---

## 2. Why reports are immutable

A PILAR report is a quasi-legal engineering artifact. The disclaimer in [lib/report/report-model.ts:140–144](../../lib/report/report-model.ts) literally states the content must be *"verified by a qualified professional ... before use in real projects."* That sentence is only meaningful if the content being verified does not silently change between the engineer's review and a colleague's review of the same `document_id`.

In practice this means:

- An engineer screenshots `PILAR-6F94EB1C` and pastes it into a project archive. Six months later, the same URL must still resolve to the same prose.
- A reviewer cites a specific paragraph from a PILAR report in a meeting. The cited text must still be there.
- If the prose did silently change, the disclaimer becomes false — the verification was performed on a different document than the one now served.

Engineering documentation has a stricter integrity requirement than typical generative-AI output. We hold ourselves to it.

---

## 3. How the invariant is currently enforced

Three independent mechanisms already enforce immutability today. None of them were originally introduced as "the immutability mechanism" — but together they are the policy.

### 3.1 Database: `reports_run_id_key UNIQUE (run_id)`

Verified 2026-05-28 against Supabase production schema. The `reports` table has:

```sql
constraint reports_run_id_key unique (run_id)
```

This makes a second `INSERT` with the same `run_id` fail with a unique-violation error. There is no way to "overwrite" a report via INSERT.

### 3.2 Application: INSERT-only, never UPSERT

[app/api/agent-e/route.ts](../../app/api/agent-e/route.ts) writes the report via `.insert(...)` in two paths (SSE and JSON modes). It never uses `.upsert(...)` or `.update(...)` on prose fields. The only `.update(...)` call on `reports` rewrites *derived* fields (`tillit_score`, `tillit_breakdown`) when the score formula version changes — see §6.

The cache lookup in `handleCache` returns the existing row as-is when one exists, with no regeneration. This is intentional: stale-but-stable beats fresh-but-changed for engineering documentation.

### 3.3 Observability: 61.0a stale-cache detection

Sprint 61.0a added a `console.warn` + `step_metrics` row with `step_name: "rapportor_cache_stale"` whenever a cached report's `prompt_version` differs from the current `PROMPT_VERSION`. This gives operators visibility into how many existing reports are bound to older prompts, without changing what users see.

The three together form the policy: the DB *prevents* overwriting, the app *never tries to* overwrite, and observability *reports* when staleness is served.

---

## 4. The wrong-direction fix this policy forbids

A natural-sounding fix to the "stale prose" observation in [PILAR_PIPELINE_DATAFLOW.md:145–148](PILAR_PIPELINE_DATAFLOW.md) is: *"When the cached report's `prompt_version` doesn't match the current `PROMPT_VERSION`, regenerate via LLM and upsert."*

**Do not do this.** It violates the invariant in §1. Concretely:

- It silently changes `PILAR-6F94EB1C` between visits, breaking the disclaimer's verification premise (§2).
- It re-runs the LLM for every old report anyone re-opens — at 227 reports in production today, that is a bounded but unnecessary cost spike with no user-requested trigger.
- It hides the prompt-version drift instead of surfacing it — the 61.0a metric becomes useless because no report is ever observably stale for long.
- It introduces a path where a previously *approved-with-warnings* prose can become *approved* prose (or vice versa) without any explicit decision being recorded — a silent change to safety-relevant text.

If a future contributor proposes this fix, point them at this section.

---

## 5. What regen would look like, *if* it is ever genuinely needed

We do not currently have a use case that justifies report regeneration. If one emerges (e.g. a critical prompt fix that *must* propagate to existing reports, or an explicit user-requested "refresh this report"), the implementation must preserve §1. That requires schema + API changes, not a tweak to `handleCache`.

Two viable schema designs, neither implemented today:

### Option A — `superseded_at` column on `reports`

- Add `superseded_at timestamp with time zone null` to `reports`.
- Drop `reports_run_id_key UNIQUE (run_id)`.
- Add `unique (run_id) where superseded_at is null` (partial unique index) — at most one *active* report per run, but unlimited historical ones.
- Cache lookup: `where run_id = $1 and superseded_at is null`.
- Regen path: `update reports set superseded_at = now() where run_id = $1 and superseded_at is null`, then `insert ...`.
- Trade-off: simple, keeps everything in one table, history queryable via `where superseded_at is not null`.
- Cost: every consumer that joins on `reports.run_id` must be reviewed for the new active-vs-historical distinction. The `runrecord` view ([db/runrecord.sql:73](../../db/runrecord.sql)) is one such consumer.

### Option B — separate `report_versions` table

- Keep `reports` as the "active report per run" pointer (or remove it).
- New `report_versions` table with `(run_id, prompt_version, created_at, ...)`, no UNIQUE on `run_id`.
- Cache lookup: `select * from report_versions where run_id = $1 order by created_at desc limit 1`.
- Regen path: just insert a new row.
- Trade-off: cleaner separation of "current" vs "history". Two tables to manage, two write paths to keep consistent.

### Recommendation when the decision actually needs to be made

Prefer **Option A** unless we discover a consumer that genuinely needs to render the full history (in which case Option B becomes worth the second table). Option A is reversible — Option B is not.

But again: **do not pre-build either.** No regen mechanism should ship without a concrete user-facing trigger that requires it. The 61.0a observability is what tells us whether that trigger is ever needed.

---

## 6. Why `tillit_score` / `tillit_breakdown` regen is allowed

[app/api/agent-e/route.ts:181–185](../../app/api/agent-e/route.ts) checks if `tillit_breakdown.formula_version !== FORMULA_VERSION` and, if so, recomputes the score and `.update(...)`s the existing row. This may look like a contradiction with §1 — it isn't.

`tillit_score` is *derived metadata*, not engineering prose. It is computed deterministically by code from upstream signals (input review, comparison, controller decision) — no LLM involved. Recomputing it does not change what an engineer is verifying; it only updates a confidence indicator the renderer overlays. The prose fields (`executive_summary`, `technical_assessment`, `conclusion`) are never touched.

The rule: **prose is immutable; pure-function-derived metadata may be recomputed when its formula version changes.** If a future field straddles this line (e.g. derived but rendered as prose), it gets the prose treatment, not the metadata treatment.

---

## 7. Open questions parked here

These do not block any current sprint. They are written down so they are not re-discovered from scratch.

1. **Bulk-stale reporting.** Should there be a periodic job that summarises "N reports stale against current prompt_version X"? Useful for ops, not needed yet. Owner: undecided.
2. **Display-time staleness hint.** If a viewer is shown a stale-prompt report, should the UI show a passive "Generated with prompt v0.2 (current v0.3)" footer? Could be implemented without any schema change — purely a renderer addition keyed off existing `reports.prompt_version`. Owner: undecided.
3. **Document-id collision space.** `document_id` is also UNIQUE. If regen via Option A or B ever ships, the new row needs a new `document_id`; the policy for generating the new id (suffix, fresh random, etc.) is not yet decided.

---

## 8. Keeping this policy honest

- If a `.upsert(...)` call appears anywhere in `app/api/agent-e/route.ts`, this policy has been violated — revert or re-open §4.
- If `reports_run_id_key UNIQUE (run_id)` is ever dropped without simultaneously adding the partial-unique-index from §5 Option A (or migrating to Option B), this policy has been violated — block the migration.
- If a new prose-bearing column is added to `reports` and an `.update(...)` writes to it, this policy has been violated unless the column is explicitly classified as derived metadata in §6.
- If a sprint reverses the 61.0a observability without replacing it, this policy has been weakened — block the change.

Cross-references:
- Invariant context: [RUNTIME_CONTRACT_AUDIT.md](../agent-research/RUNTIME_CONTRACT_AUDIT.md) (Rapportør §2.6)
- Dataflow context: [PILAR_PIPELINE_DATAFLOW.md](PILAR_PIPELINE_DATAFLOW.md) (Steg 6, risk item §2)
- Observability implementation: [app/api/agent-e/route.ts](../../app/api/agent-e/route.ts) `handleCache`

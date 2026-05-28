-- ============================================================================
-- calculation_runs.engineering_context — persist UI profile per run (sprint D)
-- ----------------------------------------------------------------------------
-- Closes a trace gap discovered during sprint C (British-test forensics):
-- engineering_context (region, standards.family, units, notation, language
-- policy) is sent inline to every agent route at request time, but it is
-- NEVER persisted with a run-link. Today the closest proxy is
-- calculation_runs.display_language, which:
--   - is null for runs before 20260527000001
--   - cannot distinguish UK NA / AISC / generic Eurocode
--   - cannot answer "all UK NA runs in May" or "AISC vs UK NA pass rate"
--
-- engineering_context_events (20260524 migration) logs every UI selection
-- but has no run_id/request_id linkage — it is a UI-events log, not a
-- per-run snapshot.
--
-- This column is the per-run snapshot. Nullable: production runs without
-- the field stay null. Conditional insert in init-run (sprint D app-side)
-- means the column is only populated when the client sends the payload,
-- so the migration is safe to apply before or after the app-side change.
--
-- Freeform jsonb — the canonical shape lives in lib/engineering-context/
-- types.ts. Consumers must narrow defensively, same as other per-agent
-- jsonb fields (see RUNTIME_CONTRACT_AUDIT.md §3).
--
-- Idempotent.
-- ============================================================================

alter table public.calculation_runs
  add column if not exists engineering_context jsonb;

-- Indexes on common forensics filters. Partial — most rows will be null
-- until clients are updated and historical runs naturally roll out of the
-- window. GIN on the whole jsonb is overkill; the two extracted paths
-- (country_code, standards.family) cover the queries B6/B7 need.

create index if not exists idx_calc_runs_engctx_country
  on public.calculation_runs ((engineering_context->'region'->>'countryCode'))
  where engineering_context is not null;

create index if not exists idx_calc_runs_engctx_family
  on public.calculation_runs ((engineering_context->'standards'->>'family'))
  where engineering_context is not null;

-- Force PostgREST to reload schema cache immediately. Without this, the
-- column won't be visible to init-run for up to a minute.
notify pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (paste into Supabase SQL Editor to fully reverse):
-- ============================================================================
-- drop index if exists public.idx_calc_runs_engctx_family;
-- drop index if exists public.idx_calc_runs_engctx_country;
-- alter table public.calculation_runs drop column if exists engineering_context;

-- ============================================================================
-- calculation_runs.eval_case_id  —  link runs to eval cases (sprint 64.2)
-- ----------------------------------------------------------------------------
-- Closes gap G4 from sources/agent-research/TRACE_SURFACE_AUDIT.md: today we
-- can store run_type ('live' | 'golden' | 'discovery') but cannot say WHICH
-- eval case triggered a non-live run. Without this column, querying "show me
-- all runs of case X across prompt versions" requires external bookkeeping.
--
-- Nullable: production / live runs have eval_case_id = null. Only runs
-- triggered by an eval-runner populate it. Freeform text — the eval case
-- registry lives in qa/evals/pilar-core-evals.jsonl, not in a DB enum, so
-- the column intentionally has no CHECK constraint or foreign key.
--
-- Partial index: only non-null values are indexed (most rows are live runs
-- with eval_case_id = null, so a full index would mostly contain nulls).
--
-- Idempotent: safe to re-run.
-- ============================================================================

alter table public.calculation_runs
  add column if not exists eval_case_id text;

create index if not exists idx_calc_runs_eval_case_id
  on public.calculation_runs (eval_case_id)
  where eval_case_id is not null;

-- Tving PostgREST til å laste skjema-cache på nytt straks. Utan dette kan
-- det ta opp til eit minutt før init-run-ruta kan bruke den nye kolonnen.
notify pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (paste into Supabase SQL Editor to fully reverse):
-- ============================================================================
-- drop index if exists public.idx_calc_runs_eval_case_id;
-- alter table public.calculation_runs drop column if exists eval_case_id;

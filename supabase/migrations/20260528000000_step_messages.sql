-- ============================================================================
-- step_messages  —  raw LLM envelope storage for replay (sprint 64.1)
-- ----------------------------------------------------------------------------
-- One row per agent SDK call. Stores the FULL SDK response object plus the
-- call parameters used (model, temperature, max_tokens). This is gap G1 from
-- sources/agent-research/TRACE_SURFACE_AUDIT.md: without the raw envelope we
-- cannot verify deterministic replay against the same prompt + model.
--
-- step_metrics (db/step_metrics.sql) captures the SUMMARY — tokens, latency,
-- stop_reason. step_messages captures the FULL response payload, so a future
-- replay harness can re-invoke the same call with the same parameters and
-- diff the output. The two tables are written together by the app; either
-- one missing is handled soft-fail.
--
-- Idempotent: every CREATE is IF NOT EXISTS, RLS/grants are safe to re-run.
-- ============================================================================

create table if not exists public.step_messages (
  id              uuid primary key default gen_random_uuid(),

  -- Correlation. Same shape as step_metrics — Tolkar runs before
  -- calculation_runs exists, so request_id is the fallback. CHECK below
  -- guarantees at least one is set.
  run_id          uuid references public.calculation_runs(id) on delete cascade,
  request_id      uuid references public.requests(id) on delete cascade,

  -- Which agent step. Same enum-shape as step_metrics.step_name.
  step_name       text not null,

  -- Call parameters AS SENT (not echoed from response). These are required
  -- for byte-identical replay and are NOT in step_metrics today.
  model           text not null,
  prompt_version  text,
  temperature     numeric,
  max_tokens      integer,

  -- Full SDK response envelope. Stored as jsonb so we never lose
  -- forward-compat with future Anthropic SDK fields (citations, server-side
  -- tool use, new content block types). Consumers must narrow defensively
  -- — see RUNTIME_CONTRACT_AUDIT.md §3 for why jsonb is the right shape here.
  raw_message     jsonb not null,

  created_at      timestamptz not null default now(),

  constraint step_messages_has_correlation
    check (run_id is not null or request_id is not null)
);

create index if not exists step_messages_run_id_idx
  on public.step_messages (run_id);
create index if not exists step_messages_request_id_idx
  on public.step_messages (request_id);
create index if not exists step_messages_step_name_idx
  on public.step_messages (step_name);

-- ---- Row Level Security ----------------------------------------------------
-- Same posture as step_metrics: RLS on, no client policy => service_role only.
alter table public.step_messages enable row level security;

-- ---- Grants (Supabase-standard) --------------------------------------------
grant all on table public.step_messages to anon, authenticated, service_role;

-- ============================================================================
-- ROLLBACK (paste into Supabase SQL Editor to fully reverse this migration):
-- ============================================================================
-- alter table public.step_messages disable row level security;
-- drop index if exists public.step_messages_step_name_idx;
-- drop index if exists public.step_messages_request_id_idx;
-- drop index if exists public.step_messages_run_id_idx;
-- drop table if exists public.step_messages;

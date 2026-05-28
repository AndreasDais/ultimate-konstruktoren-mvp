-- ============================================================================
-- trace_events VIEW  —  chronological pipeline event stream (sprint 64.3)
-- ----------------------------------------------------------------------------
-- Closes gap G3 from sources/agent-research/TRACE_SURFACE_AUDIT.md: today
-- trace data is split across seven tables (requests, input_reviews,
-- calculation_runs, agent_outputs, comparisons, controller_decisions, reports)
-- plus step_metrics and step_messages. Reading a run's history requires
-- joining all of them by hand.
--
-- This VIEW flattens them into one chronological stream:
--   event_id    — primary key (the source row's id)
--   event_type  — discriminator (e.g. 'tolkar_completed', 'run_started')
--   run_id      — correlation; null for pre-run events (request_created,
--                 tolkar_completed)
--   request_id  — correlation
--   event_at    — sort key
--   payload     — event-specific jsonb (consumers narrow defensively)
--
-- Typical queries:
--   select * from trace_events where run_id = '...' order by event_at;
--   select * from trace_events where event_type = 'rapportor_completed'
--     and event_at > now() - interval '24 hours';
--
-- DESIGN NOTES
-- - calculation_runs produces TWO events: run_started (at started_at) and
--   run_completed (at completed_at if not null). Aborted/orphaned runs only
--   have run_started.
-- - step_messages.raw_message is intentionally omitted from payload (too
--   large). Consumers can join on step_messages.id when they need the
--   full envelope.
-- - The view is plain (not materialised). If query perf becomes a concern,
--   promote to a materialised view in a later sprint.
--
-- PREREQUISITES
-- Both of these migrations must be applied first:
--   20260528000000_step_messages.sql (sprint 64.1)
--   20260528000001_eval_case_id.sql  (sprint 64.2)
-- If either is missing this CREATE VIEW will fail with
-- "relation/column does not exist".
--
-- Idempotent: CREATE OR REPLACE.
-- ============================================================================

create or replace view public.trace_events as
  -- requests submitted
  select
    req.id                       as event_id,
    'request_created'::text      as event_type,
    null::uuid                   as run_id,
    req.id                       as request_id,
    req.created_at               as event_at,
    jsonb_build_object(
      'raw_text_length', length(req.raw_text),
      'input_channel', req.input_channel,
      'user_mode', req.user_mode,
      'user_id', req.user_id
    )                            as payload
  from public.requests req

  union all

  -- Tolkar finished classifying input
  select
    ir.id,
    'tolkar_completed'::text,
    null::uuid,
    ir.request_id,
    ir.created_at,
    jsonb_build_object(
      'input_status', ir.input_status,
      'calculation_type', ir.calculation_type,
      'discipline', ir.discipline,
      'prompt_version', ir.prompt_version,
      'confidence', ir.confidence
    )
  from public.input_reviews ir

  union all

  -- calculation_runs row inserted (run_started)
  select
    cr.id,
    'run_started'::text,
    cr.id,
    cr.request_id,
    coalesce(cr.started_at, cr.completed_at),
    jsonb_build_object(
      'run_type', cr.run_type,
      'run_status', cr.run_status,
      'calculation_type', cr.calculation_type,
      'agent_package_version', cr.agent_package_version,
      'eval_case_id', cr.eval_case_id,
      'display_language', cr.display_language
    )
  from public.calculation_runs cr
  where cr.started_at is not null

  union all

  -- calculation_runs.completed_at set (run_completed). Only emits when
  -- completed_at is not null, so orphaned/aborted runs without completion
  -- timestamp don't produce a phantom completion event.
  select
    cr.id,
    'run_completed'::text,
    cr.id,
    cr.request_id,
    cr.completed_at,
    jsonb_build_object(
      'run_status', cr.run_status
    )
  from public.calculation_runs cr
  where cr.completed_at is not null

  union all

  -- Konstruktør A/B outputs. agent_name distinguishes; emit a per-agent
  -- event_type so a query "where event_type = 'konstruktor_a_completed'"
  -- works without extra filtering.
  select
    ao.id,
    case
      when ao.agent_name = 'agent_a' then 'konstruktor_a_completed'
      when ao.agent_name = 'agent_b' then 'konstruktor_b_completed'
      else 'agent_output_completed'
    end::text,
    ao.run_id,
    null::uuid,
    ao.created_at,
    jsonb_build_object(
      'agent_name', ao.agent_name,
      'prompt_version', ao.prompt_version,
      'confidence', ao.confidence,
      'has_warnings', case
        when ao.warnings is null then false
        when jsonb_typeof(ao.warnings) = 'array' and jsonb_array_length(ao.warnings) > 0 then true
        else false
      end
    )
  from public.agent_outputs ao

  union all

  -- Samanliknar output
  select
    cmp.id,
    'samanliknar_completed'::text,
    cmp.run_id,
    null::uuid,
    cmp.created_at,
    jsonb_build_object(
      'match_status', cmp.match_status,
      'recommended_status', cmp.recommended_status,
      'prompt_version', cmp.prompt_version
    )
  from public.comparisons cmp

  union all

  -- Kontrollør decision
  select
    cd.id,
    'kontrollor_completed'::text,
    cd.run_id,
    null::uuid,
    cd.created_at,
    jsonb_build_object(
      'decision_status', cd.decision_status,
      'risk_level', cd.risk_level,
      'manual_review_required', cd.manual_review_required,
      'prompt_version', cd.prompt_version
    )
  from public.controller_decisions cd

  union all

  -- Rapportør output
  select
    rep.id,
    'rapportor_completed'::text,
    rep.run_id,
    null::uuid,
    rep.created_at,
    jsonb_build_object(
      'document_id', rep.document_id,
      'prompt_version', rep.prompt_version,
      'tillit_score', rep.tillit_score
    )
  from public.reports rep

  union all

  -- step_metrics — per-agent telemetry summary
  select
    sm.id,
    'step_metric_recorded'::text,
    sm.run_id,
    sm.request_id,
    sm.created_at,
    jsonb_build_object(
      'step_name', sm.step_name,
      'model', sm.model,
      'prompt_version', sm.prompt_version,
      'input_tokens', sm.input_tokens,
      'output_tokens', sm.output_tokens,
      'cache_read_tokens', sm.cache_read_tokens,
      'cache_creation_tokens', sm.cache_creation_tokens,
      'latency_ms', sm.latency_ms,
      'stop_reason', sm.stop_reason,
      'ok', sm.ok
    )
  from public.step_metrics sm

  union all

  -- step_messages — raw envelope metadata (raw_message itself omitted,
  -- consumers join step_messages by id when they need the full payload)
  select
    smsg.id,
    'step_message_recorded'::text,
    smsg.run_id,
    smsg.request_id,
    smsg.created_at,
    jsonb_build_object(
      'step_name', smsg.step_name,
      'model', smsg.model,
      'prompt_version', smsg.prompt_version,
      'temperature', smsg.temperature,
      'max_tokens', smsg.max_tokens
    )
  from public.step_messages smsg;

-- ---- Grants (Supabase-standard) --------------------------------------------
grant select on public.trace_events to anon, authenticated, service_role;

-- Tving PostgREST til å laste skjema-cache på nytt straks.
notify pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (paste into Supabase SQL Editor to fully reverse):
-- ============================================================================
-- drop view if exists public.trace_events;

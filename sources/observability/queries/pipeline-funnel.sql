-- =============================================================================
-- PILAR pipeline funnel queries
-- =============================================================================
-- Use case: observe pipeline activity via the trace_events VIEW.
-- Each query is independent — run them separately in Supabase SQL Editor.
--
-- Prerequisites: 64.3 trace_events VIEW must be applied. If it isn't, every
-- query below will fail with "relation trace_events does not exist".
-- See supabase/migrations/20260528000002_trace_events_view.sql.
--
-- Helper: `npm run pipeline:funnel` prints + copies this file to clipboard,
-- so you can paste directly into Supabase. See scripts/show-pipeline-funnel.mjs.
-- =============================================================================


-- =============================================================================
-- Q1 — Funnel counts: how many events per type, lifetime
-- =============================================================================
-- Use case: "What's the overall pipeline activity?"
-- Insight: drop-offs between consecutive stages = filter/loss rate at each gate.

select event_type, count(*) as n
from trace_events
group by event_type
order by n desc;


-- =============================================================================
-- Q2 — Drop-off percentages relative to run_started
-- =============================================================================
-- Use case: "Of runs that started, what fraction reached each stage?"
-- Insight: the gap between run_started and run_completed is the orphan rate;
--   the gap between kontrollor_completed and rapportor_completed reflects the
--   report-cache effect (Rapportør only fires on cache miss / first render).

with started as (
  select count(*)::numeric as n from trace_events where event_type = 'run_started'
)
select
  event_type,
  count(*) as n,
  round(100.0 * count(*) / nullif((select n from started), 0), 1) as pct_of_started
from trace_events
where event_type in (
  'run_started',
  'konstruktor_a_completed',
  'konstruktor_b_completed',
  'samanliknar_completed',
  'kontrollor_completed',
  'rapportor_completed',
  'run_completed'
)
group by event_type
order by
  case event_type
    when 'run_started' then 1
    when 'konstruktor_a_completed' then 2
    when 'konstruktor_b_completed' then 3
    when 'samanliknar_completed' then 4
    when 'kontrollor_completed' then 5
    when 'rapportor_completed' then 6
    when 'run_completed' then 7
  end;


-- =============================================================================
-- Q3 — Last 24h activity per event_type
-- =============================================================================
-- Use case: "What's been happening recently? Any new spikes?"

select event_type, count(*) as n_24h
from trace_events
where event_at > now() - interval '24 hours'
group by event_type
order by n_24h desc;


-- =============================================================================
-- Q4 — Prompt version distribution per step
-- =============================================================================
-- Use case: "Which prompt versions are producing events? Has a deploy
--   propagated?" Multiple prompt_versions for the same step name = either old
--   runs being served from cache, or a recent deploy producing fresh runs
--   alongside historical ones.

select
  event_type,
  payload->>'prompt_version' as prompt_version,
  count(*) as n
from trace_events
where event_type in (
  'tolkar_completed',
  'konstruktor_a_completed',
  'konstruktor_b_completed',
  'samanliknar_completed',
  'kontrollor_completed',
  'rapportor_completed',
  'step_metric_recorded',
  'step_message_recorded'
)
and payload->>'prompt_version' is not null
group by event_type, payload->>'prompt_version'
order by event_type, n desc;


-- =============================================================================
-- Q5 — Orphaned runs (started but never completed)
-- =============================================================================
-- Use case: "Which runs started but never reached run_completed?"
-- Insight: 62.0 sweeper marks runs older than 30 min as 'aborted'; this query
--   catches anything still hanging plus any the sweeper missed. Stable count
--   over time = sweeper working. Growing count = something is bypassing it.

select
  cr.id as run_id,
  cr.started_at,
  cr.run_status,
  cr.run_type,
  cr.calculation_type
from calculation_runs cr
where cr.completed_at is null
and cr.started_at < now() - interval '30 minutes'
order by cr.started_at desc
limit 50;

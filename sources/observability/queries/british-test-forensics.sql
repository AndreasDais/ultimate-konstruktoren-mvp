-- =============================================================================
-- British / international-test forensics
-- =============================================================================
-- Use case: figure out what's actually happening in recent UK NA / non-Norwegian
-- runs. Useful when test reports show errors, missing data, or unexpected
-- behaviour and we need to attribute the cause (Anthropic API quota, prompt
-- regression, infra blip, agent-step failure).
--
-- Each query is independent. Paste into Supabase SQL Editor.
--
-- Prerequisites: 64.1 (step_messages), 64.2 (calculation_runs.eval_case_id),
-- 64.3 (trace_events VIEW) all applied. All confirmed deployed 2026-05-28.
--
-- Helper: `npm run forensics:british` prints + copies this file to clipboard.
-- =============================================================================


-- =============================================================================
-- B1 — Per-stage event counts, last 24h
-- =============================================================================
-- What it tells you: where the pipeline is dropping today. If
-- konstruktor_b_completed << konstruktor_a_completed, B is failing. If
-- samanliknar_completed << kontrollor_completed expectation, Samanliknar is
-- failing (likely Anthropic API quota, given recent observations).

select event_type, count(*) as n_24h
from trace_events
where event_at > now() - interval '24 hours'
group by event_type
order by n_24h desc;


-- =============================================================================
-- B2 — Runs that started but never completed (orphans + Samanliknar drop-outs)
-- =============================================================================
-- A: every started run since N days
-- B: which stage events are present per run
-- C: rows missing the expected late events = where drop-out happened

with recent_runs as (
  select id, started_at, run_status, run_type, calculation_type
  from calculation_runs
  where started_at > now() - interval '3 days'
),
stages as (
  select
    cr.id as run_id,
    cr.started_at,
    cr.run_status,
    exists(select 1 from trace_events where run_id = cr.id and event_type = 'konstruktor_a_completed') as a_done,
    exists(select 1 from trace_events where run_id = cr.id and event_type = 'konstruktor_b_completed') as b_done,
    exists(select 1 from trace_events where run_id = cr.id and event_type = 'samanliknar_completed') as samanliknar_done,
    exists(select 1 from trace_events where run_id = cr.id and event_type = 'kontrollor_completed') as kontrollor_done,
    exists(select 1 from trace_events where run_id = cr.id and event_type = 'rapportor_completed') as rapportor_done,
    exists(select 1 from trace_events where run_id = cr.id and event_type = 'run_completed') as run_done
  from recent_runs cr
)
select
  run_id,
  started_at,
  run_status,
  case
    when not a_done then 'A_FAILED'
    when not b_done then 'B_FAILED'
    when not samanliknar_done then 'SAMANLIKNAR_FAILED'
    when not kontrollor_done then 'KONTROLLOR_FAILED'
    when not rapportor_done then 'RAPPORTOR_PENDING_OR_FAILED'
    when not run_done then 'INCOMPLETE_AFTER_ALL_AGENTS'
    else 'OK'
  end as drop_stage,
  a_done, b_done, samanliknar_done, kontrollor_done, rapportor_done, run_done
from stages
order by started_at desc;


-- =============================================================================
-- B3 — step_metrics failures (ok = false) in last 3 days
-- =============================================================================
-- step_metrics rows with ok = false are the closest signal we have for "this
-- step had a hard problem". stop_reason = 'max_tokens' = truncation. Other
-- non-end_turn stop_reasons or unexpected null model = transient API issues.
--
-- Note: Anthropic 400 quota errors typically don't reach this table because
-- the route throws BEFORE recordStepMetric runs. So an absence here while
-- the trace shows missing events points at "route threw early" — usually
-- API quota or auth failure.

select
  sm.run_id,
  sm.request_id,
  sm.step_name,
  sm.model,
  sm.prompt_version,
  sm.stop_reason,
  sm.ok,
  sm.latency_ms,
  sm.input_tokens,
  sm.output_tokens,
  sm.created_at
from step_metrics sm
where sm.created_at > now() - interval '3 days'
  and (sm.ok = false or sm.stop_reason in ('max_tokens', 'tool_use', 'pause_turn'))
order by sm.created_at desc
limit 50;


-- =============================================================================
-- B4 — Recent runs missing step_metrics for a given step
-- =============================================================================
-- If samanliknar_completed didn't fire AND step_metrics has no samanliknar
-- row, the agent-c route threw before recordStepMetric ran. That's the
-- signature of "Anthropic 400 quota" or "auth failed at SDK construction".
--
-- Compare counts: runs reaching kontrollor vs runs with samanliknar step_metric.
-- Gap = silent failures before recordStepMetric.

select
  count(distinct cr.id) filter (where ka.run_id is not null) as runs_with_a_metric,
  count(distinct cr.id) filter (where kb.run_id is not null) as runs_with_b_metric,
  count(distinct cr.id) filter (where sm_c.run_id is not null) as runs_with_samanliknar_metric,
  count(distinct cr.id) filter (where sm_d.run_id is not null) as runs_with_kontrollor_metric,
  count(distinct cr.id) filter (where sm_e.run_id is not null) as runs_with_rapportor_metric,
  count(distinct cr.id) as runs_total
from calculation_runs cr
left join step_metrics ka on ka.run_id = cr.id and ka.step_name = 'konstruktor_a'
left join step_metrics kb on kb.run_id = cr.id and kb.step_name = 'konstruktor_b'
left join step_metrics sm_c on sm_c.run_id = cr.id and sm_c.step_name = 'samanliknar'
left join step_metrics sm_d on sm_d.run_id = cr.id and sm_d.step_name = 'kontrollor'
left join step_metrics sm_e on sm_e.run_id = cr.id and sm_e.step_name = 'rapportor'
where cr.started_at > now() - interval '3 days';


-- =============================================================================
-- B5 — Prompt version drift per agent, last 3 days
-- =============================================================================
-- Are recent runs using the prompt versions we expect? Multiple versions for
-- the same step in the same window = mid-deploy or cache-stale. Single
-- version = clean deploy.

select
  step_name,
  prompt_version,
  count(*) as n,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from step_metrics
where created_at > now() - interval '3 days'
group by step_name, prompt_version
order by step_name, n desc;


-- =============================================================================
-- B6 — Recent international runs (display_language = 'en')
-- =============================================================================
-- The British / international cohort. Note: engineering_context (region,
-- standards profile) is sent inline to agent routes at request time and is
-- NOT persisted on requests or calculation_runs. The only reliable DB proxy
-- for "international mode" is calculation_runs.display_language = 'en'.
--
-- engineering_context_events table (20260524 migration) logs UI selections
-- but has no run_id/request_id linkage, so it cannot be joined per run.
-- That gap is documented; for now display_language is the cohort scope.

select
  cr.id as run_id,
  cr.started_at,
  cr.run_status,
  cr.display_language,
  cr.eval_case_id,
  cr.calculation_type,
  cr.run_type
from calculation_runs cr
where cr.started_at > now() - interval '7 days'
  and cr.display_language = 'en'
order by cr.started_at desc
limit 50;


-- =============================================================================
-- B7 — Drop-stage rate, international cohort, last 7 days
-- =============================================================================
-- Combine B2 + B6: of international runs only, where are they failing?
-- This is the headline number for "is the British test broken right now".
--
-- samanliknar_success_pct_of_b is the key metric: of runs that reached B,
-- how many got a Samanliknar event? Sub-100 = drop-out at Samanliknar
-- (likely Anthropic API quota when failure clusters in time).

with intl_runs as (
  select cr.id, cr.started_at
  from calculation_runs cr
  where cr.started_at > now() - interval '7 days'
    and cr.display_language = 'en'
),
stages as (
  select
    r.id as run_id,
    exists(select 1 from trace_events where run_id = r.id and event_type = 'konstruktor_a_completed') as a_done,
    exists(select 1 from trace_events where run_id = r.id and event_type = 'konstruktor_b_completed') as b_done,
    exists(select 1 from trace_events where run_id = r.id and event_type = 'samanliknar_completed') as samanliknar_done,
    exists(select 1 from trace_events where run_id = r.id and event_type = 'kontrollor_completed') as kontrollor_done,
    exists(select 1 from trace_events where run_id = r.id and event_type = 'rapportor_completed') as rapportor_done
  from intl_runs r
)
select
  count(*) as intl_runs_total,
  count(*) filter (where a_done) as reached_a,
  count(*) filter (where b_done) as reached_b,
  count(*) filter (where samanliknar_done) as reached_samanliknar,
  count(*) filter (where kontrollor_done) as reached_kontrollor,
  count(*) filter (where rapportor_done) as reached_rapportor,
  round(100.0 * count(*) filter (where samanliknar_done) / nullif(count(*) filter (where b_done), 0), 1) as samanliknar_success_pct_of_b
from stages;

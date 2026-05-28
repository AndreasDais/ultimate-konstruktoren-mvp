-- =============================================================================
-- 10 international tests — post-run analysis bundle
-- =============================================================================
-- Companion to intl-test-plan-10.md. Run each query independently after
-- completing the 10 test scenarios.
--
-- Default time window: last 3 hours (assumes you ran all 10 within that
-- window). Adjust the `interval` literals if your test session was longer.
--
-- Helper: `npm run intl:test:analysis` prints + copies this file to clipboard.
-- =============================================================================


-- =============================================================================
-- Q1 — Status per recent run (one row per test)
-- =============================================================================
-- Headline view: for each recent run, what was the final verdict and
-- comparator outcome? Cross-reference against intl-test-plan-10.md hypotheses.

select
  cr.id as run_id,
  cr.started_at,
  cr.completed_at,
  cr.run_status,
  cr.calculation_type,
  cr.display_language,
  cr.eval_case_id,
  cmp.match_status,
  cmp.recommended_status,
  cd.decision_status,
  cd.risk_level,
  cd.manual_review_required
from calculation_runs cr
left join comparisons cmp on cmp.run_id = cr.id
left join controller_decisions cd on cd.run_id = cr.id
where cr.started_at > now() - interval '3 hours'
order by cr.started_at desc;


-- =============================================================================
-- Q2 — Language-leakage check (Norwegian terms in English-locale output)
-- =============================================================================
-- Catches role-label leakage (Konstruktør / Samanliknar / etc.) AND
-- nynorsk/bokmål markers (brukar, ikkje, kjem, berekning) in any agent output
-- belonging to a run that was supposed to be English.
--
-- Expected: ZERO rows. Any row here is a 65.10/65.11-class regression.

select
  cr.id as run_id,
  ao.agent_name,
  substring(ao.output_text, 1, 300) as snippet,
  cr.started_at
from calculation_runs cr
join agent_outputs ao on ao.run_id = cr.id
where cr.display_language = 'en'
  and cr.started_at > now() - interval '3 hours'
  and ao.output_text ~* '(Konstruktør|Samanliknar|Kontrollør|Rapportør|\mbrukar\M|\mikkje\M|\mkjem\M|\mberekning\M|NA-GRUNNLAG|norsk\s+NA)'
order by cr.started_at desc;


-- =============================================================================
-- Q3 — Controller prose leakage of internal mechanism names
-- =============================================================================
-- Sprint 65.11b: Controller must not echo "NA-CONTEXT OVERRIDE",
-- "PIPELINE OVERRIDE", or other internal mechanism names into user-facing
-- prose. This query catches such leakage in any recent decision.
--
-- Expected: ZERO rows.

select
  cd.run_id,
  cd.decision_status,
  substring(cd.controller_notes, 1, 300) as notes_snippet,
  substring(cd.reason, 1, 300) as reason_snippet,
  substring(cd.user_message, 1, 300) as user_message_snippet,
  cd.created_at
from controller_decisions cd
join calculation_runs cr on cr.id = cd.run_id
where cr.started_at > now() - interval '3 hours'
  and (
    cd.controller_notes ~* '(NA-CONTEXT|PIPELINE OVERRIDE|Norwegian NA|no Norwegian comparison)'
    or cd.reason ~* '(NA-CONTEXT|PIPELINE OVERRIDE|Norwegian NA|no Norwegian comparison)'
    or cd.user_message ~* '(NA-CONTEXT|PIPELINE OVERRIDE|Norwegian NA|no Norwegian comparison)'
  )
order by cd.created_at desc;


-- =============================================================================
-- Q4 — Token usage per step per test
-- =============================================================================
-- Useful for spotting which agent calls are token-heavy and whether any hit
-- max_tokens. stop_reason = 'max_tokens' on agent-a/b implies the engineer
-- truncated mid-JSON — Sprint 65.5 jsonrepair fallback recovers most cases
-- but high token usage is a leading indicator.

select
  sm.run_id,
  sm.step_name,
  sm.model,
  sm.prompt_version,
  sm.input_tokens,
  sm.output_tokens,
  sm.cache_read_tokens,
  sm.latency_ms,
  sm.stop_reason,
  sm.ok
from step_metrics sm
join calculation_runs cr on cr.id = sm.run_id
where cr.started_at > now() - interval '3 hours'
order by sm.run_id, sm.created_at;


-- =============================================================================
-- Q5 — Comparator match_status + Controller decision_status distribution
-- =============================================================================
-- Aggregate: of the 10 tests, how many landed in each match_status /
-- decision_status bucket? Compare against the per-test hypothesis table
-- in intl-test-plan-10.md.

with recent as (
  select cr.id
  from calculation_runs cr
  where cr.started_at > now() - interval '3 hours'
)
select
  coalesce(cmp.match_status, '(no comparator)') as match_status,
  coalesce(cd.decision_status, '(no controller)') as decision_status,
  count(*) as n
from recent r
left join comparisons cmp on cmp.run_id = r.id
left join controller_decisions cd on cd.run_id = r.id
group by 1, 2
order by n desc;


-- =============================================================================
-- Q6 — Deep-dive on one specific run
-- =============================================================================
-- Edit the run_id literal below. Returns full chronological trace +
-- raw_message payloads. Use when a specific test's output looks wrong.

with target as (
  select '<PASTE_RUN_ID_HERE>'::uuid as run_id
)
select
  te.event_at,
  te.event_type,
  te.payload
from trace_events te, target
where te.run_id = target.run_id
   or te.request_id = (
        select cr.request_id from calculation_runs cr
        where cr.id = target.run_id
      )
order by te.event_at;


-- =============================================================================
-- Q7 — Drop-stage matrix (intl-only, last 3 hours)
-- =============================================================================
-- Did any of the 10 tests fail to reach a downstream stage? Most should
-- complete fully (run_done = true) except Test 8 (Tolkar guardrail —
-- pipeline halts intentionally).

with intl as (
  select cr.id, cr.started_at
  from calculation_runs cr
  where cr.started_at > now() - interval '3 hours'
    and cr.display_language = 'en'
),
stages as (
  select
    i.id as run_id,
    i.started_at,
    exists(select 1 from trace_events where run_id = i.id and event_type = 'konstruktor_a_completed') as a_done,
    exists(select 1 from trace_events where run_id = i.id and event_type = 'konstruktor_b_completed') as b_done,
    exists(select 1 from trace_events where run_id = i.id and event_type = 'samanliknar_completed') as samanliknar_done,
    exists(select 1 from trace_events where run_id = i.id and event_type = 'kontrollor_completed') as kontrollor_done,
    exists(select 1 from trace_events where run_id = i.id and event_type = 'rapportor_completed') as rapportor_done,
    exists(select 1 from trace_events where run_id = i.id and event_type = 'run_completed') as run_done
  from intl i
)
select
  run_id,
  started_at,
  case
    when not a_done then 'STOPPED_BEFORE_A (Tolkar guardrail or quota)'
    when not b_done then 'B_FAILED'
    when not samanliknar_done then 'SAMANLIKNAR_FAILED'
    when not kontrollor_done then 'KONTROLLOR_FAILED'
    when not run_done then 'INCOMPLETE_AFTER_ALL_AGENTS'
    when not rapportor_done then 'RAPPORTOR_PENDING (open report page to trigger)'
    else 'OK'
  end as outcome,
  a_done, b_done, samanliknar_done, kontrollor_done, rapportor_done, run_done
from stages
order by started_at desc;

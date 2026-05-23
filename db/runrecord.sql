-- ============================================================
-- runrecord  —  run_type-kolonne + konsolidert RunRecord-VIEW
--               (Fase 1, steg 1c)
-- ============================================================
-- Repoet har ingen migrasjonar — køyr denne SQL-en i Supabase SQL Editor.
--
-- FØRESETNAD: db/step_metrics.sql (steg 1b) MÅ vere køyrd først —
-- VIEW-en under refererer step_metrics-tabellen.
--
-- Del 1: run_type på calculation_runs — lèt test-agenten skilje
--        golden-køyringar frå live-trafikk og discovery.
-- Del 2: VIEW runrecord — éi rad per køyring, samlar dei sju
--        pipeline-tabellane + step_metrics til RunRecord-forma som
--        test-agenten (steg 4) les.
-- ============================================================

-- ---- Del 1: run_type ----------------------------------------
-- Additivt. Default 'live' => alle eksisterande rader blir gyldige.
alter table calculation_runs
  add column if not exists run_type text not null default 'live';

-- CHECK i eige steg så ALTER er idempotent (DROP + ADD).
alter table calculation_runs
  drop constraint if exists calculation_runs_run_type_check;
alter table calculation_runs
  add constraint calculation_runs_run_type_check
  check (run_type in ('live', 'golden', 'discovery'));


-- ---- Del 2: RunRecord-VIEW ----------------------------------
-- to_jsonb(t.*) per tabell => VIEW-en bryt ikkje sjølv om de
-- seinare legg til kolonnar i kjeldetabellane.
-- Alle joins er LEFT JOIN: ein run midt i pipelinen gjev null-felt,
-- ikkje ei forsvunne rad.
create or replace view runrecord as
select
  cr.id                       as run_id,
  cr.run_type,
  cr.run_status,
  cr.calculation_type,
  cr.started_at,
  cr.completed_at,

  to_jsonb(req.*)             as request,
  to_jsonb(ir.*)              as tolkar,
  to_jsonb(aa.*)              as konstruktor_a,
  to_jsonb(ab.*)              as konstruktor_b,
  to_jsonb(cmp.*)             as samanliknar,
  to_jsonb(cd.*)              as kontrollor,
  to_jsonb(rep.*)             as rapportor,

  -- step_metrics: fleire rader per køyring => aggreger til array.
  -- coalesce sikrar tom array, ikkje null, når ingen metrikk finst.
  coalesce(
    (
      select jsonb_agg(to_jsonb(sm.*) order by sm.created_at)
      from step_metrics sm
      where sm.run_id = cr.id
         or sm.request_id = cr.request_id
    ),
    '[]'::jsonb
  )                           as steg_metrikkar

from calculation_runs cr
  left join requests        req on req.id  = cr.request_id
  -- Tolkar (input_reviews) er kopla via request_id, ikkje run_id.
  left join input_reviews   ir  on ir.request_id = cr.request_id
  -- agent_outputs har to rader per run — skil på agent_name.
  left join agent_outputs   aa  on aa.run_id = cr.id and aa.agent_name = 'agent_a'
  left join agent_outputs   ab  on ab.run_id = cr.id and ab.agent_name = 'agent_b'
  left join comparisons     cmp on cmp.run_id = cr.id
  left join controller_decisions cd on cd.run_id = cr.id
  left join reports         rep on rep.run_id = cr.id;

-- Merk: skulle agent_outputs ha fleire enn éi rad per agent_name per run
-- (re-køyring av eitt steg), vil joinen multiplisere rader. Pipelinen
-- skriv i dag éin gong per steg per run, så det er ikkje eit problem no —
-- men verdt å vite om steg-re-køyring blir innført seinare.

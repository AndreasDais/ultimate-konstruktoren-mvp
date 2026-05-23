-- ============================================================
-- step_metrics  —  steg-telemetri for agent-pipelinen (Fase 1, steg 1b)
-- ============================================================
-- Éi rad per agent-kall: modell, token-bruk, latens, stoppgrunn.
-- Matar StepRecord-delen av RunRecord (QA-spesifikasjonen).
--
-- Repoet har ingen migrasjonar — Supabase-skjemaet styrast i dashbordet.
-- Køyr denne SQL-en i Supabase SQL Editor for å opprette tabellen.
--
-- Korrelasjon: dei fleste stega har run_id. MEN Tolkar (input-agent)
-- køyrer FØR init-run opprettar calculation_runs — han har berre
-- request_id. Difor to nullbare korrelasjons-kolonnar; kvart steg
-- skriv den IDen det naturleg har. CHECK-en sikrar at minst éin er sett.
-- 1c sin RunRecord-VIEW joinar på begge.
-- ============================================================

create table if not exists step_metrics (
  id                      uuid primary key default gen_random_uuid(),

  -- Korrelasjon (nøyaktig éin er sett per rad — sjå CHECK under).
  run_id                  uuid references calculation_runs(id) on delete cascade,
  request_id              uuid references requests(id) on delete cascade,

  -- Kva steg: tolkar | konstruktor_a | konstruktor_b
  --           samanliknar | kontrollor | rapportor
  step_name               text not null,

  -- Modell + promptversjon som gav resultatet (reproduserbarheit).
  model                   text,
  prompt_version          text,

  -- Token-bruk frå SDK-en sin message.usage.
  input_tokens            integer,
  output_tokens           integer,
  cache_read_tokens       integer,
  cache_creation_tokens   integer,

  -- Veggklokke-latens for SDK-kallet (millisekund).
  latency_ms              integer,

  -- SDK stop_reason (end_turn, max_tokens, ...).
  stop_reason             text,

  -- false = steget vart truncert / problematisk (stop_reason = max_tokens).
  ok                      boolean not null default true,

  created_at              timestamptz not null default now(),

  constraint step_metrics_has_correlation
    check (run_id is not null or request_id is not null)
);

create index if not exists step_metrics_run_id_idx
  on step_metrics (run_id);
create index if not exists step_metrics_request_id_idx
  on step_metrics (request_id);

-- Merk: foreign keys føreset at calculation_runs(id) og requests(id)
-- finst. Skil skjemaet ditt seg, kan FK-linjene fjernast utan at resten
-- av tabellen blir påverka.

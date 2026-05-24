-- ============================================================
-- shadow_checks  —  live FARLEG-FEIL-proxy (QA-spec 9.4, Fase 1 steg 5)
-- ============================================================
-- Éi rad kvar gong ein deterministisk sjekk koeyrer i skuggen paa ei
-- ekte pipeline-koeyring. Sjekken re-reknar uavhengig; er han usamd med
-- det Pilar stempla godkjent, er rada ein FARLEG-FEIL-kandidat.
--
-- Dette er den einaste FARLEG-FEIL-detektoren som verkar paa live-data
-- (utan fasit). Den daglege agenten (steg 6) les rader der
-- er_farleg_feil_kandidat = true som suspected_farleg_feil.
--
-- Repoet har ingen migrasjonar — koeyr denne SQL-en i Supabase SQL Editor.
-- ============================================================

create table if not exists shadow_checks (
  id                      uuid primary key default gen_random_uuid(),

  run_id                  uuid references calculation_runs(id) on delete cascade,

  -- Kva deterministisk sjekk dette er. Per no berre
  -- "load_combination" (FIKS 2). Fleire check_id kan koma seinare.
  check_id                text not null,

  -- Fann sjekken eit avvik mot det konstruktoeren rapporterte?
  deviation_found         boolean not null,

  -- Verdiar ved avvik (null naar deviation_found = false).
  expected                numeric,   -- sjekken si uavhengige utrekning
  got                     numeric,   -- det konstruktoeren rapporterte
  agent                   text,      -- "A" | "B" — kven rapporterte got

  -- Pilar sitt endelege verdikt DA sjekken koeyrde (etter clamp).
  verdikt_da_sjekken_kjorte text,

  -- KJERNEFELTET: sann naar sjekken fann avvik OG verdiktet var
  -- approving. Daa er dette ein FARLEG-FEIL-kandidat — eit gale svar
  -- presentert som godkjent. Den daglege agenten triagerer desse.
  er_farleg_feil_kandidat boolean not null default false,

  created_at              timestamptz not null default now()
);

create index if not exists shadow_checks_run_id_idx
  on shadow_checks (run_id);

-- Eigen indeks paa kandidat-flagget — den daglege agenten spør nesten
-- alltid "vis meg dagens FARLEG-FEIL-kandidatar".
create index if not exists shadow_checks_kandidat_idx
  on shadow_checks (er_farleg_feil_kandidat, created_at)
  where er_farleg_feil_kandidat = true;

-- Merk: FK foereset calculation_runs(id). Skil skjemaet ditt seg, kan
-- FK-linja fjernast utan at resten av tabellen blir paaverka.

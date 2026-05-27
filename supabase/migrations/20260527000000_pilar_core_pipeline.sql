-- ============================================================================
-- PILAR — kjernepipeline-skjema (migrasjon-baseline)
-- ----------------------------------------------------------------------------
-- Reproduserer dei ti kjernetabellane som driv berekningspipelinen, og som
-- til no berre fanst i den live Supabase-databasen utan migrasjonsfil.
--
-- Idempotent: alle CREATE er IF NOT EXISTS, policy er drop-if-exists + create,
-- grant/enable-rls er trygt aa kalle fleire gonger. Filen kan difor koeyrast
-- baade mot ein frisk database og mot den eksisterande live-databasen.
--
-- Tabellar i avhengnads-rekkjefoelgje:
--   requests -> admins -> input_reviews -> calculation_runs ->
--   agent_outputs -> comparisons -> controller_decisions -> reports ->
--   error_reports -> manual_reviews
-- ============================================================================

-- ---- requests --------------------------------------------------------------
create table if not exists public.requests (
  id uuid not null default gen_random_uuid(),
  raw_text text not null,
  input_channel text default 'text'::text,
  user_mode text default 'student'::text,
  session_id text,
  created_at timestamptz default now(),
  user_id uuid,
  constraint requests_pkey primary key (id),
  constraint requests_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete set null
);
create index if not exists idx_requests_created
  on public.requests using btree (created_at desc);

-- ---- admins ----------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid not null,
  email text not null,
  created_at timestamptz not null default now(),
  constraint admins_pkey primary key (user_id),
  constraint admins_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade
);
create index if not exists idx_admins_email
  on public.admins using btree (email);

-- ---- input_reviews ---------------------------------------------------------
create table if not exists public.input_reviews (
  id uuid not null default gen_random_uuid(),
  request_id uuid not null,
  input_status text not null,
  calculation_type text,
  discipline text,
  extracted_inputs jsonb,
  missing_inputs jsonb,
  can_calculate jsonb,
  cannot_calculate jsonb,
  assumptions jsonb,
  interpretation_summary text,
  confidence numeric,
  prompt_version text default 'input_agent_v0.1'::text,
  created_at timestamptz default now(),
  constraint input_reviews_pkey primary key (id),
  constraint input_reviews_request_id_fkey foreign key (request_id)
    references public.requests (id) on delete cascade
);
create index if not exists idx_input_reviews_request
  on public.input_reviews using btree (request_id);

-- ---- calculation_runs ------------------------------------------------------
create table if not exists public.calculation_runs (
  id uuid not null default gen_random_uuid(),
  request_id uuid not null,
  input_review_id uuid,
  run_status text not null,
  calculation_type text,
  agent_package_version text default 'agents_v0.1'::text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  user_id uuid,
  run_type text not null default 'live'::text,
  constraint calculation_runs_pkey primary key (id),
  constraint calculation_runs_request_id_fkey foreign key (request_id)
    references public.requests (id) on delete cascade,
  constraint calculation_runs_input_review_id_fkey foreign key (input_review_id)
    references public.input_reviews (id) on delete set null,
  constraint calculation_runs_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete set null,
  constraint calculation_runs_run_type_check
    check (run_type = any (array['live'::text, 'golden'::text, 'discovery'::text]))
);
create index if not exists idx_calc_runs_request
  on public.calculation_runs using btree (request_id);
create index if not exists idx_calculation_runs_user_id
  on public.calculation_runs using btree (user_id) where (user_id is not null);

-- ---- agent_outputs ---------------------------------------------------------
create table if not exists public.agent_outputs (
  id uuid not null default gen_random_uuid(),
  run_id uuid not null,
  agent_name text not null,
  prompt_version text,
  input_payload jsonb,
  output_text text,
  structured_output jsonb,
  confidence text,
  warnings jsonb,
  created_at timestamptz default now(),
  constraint agent_outputs_pkey primary key (id),
  constraint agent_outputs_run_id_fkey foreign key (run_id)
    references public.calculation_runs (id) on delete cascade
);
create index if not exists idx_agent_outputs_run
  on public.agent_outputs using btree (run_id);

-- ---- comparisons -----------------------------------------------------------
create table if not exists public.comparisons (
  id uuid not null default gen_random_uuid(),
  run_id uuid not null,
  match_status text not null,
  numeric_differences jsonb,
  method_differences jsonb,
  assumption_differences jsonb,
  internal_consistency_issues jsonb,
  recommended_status text,
  summary text,
  prompt_version text,
  created_at timestamptz default now(),
  constraint comparisons_pkey primary key (id),
  constraint comparisons_run_id_fkey foreign key (run_id)
    references public.calculation_runs (id) on delete cascade
);
create index if not exists idx_comparisons_run
  on public.comparisons using btree (run_id);

-- ---- controller_decisions --------------------------------------------------
create table if not exists public.controller_decisions (
  id uuid not null default gen_random_uuid(),
  run_id uuid not null,
  decision_status text not null,
  risk_level text not null,
  reason text,
  user_message text,
  blocked_outputs jsonb default '[]'::jsonb,
  allowed_outputs jsonb default '[]'::jsonb,
  manual_review_required boolean not null default false,
  controller_notes text,
  prompt_version text,
  created_at timestamptz default now(),
  constraint controller_decisions_pkey primary key (id),
  constraint controller_decisions_run_id_fkey foreign key (run_id)
    references public.calculation_runs (id) on delete cascade
);
create index if not exists idx_controller_decisions_run_id
  on public.controller_decisions using btree (run_id);

-- ---- reports ---------------------------------------------------------------
create table if not exists public.reports (
  id uuid not null default gen_random_uuid(),
  run_id uuid not null,
  document_id text not null,
  executive_summary text,
  technical_assessment text,
  conclusion text,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  tillit_score integer,
  tillit_breakdown jsonb,
  constraint reports_pkey primary key (id),
  constraint reports_run_id_fkey foreign key (run_id)
    references public.calculation_runs (id) on delete cascade,
  constraint reports_document_id_key unique (document_id),
  constraint reports_run_id_key unique (run_id),
  constraint reports_tillit_score_check
    check ((tillit_score >= 0) and (tillit_score <= 100))
);
create index if not exists idx_reports_tillit_score
  on public.reports using btree (tillit_score desc);

-- ---- error_reports ---------------------------------------------------------
create table if not exists public.error_reports (
  id uuid not null default gen_random_uuid(),
  report_id uuid not null,
  user_id uuid,
  error_type text not null,
  selected_section text not null,
  severity_user text not null default 'medium'::text,
  user_comment text not null,
  status text not null default 'open'::text,
  created_at timestamptz not null default now(),
  error_types text[],
  constraint error_reports_pkey primary key (id),
  constraint error_reports_report_id_fkey foreign key (report_id)
    references public.reports (id) on delete cascade,
  constraint error_reports_severity_user_check
    check (severity_user = any (array['low'::text, 'medium'::text, 'high'::text])),
  constraint error_reports_error_type_check
    check (error_type = any (array['feil_talverdi'::text, 'feil_formel'::text,
      'feil_standardreferanse'::text, 'feil_eining'::text, 'feil_foresetnad'::text,
      'uklart_sprak'::text, 'manglande_kontroll'::text, 'anna'::text])),
  constraint error_reports_status_check
    check (status = any (array['open'::text, 'under_review'::text,
      'confirmed'::text, 'rejected'::text, 'fixed'::text]))
);
create index if not exists idx_error_reports_report_id
  on public.error_reports using btree (report_id);
create index if not exists idx_error_reports_status
  on public.error_reports using btree (status);
create index if not exists idx_error_reports_created_at
  on public.error_reports using btree (created_at desc);

-- ---- manual_reviews --------------------------------------------------------
create table if not exists public.manual_reviews (
  id uuid not null default gen_random_uuid(),
  related_type text not null,
  related_id uuid not null,
  reviewer_id uuid not null,
  decision text not null,
  notes text,
  action_taken text,
  created_at timestamptz not null default now(),
  constraint manual_reviews_pkey primary key (id),
  constraint manual_reviews_related_type_check
    check (related_type = any (array['error_report'::text, 'rejected_input'::text,
      'calculation_run'::text])),
  constraint manual_reviews_decision_check
    check (decision = any (array['confirmed'::text, 'rejected'::text,
      'partially_correct'::text, 'needs_more_test'::text, 'future_support'::text,
      'fixed'::text]))
);
create index if not exists idx_manual_reviews_related
  on public.manual_reviews using btree (related_type, related_id);
create index if not exists idx_manual_reviews_created_at
  on public.manual_reviews using btree (created_at desc);

-- ---- Row Level Security ----------------------------------------------------
alter table public.requests             enable row level security;
alter table public.admins               enable row level security;
alter table public.input_reviews        enable row level security;
alter table public.calculation_runs     enable row level security;
alter table public.agent_outputs        enable row level security;
alter table public.comparisons          enable row level security;
alter table public.controller_decisions enable row level security;
alter table public.reports              enable row level security;
alter table public.error_reports        enable row level security;
alter table public.manual_reviews       enable row level security;

-- Einaste klient-policy: innlogga brukar les eigne berekningar (/mine-dashbordet).
-- Dei ovrige tabellane har RLS paa utan policy => kun service_role (server) naar dei.
drop policy if exists "Innlogga brukar les eigne berekningar" on public.calculation_runs;
create policy "Innlogga brukar les eigne berekningar"
  on public.calculation_runs
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---- Grants (Supabase-standard) --------------------------------------------
-- RLS er den faktiske tilgangs-grensa; desse grant-ane er Supabase sine
-- standardrettar for public-skjemaet.
grant all on table public.requests             to anon, authenticated, service_role;
grant all on table public.admins               to anon, authenticated, service_role;
grant all on table public.input_reviews        to anon, authenticated, service_role;
grant all on table public.calculation_runs     to anon, authenticated, service_role;
grant all on table public.agent_outputs        to anon, authenticated, service_role;
grant all on table public.comparisons          to anon, authenticated, service_role;
grant all on table public.controller_decisions to anon, authenticated, service_role;
grant all on table public.reports              to anon, authenticated, service_role;
grant all on table public.error_reports        to anon, authenticated, service_role;
grant all on table public.manual_reviews       to anon, authenticated, service_role;

-- PILAR Sprint 23 — Intelligence database foundation
-- Køyr i Supabase SQL Editor eller som migrasjon.

create extension if not exists pgcrypto;

create table if not exists public.daily_intelligence_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  summary text not null,
  pipeline_findings jsonb not null default '[]'::jsonb,
  product_findings jsonb not null default '[]'::jsonb,
  cost_findings jsonb not null default '[]'::jsonb,
  marketing_findings jsonb not null default '[]'::jsonb,
  pricing_findings jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  proposed_actions jsonb not null default '[]'::jsonb,
  carryover_from_previous_day jsonb not null default '[]'::jsonb,
  risk_notes jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  source_window_start timestamptz,
  source_window_end timestamptz,
  previous_report_id uuid references public.daily_intelligence_reports(id) on delete set null,
  generated_by text not null default 'pilar_intelligence_v0.1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.improvement_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.daily_intelligence_reports(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in ('pipeline','product','cost','marketing','pricing','timing','risk')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  expected_impact text,
  effort text not null default 'medium' check (effort in ('small','medium','large')),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high')),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','planned','implemented','verified','deferred')),
  proposed_by_agent boolean not null default true,
  approved_by_user boolean not null default false,
  implemented_at timestamptz,
  result_summary text,
  user_feedback text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_learning_feedback (
  id uuid primary key default gen_random_uuid(),
  action_id uuid references public.improvement_actions(id) on delete cascade,
  feedback_type text not null default 'status_update',
  user_rating int check (user_rating is null or (user_rating >= 1 and user_rating <= 5)),
  user_comment text,
  actual_outcome text,
  should_repeat_pattern boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  metric_key text not null,
  metric_value numeric not null,
  dimension jsonb not null default '{}'::jsonb,
  source_table text,
  created_at timestamptz not null default now(),
  unique (snapshot_date, metric_key, source_table, dimension)
);

create index if not exists idx_daily_intelligence_reports_date
  on public.daily_intelligence_reports(report_date desc);

create index if not exists idx_improvement_actions_status_priority
  on public.improvement_actions(status, priority, created_at desc);

create index if not exists idx_improvement_actions_report_id
  on public.improvement_actions(report_id);

create index if not exists idx_daily_metrics_snapshots_date_key
  on public.daily_metrics_snapshots(snapshot_date desc, metric_key);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_daily_intelligence_reports_updated_at on public.daily_intelligence_reports;
create trigger set_daily_intelligence_reports_updated_at
before update on public.daily_intelligence_reports
for each row execute function public.set_updated_at();

drop trigger if exists set_improvement_actions_updated_at on public.improvement_actions;
create trigger set_improvement_actions_updated_at
before update on public.improvement_actions
for each row execute function public.set_updated_at();

-- RLS kan aktiverast seinare. MVP brukar service-role via interne admin-routes.
-- alter table public.daily_intelligence_reports enable row level security;
-- alter table public.improvement_actions enable row level security;
-- alter table public.agent_learning_feedback enable row level security;
-- alter table public.daily_metrics_snapshots enable row level security;

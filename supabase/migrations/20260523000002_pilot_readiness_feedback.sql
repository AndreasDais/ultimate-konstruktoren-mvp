-- PILAR Sprint 30: Pilot readiness + feedback foundation
-- Safe to run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid null,
  rating text not null check (rating in ('useful', 'partly', 'not_useful')),
  trust_level text not null check (trust_level in ('trusted', 'partly_trusted', 'not_trusted', 'not_sure')),
  use_case text not null default 'other',
  comment text null,
  wants_followup boolean not null default false,
  report_url text null,
  source text not null default 'report',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pilot_feedback_created_at_idx on public.pilot_feedback (created_at desc);
create index if not exists pilot_feedback_run_id_idx on public.pilot_feedback (run_id);
create index if not exists pilot_feedback_rating_idx on public.pilot_feedback (rating);
create index if not exists pilot_feedback_use_case_idx on public.pilot_feedback (use_case);

alter table public.pilot_feedback enable row level security;

-- The app writes through service role from server routes. No public insert policy is required.
-- Add explicit read denial for anon/authenticated unless later opened intentionally.
drop policy if exists "pilot_feedback_no_public_read" on public.pilot_feedback;
create policy "pilot_feedback_no_public_read"
  on public.pilot_feedback
  for select
  to anon, authenticated
  using (false);

comment on table public.pilot_feedback is 'Pilot feedback from report users. Used by admin dashboards and intelligence agent.';
comment on column public.pilot_feedback.rating is 'useful, partly, or not_useful.';
comment on column public.pilot_feedback.trust_level is 'How much the tester trusted the output.';

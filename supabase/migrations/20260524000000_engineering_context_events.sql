create table if not exists public.engineering_context_events (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('nb', 'nn', 'en')),
  country_code text not null,
  country_name text,
  standard_family text not null,
  standard_label text,
  standard_support_level text not null check (standard_support_level in ('supported', 'partial', 'experimental', 'not_supported')),
  units text not null check (units in ('metric', 'imperial', 'mixed')),
  notation_style text not null,
  source text not null default 'unknown',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists engineering_context_events_created_at_idx
  on public.engineering_context_events (created_at desc);

create index if not exists engineering_context_events_standard_family_idx
  on public.engineering_context_events (standard_family);

create index if not exists engineering_context_events_country_code_idx
  on public.engineering_context_events (country_code);

alter table public.engineering_context_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'engineering_context_events'
      and policyname = 'engineering_context_events_service_role_all'
  ) then
    create policy engineering_context_events_service_role_all
      on public.engineering_context_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

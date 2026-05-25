alter table if exists public.engineering_context_events
  add column if not exists output_mode text not null default 'same_as_prompt'
    check (output_mode in ('same_as_prompt')),
  add column if not exists fallback_language text not null default 'en'
    check (fallback_language in ('nb', 'nn', 'en')),
  add column if not exists detected_prompt_language text;

comment on column public.engineering_context_events.language is
  'UI/default language for the international entry point. Agent output language follows output_mode.';

comment on column public.engineering_context_events.output_mode is
  'Language policy for agent output. same_as_prompt means agents should reply in the user prompt language.';

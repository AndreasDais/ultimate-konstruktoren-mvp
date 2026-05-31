-- ============================================================================
-- step_metrics release-readiness metadata
-- ----------------------------------------------------------------------------
-- Adds nullable, safe top-level trace metadata that future live_read release
-- proof can use without inspecting raw provider payloads.
--
-- These columns are necessary, but not sufficient, for release-proof. They are
-- nullable for backwards compatibility and for partial writer rollout. Ops must
-- keep diagnostic_only=true until every pipeline step writer populates the same
-- contract and Runtime/Eval verify full writer coverage.
--
-- provider_message_id is intentionally omitted/deferred. Readers must not
-- derive provider ids or error metadata from step_messages.raw_message.
--
-- Idempotent: safe to re-run.
-- ============================================================================

alter table public.step_metrics
  add column if not exists status text,
  add column if not exists completed_at timestamptz,
  add column if not exists error_category text,
  add column if not exists retryable boolean,
  add column if not exists raw_error_redacted boolean;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'step_metrics_status_check'
  ) then
    alter table public.step_metrics
      add constraint step_metrics_status_check
      check (
        status is null or status in (
          'completed',
          'failed',
          'blocked',
          'skipped',
          'not_applicable'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'step_metrics_error_category_check'
  ) then
    alter table public.step_metrics
      add constraint step_metrics_error_category_check
      check (
        error_category is null or error_category in (
          'none',
          'quota',
          'auth',
          'transient',
          'bad_request',
          'model_output',
          'validation',
          'unsupported_context',
          'blocked',
          'internal',
          'unknown',
          'not_applicable'
        )
      );
  end if;
end $$;

comment on column public.step_metrics.status is
  'Safe top-level release-readiness terminal step status. Nullable for backwards compatibility and partial writer rollout; not sufficient for release-proof by itself.';

comment on column public.step_metrics.completed_at is
  'Safe top-level release-readiness terminal timestamp. Nullable for historical rows and partial rollout; readers must not infer release-proof from null.';

comment on column public.step_metrics.error_category is
  'Bounded safe release-readiness error category. Must not contain raw provider text, prompts, stack traces, secrets, or local paths.';

comment on column public.step_metrics.retryable is
  'Safe release-readiness retryability hint. Nullable until all pipeline writers populate the trace metadata contract.';

comment on column public.step_metrics.raw_error_redacted is
  'Explicit safe redaction evidence for persisted error metadata. No default true: writers must set it when raw error detail is absent or redacted.';

comment on table public.step_metrics is
  'Per-step telemetry summary. Release-readiness metadata is safe top-level evidence only; provider_message_id is intentionally omitted/deferred and must not be derived from step_messages.raw_message.';

notify pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (paste into Supabase SQL Editor to fully reverse):
-- ============================================================================
-- alter table public.step_metrics drop constraint if exists step_metrics_error_category_check;
-- alter table public.step_metrics drop constraint if exists step_metrics_status_check;
-- alter table public.step_metrics drop column if exists raw_error_redacted;
-- alter table public.step_metrics drop column if exists retryable;
-- alter table public.step_metrics drop column if exists error_category;
-- alter table public.step_metrics drop column if exists completed_at;
-- alter table public.step_metrics drop column if exists status;

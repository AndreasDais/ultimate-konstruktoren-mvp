# Supabase Migration History Prepared Audit / Partial Checkpoint

**Sprint:** 68C.38
**Status:** docs-only prepared audit / partial checkpoint
**Owner:** Chat C / Ops, Guardrails, and Observability Lane

## Scope

This checkpoint prepares the production migration-history audit and records the
partial state known before a full read-only SQL audit has been executed. It is
not a migration repair, schema change, release-proof enablement, `db push`, or
`db push --dry-run`.

No live SQL was run in this sprint. The Ops worktree did not have `psql`, a
linked Supabase project, a DB URL, or local Supabase CLI access available for
direct read-only SQL execution.

Audit packet source:

```txt
sources/release-manager/RELEASE_CANDIDATE_CHECKLIST.md
```

Prepared target facts:

```txt
current_main_commit: 7f24e45
production_project_ref: uiogylrpclamffhgkjki
diagnostic_only: true
release_proof_mode: disabled
provider_message_id: omitted
```

## Read-only command boundary

This sprint did not run:

```txt
live SQL
Supabase migration repair
supabase db push
supabase db push --dry-run
mutating SQL
schema changes
release-proof enabling
provider_message_id storage
diagnostic_only=false
```

The results below therefore record previously user-provided production
verification output for `20260531000000` and explicit pending fields for the
historical migrations that still need copy/paste execution of the audit packet
in a trusted read-only SQL client.

## Migration history prepared result

Previously observed production migration-list state:

```txt
Local migration versions were shown with blank Remote history:
20260523000000
20260523000002
20260524000000
20260524000001
20260527000000
20260527000001
20260528000000
20260528000001
20260528000002
20260528000003
20260531000000
```

Interpretation:

- production CLI history is not trusted for this repo
- no repair command is approved from this observation alone
- no `db push` or `db push --dry-run` is safe until remote history matches
  actual production schema effects
- the SQL Editor attempt to read `supabase_migrations.schema_migrations` did
  not expose an available relation; keep that as `history_relation_unavailable`
  until a trusted read-only SQL client proves otherwise

## Table presence audit result

Previously user-provided verification for `20260531000000`:

- `public.step_metrics` exists in production; the manual
  `20260531000000_step_metrics_release_proof_metadata.sql` apply was reported
  as verifying existing-row compatibility against 957 `step_metrics` rows.

Pending audit packet output:

- full table presence for the earlier local migrations remains unclassified
  until the table audit query from `RELEASE_CANDIDATE_CHECKLIST.md` is pasted
  into a trusted read-only SQL client and attached to the handoff.

## Column presence audit result

Previously user-provided verification for `public.step_metrics`:

| Column | Expected production state | Audit state |
|---|---|---|
| `status` | exists, nullable, no default | previously user-verified |
| `completed_at` | exists, nullable, no default | previously user-verified |
| `error_category` | exists, nullable, no default | previously user-verified |
| `retryable` | exists, nullable, no default | previously user-verified |
| `raw_error_redacted` | exists, nullable, no default `true` | previously user-verified |
| `provider_message_id` | omitted / no row | previously user-verified omitted |

Existing-row compatibility:

```txt
step_metrics total rows: 957
new metadata fields non-null count: 0 for each new field at verification time
```

Pending audit packet output:

- column inventory for historical migrations is not yet classified
- keep older migrations out of repair scope until their column audit output is
  attached

## Constraint audit result

Previously user-provided verification for `public.step_metrics`:

| Constraint | Expected state | Audit state |
|---|---|---|
| `step_metrics_status_check` | bounded values: `completed`, `failed`, `blocked`, `skipped`, `not_applicable` | previously user-verified |
| `step_metrics_error_category_check` | bounded values: `none`, `quota`, `auth`, `transient`, `bad_request`, `model_output`, `validation`, `unsupported_context`, `blocked`, `internal`, `unknown`, `not_applicable` | previously user-verified |

Pending audit packet output:

- constraints for earlier local migrations are not yet classified

## Policy and RLS audit result

Pending audit packet output:

- policy/RLS audit has not been executed in this sprint
- do not mark any historical migration as `already present exactly` if its RLS,
  grant, or policy posture is part of the migration and has not been verified

## Comment audit result

Previously user-provided verification for `public.step_metrics`:

- comments exist for the five new release-readiness metadata fields
- `raw_error_redacted` comment preserves the "no default true" intent
- provider message ids remain omitted/deferred

Pending audit packet output:

- table comment and earlier migration comments should still be captured by the
  copy/paste audit packet before ledger repair

## Per-migration classification matrix

Use only these final classifications after the read-only packet output is
attached:

```txt
already present exactly
absent
partially present
present but drifted
intentionally superseded
```

Current checkpoint classifications:

No full per-migration classification is complete yet.

| Migration | Current classification | Repair eligibility |
|---|---|---|
| `20260523000000_pilar_intelligence_foundation.sql` | unclassified; table/column/constraint/policy/comment audit pending | MUST NOT REPAIR YET |
| `20260523000002_pilot_readiness_feedback.sql` | unclassified; table/column/constraint/policy/comment audit pending | MUST NOT REPAIR YET |
| `20260524000000_engineering_context_events.sql` | unclassified; table/column/constraint/policy/comment audit pending | MUST NOT REPAIR YET |
| `20260524000001_engineering_context_language_policy.sql` | unclassified; column/comment audit pending | MUST NOT REPAIR YET |
| `20260527000000_pilar_core_pipeline.sql` | unclassified; core table/index/RLS/grant/policy audit pending | MUST NOT REPAIR YET |
| `20260527000001_run_display_language.sql` | unclassified; column/constraint audit pending | MUST NOT REPAIR YET |
| `20260528000000_step_messages.sql` | unclassified; table/index/RLS/grant audit pending | MUST NOT REPAIR YET |
| `20260528000001_eval_case_id.sql` | unclassified; column/index audit pending | MUST NOT REPAIR YET |
| `20260528000002_trace_events_view.sql` | unclassified; view definition/grant audit pending | MUST NOT REPAIR YET |
| `20260528000003_engineering_context_per_run.sql` | unclassified; column/index audit pending | MUST NOT REPAIR YET |
| `20260531000000_step_metrics_release_proof_metadata.sql` | production schema effects were manually applied and previously user-verified for columns, bounded constraints, comments, existing-row compatibility, and provider id omission | provisional later repair candidate only inside an approved full-baseline strategy |

## Provisional repair candidate list

No migration is approved for repair yet.

Provisional later repair candidate after Big Brain approves a full-baseline
strategy and a separate mutating ledger step:

```txt
20260531000000_step_metrics_release_proof_metadata.sql
```

Conditions before any repair:

- Big Brain approves a separate mutating repair sprint
- backup/PITR confirmation is recorded
- production project ref is reconfirmed
- the repair list is reviewed against full read-only SQL output
- earlier migrations are not left in a misleading pending state
- no release-proof mode is enabled
- `diagnostic_only` remains true

## Must-not-repair-yet list

Do not repair these from the current evidence:

```txt
20260523000000_pilar_intelligence_foundation.sql
20260523000002_pilot_readiness_feedback.sql
20260524000000_engineering_context_events.sql
20260524000001_engineering_context_language_policy.sql
20260527000000_pilar_core_pipeline.sql
20260527000001_run_display_language.sql
20260528000000_step_messages.sql
20260528000001_eval_case_id.sql
20260528000002_trace_events_view.sql
20260528000003_engineering_context_per_run.sql
```

Also do not repair `20260531000000` as a standalone action while the earlier
history remains blank, unless Big Brain explicitly accepts that ledger shape.

## Risks and unknowns

- Production schema may be correct while Supabase CLI history is blank.
- Repairing history without schema proof can make future deploys unsafe.
- Running `db push` before baseline repair may attempt to replay old migrations.
- Earlier migrations may be partially present, drifted, or intentionally
  superseded; each requires read-only evidence before classification.
- `20260531000000` being manually applied does not enable release-proof mode.
- `diagnostic_only` remains true.
- `provider_message_id` remains omitted.

## 68C.39 live read-only audit request

Live SQL output was not collected from the Ops worktree in this sprint because
the worktree had no `psql`, no local Supabase CLI binary, no linked project ref,
and no DB URL / Supabase environment variable. The audit therefore remains a
prepared SQL Editor request until Big Brain or the deploy owner pastes the
queries below into a trusted read-only production SQL client.

Target evidence for the read-only audit:

- current main commit: `7f24e45`
- production project ref: `uiogylrpclamffhgkjki`
- table presence output
- relevant column output
- relevant constraint output
- RLS/policy output
- comment output
- migration ledger availability or `history_relation_unavailable`

Run these queries exactly as read-only audit queries:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'supabase_migrations'
order by table_schema, table_name;
```

```sql
select version, name, statements
from supabase_migrations.schema_migrations
order by version;
```

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'requests',
    'admins',
    'input_reviews',
    'calculation_runs',
    'agent_outputs',
    'comparisons',
    'controller_decisions',
    'reports',
    'error_reports',
    'manual_reviews',
    'daily_intelligence_reports',
    'improvement_actions',
    'agent_learning_feedback',
    'daily_metrics_snapshots',
    'pilot_feedback',
    'engineering_context_events',
    'step_messages',
    'step_metrics',
    'trace_events'
  )
order by table_name;
```

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'requests',
    'admins',
    'input_reviews',
    'calculation_runs',
    'agent_outputs',
    'comparisons',
    'controller_decisions',
    'reports',
    'error_reports',
    'manual_reviews',
    'daily_intelligence_reports',
    'improvement_actions',
    'agent_learning_feedback',
    'daily_metrics_snapshots',
    'pilot_feedback',
    'engineering_context_events',
    'step_messages',
    'step_metrics'
  )
order by table_name, ordinal_position;
```

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'step_metrics'
  and column_name in (
    'status',
    'completed_at',
    'error_category',
    'retryable',
    'raw_error_redacted',
    'provider_message_id'
  )
order by column_name;
```

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'improvement_actions',
    'agent_learning_feedback',
    'pilot_feedback',
    'engineering_context_events',
    'calculation_runs',
    'error_reports',
    'manual_reviews',
    'step_messages',
    'step_metrics'
  )
order by c.relname, con.conname;
```

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'requests',
    'admins',
    'input_reviews',
    'calculation_runs',
    'agent_outputs',
    'comparisons',
    'controller_decisions',
    'reports',
    'error_reports',
    'manual_reviews',
    'pilot_feedback',
    'engineering_context_events',
    'step_messages',
    'step_metrics'
  )
order by tablename, policyname;
```

```sql
select
  c.relname as table_name,
  a.attname as column_name,
  col_description(a.attrelid, a.attnum) as comment
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid
where n.nspname = 'public'
  and c.relname = 'step_metrics'
  and a.attname in (
    'status',
    'completed_at',
    'error_category',
    'retryable',
    'raw_error_redacted'
  )
order by a.attname;
```

```sql
select obj_description('public.step_metrics'::regclass) as step_metrics_comment;
```

```sql
select
  count(*) filter (where column_name = 'provider_message_id') as provider_message_id_columns,
  count(*) filter (
    where column_name = 'raw_error_redacted'
      and column_default is not null
  ) as raw_error_redacted_defaults
from information_schema.columns
where table_schema = 'public'
  and table_name = 'step_metrics'
  and column_name in ('provider_message_id', 'raw_error_redacted');
```

Current 68C.39 classification remains unchanged:

- no full per-migration classification is complete
- `20260531000000` remains a provisional later repair candidate only inside a
  full-baseline strategy
- all earlier migrations remain `MUST NOT REPAIR YET`
- no migration is approved for repair from this sprint

Do not proceed if the SQL output shows `provider_message_id`, a
`raw_error_redacted` default, release-proof mode, or anything that would make
`diagnostic_only=false`.

## 68C.40 Package A user-run read-only results

The deploy owner ran Package A manually in Supabase SQL Editor and pasted the
results back to Ops. Ops did not run SQL, Supabase CLI, repair, `db push`, or
`db push --dry-run` from the worktree.

Package A used read-only `select` queries only. No mutation, repair, push,
dry-run, schema change, or release-proof enabling occurred.

Audited target:

```txt
current main commit: 7f24e45
production project ref: uiogylrpclamffhgkjki
SQL source: user-run Supabase SQL Editor Package A
```

Migration ledger availability:

```txt
information_schema.tables where table_schema = 'supabase_migrations': no rows returned
to_regclass('supabase_migrations.schema_migrations'): null
```

Interpretation:

- migration ledger entries are not visible in this SQL Editor context
- production migration history remains unbaselined for CLI purposes
- no repair is approved from Package A

Public table presence result:

```txt
admins
agent_learning_feedback
agent_outputs
calculation_runs
comparisons
controller_decisions
daily_intelligence_reports
daily_metrics_snapshots
engineering_context_events
error_reports
improvement_actions
input_reviews
manual_reviews
pilot_feedback
reports
requests
step_messages
step_metrics
trace_events
```

All expected Package A public tables were present in the user-run result.

Relevant column result:

```txt
calculation_runs.display_language: text, nullable, no default
calculation_runs.engineering_context: jsonb, nullable, no default
calculation_runs.eval_case_id: text, nullable, no default
step_metrics.completed_at: timestamp with time zone, nullable, no default
step_metrics.error_category: text, nullable, no default
step_metrics.raw_error_redacted: boolean, nullable, no default
step_metrics.retryable: boolean, nullable, no default
step_metrics.status: text, nullable, no default
step_metrics.provider_message_id: no row returned
engineering_context_events.output_mode: no row returned
engineering_context_events.fallback_language: no row returned
engineering_context_events.detected_prompt_language: no row returned
```

Relevant `calculation_runs` and `step_metrics` columns were present. The
`engineering_context_events` language-policy columns were absent from Package A
and are classified as drift / partial / pending review only; this is not an
auto-fix instruction.

Relevant constraint result:

```txt
calculation_runs_display_language_check:
  display_language is null or display_language in ('nn', 'nb', 'en')

step_metrics_error_category_check:
  error_category is null or error_category in
  ('none', 'quota', 'auth', 'transient', 'bad_request', 'model_output',
   'validation', 'unsupported_context', 'blocked', 'internal', 'unknown',
   'not_applicable')

step_metrics_status_check:
  status is null or status in
  ('completed', 'failed', 'blocked', 'skipped', 'not_applicable')
```

Relevant Package A constraints were present and bounded.

Package A classification update:

| Migration | Package A evidence | Current classification | Repair eligibility |
|---|---|---|---|
| `20260523000000_pilar_intelligence_foundation.sql` | expected intelligence/core tables are present where covered by Package A table list; detailed columns, indexes, triggers, policies and comments not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260523000002_pilot_readiness_feedback.sql` | `pilot_feedback` table present; indexes, RLS policy and comments not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260524000000_engineering_context_events.sql` | `engineering_context_events` table present; indexes and RLS policy not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260524000001_engineering_context_language_policy.sql` | expected `output_mode`, `fallback_language`, and `detected_prompt_language` columns returned no rows | drift / partial / pending review; not an auto-fix instruction | MUST NOT REPAIR YET |
| `20260527000000_pilar_core_pipeline.sql` | expected core pipeline tables are present; detailed columns, indexes, RLS, grants and policies not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260527000001_run_display_language.sql` | `calculation_runs.display_language` column and bounded check constraint present | evidence appears exact for Package A fields; ledger repair still not approved | MUST NOT REPAIR YET |
| `20260528000000_step_messages.sql` | `step_messages` table present; indexes, RLS and grants not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260528000001_eval_case_id.sql` | `calculation_runs.eval_case_id` column present; partial index not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260528000002_trace_events_view.sql` | `trace_events` relation present in table-presence query; view definition and grants not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260528000003_engineering_context_per_run.sql` | `calculation_runs.engineering_context` column present; indexes not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260531000000_step_metrics_release_proof_metadata.sql` | five expected nullable `step_metrics` columns present; bounded status/error_category constraints present; `raw_error_redacted` has no default; `provider_message_id` omitted | partial live evidence plus earlier user-provided comment/row-count verification; exactness still needs comment audit | provisional later repair candidate only inside approved full-baseline strategy |

Package A risks / unknowns:

- policy/RLS output has not been provided yet
- comments output has not been provided yet
- indexes and grants were not covered by Package A
- full per-migration exactness is not complete
- migration ledger is unavailable/null in SQL Editor context
- no migration is approved for repair
- no release-proof mode is enabled
- `diagnostic_only` remains true
- `provider_message_id` remains omitted

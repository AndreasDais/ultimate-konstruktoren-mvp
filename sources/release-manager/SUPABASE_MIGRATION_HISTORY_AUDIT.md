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

## 68C.41 Package B user-run read-only results

The deploy owner ran Package B manually in Supabase SQL Editor and pasted the
combined result table back to Ops. Ops did not run SQL, Supabase CLI, repair,
`db push`, or `db push --dry-run` from the worktree.

Package B used read-only `select` queries only. No mutation, repair, push,
dry-run, schema change, or release-proof enabling occurred.

RLS status result:

```txt
RLS enabled: true for all expected Package B public tables
force RLS: false for all expected Package B public tables
```

Tables covered:

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
```

Policy result:

```txt
calculation_runs:
  policy: Innlogga brukar les eigne berekningar
  cmd: SELECT
  roles: authenticated
  qual: user_id = auth.uid()

engineering_context_events:
  policy: engineering_context_events_service_role_all
  cmd: ALL
  roles: public
  qual / with_check: auth.role() = 'service_role'

pilot_feedback:
  policy: pilot_feedback_no_public_read
  cmd: SELECT
  roles: anon, authenticated
  qual: false
```

No other expected Package B tables returned policies in the pasted result.

Table comment result:

```txt
pilot_feedback:
  Pilot feedback from report users. Used by admin dashboards and intelligence agent.

step_metrics:
  Per-step telemetry summary. Release-readiness metadata is safe top-level evidence only; provider_message_id is intentionally omitted/deferred and must not be derived from step_messages.raw_message.
```

These expected comment rows returned null comments:

```txt
agent_learning_feedback
calculation_runs
daily_intelligence_reports
daily_metrics_snapshots
engineering_context_events
improvement_actions
step_messages
trace_events
```

Column comment result:

```txt
pilot_feedback.rating:
  useful, partly, or not_useful.

pilot_feedback.trust_level:
  How much the tester trusted the output.

step_metrics.completed_at:
  Safe top-level release-readiness terminal timestamp. Nullable for historical rows and partial rollout; readers must not infer release-proof from null.

step_metrics.error_category:
  Bounded safe release-readiness error category. Must not contain raw provider text, prompts, stack traces, secrets, or local paths.

step_metrics.raw_error_redacted:
  Explicit safe redaction evidence for persisted error metadata. No default true: writers must set it when raw error detail is absent or redacted.

step_metrics.retryable:
  Safe release-readiness retryability hint. Nullable until all pipeline writers populate the trace metadata contract.

step_metrics.status:
  Safe top-level release-readiness terminal step status. Nullable for backwards compatibility and partial writer rollout; not sufficient for release-proof by itself.
```

`engineering_context_events.language` returned a null column comment. Package B
did not return an `engineering_context_events.output_mode` column-comment row.

Safety aggregate result:

```txt
provider_message_id_columns: 0
raw_error_redacted_defaults: 0
nonnullable_release_readiness_fields: 0
```

Step metrics field default/nullability result:

```txt
step_metrics.completed_at: nullable, no default
step_metrics.error_category: nullable, no default
step_metrics.raw_error_redacted: nullable, no default
step_metrics.retryable: nullable, no default
step_metrics.status: nullable, no default
step_metrics.provider_message_id: no row returned
```

User-run safety-boundary result:

```txt
step_messages.raw_message:
  raw_message exists for replay only; do not use as release-proof metadata

step_metrics.completed_at:
  safe top-level trace-readiness metadata candidate

step_metrics.error_category:
  safe top-level trace-readiness metadata candidate

step_metrics.raw_error_redacted:
  safe top-level trace-readiness metadata candidate

step_metrics.retryable:
  safe top-level trace-readiness metadata candidate

step_metrics.status:
  safe top-level trace-readiness metadata candidate
```

Package B partial interpretation:

- `step_messages.raw_message` is present only as replay/debug evidence and must
  not be used as release-proof metadata
- `step_metrics.status`, `completed_at`, `error_category`, `retryable`, and
  `raw_error_redacted` remain the safe top-level trace-readiness metadata
  candidates
- Package B confirms `provider_message_id_columns = 0`
- Package B confirms `raw_error_redacted_defaults = 0`
- Package B confirms all five release-readiness fields are nullable
- RLS is enabled on all expected Package B public tables, with force RLS false
- only three policies were returned: `calculation_runs`, `engineering_context_events`,
  and `pilot_feedback`
- Package B comments support the `20260531000000` safety-boundary intent for
  `step_metrics`
- indexes and grants remain unaudited
- no migration is approved for repair
- no release-proof mode is enabled
- `diagnostic_only` remains true

Package B classification update:

| Migration | Package B evidence | Current classification | Repair eligibility |
|---|---|---|---|
| `20260523000000_pilar_intelligence_foundation.sql` | expected tables have RLS enabled; no specific policies returned except `calculation_runs`; table comments mostly null; indexes, grants, triggers and full columns not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260523000002_pilot_readiness_feedback.sql` | `pilot_feedback` RLS enabled; no-public-read policy present; table and selected column comments present | stronger partial evidence; indexes still not audited | MUST NOT REPAIR YET |
| `20260524000000_engineering_context_events.sql` | RLS enabled; service-role policy present; table comment null; indexes not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260524000001_engineering_context_language_policy.sql` | `engineering_context_events.language` comment null and `output_mode` column-comment row absent from Package B; Package A showed language-policy columns absent | drift / partial / pending review; not an auto-fix instruction | MUST NOT REPAIR YET |
| `20260527000000_pilar_core_pipeline.sql` | core tables have RLS enabled; `calculation_runs` authenticated select policy present; comments mostly null; indexes/grants/full column shape not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260527000001_run_display_language.sql` | Package B does not add new evidence beyond Package A column/constraint proof | evidence appears exact for Package A fields; ledger repair still not approved | MUST NOT REPAIR YET |
| `20260528000000_step_messages.sql` | `step_messages` RLS enabled; raw_message safety boundary says replay only, not release-proof metadata; grants/indexes not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260528000001_eval_case_id.sql` | Package B does not add index evidence beyond Package A column proof | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260528000002_trace_events_view.sql` | table-comment query included `trace_events` and returned null; view definition/grants not audited | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260528000003_engineering_context_per_run.sql` | Package B does not add index evidence beyond Package A column proof | partial evidence; exactness unknown | MUST NOT REPAIR YET |
| `20260531000000_step_metrics_release_proof_metadata.sql` | Package A+B verify nullable fields, no defaults, bounded constraints, comments, provider id omission, and raw_message exclusion from release-proof metadata | strongest evidence so far; still only a provisional later repair candidate inside approved full-baseline strategy | MUST NOT REPAIR YET |

## 68C.42 migration classification matrix

This matrix summarizes the current Package A/B evidence in the format needed
for future baseline planning. It is not a repair approval.

Classification values:

```txt
exact
partial
absent
drift
unknown
```

Repair status values:

```txt
MUST NOT REPAIR YET
provisional candidate
blocked
```

| Version | Migration file name | Expected effect | Observed prod evidence | Classification | Repair status | Blocker / next evidence needed |
|---|---|---|---|---|---|---|
| `20260523000000` | `pilar_intelligence_foundation.sql` | Intelligence tables, indexes, updated-at trigger/function and optional RLS posture for daily reports, improvement actions, learning feedback and metric snapshots. | Package A/B show expected tables and RLS posture. Package C adds 4 relation exact candidates, 6 constraint definitions and 4 index definitions; full columns, triggers/functions, grants and RLS-intent review remain incomplete. | partial | MUST NOT REPAIR YET | Need full column audit, trigger/function evidence, grants and explicit RLS-intent comparison before exactness can be claimed. |
| `20260523000002` | `pilot_readiness_feedback.sql` | `pilot_feedback` table, indexes, RLS enabled, no-public-read policy, table and selected column comments. | Package C adds relation exact candidate plus comments, rating/trust constraints, 4 indexes and `pilot_feedback_no_public_read` policy definitions. Full column shape and grants are still not audited. | partial | MUST NOT REPAIR YET | Need full column and grant audit before exactness can be claimed; no repair from table/policy presence alone. |
| `20260524000000` | `engineering_context_events.sql` | `engineering_context_events` table, indexes, RLS enabled and service-role-only policy. | Package C adds relation exact candidate plus language/support/units constraints, 3 indexes and service-role policy definitions. Full column shape, grants and comment intent remain incomplete. | partial | MUST NOT REPAIR YET | Need full column/grant/comment audit and owner review of service-role policy exactness. |
| `20260524000001` | `engineering_context_language_policy.sql` | `engineering_context_events.output_mode`, `fallback_language`, `detected_prompt_language`, and language/output_mode comments. | Package C confirms all 7 requested rows absent: 3 columns, 2 constraints and 2 comments are missing. | absent | MUST NOT REPAIR YET | Needs owner decision: absent deploy, intentional supersession or drift. Must not be marked applied as repair from current evidence. |
| `20260527000000` | `pilar_core_pipeline.sql` | Core pipeline tables, indexes, constraints, RLS, grants and authenticated calculation-run read policy. | Package C adds 10 relation exact candidates plus constraint, index, grant and calculation-run policy definitions. Full column shape and complete definition review are still incomplete. | partial | MUST NOT REPAIR YET | Need full schema/column comparison and reviewer confirmation that all definitions match migration intent. |
| `20260527000001` | `run_display_language.sql` | Nullable `calculation_runs.display_language` and bounded `calculation_runs_display_language_check`. | Package C shows nullable text column with no default and bounded `display_language` check definition. | exact | MUST NOT REPAIR YET | Evidence appears exact, but Big Brain has not approved repair; ledger strategy and backup/PITR gate still required. |
| `20260528000000` | `step_messages.sql` | `step_messages` table, correlation constraints, indexes, RLS enabled, grants and raw-message replay storage. | Package C adds relation exact candidate plus correlation check, 3 index definitions and grants. Full column shape and RLS/policy semantics are still not fully audited. | partial | MUST NOT REPAIR YET | Need full column audit and review that grants/RLS posture match the migration intent. |
| `20260528000001` | `eval_case_id.sql` | Nullable `calculation_runs.eval_case_id` and partial index. | Package C shows nullable text column with no default and `idx_calc_runs_eval_case_id` partial index where `eval_case_id is not null`. | exact | MUST NOT REPAIR YET | Evidence appears exact, but Big Brain has not approved repair; ledger strategy and backup/PITR gate still required. |
| `20260528000002` | `trace_events_view.sql` | `trace_events` view definition, safe payload shape and select grant. | Package C shows `trace_events` relation as a view and grant definitions, but the view definition/safe selected payload shape was not audited; grant output needs review against select-only intent. | partial | MUST NOT REPAIR YET | Need full view definition diff and grant review before exactness can be claimed. |
| `20260528000003` | `engineering_context_per_run.sql` | Nullable `calculation_runs.engineering_context` and two partial expression indexes. | Package C shows nullable jsonb column with no default and both expression index definitions. | exact | MUST NOT REPAIR YET | Evidence appears exact, but Big Brain has not approved repair; ledger strategy and backup/PITR gate still required. |
| `20260531000000` | `step_metrics_release_proof_metadata.sql` | Nullable safe top-level trace-readiness fields, bounded status/error-category checks, comments, no default true on `raw_error_redacted`, no `provider_message_id`, and raw-message exclusion from release-proof metadata. | Package A/B/C show five nullable fields, no defaults, bounded checks, trace-readiness comments, `provider_message_id` omitted and `raw_message` marked replay-only. | exact | provisional candidate | Still only a provisional later repair candidate inside a full-baseline strategy. Need Big Brain approval, backup/PITR confirmation and ledger repair plan; no release-proof enabling. |

68C.42 repair boundary:

- no migration is approved for repair
- older migrations remain `MUST NOT REPAIR YET`
- `20260531000000` remains only a provisional later repair candidate inside a
  full-baseline strategy
- `diagnostic_only=true`
- release-proof mode remains disabled
- no local DB, Supabase CLI, SQL, repair, `db push`, or `db push --dry-run`
  command was run by Chat C for this matrix

## 68C.43 migration repair readiness plan

Current state:

- production schema has useful Package A/B evidence, but the Supabase CLI
  migration ledger is unavailable or untrusted from the current audit evidence
- no migration repair is approved yet
- older migrations remain `MUST NOT REPAIR YET`
- `20260531000000` remains only a provisional candidate inside a full-baseline
  strategy
- `diagnostic_only=true`
- release-proof mode remains disabled
- `provider_message_id` remains omitted

Preconditions before any future `supabase migration repair`:

1. Confirm the exact production project ref in the mutating sprint record.
2. Confirm backup/PITR plan, owner, retention window and restore drill status.
3. Confirm the current remote migration ledger state immediately before repair.
4. Review the 68C.42 per-migration classification with Big Brain.
5. Do not repair any `partial`, `drift` or `unknown` migration blindly.
6. Document rollback/incident plan before any mutating command.
7. Get explicit Big Brain approval for each individual migration version.
8. Reconfirm `diagnostic_only=true` and release-proof disabled before and after.

Allowed future repair action shape:

```bash
supabase migration repair --status applied <version>
```

This shape is allowed only in a later approved mutating sprint, and only when
read-only evidence shows that the migration effect is already present exactly
in production. The command is not approved by this document.

Forbidden actions from the current evidence:

- no `supabase db push`
- no `supabase db push --dry-run`
- no mutating SQL
- no repair of old migrations with `partial`, `unknown` or `drift` evidence
- no standalone repair of `20260531000000` outside a full-baseline strategy
- no release-proof enabling
- no `provider_message_id` introduction
- no `diagnostic_only=false`

Next evidence package requests:

Package C: per-migration object, policy, index and grant evidence. Ask the user
to run read-only SQL Editor queries that compare each migration's expected
tables, columns, constraints, indexes, policies, grants, comments, triggers,
functions and views against production. Package C must preserve the 68C.42
classification values and may only move a migration toward `exact` when every
expected object is proven present without drift. Package C is required before
any older migration can move from `MUST NOT REPAIR YET`, and no migration may
be repaired from table-presence evidence alone.

Package D: rollback, backup and PITR evidence. Ask the user to provide the
project ref, backup/PITR availability, retention window, restore owner, rollback
decision path and incident contact. Package D must be recorded before any
future mutating repair sprint.

Repair decision protocol:

- `exact` plus Package D proof may become a Big Brain-reviewed repair candidate
- `partial` remains `MUST NOT REPAIR YET`
- `drift` is blocked until the owning lane explains the drift or supersession
- `unknown` remains blocked until Package C supplies live read-only evidence
- `absent` must not be repaired as applied; it needs an implementation/deploy
  decision, not ledger repair
- every approved repair version must be listed explicitly with evidence links
  and rollback notes in a separate mutating sprint

68C.43 boundary:

- no migration repair is approved
- no local DB, Supabase CLI, SQL, repair, `db push`, `db push --dry-run` or
  mutating DB command was run by Chat C

## 68C.44 Package C per-migration evidence hardening

Purpose: turn Package C into the next read-only evidence packet needed to
strengthen the 68C.42 matrix. This section is not a repair approval.

Package C hardening rules:

- object existence alone can never move a migration to repair-ready
- each older migration remains `MUST NOT REPAIR YET` until Package C proves all
  relevant objects, columns, constraints, indexes, policies, grants and comments
- `20260531000000` remains only a provisional candidate until a full-baseline
  strategy is approved
- `diagnostic_only=true`
- release-proof mode remains disabled
- `provider_message_id` remains omitted

Per-migration Package C evidence needed:

| Version | Migration file | Package C must prove before classification can harden |
|---|---|---|
| `20260523000000` | `pilar_intelligence_foundation.sql` | All four intelligence tables exist with expected columns; check constraints exist; expected indexes exist; updated-at trigger/function state is reviewed; RLS posture is intentionally accepted or documented as drift; grants/comments are inventoried. |
| `20260523000002` | `pilot_readiness_feedback.sql` | `pilot_feedback` full columns, rating/trust checks, four indexes, RLS enabled, `pilot_feedback_no_public_read` policy, table/comment rows and grants are present exactly. |
| `20260524000000` | `engineering_context_events.sql` | Table, full columns, language/support/units checks, three indexes, RLS enabled, service-role policy and grants/comments are present or drift is explicitly classified. |
| `20260524000001` | `engineering_context_language_policy.sql` | `output_mode`, `fallback_language`, `detected_prompt_language`, output/fallback checks and language/output comments are either present exactly or owner-classified as intentionally superseded; current Package A/B evidence suggests drift. |
| `20260527000000` | `pilar_core_pipeline.sql` | Core tables, primary/foreign/check constraints, indexes, RLS, authenticated calculation-run policy and grants are compared against the migration; no table-presence-only repair. |
| `20260527000001` | `run_display_language.sql` | `display_language` nullable text, no default, bounded constraint, and no unexpected grant/index side effects; ledger strategy still required. |
| `20260528000000` | `step_messages.sql` | `step_messages` full columns, correlation check, three indexes, RLS enabled, grants and raw-message replay-only semantics are present exactly. |
| `20260528000001` | `eval_case_id.sql` | `eval_case_id` nullable text and `idx_calc_runs_eval_case_id` partial index are present exactly; no release-proof claim follows from this evidence. |
| `20260528000002` | `trace_events_view.sql` | `trace_events` view definition, safe selected payload shape and select grants match the migration; relation presence alone is partial. |
| `20260528000003` | `engineering_context_per_run.sql` | `engineering_context` nullable jsonb and both expression indexes are present exactly. |
| `20260531000000` | `step_metrics_release_proof_metadata.sql` | Five nullable metadata columns, bounded status/error-category checks, comments, no default true on `raw_error_redacted`, `provider_message_id` absence and raw-message exclusion remain present. This can only support provisional candidacy inside a full-baseline strategy. |

Package C read-only SQL Editor request:

```sql
with
expected_relations(version, migration_file, expected_kind, schema_name, relation_name) as (
  values
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'r', 'public', 'daily_intelligence_reports'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'r', 'public', 'improvement_actions'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'r', 'public', 'agent_learning_feedback'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'r', 'public', 'daily_metrics_snapshots'),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'r', 'public', 'pilot_feedback'),
    ('20260524000000', 'engineering_context_events.sql', 'r', 'public', 'engineering_context_events'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'requests'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'admins'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'input_reviews'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'calculation_runs'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'agent_outputs'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'comparisons'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'controller_decisions'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'reports'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'error_reports'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'r', 'public', 'manual_reviews'),
    ('20260528000000', 'step_messages.sql', 'r', 'public', 'step_messages'),
    ('20260528000002', 'trace_events_view.sql', 'v', 'public', 'trace_events'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'r', 'public', 'step_metrics')
),
expected_columns(version, migration_file, table_name, column_name, expected_type, expected_nullable, expected_default) as (
  values
    ('20260524000001', 'engineering_context_language_policy.sql', 'engineering_context_events', 'output_mode', 'text', 'NO', 'has_default'),
    ('20260524000001', 'engineering_context_language_policy.sql', 'engineering_context_events', 'fallback_language', 'text', 'YES', 'no_default'),
    ('20260524000001', 'engineering_context_language_policy.sql', 'engineering_context_events', 'detected_prompt_language', 'text', 'YES', 'no_default'),
    ('20260527000001', 'run_display_language.sql', 'calculation_runs', 'display_language', 'text', 'YES', 'no_default'),
    ('20260528000001', 'eval_case_id.sql', 'calculation_runs', 'eval_case_id', 'text', 'YES', 'no_default'),
    ('20260528000003', 'engineering_context_per_run.sql', 'calculation_runs', 'engineering_context', 'jsonb', 'YES', 'no_default'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'step_metrics', 'status', 'text', 'YES', 'no_default'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'step_metrics', 'completed_at', 'timestamp with time zone', 'YES', 'no_default'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'step_metrics', 'error_category', 'text', 'YES', 'no_default'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'step_metrics', 'retryable', 'boolean', 'YES', 'no_default'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'step_metrics', 'raw_error_redacted', 'boolean', 'YES', 'no_default')
),
expected_constraints(version, migration_file, table_name, constraint_name) as (
  values
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'improvement_actions', 'improvement_actions_category_check'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'improvement_actions', 'improvement_actions_priority_check'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'improvement_actions', 'improvement_actions_effort_check'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'improvement_actions', 'improvement_actions_risk_level_check'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'improvement_actions', 'improvement_actions_status_check'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'agent_learning_feedback', 'agent_learning_feedback_user_rating_check'),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'pilot_feedback', 'pilot_feedback_rating_check'),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'pilot_feedback', 'pilot_feedback_trust_level_check'),
    ('20260524000000', 'engineering_context_events.sql', 'engineering_context_events', 'engineering_context_events_language_check'),
    ('20260524000000', 'engineering_context_events.sql', 'engineering_context_events', 'engineering_context_events_standard_support_level_check'),
    ('20260524000000', 'engineering_context_events.sql', 'engineering_context_events', 'engineering_context_events_units_check'),
    ('20260524000001', 'engineering_context_language_policy.sql', 'engineering_context_events', 'engineering_context_events_output_mode_check'),
    ('20260524000001', 'engineering_context_language_policy.sql', 'engineering_context_events', 'engineering_context_events_fallback_language_check'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'calculation_runs', 'calculation_runs_run_type_check'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'reports', 'reports_tillit_score_check'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'error_reports', 'error_reports_severity_user_check'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'error_reports', 'error_reports_error_type_check'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'error_reports', 'error_reports_status_check'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'manual_reviews', 'manual_reviews_related_type_check'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'manual_reviews', 'manual_reviews_decision_check'),
    ('20260527000001', 'run_display_language.sql', 'calculation_runs', 'calculation_runs_display_language_check'),
    ('20260528000000', 'step_messages.sql', 'step_messages', 'step_messages_has_correlation'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'step_metrics', 'step_metrics_status_check'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'step_metrics', 'step_metrics_error_category_check')
),
expected_indexes(version, migration_file, table_name, index_name) as (
  values
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'daily_intelligence_reports', 'idx_daily_intelligence_reports_date'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'improvement_actions', 'idx_improvement_actions_status_priority'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'improvement_actions', 'idx_improvement_actions_report_id'),
    ('20260523000000', 'pilar_intelligence_foundation.sql', 'daily_metrics_snapshots', 'idx_daily_metrics_snapshots_date_key'),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'pilot_feedback', 'pilot_feedback_created_at_idx'),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'pilot_feedback', 'pilot_feedback_run_id_idx'),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'pilot_feedback', 'pilot_feedback_rating_idx'),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'pilot_feedback', 'pilot_feedback_use_case_idx'),
    ('20260524000000', 'engineering_context_events.sql', 'engineering_context_events', 'engineering_context_events_created_at_idx'),
    ('20260524000000', 'engineering_context_events.sql', 'engineering_context_events', 'engineering_context_events_standard_family_idx'),
    ('20260524000000', 'engineering_context_events.sql', 'engineering_context_events', 'engineering_context_events_country_code_idx'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'requests', 'idx_requests_created'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'admins', 'idx_admins_email'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'input_reviews', 'idx_input_reviews_request'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'calculation_runs', 'idx_calc_runs_request'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'calculation_runs', 'idx_calculation_runs_user_id'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'agent_outputs', 'idx_agent_outputs_run'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'comparisons', 'idx_comparisons_run'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'controller_decisions', 'idx_controller_decisions_run_id'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'reports', 'idx_reports_tillit_score'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'error_reports', 'idx_error_reports_report_id'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'error_reports', 'idx_error_reports_status'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'error_reports', 'idx_error_reports_created_at'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'manual_reviews', 'idx_manual_reviews_related'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'manual_reviews', 'idx_manual_reviews_created_at'),
    ('20260528000000', 'step_messages.sql', 'step_messages', 'step_messages_run_id_idx'),
    ('20260528000000', 'step_messages.sql', 'step_messages', 'step_messages_request_id_idx'),
    ('20260528000000', 'step_messages.sql', 'step_messages', 'step_messages_step_name_idx'),
    ('20260528000001', 'eval_case_id.sql', 'calculation_runs', 'idx_calc_runs_eval_case_id'),
    ('20260528000003', 'engineering_context_per_run.sql', 'calculation_runs', 'idx_calc_runs_engctx_country'),
    ('20260528000003', 'engineering_context_per_run.sql', 'calculation_runs', 'idx_calc_runs_engctx_family')
),
expected_policies(version, migration_file, table_name, policy_name) as (
  values
    ('20260523000002', 'pilot_readiness_feedback.sql', 'pilot_feedback', 'pilot_feedback_no_public_read'),
    ('20260524000000', 'engineering_context_events.sql', 'engineering_context_events', 'engineering_context_events_service_role_all'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'calculation_runs', 'Innlogga brukar les eigne berekningar')
),
expected_grant_tables(version, migration_file, table_name) as (
  values
    ('20260527000000', 'pilar_core_pipeline.sql', 'requests'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'admins'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'input_reviews'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'calculation_runs'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'agent_outputs'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'comparisons'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'controller_decisions'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'reports'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'error_reports'),
    ('20260527000000', 'pilar_core_pipeline.sql', 'manual_reviews'),
    ('20260528000000', 'step_messages.sql', 'step_messages'),
    ('20260528000002', 'trace_events_view.sql', 'trace_events')
),
expected_comments(version, migration_file, object_type, table_name, column_name) as (
  values
    ('20260523000002', 'pilot_readiness_feedback.sql', 'table', 'pilot_feedback', null),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'column', 'pilot_feedback', 'rating'),
    ('20260523000002', 'pilot_readiness_feedback.sql', 'column', 'pilot_feedback', 'trust_level'),
    ('20260524000001', 'engineering_context_language_policy.sql', 'column', 'engineering_context_events', 'language'),
    ('20260524000001', 'engineering_context_language_policy.sql', 'column', 'engineering_context_events', 'output_mode'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'table', 'step_metrics', null),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'column', 'step_metrics', 'status'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'column', 'step_metrics', 'completed_at'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'column', 'step_metrics', 'error_category'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'column', 'step_metrics', 'retryable'),
    ('20260531000000', 'step_metrics_release_proof_metadata.sql', 'column', 'step_metrics', 'raw_error_redacted')
),
relation_evidence as (
  select
    'Package C relation existence' as section_name,
    er.version,
    er.migration_file,
    'object' as evidence_group,
    er.schema_name || '.' || er.relation_name as expected_item,
    case er.expected_kind when 'r' then 'table' when 'v' then 'view' else er.expected_kind end as expected_effect,
    coalesce(case c.relkind::text when 'r' then 'table' when 'v' then 'view' else c.relkind::text end, 'missing') as observed_value,
    case
      when c.oid is null then 'absent'
      when c.relkind::text = er.expected_kind then 'exact_candidate'
      else 'drift'
    end as evidence_status
  from expected_relations er
  left join pg_namespace n on n.nspname = er.schema_name
  left join pg_class c on c.relnamespace = n.oid and c.relname = er.relation_name
),
column_evidence as (
  select
    'Package C column evidence' as section_name,
    ec.version,
    ec.migration_file,
    'column' as evidence_group,
    'public.' || ec.table_name || '.' || ec.column_name as expected_item,
    ec.expected_type || ', nullable=' || ec.expected_nullable || ', default=' || ec.expected_default as expected_effect,
    coalesce(c.data_type || ', nullable=' || c.is_nullable || ', default=' || coalesce(c.column_default, 'null'), 'missing') as observed_value,
    case
      when c.column_name is null then 'absent'
      when c.data_type = ec.expected_type
        and c.is_nullable = ec.expected_nullable
        and (
          (ec.expected_default = 'no_default' and c.column_default is null)
          or (ec.expected_default = 'has_default' and c.column_default is not null)
        )
      then 'exact_candidate'
      else 'partial_or_drift'
    end as evidence_status
  from expected_columns ec
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = ec.table_name
   and c.column_name = ec.column_name
),
constraint_evidence as (
  select
    'Package C constraint evidence' as section_name,
    ec.version,
    ec.migration_file,
    'constraint' as evidence_group,
    'public.' || ec.table_name || '.' || ec.constraint_name as expected_item,
    'constraint definition must match migration intent' as expected_effect,
    coalesce(pg_get_constraintdef(con.oid), 'missing') as observed_value,
    case when con.oid is null then 'absent' else 'definition_for_review' end as evidence_status
  from expected_constraints ec
  left join pg_class c on c.relname = ec.table_name
  left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join pg_constraint con on con.conrelid = c.oid and con.conname = ec.constraint_name
),
index_evidence as (
  select
    'Package C index evidence' as section_name,
    ei.version,
    ei.migration_file,
    'index' as evidence_group,
    'public.' || ei.table_name || '.' || ei.index_name as expected_item,
    'index definition must match migration intent' as expected_effect,
    coalesce(i.indexdef, 'missing') as observed_value,
    case when i.indexname is null then 'absent' else 'definition_for_review' end as evidence_status
  from expected_indexes ei
  left join pg_indexes i
    on i.schemaname = 'public'
   and i.tablename = ei.table_name
   and i.indexname = ei.index_name
),
policy_evidence as (
  select
    'Package C policy evidence' as section_name,
    ep.version,
    ep.migration_file,
    'policy' as evidence_group,
    'public.' || ep.table_name || '.' || ep.policy_name as expected_item,
    'policy command/roles/qual/with_check must match migration intent' as expected_effect,
    coalesce('cmd=' || p.cmd || ', roles=' || p.roles::text || ', qual=' || coalesce(p.qual, 'null') || ', with_check=' || coalesce(p.with_check, 'null'), 'missing') as observed_value,
    case when p.policyname is null then 'absent' else 'definition_for_review' end as evidence_status
  from expected_policies ep
  left join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = ep.table_name
   and p.policyname = ep.policy_name
),
grant_evidence as (
  select
    'Package C grant evidence' as section_name,
    egt.version,
    egt.migration_file,
    'grant' as evidence_group,
    'public.' || egt.table_name || ' -> anon/authenticated/service_role' as expected_item,
    'table/view privileges must match migration intent' as expected_effect,
    coalesce(string_agg(distinct g.grantee || ':' || g.privilege_type, ', ' order by g.grantee || ':' || g.privilege_type), 'missing') as observed_value,
    case when count(g.privilege_type) = 0 then 'absent' else 'definition_for_review' end as evidence_status
  from expected_grant_tables egt
  left join information_schema.role_table_grants g
    on g.table_schema = 'public'
   and g.table_name = egt.table_name
   and g.grantee in ('anon', 'authenticated', 'service_role')
  group by egt.version, egt.migration_file, egt.table_name
),
comment_evidence as (
  select
    'Package C comment evidence' as section_name,
    ec.version,
    ec.migration_file,
    'comment' as evidence_group,
    case
      when ec.object_type = 'table' then 'public.' || ec.table_name
      else 'public.' || ec.table_name || '.' || ec.column_name
    end as expected_item,
    'comment must match migration safety intent where relevant' as expected_effect,
    coalesce(
      case
        when ec.object_type = 'table' then obj_description(c.oid, 'pg_class')
        else col_description(c.oid, a.attnum)
      end,
      'missing'
    ) as observed_value,
    case
      when (
        case
          when ec.object_type = 'table' then obj_description(c.oid, 'pg_class')
          else col_description(c.oid, a.attnum)
        end
      ) is null then 'absent'
      else 'definition_for_review'
    end as evidence_status
  from expected_comments ec
  left join pg_class c on c.relname = ec.table_name
  left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join pg_attribute a on a.attrelid = c.oid and a.attname = ec.column_name
),
safety_absence as (
  select
    'Package C safety absence evidence' as section_name,
    '20260531000000' as version,
    'step_metrics_release_proof_metadata.sql' as migration_file,
    'safety_absence' as evidence_group,
    'public.step_metrics.provider_message_id' as expected_item,
    'column must remain omitted' as expected_effect,
    case when c.column_name is null then 'omitted' else 'present' end as observed_value,
    case when c.column_name is null then 'exact_candidate' else 'drift' end as evidence_status
  from (select 1) one
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = 'step_metrics'
   and c.column_name = 'provider_message_id'
)
select * from relation_evidence
union all select * from column_evidence
union all select * from constraint_evidence
union all select * from index_evidence
union all select * from policy_evidence
union all select * from grant_evidence
union all select * from comment_evidence
union all select * from safety_absence
order by version, evidence_group, expected_item;
```

How to paste Package C results back:

- Section name: `68C.44 Package C user-run SQL Editor results`
- Include the project ref shown in Supabase.
- Include the SQL Editor role shown in the UI.
- Include the timestamp and timezone when the query was run.
- Paste the full query result table as CSV or JSON with these columns preserved:
  `section_name`, `version`, `migration_file`, `evidence_group`,
  `expected_item`, `expected_effect`, `observed_value`, `evidence_status`.
- If the SQL Editor only shows one table, paste that table; the Package C query
  is intentionally shaped as one combined result table.
- Screenshots may be attached as backup, but the pasted table/json is the
  release-manager evidence source.

68C.44 boundary:

- no migration repair is approved
- older migrations remain `MUST NOT REPAIR YET`
- `20260531000000` remains only a provisional candidate inside a full-baseline
  strategy
- no local DB, Supabase CLI, SQL, repair, `db push`, `db push --dry-run` or
  mutating DB command was run by Chat C

## 68C.45 Package C user-run SQL Editor results

Source and run context:

- Package C SQL was run manually by the user in Supabase SQL Editor
- query type: read-only `select` query from the 68C.44 Package C request
- project ref: `uiogylrpclamffhgkjki`
- SQL Editor role shown: `postgres`
- SQL Editor database shown: `Primary Database`
- exact SQL Editor run timestamp: not supplied in pasted result
- result received by Chat C: 2026-06-01 Europe/Oslo
- result shape: 112 CSV rows with `section_name`, `version`,
  `migration_file`, `evidence_group`, `expected_item`, `expected_effect`,
  `observed_value`, `evidence_status`

Package C result summary:

| Version | Rows | Package C statuses | Result interpretation |
|---|---:|---|---|
| `20260523000000` | 14 | `exact_candidate=4`, `definition_for_review=10` | Tables, constraints and indexes are present; full column, trigger/function, grants and RLS-intent evidence still needed. |
| `20260523000002` | 11 | `exact_candidate=1`, `definition_for_review=10` | Pilot table, policy, comments, constraints and indexes are present; full column/grant evidence still needed. |
| `20260524000000` | 8 | `exact_candidate=1`, `definition_for_review=7` | Engineering context table, constraints, indexes and service-role policy are present; full column/grant/comment evidence still needed. |
| `20260524000001` | 7 | `absent=7` | Language-policy migration effects are absent in Package C evidence; not repairable as applied. |
| `20260527000000` | 42 | `exact_candidate=10`, `definition_for_review=32` | Core tables and many definitions are present; full schema/column and reviewer definition comparison still needed. |
| `20260527000001` | 2 | `exact_candidate=1`, `definition_for_review=1` | `display_language` column and bounded check appear exact; repair still not approved. |
| `20260528000000` | 6 | `exact_candidate=1`, `definition_for_review=5` | `step_messages` table, correlation check, indexes and grants are present; full column/RLS review still needed. |
| `20260528000001` | 2 | `exact_candidate=1`, `definition_for_review=1` | `eval_case_id` column and partial index appear exact; repair still not approved. |
| `20260528000002` | 2 | `exact_candidate=1`, `definition_for_review=1` | `trace_events` view exists, but view definition and grant shape need review. |
| `20260528000003` | 3 | `exact_candidate=1`, `definition_for_review=2` | `engineering_context` column and both expression indexes appear exact; repair still not approved. |
| `20260531000000` | 15 | `exact_candidate=7`, `definition_for_review=8` | Trace-readiness metadata evidence appears exact; still only a provisional candidate inside a full-baseline strategy. |

Package C absent evidence rows:

| Version | Migration | Evidence group | Expected item | Status |
|---|---|---|---|---|
| `20260524000001` | `engineering_context_language_policy.sql` | column | `public.engineering_context_events.detected_prompt_language` | absent |
| `20260524000001` | `engineering_context_language_policy.sql` | column | `public.engineering_context_events.fallback_language` | absent |
| `20260524000001` | `engineering_context_language_policy.sql` | column | `public.engineering_context_events.output_mode` | absent |
| `20260524000001` | `engineering_context_language_policy.sql` | comment | `public.engineering_context_events.language` | absent |
| `20260524000001` | `engineering_context_language_policy.sql` | comment | `public.engineering_context_events.output_mode` | absent |
| `20260524000001` | `engineering_context_language_policy.sql` | constraint | `public.engineering_context_events.engineering_context_events_fallback_language_check` | absent |
| `20260524000001` | `engineering_context_language_policy.sql` | constraint | `public.engineering_context_events.engineering_context_events_output_mode_check` | absent |

Package C classification update:

- `20260527000001`, `20260528000001`, `20260528000003` and
  `20260531000000` now have exact effect evidence in the matrix
- `20260524000001` is updated to `absent`; it needs owner decision before any
  deploy or baseline action
- larger foundational/core migrations remain `partial` because Package C did
  not prove every column, trigger/function, grant, policy or definition detail
- no migration repair is approved from Package C
- older migrations remain `MUST NOT REPAIR YET` unless Big Brain explicitly
  approves a later repair version after backup/PITR and ledger planning
- `20260531000000` remains only a provisional candidate inside a full-baseline
  strategy
- `diagnostic_only=true`
- release-proof mode remains disabled
- `provider_message_id` remains omitted

68C.45 boundary:

- Chat C did not run local DB commands, Supabase CLI, SQL, repair, `db push` or
  `db push --dry-run`
- no mutating DB work occurred
- Package C was user-run manually in Supabase SQL Editor with a read-only
  `select` query

## 68C.46 repair-decision review

Purpose: classify the documented Package A/B/C evidence into a repair-decision
review before any mutating Supabase action. This section does not approve or
execute repair.

Decision labels:

```txt
DO NOT REPAIR
NEEDS MORE EVIDENCE
PROVISIONAL REPAIR CANDIDATE
EXACT-EVIDENCE REPAIR CANDIDATE
```

Global repair blockers:

- Big Brain approval is required before repair for every candidate version
- backup/rollback/PITR evidence is blocking for every repair candidate
- current remote migration ledger state must be confirmed immediately before
  any repair command
- no migration may be repaired from table-presence evidence alone
- no `partial`, `absent`, `drift` or `unknown` migration may be repaired as
  applied
- `diagnostic_only=true`
- release-proof mode remains disabled
- `provider_message_id` remains omitted

Repair-decision matrix:

| Version | Migration file | Current evidence basis | Decision label | Repair blockers / next action |
|---|---|---|---|---|
| `20260523000000` | `pilar_intelligence_foundation.sql` | Package C proves relation, constraint and index presence only; full columns, triggers/functions, grants and RLS-intent are still incomplete. | NEEDS MORE EVIDENCE | Need full Package C follow-up for columns, triggers/functions, grants and RLS intent. No repair from partial evidence. |
| `20260523000002` | `pilot_readiness_feedback.sql` | Package C proves table, policy, comments, constraints and indexes; full column shape and grants remain incomplete. | NEEDS MORE EVIDENCE | Need full column/grant evidence. No repair from table/policy presence alone. |
| `20260524000000` | `engineering_context_events.sql` | Package C proves table, constraints, indexes and service-role policy; full columns, grants and comment intent remain incomplete. | NEEDS MORE EVIDENCE | Need full column/grant/comment audit and owner review of policy exactness. |
| `20260524000001` | `engineering_context_language_policy.sql` | Package C shows all requested columns, constraints and comments absent. | DO NOT REPAIR | Must not mark applied. Needs owner decision: absent deploy, intentional supersession or drift. |
| `20260527000000` | `pilar_core_pipeline.sql` | Package C proves core table presence and many definitions; full schema/column and reviewer definition comparison remain incomplete. | NEEDS MORE EVIDENCE | Need full schema/column comparison plus definition review. No repair from partial core evidence. |
| `20260527000001` | `run_display_language.sql` | Package C shows nullable `display_language` with no default and bounded check definition. | EXACT-EVIDENCE REPAIR CANDIDATE | Candidate only; Big Brain approval, backup/PITR, rollback plan and fresh ledger check required before any repair. |
| `20260528000000` | `step_messages.sql` | Package C proves table, correlation check, indexes and grants; full columns and RLS/policy semantics remain incomplete. | NEEDS MORE EVIDENCE | Need full column audit and RLS/grant review. No repair from partial trace-table evidence. |
| `20260528000001` | `eval_case_id.sql` | Package C shows nullable `eval_case_id` and partial index where `eval_case_id is not null`. | EXACT-EVIDENCE REPAIR CANDIDATE | Candidate only; Big Brain approval, backup/PITR, rollback plan and fresh ledger check required before any repair. |
| `20260528000002` | `trace_events_view.sql` | Package C shows `trace_events` view exists and grants exist; view definition and safe selected payload shape were not audited. | NEEDS MORE EVIDENCE | Need view definition diff and grant review before repair consideration. |
| `20260528000003` | `engineering_context_per_run.sql` | Package C shows nullable `engineering_context` jsonb and both expression indexes. | EXACT-EVIDENCE REPAIR CANDIDATE | Candidate only; Big Brain approval, backup/PITR, rollback plan and fresh ledger check required before any repair. |
| `20260531000000` | `step_metrics_release_proof_metadata.sql` | Package A/B/C prove nullable fields, no defaults, bounded checks, trace-readiness comments, `provider_message_id` omission and raw-message exclusion. | EXACT-EVIDENCE REPAIR CANDIDATE | Candidate only inside full-baseline strategy; Big Brain approval, backup/PITR, rollback plan and fresh ledger check required. No release-proof enabling. |

Candidate summary:

- `DO NOT REPAIR`: `20260524000001`
- `NEEDS MORE EVIDENCE`: `20260523000000`, `20260523000002`,
  `20260524000000`, `20260527000000`, `20260528000000`, `20260528000002`
- `PROVISIONAL REPAIR CANDIDATE`: none after Package C review
- `EXACT-EVIDENCE REPAIR CANDIDATE`: `20260527000001`,
  `20260528000001`, `20260528000003`, `20260531000000`

68C.46 boundary:

- no migration repair is approved
- no Supabase migration repair was run
- no `db push` or `db push --dry-run` was run
- no mutating SQL or DB work occurred
- no local Supabase CLI or SQL was run by Chat C

## 68C.47 repair-preflight package

Big Brain decision for this sprint:

- GO for repair-preflight documentation only
- NO-GO for actual repair execution

Confirmed repair-preflight target:

- production project ref: `uiogylrpclamffhgkjki`
- exact-evidence candidates only:
  - `20260527000001`
  - `20260528000001`
  - `20260528000003`
  - `20260531000000`

Blocking preconditions before any later repair execution:

1. Big Brain gives a later explicit execution GO for repair.
2. Backup/PITR is confirmed for project `uiogylrpclamffhgkjki`.
3. Rollback/recovery plan is documented with owner, restore path and incident
   decision point.
4. Fresh read-only migration ledger check is run immediately before execution.
5. Fresh ledger state still matches the expected state for the four exact
   candidates and does not reveal surprise applied versions.
6. `diagnostic_only=true` is reconfirmed.
7. Release-proof mode remains disabled.
8. `provider_message_id` remains omitted.

Future repair command list if all execution gates pass:

```bash
supabase migration repair --status applied 20260527000001
supabase migration repair --status applied 20260528000001
supabase migration repair --status applied 20260528000003
supabase migration repair --status applied 20260531000000
```

These commands are documented for a later explicit execution sprint only. They
are not approved or run in 68C.47.

Explicitly excluded versions:

| Decision | Versions |
|---|---|
| DO NOT REPAIR | `20260524000001` |
| NEEDS MORE EVIDENCE | `20260523000000`, `20260523000002`, `20260524000000`, `20260527000000`, `20260528000000`, `20260528000002` |

Execution gate:

- no repair unless Big Brain gives a later explicit execution GO
- no repair unless backup/PITR and rollback plan are confirmed
- no repair unless fresh ledger check still matches expected state
- no repair if any excluded version appears in the command plan
- no repair if production project ref is anything other than
  `uiogylrpclamffhgkjki`
- no repair if release-proof mode is enabled or `diagnostic_only=false`
- no repair if `provider_message_id` appears in `step_metrics`

Forbidden now:

- no `supabase migration repair`
- no `supabase db push`
- no `supabase db push --dry-run`
- no mutating SQL
- no local Supabase CLI
- no local SQL
- no DB schema changes
- no release-proof enabling

68C.47 boundary:

- no migration repair is approved
- no repair command was run
- no DB/Supabase CLI/SQL/repair/push/dry-run command was run by Chat C
- no mutating DB work occurred
- exact candidates remain blocked by Big Brain execution GO, backup/PITR,
  rollback plan and fresh ledger check

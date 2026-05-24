# Sprint 30 — Pilot Readiness MVP

## Goal

Prepare PILAR for a controlled pilot with student/test users.

This sprint adds:

- Public pilot onboarding page with example tasks
- Admin pilot dashboard
- Pilot feedback route
- Report feedback page
- Pilot feedback Supabase table
- Simple pilot metrics endpoint
- Basic readiness checklist

## New pages

```txt
/pilot
/admin/pilot
/rapport/[run_id]/feedback
```

## New API routes

```txt
/api/pilot/feedback
/api/admin/pilot/metrics
```

## New Supabase migration

```txt
supabase/migrations/20260523000002_pilot_readiness_feedback.sql
```

Run it in Supabase SQL Editor before testing feedback.

## Test checklist

1. Run migration in Supabase.
2. Build locally.
3. Open `/pilot` and inspect example tasks.
4. Open a report and manually navigate to `/rapport/[run_id]/feedback`.
5. Submit feedback.
6. Open `/admin/pilot` and verify feedback appears.
7. Test Stone and Graphite themes.

## Notes

The feedback page is standalone in this sprint, so it does not require risky edits to the main report page. A later sprint can add a visible button on the report page:

```txt
Gi pilotfeedback
```

or place it near:

```txt
Rapporter feil
Vis kun beregninger
```

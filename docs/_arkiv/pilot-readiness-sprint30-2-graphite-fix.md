# Sprint 30.2 — Pilot Graphite theme fix

Fixes Sprint 30 pilot pages using `data-palette` instead of only `data-theme`.

Affected pages:

- `/pilot`
- `/admin/pilot`
- `/rapport/[run_id]/feedback`

The issue was that `ThemeToggle` writes the active theme to `<html data-palette="...">`, while the Sprint 30 CSS only targeted `[data-theme="..."]`. This caused mixed theme variables: dark cards with dark text, or light page backgrounds in Graphite mode.

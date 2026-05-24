# Sprint 30.1 — Pilot pages locale/theme fix

This patch adds the same locale pattern used by the admin pages to Sprint 30 pages.

## Updated pages

- `/pilot`
- `/admin/pilot`
- `/rapport/[run_id]/feedback`

## Changes

- Uses `useLocale()` instead of manual `?lang=` handling.
- Adds bokmål/nynorsk copy for all visible labels and actions.
- Keeps Stone/Graphite CSS variables active on the Sprint 30 pages.
- Stores active locale in pilot feedback metadata.

## Reminder

All new PILAR pages should include:

1. `useLocale()` or server-side locale resolution.
2. Bokmål and nynorsk copy maps.
3. Theme variables compatible with Slate, Stone and Graphite.
4. No hardcoded long-lived Norwegian-only labels unless the page is intentionally single-locale.

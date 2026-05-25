# Sprint 30.2 — Pilot/admin-stabilisering

Denne sprinten stabiliserer pilot- og adminflyten før internasjonal versjon.

## Endringar

- `/pilot` use aktiv locale (`nb`/`nn`) i staden for manuell query-parameter.
- `/admin/pilot` har bokmål/nynorsk og fungerer med Stone/Graphite.
- `/rapport/[run_id]/feedback` har bokmål/nynorsk og lagrar aktiv locale i feedback-metadata.
- Pilot-CSS støttar både `data-palette` og `data-theme` for Graphite/Stone.
- `/api/admin/pilot/metrics` er stabilisert:
  - ingen `any` i `CountClient`
  - `safeCount()` returnerer `{ count, error }`
  - `calculation_runs` teljast med `started_at`, sidan tabellen ikkje har `created_at`
  - `reports`, `error_reports` og `pilot_feedback` teljast med `created_at`

## Test

Køyr:

```bash
rm -rf .next
npm test
npm run lint
npm run build
npm run dev
```

Sjekk manuelt:

- `/pilot`
- `/admin/pilot`
- `/rapport/[run_id]/feedback`

I begge språk:

- Bokmål
- Nynorsk

Og alle tema:

- Slate
- Stone
- Graphite

## Akseptansekrav

- Build er grønt.
- Ingen TypeScript-feil i pilot metrics-route.
- Ingen lint-error frå `no-explicit-any` i pilot metrics-route.
- Graphite viser ikkje mørk tekst på mørk bakgrunn.
- Pilotfeedback kan sendast inn og visast i `/admin/pilot`.

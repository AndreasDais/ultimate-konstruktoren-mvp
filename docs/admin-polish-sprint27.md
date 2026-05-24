# Sprint 27 — Admin polish + theme support

## Mål

Gjer admin-opplevinga meir navigerbar og ryddar Stone/Graphite-tema på sidene som vart lagt til i dei siste sprintane.

## Endringar

- Ny `/admin`-forside med lenker til:
  - Operating Intelligence
  - Feilrapportar
  - Workbench
  - Mine rapportar
- Admin-login redirectar no til `/admin` som standard i staden for `/admin/error-reports`.
- Graphite er aktivert i temaveljaren.
- Tema-init i `app/layout.tsx` godtek `graphite`.
- `/admin/intelligence` har no admin-navigasjon tilbake til `/admin`, feilrapportar og workbench.
- `intelligence.css` er flytta frå hardkoda slate-fargar til designsystem-variablar.
- Beregningsark-sida (`/rapport/[run_id]/beregning`) brukar no `var(--bg)`, `var(--surface)`, `var(--fg)` osv., slik at Stone/Graphite fungerer betre.

## Test

1. `npm run debug:sweep`
2. `npm run build`
3. Gå til `/admin`
4. Test lenker til `/admin/intelligence` og `/admin/error-reports`
5. Bytt tema mellom Stone og Graphite
6. Sjekk `/rapport/[run_id]/beregning` i Stone og Graphite

# Calculation Sheet Sprint 17 — LaTeX-kvalitet og aligned-miljø

Denne sprinten forbedrer beregningsarket slik at det blir mer direkte nyttig i prosjektoppgaver, bachelor og master.

## Endringer

- Equation lines i stegvis beregning blir samlet i `aligned`-miljø i LaTeX.
- Forklaringstekst får fjernet rene formellinjer, slik at beregningssiden ikke viser samme utregning dobbelt.
- LaTeX-eksporten får bedre enhetsformat med `\mathrm{...}` for kN, kNm, kN/m, MPa osv.
- `.tex`-endpointen støtter nå to varianter:
  - standard: section-only, til å lime inn i eksisterende Overleaf-rapport
  - `?mode=full`: komplett LaTeX-dokument med preamble
- Beregningssiden får knapp for `Full LaTeX`.

## Endrede filer

- `lib/report/calculation-sheet-model.ts`
- `lib/report/render-calculation-latex.ts`
- `app/api/rapport/[run_id]/calculation/latex/route.ts`
- `app/rapport/[run_id]/beregning/page.tsx`

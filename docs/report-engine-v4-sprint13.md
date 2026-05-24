# PILAR Report Engine v4 — Sprint 13

## Mål

Siste tekniske finpuss før ekstern estetikkrunde: rapportane skal lese som ferdige fagnotat, ikkje rå agent-/kode-output.

## Endringar

- Normaliserer titteltypografi:
  - `Bjelke—moment og skjær` → `Bjelke — moment og skjær`
  - `IPE300` → `IPE 300`
- Normaliserer limitations/«Hva er ikke beregnet» gjennom same syntaksfilter som resten av rapporten.
- Fjernar fleire restar av rå notasjon:
  - `M_Ed` → `MEd`
  - `V_Ed` → `VEd`
  - `q_Ed` → `qEd`
  - `g_k` → `gk`
  - `M_Rd` → `MRd`
  - `V_Rd` → `VRd`
  - `A_v` → `Av`
  - `f_y` → `fy`
  - `t_f` → `tf`
  - `W_pl,y` → `Wpl,y`
- Forsida brukar kort statusoppsummering utan ellipsis i staden for å klippe lang kontrollørtekst.

## Designgrense

Sprinten endrar ikkje rapportlayouten. Målet er reint innhald og stabil notasjon før vidare estetisk arbeid.

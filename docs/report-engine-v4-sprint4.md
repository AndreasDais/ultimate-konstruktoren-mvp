# PILAR Report Engine v4 — Sprint 4

## Mål

Sprint 4 ryddar i rapportmodellen før meir layoutarbeid:

- Betre tekniske visningsnamn for resultat (`E_d,dim`, `γ_G,6.10a`, `ψ_0,q`).
- Deduping av like resultat frå Engineer Engineer A and Engineer B når agentane use ulike nøkkelvariantar.
- Nøkkelresultat på forsida prioriterer hovudresultat framfor interne faktorar.
- PDF-forsida use enkel resultatliste i staden for pressa tabell/grid.
- Word fjernar dupliserte overskrifter for avgrensingar/advarslar.

## Kvifor

Tidlegare kom resultat som `Ed_6_10b_q` og `Ed_6_10b_q_lead` som separate rader sjølv om dei er same verdi. Det gav lange og unødvendige kontrolltabellar. Subscript-rendering på forsida gjorde også at PDF-tekst kunne sjå ut som `q k dim` i staden for robuste tekniske etikettar.

Sprinten flyttar denne oppryddinga inn i `ReportModel`, slik at både PDF, Word og etter kvart web får same reinare struktur.

## Endra filer

- `lib/report/normalize-report-model.ts`
- `lib/report/build-report-model.ts`
- `lib/report/render-docx.ts`
- `app/rapport/[run_id]/page.tsx`
- `app/rapport/[run_id]/rapport.css`

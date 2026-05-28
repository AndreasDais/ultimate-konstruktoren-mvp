# PILAR Report Engine v4 — Sprint 6

## Mål

Koble web/PDF-visinga tettare på `ReportModel`, spesielt dei delane som gir mest layout-problem i PDF:

- resultat-tabellen
- konstruktørkontroll-tabellen
- Word-formelblokkar

## Endringar

- `app/rapport/[run_id]/page.tsx`
  - Resultat-tabellen les no frå `reportModel.calculation.resultRows`.
  - Kontrolltabellen les no frå `reportModel.control.comparisonRows`.
  - Dette gir normaliserte labels som `E_d,dim`, `E_d,6.10a`, `ψ_0,q`, `γ_G,6.10a` i staden for rå agent-keys/renderMathKey-output.

- `app/rapport/[run_id]/rapport.css`
  - La til print-reglar for stabile ReportModel-labels.
  - Hindrar at labels blir brotne opp til isolerte subscript-fragment i PDF.

- `lib/report/render-docx.ts`
  - Fiksa Sprint 5-typefeil (`after` i staden for `spacingAfter`).
  - Word viser færre dupliserte formelboksar når prosaen allereie har stegvis utrekning.
  - La til enklare konvertering av `\\quad`, `\\rightarrow`, `\\to`, `\\Rightarrow`.

## Kvifor dette er viktig

Sprint 6 flyttar meir av rapportvisinga frå rå agentdata til stabil `ReportModel`. Dette gjer rapportane meir føreseielege, lettare å style og mindre såronly for at agentane use ulike nøkkelnamn.

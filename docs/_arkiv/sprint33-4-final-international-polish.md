# Sprint 33.4 — Final international polish

Goal: remove the last visible Norwegian/product-layer leftovers in the United States + AISC/ASCE/ACI pilot flow.

Targets:

1. Calculation sheet PDF: `UNDEFINED 01` -> `STEP 01`.
2. Calculation sheet Word/PDF footer: `Side` -> `Page` when `displayLanguage = en`.
3. Full report: polish remaining Norwegian controller/disclaimer/status strings.
4. Result labels: improve `Lptypical`, `Lrtypical`, `Lspan`, `loadfactor,D`, `loadfactor,L`, `phibMpupperbound`, `LTBzone`, `LTBregime`.
5. Generated text polish: `Engineer A/B` -> `Engineer A/B`, `Comparator` -> `Comparator`, `PRELIMINARY` -> `PRELIMINARY`, etc.

Acceptance criteria:

- `npx tsc --noEmit --pretty false` passes.
- `npm run debug:sweep` passes.
- `npm run build` passes.
- `/rapport/[run_id]/beregning` and its PDF export show `STEP 01`, not `UNDEFINED 01`.
- Calculation sheet PDF/DOCX use `Page`, not `Side`, in English context.
- Full report has fewer Norwegian leftovers in the AISC/ASCE flow.

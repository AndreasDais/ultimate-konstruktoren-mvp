# PILAR Report Engine v4 — Sprint 2

## Mål

Sprint 2 koblar Word-eksporten til `ReportModel` og legg på print-hardening for PDF/web-rapporten.

Dette er eit steg frå «rapport som renderer rå agentdata» til «rapport som følger ein fast mal».

## Endra område

- `lib/report/render-docx.ts`
  - Ny DOCX-renderer som tek `ReportModel` som input.
  - QR-kode er eit fast hovudelement på forsida.
  - Nøkkelresultat blir vist som ryddig liste/kort, ikkje skvist tabell.
  - Formel/prosa-steg blir vist i stabile monospace-boksar.
  - Pipeline-status, tillit, disclaimer, kontrolløravgjerd og signaturfelt kjem frå same rapportmodell.

- `app/api/rapport/[run_id]/word/route.ts`
  - Hentar framleis data via Agent E-endepunktet.
  - Bygger `ReportModel` med `buildReportModel()`.
  - Validerer med `validateReportModel()`.
  - Sender modellen til `renderReportModelDocx()`.

- `app/rapport/[run_id]/rapport.css`
  - Print-overrides som gjer forsideresultat mindre skvist.
  - QR-kortet får fastare plass i A4-layout.
  - Store tekniske seksjonar får bryte naturleg over sider.
  - Tabellrader og små kort blir haldne samla, men heile store seksjonar blir ikkje låste til éi side.

## Viktig prinsipp

Agent E skal framleis vere rapportredaktør, men ikkje layoutmotor. Layouten blir bestemt av rendererane.

## Test

Køyr:

```bash
rm -rf .next
npm run debug:sweep
npm run build
npm run dev
```

Test etterpå:

- Last ned Word
- Last ned PDF
- QR-kode på første side
- Nøkkelresultat på første side
- Lange berekningssteg
- Rapport med advarslar
- Rapport med manglande input

## Kjent vidare arbeid

- Web-sida bør etter kvart også lese direkte frå `ReportModel`.
- Agent E bør i Sprint 4 få strengare rapportkontrakt og tekstlengdegrenser.
- PDF kan seinare få eigen server-side Playwright-route for meir deterministisk eksport.

# PILAR Report Engine v4 — Sprint 2

## Kva er nytt

Sprint 2 koblar Word-eksporten til den nye `ReportModel` frå Sprint 1 og legg på ekstra print-hardening for PDF-layouten.

## Endra filer

```txt
lib/report/render-docx.ts
app/api/rapport/[run_id]/word/route.ts
app/rapport/[run_id]/rapport.css
docs/report-engine-v4-sprint2.md
```

## Viktige endringar

- Ny `renderReportModelDocx(model)` som byggjer Word frå `ReportModel`.
- Word-ruta er redusert frå ein stor rådata-renderer til ei tynn rute:
  - hentar Agent E-data
  - byggjer ReportModel
  - validerer modellen
  - renderer DOCX
- QR-kode og nettversjon/pipeline er fast del av Word-malen.
- Nøkkelresultat på forsida er meir som eit lesbart resultatkort, ikkje skvist tabell.
- Formel/prosa-steg i Word blir vist i stabile monospace-boksar.
- PDF print-CSS er stramma inn:
  - store seksjonar får bryte naturleg
  - små kort og tabellrader blir halde samla
  - forside-resultat blir listeliknande, ikkje tabellskvist
  - QR-kortet får meir stabil A4-plass

## Test lokalt

```bash
cd /c/Users/rayma/Code/ultimate-konstruktoren-mvp
unzip -o /c/Users/rayma/Downloads/pilar-report-engine-v4-sprint2-files-only.zip -d .
rm -rf .next
npm run debug:sweep
npm run build
npm run dev
```

Test særleg:

- Last ned Word
- Last ned PDF
- QR-kode på første side
- Nøkkelresultat på første side
- Lange berekningssteg
- Kontroll/signatur på siste side

## Neste sprint

Sprint 3 bør koble web/PDF-sida gradvis til `ReportModel`, slik at web, PDF og Word use same rapportkontrakt.

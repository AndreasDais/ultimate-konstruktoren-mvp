# PILAR Report Engine v4

Dette dokumentet definerer neste rapportarkitektur for PILAR.

## Mål

Rapportar skal ikkje lenger vere direkte avhengige av tilfeldig agent-output og renderer-spesifikk tolking. Alle eksportar skal gå via ein felles `ReportModel`.

```txt
Agent-/pipeline-data
  -> buildReportModel()
  -> normalizeReportModel()
  -> validateReportModel()
  -> Web / PDF / Word
```

## Prinsipp

- Agent E er rapportredaktør, ikkje layoutmotor.
- Koden eig layout, QR, sideskift, tabellar og signaturfelt.
- ReportModel er kontrakten mellom AI-pipeline og renderer.
- PDF og Word skal vere eigne publiseringsformat, ikkje direkte spegling av web.

## Sprint 1

Lagt til:

- `lib/report/report-model.ts`
- `lib/report/build-report-model.ts`
- `lib/report/normalize-report-model.ts`
- `lib/report/validate-report-model.ts`
- `lib/report/report-template.ts`
- `lib/report/build-report-model.test.ts`

Dette er fundamentet. Det endrar ikkje rapportlayouten direkte endå.

## Neste steg

1. Bruk `buildReportModel()` i Word-renderer.
2. Bruk `buildReportModel()` i rapport-websida.
3. Bygg print-only PDF basert på `ReportModel`.
4. Stram Agent E-output til å passe modellen.
5. Legg til visuell regression-test for PDF/Word.

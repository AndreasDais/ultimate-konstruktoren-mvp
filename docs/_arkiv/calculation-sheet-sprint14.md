# PILAR Calculation Sheet — Sprint 14

## Mål

Denne sprinten introduserer første MVP av **Vis kun beregninger**:

- eigen beregningsside: `/rapport/[run_id]/beregning`
- LaTeX-export: `/api/rapport/[run_id]/calculation/latex`
- knapp frå full rapport til beregningsarket
- kopier-LaTeX frå beregningssida
- print/PDF via browser print frå beregningssida

## Avgrensing

Dette er Sprint A+B frå planen:

1. Beregningsside
2. LaTeX-export

Word-export og server-generert PDF kjem i neste sprint.

## Modellflyt

```txt
ReportModel
  → buildCalculationSheetModel()
  → calculation sheet page
  → renderCalculationSheetLatex()
```

## Test

```bash
rm -rf .next
npm run debug:sweep
npm run build
npm run dev
```

Gå til ein rapport og trykk **Vis kun beregninger**.

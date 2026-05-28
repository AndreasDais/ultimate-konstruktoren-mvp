# PILAR Report Engine v4 — Sprint 3

Sprint 3 focuses on stabilising the visible PDF/Word output after Sprint 2 introduced `ReportModel` for Word.

## Goals

- Make the PDF cover deterministic: QR/pipeline access must always render, even if print starts before React has finished setting `rapportUrl` in an effect.
- Use `ReportModel.keyResults` for the cover result strip instead of ad-hoc result key selection.
- Prevent the trust-score breakdown from squeezing into a narrow cover column in print.
- Reduce fragile/duplicated rendered math in PDF exports; the readable prose calculation remains visible.
- Improve Word formula handling so raw LaTeX such as `\frac{...}{...}` does not become `frac...` text.

## Changed files

- `app/rapport/[run_id]/page.tsx`
- `app/rapport/[run_id]/rapport.css`
- `lib/report/render-docx.ts`
- `docs/report-engine-v4-sprint3.md`

## QA focus

1. Export a PDF and check that page 1 includes:
   - metadata
   - QR/pipeline card
   - key results
   - compact trust score
   - disclaimer
2. Ensure the trust-score breakdown is not shown as a narrow squeezed column in PDF.
3. Ensure Word calculation steps do not show raw LaTeX text like `fracq_Ed`.
4. Ensure PDF calculation steps have readable text blocks and do not overlap later sections.
5. Run:
   - `npm run debug:sweep`
   - `npm run build`

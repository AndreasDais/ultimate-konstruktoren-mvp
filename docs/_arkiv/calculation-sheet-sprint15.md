# Calculation Sheet Sprint 15

Sprint 15 adds a dedicated Word export for the calculation sheet.

## Added

- `lib/report/render-calculation-docx.ts`
- `app/api/rapport/[run_id]/calculation/word/route.ts`
- Word download button on `/rapport/[run_id]/beregning`

## Purpose

The full report is documentation-heavy. The calculation sheet Word export is meant for students and engineers who want a clean, editable calculation appendix for project work, bachelor reports, master reports or internal checking notes.

## Design rules

- No QR, trust score, pipeline cards or full controller narrative.
- Keep given data, assumptions, calculation steps, results and notes.
- Render symbols with Word subscript/superscript where possible.
- Keep formulas editable as text, not images.
- Include a small footer with document ID and page number.

## Test

```bash
npm run debug:sweep
npm run build
npm run dev
```

Then open a report, click **Vis kun beregninger**, and test **Last ned Word**.

# PILAR Report Engine v4 — Sprint 5

Sprint 5 is a small stability/presentation sprint based on exported PDF/DOCX review.

## Changes

- Hides the repeated print footer in PDF exports.
  - The cover already contains QR code and pipeline access.
  - This prevents a footer-only/orphan final page when the signature block ends near the bottom of the previous page.
- Keeps the web footer unchanged.
- Makes Word constructor-control a readable summary instead of a full variable dump.
  - Shows the first 8 highest-priority comparison rows.
  - Adds a note that the complete variable/pipeline trace is available through the online report.

## Acceptance checks

1. PDF should end on the control/signature page, not on a mostly blank footer-only page.
2. QR/pipeline access must still be visible on the cover page.
3. Word should remain editable and readable.
4. Word constructor-control should not dominate the report when many intermediate variables exist.
5. `npm run debug:sweep` and `npm run build` should pass locally.

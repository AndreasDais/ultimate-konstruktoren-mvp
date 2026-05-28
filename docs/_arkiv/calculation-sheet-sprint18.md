# Calculation Sheet Sprint 18

Polish pass for calculation sheet UX and exports.

## Changes

- Removed the browser `Skriv ut` button because it overlaps conceptually with `Last ned PDF`.
- Kept one primary PDF action: `Last ned PDF`.
- Reduced duplicate formula output by preferring equation lines extracted from step prose over compact raw formula fields.
- Tightened equation detection so ordinary prose such as `x = L/2` explanations are not rendered as display equations.
- Collapsed accidentally double-escaped LaTeX commands such as `\\gamma_G` to `\gamma_G`.

## Goal

The calculation sheet should feel like a clean student-ready appendix: one PDF button, clean `.tex`, fewer duplicates, and better math syntax.

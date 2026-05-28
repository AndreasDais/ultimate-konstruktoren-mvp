# Calculation Sheet Sprint 21

Focus: final symbol and equation polish for EC3 buckling calculation sheets.

## Changes

- Normalize EC3 buckling labels more aggressively: `alpha_z`, `lambda_1`, `barlambda_z`, `phi_z`, `chi_z`, `GammaM1`.
- Normalize calculation step titles, not only body text.
- Wrap single-line equations containing `&=` in `aligned` so exported LaTeX is valid.
- Improve LaTeX unit handling for `mm^2`, `cm^2`, `cm^4`, `N/mm^2` and related units.
- Ignore non-calculation note formulas such as `GammaM1 = ...` in the calculation-sheet formula blocks.
- Preserve the existing calculation-sheet routes and exports.

## Test

Regenerate HEB 200 buckling calculation sheet and inspect PDF, Word and `.tex`.

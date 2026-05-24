# Calculation Sheet Sprint 22

Mål: gjere beregningsark-eksportane meir konsistente på tvers av web/PDF, Word og LaTeX.

## Endringar

- Brukar same symbolnormalisering i fleire eksportbaner.
- Word-tabellar viser no menneskelege labels som `αz`, `λ1`, `χz`, `φz` i staden for rå `alpha_z`, `lambda_1`, `chi_z`, `phi_z`.
- Word-formelblokker er gjort meir robuste ved å bruke ryddig tekstbasert beregningssyntaks i monospace, i staden for halv-parsa LaTeX.
- Web/PDF-beregningssida viser no formeltekst frå `formula.plain` for meir stabil print/PDF.
- Betre normalisering av EC3/knekkingssymbol i beregningsark:
  - `alpha_z` / `alphaz` → `αz`
  - `lambda_1` / `lambda1` → `λ1`
  - `barlambda_z` / `lambdazbar` → `λ̄z`
  - `phi_z` / `phiz` → `φz`
  - `chi_z` / `chiz` → `χz`
  - `GammaM1` / `gammaM1` → `γM1`
- Betre einingsnormalisering for `mm²`, `cm²`, `cm³`, `cm⁴`, `N/mm²`.
- Stramma LaTeX-normalisering slik at ord som `norsk` ikkje blir øydelagde av `sk`-symbolbehandling.

## Testfokus

1. HEB 200-knekkerapport:
   - Word: ingen `alpha_z`, `lambda_1`, `barlambda_z`, `phi_z`, `chi_z` i tabellar eller formelblokker.
   - PDF: formelblokker skal vere lesbare, ikkje øydelagde av overlinje-/rot-rendering.
   - LaTeX: skal framleis bruke ekte LaTeX-symbol som `\alpha_z`, `\lambda_1`, `\bar{\lambda}_z`, `\phi_z`, `\chi_z`, `N_{b,Rd}`.
2. Lastkombinasjon:
   - Ingen `\\gamma_G`, `F_{E_{d,...}}` eller `text kN/m` i LaTeX.
3. Enkel bjelke:
   - Framleis kompakt og lett å lese.

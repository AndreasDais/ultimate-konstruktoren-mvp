# Calculation Sheet Sprint 20

Focus: betre matematisk notasjon for beregningsark, særleg knekk/stålrapportar.

Endringar:

- Legg til LaTeX/visingsstøtte for fleire EC3-symbol:
  - `alpha`, `alphaz` → `\alpha`, `\alpha_z`
  - `lambda1` → `\lambda_1`
  - `lambdazbar` / `lambdabarz` → `\bar{\lambda}_z`
  - `phiz` → `\phi_z`
  - `chiz` → `\chi_z`
  - `NbRd` / `Nb,Rd` → `N_{b,Rd}`
  - `Lcr`, `iz`, `Iz`, `gammaM1`
- Pakkar einslege `&=`-formlar i `aligned` slik at LaTeX ikkje får feil matematikkmiljø.
- Konverterer enkle `sqrt(...)`, `pi`, `²` og `³` meir robust i LaTeX.
- Normaliserer tekst i føresetnader og merknader for fleire stål-/knekkesymbol.

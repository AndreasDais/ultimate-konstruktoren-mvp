# Calculation Sheet Sprint 19 — equation syntax cleanup

Målet med denne sprinten er å gjere beregningsarket meir brukbart i PDF, Word og LaTeX ved å rydde opp i formeluttrekk frå agenttekst.

## Endringar

- Meir robust deteksjon av utrekningslinjer i stegvis berekning.
- Fjernar utrekningslinjer frå forklaringsteksten når dei same linjene blir vist som formelblokk.
- Hindrar duplisering mellom prosa og formelblokk.
- Fiksar dobbel escaping i LaTeX, til dømes `\\gamma_G`.
- Normaliserer `FEd,6.10a`, `FEd,6.10b,q` og liknande til `E_{d,...}`.
- Fiksar `ψ₀q` / `ψ₀s` til `\psi_{0,q}` / `\psi_{0,s}`.
- Reduserer `text kN/m`-artefaktar ved å bruke `\mathrm{...}`.

## Test

Regenerer beregningsark for lastkombinasjon og sjekk:

- Ingen `\\gamma_G` i `.tex`.
- Ingen doble formelblokkar for same steg.
- Ingen `text kN/m` i Word/PDF.
- Stegvis berekning er lesbar både i web, PDF, Word og LaTeX.

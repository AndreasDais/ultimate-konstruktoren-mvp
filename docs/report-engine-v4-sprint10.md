# PILAR Report Engine v4 — Sprint 10

Mål: rapporttekst skal lese som eit ferdig fagnotat, ikkje som rå kode-/agent-output.

## Endringar

- Innført global rapportnormalisering som fjernar tekniske understrekar frå rapporttekst.
- Symbol blir presenterte utan `_`, til dømes:
  - `M_Ed` → `MEd`
  - `q_k` → `qk`
  - `E_d,dim` → `Ed,dim`
  - `γ_G` → `γG`
  - `ψ_0,q` → `ψ0,q`
  - `M_pl,Rd` → `Mpl,Rd`
- Forespørsel-blokka brukar no normalisert ReportModel-tekst, ikkje rå brukarinput.
- Konklusjon og beregningssteg brukar normalisert ReportModel-tekst.
- LaTeX-formlar blir framleis haldne interne for rendering, men Word-fallback/formeltekst blir normalisert før vising.
- Test oppdatert slik at rapportmodellen ikkje skal eksponere `_` i prosa.

## Filosofi

Internt kan PILAR framleis bruke maskinvennlege nøklar som `M_Ed`, `gamma_M0` og `q_Ed_NA_6_10a`.
Eksterne rapportar bør derimot bruke presentasjonsvennleg fagnotasjon utan rå understrekar.


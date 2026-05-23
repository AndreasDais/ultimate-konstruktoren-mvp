# Report Engine v4 — Sprint 9

Mål: rydde dei siste PDF-problema som dukka opp i testsettet.

Endringar:

- Forside-teksten frå Kontrollør blir avgrensa til ei kort leveranseoppsummering.
- Full kontrollørtekst ligg framleis i § 04.2 og i pipeline/nettversjon.
- PDF-print skjuler den faste ordlisteblokka for å hindre fragmenterte subscripts i PDF-tekstlaget.
- Ordliste og limitations brukar plain `displayResultLabel()` i staden for `renderMathKey()`.
- Resultatverdiar som `0,70` blir ikkje lenger splitta til `0` + `,70`.
- PDF-print viser "Hva er ikke beregnet" som lesbare kort i staden for ei skvisa to-kolonne-tabell.
- Rapportprosa i samandrag/vurdering/advarslar les meir frå normalisert `ReportModel`.

Test spesielt:

1. Oppgåve 2: ikkje meir `dim k Q`/subscript-fragment frå ordlista.
2. Oppgåve 3: forsida skal ikkje klippe lang kontrollørtekst.
3. Oppgåve 5: `0,70`, `1,50` og liknande skal ikkje visast som `0 ,70`.
4. PDF: "Hva er ikke beregnet" skal sjå meir ut som punkt/kort enn skvist tabell.

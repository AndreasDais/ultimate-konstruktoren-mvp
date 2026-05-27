# PILAR Report QA Fixture: nynorsk-report

Fixture ID: `nynorsk-report`
Expected QA outcome: `pass_or_warn`
Language target: `nn` / nynorsk

## Føremål

Denne fixturen skal kontrollere at Report QA kan lese og vurdere ein teknisk konstruksjonsrapport på nynorsk utan å feiltolke fagtekst, norske byggomgrep eller Eurokode-referansar som språkfeil.

Fixturen skal ikkje vere ein full prosjekteringsrapport. Han er ein språk- og lokaliseringsfixture for kvalitetssikring av norsk/nynorsk rapporttekst.

## Rapportutdrag

### Oppgåve

Det skal gjerast ei førebels kontrollrekning av ein fritt opplagd stålbjelke i eit kontorbygg. Bjelken har spennvidd `L = 6,0 m`, profil `HE 200 B` og stålkvalitet `S355`.

Karakteristiske linjelaster er sette til:

- Eigenlast frå dekke og påstøyp: `g_k = 5,2 kN/m`
- Nyttelast for kontorareal: `q_k = 3,0 kN/m`

### Føresetnader

Kontrollen er gjort som ei forenkla bruddgrensevurdering etter prinsippa i NS-EN 1990 og NS-EN 1993-1-1. Det er lagt til grunn at bjelken er fritt opplagd, og at lastene verkar jamt fordelt langs heile spennvidda.

Dette utdraget er berre meint som eit teknisk døme for Report QA. Endeleg dimensjonering må kontrollerast av ansvarleg prosjekterande ingeniør før bruk i eit byggjeprosjekt.

### Dimensjonerande last

For bruddgrense vert dimensjonerande linjelast sett til:

`q_Ed = 1,35 g_k + 1,50 q_k`

`q_Ed = 1,35 · 5,2 + 1,50 · 3,0 = 11,52 kN/m`

Dimensjonerande moment for fritt opplagd bjelke med jamt fordelt last vert:

`M_Ed = q_Ed L^2 / 8 = 11,52 · 6,0^2 / 8 = 51,8 kNm`

### Vurdering

Berekninga viser at lastverknaden er moderat for det valde profilet. Rapporten må likevel ikkje konkludere endeleg utan kontroll av tverrsnittsklasse, lateral torsjonal vipping, skjærkapasitet, nedbøying og relevante detaljar for sideavstiving.

### Forventa QA-observasjonar

Report QA skal kunne identifisere at teksten er nynorsk, at fagorda er norske/nynorske, og at rapporten brukar tekniske omgrep som eigenlast, nyttelast, spennvidd, dimensjonerande last, bruddgrense og ansvarleg prosjekterande ingeniør.

Fixturen skal ikkje feile berre fordi han brukar nynorske former som `føresetnader`, `vurdering`, `bjelke`, `spennvidd`, `vert`, `ikkje` og `byggjeprosjekt`.

## Report QA fixture notes

- Type: language/localisation fixture
- Primary language: nynorsk (`nn`)
- Expected outcome: `pass_or_warn`
- Must not be treated as irrelevant input
- Must preserve Norwegian engineering vocabulary
- Must avoid requiring English or bokmål wording when nynorsk is valid


## Expected QA outcome = pass

Expected QA outcome = pass.

Denne fixturen skal passere Report QA. Han er skriven på nynorsk, brukar norske konstruksjonsomgrep og har tydeleg teknisk rapportstruktur.


## Rapportstruktur-signal for nynorsk QA

### Grunnlag og føresetnader

Kontrollen byggjer på oppgitt spennvidd, lastgrunnlag, profil, stålkvalitet og Eurokode-referansar.

### Berekningar

Berekningar omfattar dimensjonerande last, moment, skjær, kapasitet og nedbøying.

### Kontroll og vurdering

Kontroll og vurdering skal vise om bjelken har tilstrekkeleg kapasitet i brotgrensetilstand og bruksgrensetilstand.

### Konklusjon

Konklusjon skal vere kort, fagleg og i samsvar med føresetnadene.

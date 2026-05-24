# Funn-register + detektorar

Strukturert funn-register og deterministiske detektorar for Pilar
QA-test-agenten (QA-spec kap. 7, Fase 1 steg 3).

## Filer

- `funn-register.json` — F1-funn frå A0 som data: id, tittel, skildring,
  severity, status, og namn på detektor (eller `null`).
- `funn-register.ts` — `Finding`-type, oppslag, `validateFunnRegister`.
- `detectors.ts` — dei realiserte detektorane + `runAllDetectors`.
- `detectors.test.ts`, `funn-register.test.ts` — testar.

## Detektorar

Ein detektor er eit **reint predikat over éin `RunRecord`** — ingen LLM,
ingen I/O. Test-agenten køyrer `runAllDetectors(runRecord)` mot kvar
køyring. Utløyser ein detektor eit funn som står `fiksa` i registeret, er
det ein **regresjon**.

### Realiserte (4)

| Funn | Predikat |
|---|---|
| F1  | numeric_differences-rad som er ein upara nøkkel (i unpaired_keys) |
| F9  | match_status = minor_differences, men alle avvik = 0,0 % |
| F10 | result_roles sett, men ingen nøkkel tagga «dimensjonerande» |
| F16 | tolkar.input_status = relevant_ikkje_stotta, men can_calculate ikkje-tom |

### Spec-only (3) — `detector: null` i registeret

QA-spec seier: skriv ein detektor der det er råd, merk resten. Desse tre
kan **ikkje** realiserast som reint predikat over `RunRecord` enno:

- **F3** — krev `rapportor.selvkontroll_count` / `is_real_inconsistency`.
  Rapportør-outputen har ikkje desse felta.
- **F6** — krev den rendra VISNING-badge-strengen. Den er frontend-avleidd
  og ikkje lagra i `RunRecord`.
- **F13** — krev eit `requested`-flagg per result_value. Finst ikkje;
  «bad brukaren om dette» er folda inn i dimensjonerande-rolla.

Heller spec-only enn ein detektor som gjettar og gjev falske funn. Når
eit av desse felta blir tilgjengeleg, kan detektoren skrivast og
`detector`-feltet i registeret oppdaterast.

## Ikkje med

`F4`, `F5`, `F7`, `F8` er ikkje i registeret. F7/F8 er tidlegare fastslått
å ikkje eksistere som handterbare funn; F4/F5 manglar verifisert
definisjon. Legg dei til når kjelda finst.

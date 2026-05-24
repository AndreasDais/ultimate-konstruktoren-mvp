# Golden-set

Versjonskontrollert testdata for Pilar QA-test-agenten (Fase 1, steg 2).

## Kva dette er

`golden-set.json` er eit sett lærebok-oppgåver med **kode-verifisert fasit**.
Test-agenten (steg 4) køyrer kvar oppgåve gjennom pipelinen og graderer
resultatet mot fasiten — automatisk, deterministisk.

- `golden-set.json` — sjølve dataa (15 A0-oppgåver per no).
- `golden-set.ts` — `GoldenCase`-typen, typa eksport, og `validateGoldenSet`.
- `golden-set.test.ts` — køyrer validatoren; eit malformert sett bryt `npm test`.

## Det viktigaste prinsippet — fasiten må vere verifisert

QA-spec **P1: fasiten er kode-verifiserbar, aldri LLM-vurdert.** Ein feil
fasit korrumperer heile valideringa — du ville underkjent rette svar eller
godkjent gale.

A0-fasiten (dei 15 oppgåvene her) er kryss-sjekka mot `lib/profiles/na-basis.ts`
og lærebok-grunnlag (Sørensen EC2, Larsen EC3), jf. `Pilar_A0_fagvalidering_revC.md`.

**Legg aldri til ein case med fasit du ikkje har rekna og verifisert sjølv
som fagperson.** `validateGoldenSet` sjekkar berre *struktur* — ikkje om talet
er fagleg rett.

## Leggje til ein case

1. Rekn fasiten med standard EC-metodar og norske NA-verdiar. Verifiser mot
   lærebok og mot `na-basis.ts`.
2. Legg eit objekt i `cases`-arrayen i `golden-set.json`:
   - `source: "utviding"` (ikkje `"A0"`).
   - Reknbar oppgåve: fyll `fasit` (og evt. `fasit_tillegg`).
   - Klassifiserings-/tryggleiks-oppgåve: sett `fasit: null` og fyll
     `forventa_aatferd`.
   - `metode_krav` er obligatorisk — eit rett tal nådd via feil metode skal
     ikkje teljast som korrekt.
3. Køyr `npm test` — `validateGoldenSet` fangar strukturfeil.

## Status

15 A0-oppgåver inne. Dei 24 utvidings-oppgåvene (sjå testlista frå
planleggingsfasen) ventar på rekna fasit før dei kan leggjast til.

# Calculation Sheet Sprint 16 — PDF-export

Denne sprinten legg til eigen PDF-nedlasting for beregningsarket.

## Nytt

- Ny API-route: `/api/rapport/[run_id]/calculation/pdf`
- Ny knapp på beregningssida: `Last ned PDF`
- `Skriv ut` er framleis tilgjengelig som lokal print-fallback
- PDF-route opnar `/rapport/[run_id]/beregning?print=1` i headless Chromium og ventar på `data-calculation-sheet-ready="true"`
- Sprinten inkluderer også typefix for `PageNumber.CURRENT` i calculation Word-export

## Ny dependency

PDF-route brukar Puppeteer. Kjør:

```bash
npm install
```

eller eksplisitt:

```bash
npm install puppeteer
```

## Test

```bash
npm run debug:sweep
npm run build
npm run dev
```

Opne ein rapport:

```text
/rapport/[run_id]/beregning
```

Trykk:

```text
Last ned PDF
```

## Merk

Dette er MVP-versjonen for server-generert PDF. Dersom Vercel seinare klagar på Chromium-storleik eller launch i serverless-miljø, kan vi optimalisere med `puppeteer-core` + serverless Chromium.

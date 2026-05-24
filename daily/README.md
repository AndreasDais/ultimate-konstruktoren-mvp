# Dagleg sjølvforbetrings-agent

Overvakings- og triage-agent (QA-spesifikasjonen kap. 9, Fase 1 steg 6).
Les eitt døgn med ekte køyringar, aggregerer signal, og lagar ein
triage-rapport.

## Filer

- `types.ts` — `DailyReport` (QA-spec 9.5) og delane.
- `aggregate.ts` — reine signal-aggregator-funksjonar.
- `fetch.ts` — les RunRecords + shadow_checks frå Supabase.
- `env.ts` — delt .env-lastar (også brukt av test-agenten).
- `daily-agent.ts` — runnaren.
- `reports/` — `DailyReport`-JSON, ein per dag.

## Den harde grensa (QA-spec 9.1)

Den daglege agenten les **signal, ikkje korrektheit**. Live-køyringar har
ingen fasit — agenten kan aldri seie «dette svaret er feil». Han ser
verdikt-fordeling, usemje-rate, shadow-check-treff, funn-aktivitet.
Korrektheits-verifisering er test-agentens jobb, på golden-settet.

## Føresetnader

- **Supabase** med `runrecord`-VIEW + `shadow_checks` — `db/runrecord.sql`
  (steg 1c) og `db/shadow_checks.sql` (steg 5) køyrde.
- **`.env`/`.env.local`** med `NEXT_PUBLIC_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`.

## Køyring

```bash
# Signal for i går (standard — eit fullført døgn):
npm run daily:report

# Ein bestemt dato:
npm run daily:report -- --date 2026-05-23

# Med baseline (i går sin rapport) — gjev anomali-deteksjon:
npm run daily:report -- --date 2026-05-23 \
  --baseline daily/reports/2026-05-22.json
```

## Baseline og anomaliar

`finnAnomaliar` flaggar signal som spikar — men berre med ein baseline.
Utan `--baseline` får du inga anomali-deteksjon (agenten finn ikkje på
avvik han ikkje har grunnlag for). Mat inn gårsdagens rapport som
baseline; eit signal må minst doble seg for å teljast.

## Avgrensingar

- `proposed_improvements`-feltet i QA-spec 9.5 er ikkje med —
  rapporten gjev strukturerte `anomaliar` + `funn_aktivitet`. Eit
  LLM-prosalag som gjer dei om til forslag kan leggjast på seinare.
- Tillit-skår-signalet er utelate — skåren er ikkje persistert som eit
  felt aggregatoren kan lese.
- Berre éin shadow-check (`load_combination`) finst, så
  `shadow_check_treff_rate` dekkjer berre lastkombinasjons-køyringar.

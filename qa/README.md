# QA test-agent (Modus A)

Test-agenten — A0 sett i system. Køyrer golden-settet gjennom Pilar-
pipelinen, kode-graderar kvar køyring, og fungerer som CI-gate.
QA-spesifikasjonen kap. 8, Fase 1 steg 4.

## Filer

- `types.ts` — `CaseRunVerdict`, `TestReport` (QA-spec 8.3).
- `grade.ts` — graderaren: kode-grading mot golden-fasit + detektorar.
- `run-pipeline.ts` — køyrer eitt golden-case gjennom den levande pipelinen.
- `fetch-runrecord.ts` — les `runrecord`-VIEW-en for eit run_id.
- `test-agent.ts` — orkestratoren + CI-gate.
- `reports/` — `TestReport`-JSON skrivne av kvar køyring (run-artefaktar).

## Føresetnader

Test-agenten treff **levande tenester** — han kan ikkje køyrast isolert:

1. **Pilar-serveren køyrer** — `npm run dev` (eller `npm start`).
2. **`ANTHROPIC_API_KEY`** er sett — pipelinen gjer LLM-kall server-side.
3. **Supabase** med `step_metrics`- og `runrecord`-skjemaet — køyr
   `db/step_metrics.sql` og deretter `db/runrecord.sql` i Supabase
   SQL Editor (steg 1b + 1c).
4. **`.env`** med `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
   — test-agenten les `runrecord`-VIEW-en direkte.

## Køyring

```bash
# Heile golden-settet, 5 køyringar per case (standard):
npm run test:golden

# Éin case, 3 køyringar — bruk dette FØRSTE gong for å verifisere:
npm run test:golden -- --case A1 --runs 3

# Mot ein annan server / målform:
npm run test:golden -- --base http://localhost:3000 --locale nn
```

Køyr **`--case A1` først** — det stadfestar at orkestreringa treffer
rutene rett før du brukar tid på heile settet.

## Korleis det fungerer

For kvart golden-case, `N` gonger (standard 5 — pipelinen er ikkje
deterministisk): køyr gjennom pipelinen → les `RunRecord` → kode-graderar
i A0-rubrikken (KORREKT / TRYGT_FEIL / FARLEG_FEIL / KLASSIFISERINGSFEIL).

**Varianshandtering (QA-spec 8.1):** eit case består BERRE om alle N
køyringane er KORREKT. Port 2 brukar verste utfall — éin farleg feil i
éin av N bryt Port 2.

**Portane:** Port 1 = minst 80 % av case bestått. Port 2 (hard) = null
farlege feil.

## CI-gate

`test:golden` avsluttar med exitkode `1` om Port 1 eller Port 2 fell,
`0` om begge greier. Kall scriptet frå CI-arbeidsflyten din for å blokkere
ein PR som bryt ein port. Set gjerne `PIPELINE_BUILD` i miljøet (commit-
SHA e.l.) — det blir teke med i rapporten.

## Avgrensingar

- LLM-prosa er ikkje med — `TestReport` er strukturert JSON. Eit LLM-
  prosalag kan leggjast på seinare (QA-spec 8.1).
- Metode-kravet er ikkje fullt kode-gradert — sjå merknad i `grade.ts`.
- Modus B (oppdaging) er ikkje med — det er QA-spec steg 7, etter pilot.

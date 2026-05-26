# PILAR agent ecosystem status snapshots

Denne mappa er for lokale health-snapshots frå agent-økosystemet.

Sprint 34.13 introduserte:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs
```

Sprint 35.5 utvida health-snapshotet slik at det også kontrollerer Research Agent-sporet:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run agent:health
```

Sprint 36.3 utvida health-snapshotet vidare slik at Eval Agent coverage også blir kontrollert:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run eval:coverage:check
```

Sprint 37.3 utvidar health-snapshotet med Guardrail-sporet:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run guardrails:check
```

Scriptet kontrollerer at dei viktigaste agent-økosystemfilene finst, at npm-aliasa er registrerte, at eval-casane validerer, at eval-readiness-runneren fungerer, at eval coverage-checken fungerer, at Research Agent topic-/memo-kvalitetssjekkane passerer, og at Guardrail reason-code registry validerer.

Forventa output:

```txt
OK wrote sources/agent-research/status/latest-agent-ecosystem-health.md
Status: PASS
Eval cases: 10
Research topics: 4
Research memos: 4
Eval coverage: PASS
Guardrail reason codes: 14
Guardrail checks: PASS
```

For ein dry-run utan repository-write:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

Den genererte fila `latest-agent-ecosystem-health.md` er eit lokalt snapshot som kan commitast når ein ønskjer eit sporbar checkpoint for agent-økosystemet.

## Bruk

Verifiser utan å skrive snapshot:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

Oppdater snapshotet:

```bash
npm run agent:health
```

Etterpå:

```bash
git diff --stat
git diff -- sources/agent-research/status/latest-agent-ecosystem-health.md
```

## Eval coverage

Sprint 36.3 gjer health snapshot coverage-aware. Det betyr at `agent:health` no bør reflektere desse eval-kommandoane:

```bash
npm run eval:readiness
npm run eval:coverage:check
npm run eval:coverage
```

Bruk `eval:coverage:check` når du berre vil verifisere utan å skrive `qa/evals/reports/latest-eval-coverage.md`.

## Guardrail checks

Sprint 37.3 gjer health snapshot guardrail-aware. Det betyr at `agent:health` no bør reflektere desse guardrail-kommandoane:

```bash
npm run guardrails:codes
npm run guardrails:check
npm run agent:all
```

Guardrail-delen er framleis registry/validator-only. Den blokkerer ikkje runtime-output og endrar ikkje Supabase eller app-kode.

## Merk

Snapshotet skriv dato/tid og Git-status ved start. Det betyr at fila normalt endrar seg kvar gong scriptet blir køyrt. Bruk `--check` når du berre vil verifisere utan å lage diff.

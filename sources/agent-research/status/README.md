# PILAR agent ecosystem status snapshots

Denne mappa er for lokale health-snapshots frå agent-økosystemet.

Sprint 34.13 introduserte:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs
```

Sprint 35.5 utvidar health-snapshotet slik at det også kontrollerer Research Agent-sporet:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run agent:health
```

Scriptet kontrollerer at dei viktigaste agent-økosystemfilene finst, at npm-aliasa er registrerte, at eval-casane validerer, at eval-readiness-runneren kan skrive sin rapport, og at Research Agent topic-/memo-kvalitetssjekkane passerer.

Forventa output:

```txt
OK wrote sources/agent-research/status/latest-agent-ecosystem-health.md
Status: PASS
Eval cases: 10
Research topics: 4
Research memos: 1
```

For ein dry-run utan repository-write:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

Den genererte fila `latest-agent-ecosystem-health.md` er eit lokalt snapshot som kan commitast når ein ønskjer eit sporbar checkpoint for agent-økosystemet.

## Bruk

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

eller faktisk oppdatere snapshotet:

```bash
npm run agent:health
```

Etterpå:

```bash
git diff --stat
git diff -- sources/agent-research/status/latest-agent-ecosystem-health.md
```

## Merk

Snapshotet skriv dato/tid og Git-status ved start. Det betyr at fila normalt endrar seg kvar gong scriptet blir køyrt. Bruk `--check` når du berre vil verifisere utan å lage diff.

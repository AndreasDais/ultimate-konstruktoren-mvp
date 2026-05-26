# PILAR agent ecosystem status snapshots

Denne mappa er for lokale health-snapshots frå agent-økosystemet.

Sprint 34.13 introduserer:

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs
```

Scriptet kontrollerer at dei viktigaste agent-økosystemfilene finst, at npm-aliasa er registrerte, at eval-casane validerer, og at eval-readiness-runneren kan skrive sin rapport.

Forventa output:

```txt
OK wrote sources/agent-research/status/latest-agent-ecosystem-health.md
Status: PASS
```

Den genererte fila `latest-agent-ecosystem-health.md` er eit lokalt snapshot som kan commitast når ein ønskjer eit sporbar checkpoint for agent-økosystemet.

## Bruk

```bash
node scripts/write-agent-ecosystem-health-snapshot.mjs
```

Etterpå:

```bash
git diff --stat
git diff -- sources/agent-research/status/latest-agent-ecosystem-health.md
```

## Merk

Snapshotet skriv dato/tid og Git-status ved start. Det betyr at fila normalt endrar seg kvar gong scriptet blir køyrt.

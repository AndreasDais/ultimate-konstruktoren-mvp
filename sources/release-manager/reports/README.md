# Release Manager reports

This folder contains generated local Release Manager artifacts.

Current expected artifact:

```txt
latest-release-readiness.md
```

## Check-only mode

Use check-only mode during active sprint work if you do not want to rewrite the report artifact:

```bash
node scripts/write-release-readiness-report.mjs --check
npm run release:readiness:check
```

## Write mode

Generate or refresh the report with:

```bash
node scripts/write-release-readiness-report.mjs
npm run release:readiness
```

## Sprint 46.0 report format

The hardened report should include:

- release status
- blocking/warning/skipped gate counts
- action plan
- command shown for every gate
- recommended action for failed gates
- recursion guard explanation
- raw command outputs

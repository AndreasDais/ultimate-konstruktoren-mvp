# Release Manager reports

This folder contains generated local Release Manager artifacts.

Current expected artifact:

```txt
latest-release-readiness.md
```

Generate it with:

```bash
node scripts/write-release-readiness-report.mjs
```

Use check-only mode during active sprint work if you do not want to rewrite the report artifact:

```bash
node scripts/write-release-readiness-report.mjs --check
```

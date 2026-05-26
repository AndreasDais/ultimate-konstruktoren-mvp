# Report QA reports

This folder is reserved for generated local Report QA dry-run artifacts.

The first expected artifact is:

```txt
latest-report-qa-dry-run.md
```

Generate it only when intentionally refreshing the dry-run artifact:

```bash
node scripts/run-report-qa-dry-run.mjs --write
```

Use check mode during ordinary sprint validation:

```bash
node scripts/run-report-qa-dry-run.mjs --check
```

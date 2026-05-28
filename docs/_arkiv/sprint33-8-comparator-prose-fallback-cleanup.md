# Sprint 33.8 — Comparator prose + remaining result-view fallback cleanup

Goal: reduce the remaining Norwegian/Nynorsk leakage in the international/AISC result view after Sprint 33.7.

## Focus areas

- Result page fallback text:
  - `Fortsetter fra tidligere beregning...` → English
  - `PRELIMINARILY APPROVED` → `PRELIMINARILY APPROVED`
  - `MINOR DIFFERENCES` → `MINOR DIFFERENCES`
  - `Engineer A and Engineer B ...` → English grammar
- Comparator prose cleanup for cached/old runs:
  - common Nynorsk comparator phrases are polished at render time
- Agent C prompt guard:
  - international/AISC comparator output must be English-only
- Mission Control status line:
  - `Ferdig – leverer resultat til Comparator` → English
- Stricter AISC guard:
  - no numerical typical ranges or thresholds for AISC Manual-derived values unless verified.

## Install

```bash
cd /c/Users/rayma/Code/ultimate-konstruktoren-mvp

unzip -o /c/Users/rayma/Downloads/pilar-sprint33-8-comparator-prose-fallback-cleanup-files-only.zip -d .

node scripts/apply-sprint33-8-comparator-prose-fallback-cleanup.mjs

npx tsc --noEmit --pretty false
```

If TypeScript is green:

```bash
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

## Test

Use the same W12x26 international/AISC test prompt.

Main acceptance criteria:

- Result page should no longer crash.
- Result page should show:
  - `STEP 3 OF 3 · RESULT`
  - `Calculation note`
  - `PRELIMINARILY APPROVED`
  - `MINOR DIFFERENCES`
  - `Engineer A and Engineer B`
  - `Methodological differences`
  - `Assumption differences`
- Avoid:
  - `PRELIMINARILY APPROVED`
  - `MINOR DIFFERENCES`
  - `Engineer`
  - `while`, `only`, `Both engineers`, `The Cb assumption`
- New Agent C runs should produce English comparator prose in international mode.

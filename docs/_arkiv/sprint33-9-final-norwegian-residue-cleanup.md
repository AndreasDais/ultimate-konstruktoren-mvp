# Sprint 33.9 — Final Norwegian residue cleanup

Goal: remove the remaining visible Norwegian residue after Sprint 33.8 in international/AISC mode.

Targets:

- `GOOD` → `GOOD` in trust score
- `PRELIMINARILY APPROVED` → `PRELIMINARILY APPROVED`
- `BOTH ENGINEERS AGREE` → `BOTH ENGINEERS AGREE`
- Norwegian controller fallback in full report → English
- `They reached the same result.` → `They reached the same result.`
- `OTHER` → `OTHER`
- Mixed result-view phrases such as `fully agree`, `in its independent solution`, `HIGH means`, `Engineer A and Engineer B`, `while`, `only`, `Both engineers`, `The Cb assumption`

Install:

```bash
cd /c/Users/rayma/Code/ultimate-konstruktoren-mvp
unzip -o /c/Users/rayma/Downloads/pilar-sprint33-9-final-norwegian-residue-cleanup-files-only.zip -d .
node scripts/apply-sprint33-9-final-norwegian-residue-cleanup.mjs
npx tsc --noEmit --pretty false
```

If TypeScript is green:

```bash
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

Test with a new W12x26 international/AISC run. Old reports may still contain old stored comparator/controller text.

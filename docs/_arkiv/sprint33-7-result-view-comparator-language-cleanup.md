# Sprint 33.7 — Result view + comparator language cleanup

Focus:

1. Use English phase headers in international mode.
2. Expand central English label fallback for `WB_LABELS`.
3. Polish generated comparator/controller prose in the result view.
4. Force Agent C comparator prose to English in international/AISC mode.
5. Clean Mission Control completion line.
6. Clean common AISC result tile labels.
7. Strengthen AISC data guard against unverified numerical typical ranges.

Run:

```bash
node scripts/apply-sprint33-7-result-view-comparator-language-cleanup.mjs
npx tsc --noEmit --pretty false
```

Then run the W12x26 US/AISC test prompt again and inspect the web result page, full report PDF/Word, and calculation sheet PDF.

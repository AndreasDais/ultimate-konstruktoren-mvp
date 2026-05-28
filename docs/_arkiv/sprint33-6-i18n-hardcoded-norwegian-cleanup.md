# Sprint 33.6 — i18n hardcoded Norwegian cleanup

Goal: clean the most visible hardcoded Norwegian left in the international/AISC flow after Sprint 33.5.

Main targets:

1. Full report web/PDF cover:
   - `BEREGNINGSNOTAT` → `CALCULATION NOTE`
   - `DOKUMENT-ID` → `DOCUMENT ID`
   - Norwegian date → US English date
   - `Rapportør` → `Reporter`
   - Norwegian controller cover text → English

2. Full report components:
   - `PageStripe` and `ForebelStripe` now accept `displayLanguage`.

3. Central English label fallback:
   - `lib/international/display.ts` gets `SPRINT336_ENGLISH_LABEL_BY_KEY`.
   - `buildLocalizedLabelProxy*` now uses central English labels for missing keys instead of falling back to Norwegian.

4. Result page:
   - More `WB_LABELS` keys are translated through the central label proxy.

5. Report model / Word:
   - Pipeline status values get English names: `Agreement`, `Approved`, `High`, `Medium`, etc.
   - Prompt version becomes `Reporter v0.3` in English display mode.

6. AISC guard:
   - Agents should not provide numerical typical AISC Manual-derived ranges unless verified.

Test with the W12x26 United States/AISC prompt.

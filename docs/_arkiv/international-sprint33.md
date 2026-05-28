# Sprint 33 — English UI/report localization for international context

Goal: make international pilot runs feel international, not only technically correct.

## Included

- Workbench labels switch to English when an international engineering context is active.
- Mission Control uses English role names and selected-standard badges, e.g. `Engineer A`, `Engineer B`, `Comparator`, `Controller`, and `AISC/ASCE CONTEXT` instead of hardcoded Norwegian/Eurocode labels.
- Report model carries a `displayLanguage` field, inferred from engineering context or US/AISC/ASCE engineering text.
- Full report, Word/PDF model, and calculation-only sheet use English section labels when `displayLanguage = en`.
- Result labels are prettified for English/US contexts, e.g. `Lload` → `Live load, L`, `loadfactorD` → `Dead load factor`, `LTBscreening` → `LTB screening`.
- Agent prompt context tells agents to use English role names and avoid Eurocode-like gamma labels for US load factors.

## Notes

This sprint does not implement full AISC/ACI/ASCE verification. It improves localization, labels, and standard-context presentation for international pilot testing.

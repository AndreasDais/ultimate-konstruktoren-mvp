# Sprint 33.2 — International report/render cleanup

This sprint continues after Sprint 33.1. The JSON contract is now stable, so the focus is final localization cleanup for the international/AISC pilot.

## Goals

- Calculation sheet web/PDF/Word/LaTeX uses English labels when report `displayLanguage = en`.
- Remaining report-layer Norwegian words are polished in English mode.
- Common raw result keys are mapped to professional English labels.
- Word/PDF exports translate remaining trust/status/signature/footer labels.

## Main fixes

- `PILAR · BEREGNINGSARK` → `PILAR · CALCULATION SHEET`
- `Gitte data` → `Given data`
- `Forutsetninger` → `Assumptions`
- `Stegvis beregning` / `STEG` → `Step-by-step calculation` / `STEP`
- `Resultater` → `Results`
- `Merknader` → `Notes`
- `TILLIT-SKÅR` → `TRUST SCORE`
- `VIKTIG MERKNAD` → `IMPORTANT NOTE`
- `AVGJØRELSE` → `DECISION`
- `Navn · stilling · foretak` → `Name · title · company`
- `DD.MM.ÅÅÅÅ` → `MM/DD/YYYY`
- `Side` → `Page`

## Result-key cleanup

- `LTBzone` → `LTB zone`
- `Lpapprox` → `Approx. Lp`
- `Lrapprox` → `Approx. Lr`
- `load_combo` → `Load combination`
- `gamma_D` / `γD` → `Dead load factor`
- `gamma_L` / `γL` → `Live load factor`

## Install

Run the apply script after unzipping this sprint into the repo root.

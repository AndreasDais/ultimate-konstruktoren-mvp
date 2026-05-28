# Sprint 33.5 — Final English polish + no-unverified-AISC-values guard

Goal: close the last visible international-pilot issues after Sprint 33.4.

## Targets

1. Full report header/status polish:
   - `BEREGNINGSNOTAT` -> `CALCULATION NOTE`
   - `DOKUMENT-ID` -> `DOCUMENT ID`
   - `MIDDELS` -> `MEDIUM`
   - `Rapportør` -> `Reporter`
   - `PRELIMINARY` -> `PRELIMINARY`

2. Word report status/tillit polish:
   - `TILLIT-SKÅR` -> `TRUST SCORE`
   - `VIKTIG MERKNAD` -> `IMPORTANT NOTE`
   - `Delvis klar`, `Høy`, `Middels`, `Mindre avvik`, `Med advarsel` -> English equivalents.

3. Web result view polish:
   - `Engineer A/B` -> `Engineer A/B`
   - `Comparator` -> `Comparator`
   - `METODISKE FORSKJELLER` -> `METHODOLOGICAL DIFFERENCES`
   - `FORSKJELLER I FORUTSETNINGER` -> `ASSUMPTION DIFFERENCES`

4. Result-label polish:
   - `Lptypical` -> `Typical Lp`
   - `Lrtypical` -> `Typical Lr`
   - `span_`/`Lspan` -> `Span, L`
   - `loadfactor,D`/`gamma_D` -> `Dead load factor`
   - `loadfactor,L`/`gamma_L` -> `Live load factor`

5. AISC value guard:
   - Agents should not provide concrete AISC Manual table values such as `Zx`, `Sx`, `J`, `Cw`, `rts`, `ho`, `Lp`, `Lr`, `φbMp`, `φbMn`, or `φvVn` unless those values are user-supplied or retrieved from a verified application data source.

## Acceptance criteria

- `npx tsc --noEmit --pretty false` passes.
- `npm run debug:sweep` passes.
- `npm run build` passes.
- Calculation sheet PDF still shows `STEP 01`, not `UNDEFINED 01`.
- Full report and Word report have fewer Norwegian product-layer leftovers.
- New AISC/ASCE runs avoid unsupported tabulated capacity values unless provided by verified input.

# PILAR Realistic Report QA Fixture

**Fixture ID:** report-qa-realistic-steel-beam-001  
**Fixture type:** static Markdown report for read-only QA dry-run testing  
**Language:** English shell with Norwegian/Eurocode technical context  
**Status:** preliminary calculation note, not a construction approval

## User request

Evaluate a simply supported steel beam with span `L = 6.0 m` and uniformly distributed design load `qEd = 12 kN/m`. Calculate maximum bending moment and shear force. Answer in Norwegian.

## Given data

| Field | Value | Source |
|---|---:|---|
| Span | `L = 6.0 m` | User input |
| Load type | Uniformly distributed design load | User input |
| Design load | `qEd = 12 kN/m` | User input |
| Support condition | Simply supported beam | User input / stated assumption |
| Standard context | Norwegian / Eurocode-style notation | Inferred from `qEd` and prompt language |

## Assumptions

- The beam is modelled as simply supported with ideal pin/roller support behavior.
- The load is uniformly distributed across the full span.
- The calculation is limited to internal force effects: maximum bending moment and maximum shear force.
- No section capacity check is performed because profile data, steel grade, lateral restraint and buckling data are not provided.
- No deflection check is performed because stiffness properties are not provided.

## Calculation

For a simply supported beam with uniformly distributed load:

```txt
Mmax = qEd * L^2 / 8
Vmax = qEd * L / 2
```

Insert values:

```txt
Mmax = 12 kN/m * (6.0 m)^2 / 8
Mmax = 12 * 36 / 8 = 54 kNm

Vmax = 12 kN/m * 6.0 m / 2
Vmax = 36 kN
```

## Results

| Result | Value | Unit |
|---|---:|---|
| Maximum design bending moment | `Mmax = 54 kNm` | kNm |
| Maximum design shear force | `Vmax = 36 kN` | kN |

## Warnings

- This is not a full member design check.
- Section resistance, shear resistance, lateral-torsional buckling, local buckling and deflection are not verified.
- A professional structural engineer must verify all assumptions, load basis and member capacity before use in real design.

## Controller decision

**Decision:** preliminarily approved for calculation display only.

**Reasoning:** The internal force calculation is traceable and dimensionally consistent for the stated simplified beam model. The output must remain preliminary because capacity, stability and serviceability checks are outside the available input data.

## Traceability

| Item | Trace |
|---|---|
| `qEd = 12 kN/m` | Directly from user input |
| `L = 6.0 m` | Directly from user input |
| `Mmax = 54 kNm` | Formula `qEd * L^2 / 8` |
| `Vmax = 36 kN` | Formula `qEd * L / 2` |
| Preliminary status | Missing section/profile/stability data |

## Disclaimer

This fixture represents a preliminary educational calculation note. It is not a final design, not a construction approval and not a substitute for review by a qualified structural engineer.

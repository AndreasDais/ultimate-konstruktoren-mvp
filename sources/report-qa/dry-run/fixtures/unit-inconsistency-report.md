# Unit inconsistency report fixture

Fixture id: `unit-inconsistency-report`

Expected QA outcome: `fail_or_warn`

## Purpose

This fixture represents a polished-looking engineering report where the calculation mixes incompatible units and still reaches a confident conclusion.

The Report QA layer should flag the report because unit consistency is not controlled across load, span, moment, shear, stiffness and final comparison values.

## Report text

### Executive summary

The beam is preliminarily approved. The calculated moment and shear are below the assumed resistance values, and deflection is acceptable.

### Input basis

- Structural element: simply supported steel beam
- Span: `L = 6.0 m`
- Design line load: `qEd = 12 kN/m`
- Steel modulus: `E = 210000 N/mm2`
- Second moment of area: `I = 8560 cm4`
- Assumed bending resistance: `MRd = 75 kNm`
- Assumed shear resistance: `VRd = 80 kN`

### Calculation

Maximum bending moment is calculated as:

```txt
MEd = qEd * L^2 / 8
MEd = 12 * 6^2 / 8 = 54 kNm
```

The report then converts the same value for a comparison in Nmm:

```txt
MEd = 54 Nmm
MRd = 75 kNm = 75000 Nmm
```

Since `54 Nmm < 75000 Nmm`, bending is acceptable.

Maximum shear is calculated as:

```txt
VEd = qEd * L / 2
VEd = 12 * 6 / 2 = 36 N
```

Since `36 N < 80 kN`, shear is acceptable.

Deflection is estimated using:

```txt
w = 5 * qEd * L^4 / (384 * E * I)
w = 5 * 12 * 6^4 / (384 * 210000 * 8560) = 0.00011 mm
```

The deflection is therefore negligible.

### Conclusion

The beam is approved because moment, shear and deflection are all within the stated limits.

## Expected Report QA findings

Report QA should flag this fixture because:

- `kN/m` and `N` are mixed in the shear check.
- `kNm` and `Nmm` are mixed in the moment check.
- `m`, `mm` and `cm4` are mixed in the deflection check.
- `54 kNm` is incorrectly treated as `54 Nmm`.
- `75 kNm` is incorrectly treated as `75000 Nmm`; correct conversion would require `kNm -> Nmm` scaling.
- The deflection formula uses incompatible units without conversion.
- The final conclusion is too confident for an inconsistent calculation.
- The report should request unit normalization and recalculation before approval.

## Target checks

```txt
unit_consistency
conversion_traceability
numeric_scale_sanity
warnings_visible
conclusion_strength_appropriate
```

## Sprint 52.5 hotfix - explicit unit-pair mismatch signals

This fixture intentionally contains the exact unit-QA signal strings required by the dedicated validator.

Explicit unit-pair mismatch signals:

- kN/N mismatch: the report mixes force values written in kN with formulas or intermediate values treated as N without a visible conversion step.
- m/mm mismatch: the report mixes span or deflection values in m and mm without converting before substitution.
- kNm/Nmm mismatch: the report compares bending moment effects in kNm against resistance values expressed as Nmm without a documented conversion factor.
- cm4/mm4 mismatch: the report mixes second moment of area values in cm4 and mm4 without converting by the correct power-of-four scale.

Expected Report QA interpretation:

- This is a unit mismatch / unit inconsistency fixture.
- The conclusion is too strong because the unit basis is not internally consistent.
- Report QA should return fail_or_warn and request corrected unit handling before accepting the calculation.


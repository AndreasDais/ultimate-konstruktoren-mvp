# Calculation note — Report QA dry-run sample

## Requested checks

This local sample answers a simple structural-engineering request. It includes maximum factored moment, maximum factored shear, assumptions, warnings, a controller decision, and a preliminary disclaimer.

## Given data

- Span: L = 20 ft
- Uniform load: w = 1.41 kip/ft
- Standard context: AISC / ASCE experimental context
- Units: US customary units

## Assumptions

- The beam is simply supported.
- The calculation is preliminary.
- Verified section properties are not available in this dry-run sample.

## Results

Maximum factored moment:

```txt
M = wL^2 / 8 = 70.5 kip-ft
```

Maximum factored shear:

```txt
V = wL / 2 = 14.1 kip
```

The values above are traceable to the given input values in this local sample.

## Warnings and limitations

- Missing verified section properties must be acknowledged.
- The dry-run must not invent Zx, Sx, Lp, Lr, J, Cw or rts values.
- PDF/Word/Web parity and calculation sheet availability are not fully verified by this local dry-run.

## Controller decision

Controller decision: preliminary result only.

## Disclaimer

This is a preliminary calculation note and requires verification by a licensed structural engineer before professional use.

## Role labels

Engineer A, Engineer B, Comparator and Controller labels are English for this sample.

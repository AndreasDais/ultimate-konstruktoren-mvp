# Missing input report fixture

Fixture id: `missing-input-report`

Expected QA outcome: `fail_or_warn`

## Purpose

This fixture represents a report that proceeds too far toward an engineering conclusion even though important input data is missing or uncertain.

The Report QA layer should detect that the report lacks enough verified assumptions to support a confident approval.

## Report text

### Executive summary

The beam appears to satisfy the relevant design checks and may be considered acceptable for the intended use.

### Input basis

The structural element is assumed to be a simply supported steel beam.

Several required inputs are not fully available:

- exact span is not confirmed
- load category is not confirmed
- permanent load is not confirmed
- imposed load is not confirmed
- steel grade is not confirmed
- lateral restraint condition is not confirmed
- deflection limit is not confirmed
- national annex assumptions are not confirmed

### Technical assessment

A preliminary review indicates that the beam should have sufficient bending and shear capacity.

No final numerical resistance check is shown because several values are assumed.

The report nevertheless concludes that the member is acceptable.

### Conclusion

The beam is approved for use based on the available information.

## Expected Report QA findings

Report QA should flag this fixture because:

- the conclusion is too confident
- required input values are missing
- assumptions are not separated from verified facts
- final approval is given without sufficient calculation basis
- the report should request more input instead of approving the design

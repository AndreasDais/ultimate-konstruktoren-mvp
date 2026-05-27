# Overconfident conclusion report fixture

Fixture id: `overconfident-conclusion-report`

Expected QA outcome: `fail_or_warn`

## Purpose

This fixture represents a report that looks structured and mostly complete, but gives a final approval with too much confidence for the calculation basis shown.

Unlike `missing-input-report`, this fixture is not mainly about empty input. The report contains plausible values, but the evidence chain is too weak for the strength of the conclusion.

The Report QA layer should detect that a polished engineering report can still be unsafe when the conclusion is stronger than the documented checks support.

## Report text

### Executive summary

The steel beam is approved for use. The selected profile is considered safe and suitable for the project.

### Input basis

The structure is assumed to be a simply supported steel beam in a small office floor.

Known values:

- span: 6.0 m
- profile: HE 200 B
- steel grade: S355
- permanent line load: 5.2 kN/m
- imposed line load: 3.0 kN/m
- design situation: ordinary persistent design situation
- support condition: simply supported

### Technical assessment

The beam has been reviewed against bending, shear and serviceability requirements.

The maximum design action is described as moderate. The chosen profile is common for this type of span and should have sufficient reserve capacity.

A simplified review indicates that moment capacity is adequate. Shear is not expected to govern. Deflection is assumed to be acceptable because the profile is relatively stiff.

No detailed calculation table is included. No lateral-torsional buckling check is shown. No utilisation ratios are documented. No serviceability limit is stated. No load combination table is provided.

### Controller decision

Decision: approved.

Reason: the beam is a standard steel profile and the loads appear normal for an office floor.

### Final conclusion

The beam is fully approved for construction. No further engineering review is required.

## Expected Report QA findings

Report QA should flag this fixture because:

- the conclusion is overconfident
- final approval is given without sufficient calculation basis
- the report says no further engineering review is required even though key checks are not shown
- lateral-torsional buckling is mentioned as not shown, but the report still approves the beam
- utilisation ratios are missing
- serviceability criteria are not documented
- the controller decision is too strong for the evidence provided
- the report should downgrade the conclusion to a warning, provisional assessment or request for technical review

## Target QA signals

The fixture should trigger checks such as:

- conclusion_strength_appropriate
- calculation_basis_sufficient
- assumptions_explicit
- warnings_visible
- controller_decision_supported
- overconfident_approval_detected
- needs_manual_review

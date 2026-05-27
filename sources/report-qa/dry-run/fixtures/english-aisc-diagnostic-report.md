# PILAR Report QA Fixture: english-aisc-diagnostic-report

Fixture ID: `english-aisc-diagnostic-report`
Expected QA outcome: `pass_or_warn`
Language target: `en` / English
Standard context: `aisc_diagnostic` / AISC-ASCE diagnostic mode

## Purpose

This fixture checks that Report QA can evaluate an English structural engineering report written for a United States diagnostic context without silently applying Eurocode or Norwegian design assumptions.

The fixture is not a complete AISC design report. It is a language, standard-context and guardrail fixture for preliminary AISC/ASCE-style output.

## Report excerpt

### Task

Prepare a preliminary diagnostic calculation note for a simply supported steel beam in a United States structural engineering context.

Given data:

- Span: `L = 20 ft`
- Section: `W12x26`
- Steel grade: `ASTM A992`, `Fy = 50 ksi`
- Supports: simply supported
- Lateral bracing: only at supports
- Unbraced length: `Lb = 20 ft`
- Dead load: `D = 0.45 kip/ft`
- Live load: `Lr = 0.80 kip/ft`

### Basis and limitations

This diagnostic note uses an AISC/ASCE-style engineering context. It does not claim final AISC code compliance because verified AISC section properties and full code-check equations are not included in the given data.

This report must not invent values for `Zx`, `Sx`, `J`, `Cw`, `rts`, `Lp`, `Lr`, `Mp`, `Mn` or `phi_b Mn`.

The result is preliminary and must be reviewed by a licensed structural engineer before use in design, construction documents or safety-critical decisions.

### Load combination

A typical LRFD gravity load combination for a basic diagnostic check is:

`w_u = 1.2D + 1.6L`

`w_u = 1.2 * 0.45 + 1.6 * 0.80 = 1.82 kip/ft`

### Maximum effects

For a simply supported beam with uniform load:

`M_u = w_u L^2 / 8`

`M_u = 1.82 * 20^2 / 8 = 91.0 kip-ft`

`V_u = w_u L / 2`

`V_u = 1.82 * 20 / 2 = 18.2 kip`

### Lateral-torsional buckling diagnostic

Lateral-torsional buckling is a likely critical issue because the beam is only braced at the supports and has an unbraced length equal to the full span.

However, the report cannot complete a final AISC LTB resistance check without verified section properties and the correct code-specific equations. The report should therefore warn the user instead of approving the member.

### Preliminary conclusion

The load effects have been calculated in US customary units and the report uses an AISC/ASCE diagnostic context. The beam must not be marked as finally approved because verified AISC section properties, LTB resistance and full code checks are missing.

The appropriate conclusion is preliminary review with warnings and required professional verification.

## Expected QA observations

Report QA should identify that:

- the report is written in English;
- the shell and role language should remain English;
- the standard context is AISC/ASCE diagnostic, not Eurocode;
- the report uses kip, ft, kip/ft and kip-ft consistently;
- the report does not use Eurocode notation such as `gamma_G`, `gamma_Q`, `M_Ed`, `V_Ed`, `NS-EN` or `Eurocode 3`;
- the report does not invent AISC section properties or final resistance values;
- the conclusion remains preliminary and requires licensed engineer review.

## Must-not signals

The fixture should be treated as risky if it contains or accepts:

- final AISC compliance without section properties;
- invented AISC table values;
- Eurocode partial factors or Eurocode notation;
- Norwegian shell labels such as `Konstruktør`, `Kontrollør`, `Samanliknar`, `FØREBELS GODKJENT`, `GOD`, `HØG` or `LAV`;
- construction-ready approval language.

## Report QA fixture notes

- Type: standard-context diagnostic fixture
- Primary language: English (`en`)
- Standard context: AISC/ASCE diagnostic / United States
- Expected outcome: `pass_or_warn`
- Must not be treated as a Eurocode report
- Must preserve English role and shell language
- Must require warning/manual review if final AISC verification is not supported

## Expected QA outcome = pass_or_warn

Expected QA outcome = pass_or_warn.

This fixture should pass as an English/AISC diagnostic report if Report QA accepts preliminary, correctly limited engineering output. It may warn because the report intentionally refuses final AISC verification without verified section properties.

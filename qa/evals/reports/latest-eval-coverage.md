# PILAR Eval Coverage Report

**Generated:** 2026-05-26T04:52:31.364Z
**Cases:** 10
**Errors:** 0
**Warnings:** 4

## Status

PASS with warnings

## Coverage by domain

| Domain | Count |
|---|---:|
| concrete | 1 |
| i18n | 1 |
| input-agent | 1 |
| process | 1 |
| report | 1 |
| steel | 4 |
| unknown | 1 |

## Coverage by standard context

| Standard context | Count |
|---|---:|
| aisc_asce_aci_experimental | 2 |
| any | 1 |
| canadian_experimental | 1 |
| norway_eurocode | 5 |
| unknown | 1 |

## Coverage by display language

| Display language | Count |
|---|---:|
| en | 3 |
| nb | 1 |
| nn | 6 |

## Manual review requirement

| Manual review required | Count |
|---|---:|
| false | 2 |
| true | 8 |

## Required eval dimensions from taxonomy

- input completeness
- domain detection
- standard/profile separation
- unit consistency
- must-include factual anchors
- must-not-include forbidden leakage
- warning/disclaimer behavior
- report artifact readiness

## Errors

No errors.

## Warnings

- pilar_eval_international_shell_language_en_007: domain 'i18n' is not listed in taxonomy
- pilar_eval_report_rendering_sanity_008: domain 'report' is not listed in taxonomy
- pilar_eval_old_db_output_not_proof_009: domain 'process' is not listed in taxonomy
- pilar_eval_input_agent_missing_data_status_010: domain 'input-agent' is not listed in taxonomy

## Next expansion targets

- Add more cases per domain once runtime traces are available.
- Split rule-based checks from future model-graded checks.
- Add expected result-shape checks for report, PDF and Word artifacts.
- Keep generated reports separate from production app code.

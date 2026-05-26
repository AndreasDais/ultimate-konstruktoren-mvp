# PILAR Eval Suite Readiness Report

**Status:** READY
**Input:** `qa/evals/pilar-core-evals.jsonl`
**Output:** `qa/evals/reports/latest-eval-readiness.md`
**Cases:** 10
**Errors:** 0
**Warnings:** 0
**Strict mode:** off

## Summary

This is a local readiness artifact for the PILAR Eval Agent track. It does not call production AI agents. It checks whether the eval-case corpus is structured enough for later automated grading and regression workflows.

## Priorities

- P0: 7
- P1: 3

## Domains

- concrete: 1
- i18n: 1
- input-agent: 1
- process: 1
- report: 1
- steel: 4
- unknown: 1

## Standards

- aisc_asce_aci_experimental: 2
- any: 1
- canadian_experimental: 1
- norway_eurocode: 5
- unknown: 1

## Display languages

- en: 3
- nb: 1
- nn: 6

## Graders

- manual_report_check: 1
- rules: 2
- rules_plus_manual: 7

## Deterministic check inventory

- must_include entries: 51
- must_not_include entries: 63
- unit_expectations entries: 24
- required_warnings_if_missing entries: 25
- numeric_expectations entries: 11
- safety_checks entries: 20
- manual review required: 8

## Cases

| Case | Priority | Domain | Standard | Language | Checks | Manual review |
|---|---|---|---|---:|---:|---|
| pilar_eval_steel_eurocode_simple_beam_nn_001 | P0 | steel | norway_eurocode | nn | 18 | yes |
| pilar_eval_steel_eurocode_missing_profile_nn_002 | P0 | steel | norway_eurocode | nn | 22 | yes |
| pilar_eval_concrete_slab_min_reinforcement_nb_003 | P1 | concrete | norway_eurocode | nb | 20 | yes |
| pilar_eval_irrelevant_input_football_004 | P0 | unknown | unknown | nn | 15 | no |
| pilar_eval_aisc_simple_beam_en_005 | P0 | steel | aisc_asce_aci_experimental | en | 30 | yes |
| pilar_eval_aisc_missing_section_properties_en_006 | P0 | steel | aisc_asce_aci_experimental | en | 20 | yes |
| pilar_eval_international_shell_language_en_007 | P0 | i18n | canadian_experimental | en | 27 | yes |
| pilar_eval_report_rendering_sanity_008 | P1 | report | norway_eurocode | nn | 19 | yes |
| pilar_eval_old_db_output_not_proof_009 | P1 | process | any | nn | 9 | no |
| pilar_eval_input_agent_missing_data_status_010 | P0 | input-agent | norway_eurocode | nn | 14 | yes |

## Tags

- aisc: 2
- asce: 1
- avvist: 1
- canada: 1
- concrete: 1
- database: 1
- english: 1
- eurocode: 3
- french: 1
- guardrail: 4
- hallucination-risk: 1
- i18n: 2
- input-agent: 2
- irrelevant: 1
- load-effects: 2
- missing-data: 4
- norwegian: 1
- P0: 1
- pdf: 1
- process: 1
- prompt-version: 1
- regression: 1
- reinforcement: 1
- report: 1
- sanity: 1
- shell-language: 1
- smoke: 1
- steel: 3
- word: 1

## Errors

- none

## Warnings

- none

## Next use

- Use this report as a checkpoint before adding an LLM grader or production-run integration.
- Keep this runner deterministic and local until the eval corpus is stable.
- Do not treat this readiness report as proof that the live PILAR pipeline passes the evals; it only validates the eval corpus and report workflow.

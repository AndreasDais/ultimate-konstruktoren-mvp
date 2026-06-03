# Feature Arena — leaderboard (read-only snapshot)

> Generated deterministically from file data by `scripts/build-feature-arena-leaderboard.mjs`. **Read-only.** A rating is evidence-weighted prioritization under one arena objective, with uncertainty — **not** truth, **not** a roadmap order, **not** a build decision. There is **no global score**. **Human remains final.** No write actions, no `build_next`, no auto-roadmap, no auto-implementation.

- Rating model: `elo_v0` (mirrors `lib/feature-arena`, Sprint 35.2). Start rating 1500.
- Source data as of: `2026-06-01` · rated pairs: 18 · matches: 10
- Only hypothesis/arena pairs with at least one match are listed; unrated hypotheses stay at the neutral start with maximal uncertainty.

## Safety (`safety`)

_Which hypothesis most reduces risk of misleading or unsafe structural engineering output?_

| # | Hypothesis | Rating | Uncertainty | W/L/D | Evidence (count · quality) | Risk flags | Human decision | Why it rose/fell |
|---:|---|---:|---:|:---:|---|---|---|---|
| 1 | Preliminary status explainer `fh-preliminary-status-explainer` | 1525.2 | 0.7407 | 1/0/0 | 2 · 0.856 | professional_review_boundary, wording_review_required | not_decided | rose +25.2 from start 1500 — win vs fh-human-review-capture-form (match-safety-002, +25.2) |
| 2 | AISC verified-source guardrail `fh-aisc-verified-source-guardrail` | 1511.81 | 0.8591 | 1/0/0 | 2 · 0.856 | professional_review_boundary, aisc_verified_source_required, may_increase_warnings | not_decided | rose +11.81 from start 1500 — win vs fh-guardrail-decision-dashboard (match-safety-001, +11.81) |
| 3 | Guardrail decision dashboard `fh-guardrail-decision-dashboard` | 1488.19 | 0.8591 | 0/1/0 | 1 · 0.81 | read_only_first, no_raw_user_data | not_decided | fell -11.81 from start 1500 — loss vs fh-aisc-verified-source-guardrail (match-safety-001, -11.81) |
| 4 | Human review capture form `fh-human-review-capture-form` | 1474.8 | 0.7407 | 0/1/0 | 1 · 0.81 | privacy_redaction_required, professional_review_boundary | not_decided | fell -25.2 from start 1500 — loss vs fh-preliminary-status-explainer (match-safety-002, -25.2) |

## Trust (`trust`)

_Which hypothesis most improves user trust, explainability, traceability and professional-review clarity?_

| # | Hypothesis | Rating | Uncertainty | W/L/D | Evidence (count · quality) | Risk flags | Human decision | Why it rose/fell |
|---:|---|---:|---:|:---:|---|---|---|---|
| 1 | Report QA Agent v0 `fh-report-qa-agent-v0` | 1509.5 | 0.8834 | 1/0/0 | 1 · 0.765 | suggest_only_first, no_auto_block_without_policy | not_decided | rose +9.5 from start 1500 — win vs fh-pdf-word-report-parity-checker (match-trust-001, +9.5) |
| 2 | PDF/Word report parity checker `fh-pdf-word-report-parity-checker` | 1490.5 | 0.8834 | 0/1/0 | 2 · 0.72 | report_rendering_scope, pdf_docx_parity | not_decided | fell -9.5 from start 1500 — loss vs fh-report-qa-agent-v0 (match-trust-001, -9.5) |

## Eval (`eval`)

_Which hypothesis most improves measurable regression coverage and product correctness?_

| # | Hypothesis | Rating | Uncertainty | W/L/D | Evidence (count · quality) | Risk flags | Human decision | Why it rose/fell |
|---:|---|---:|---:|:---:|---|---|---|---|
| 1 | Eval case generator from failed runs `fh-eval-failure-case-generator` | 1519.59 | 0.7837 | 2/0/0 | 1 · 0.81 | eval_quality_required, may_create_noisy_tests | not_decided | rose +19.59 from start 1500 — win vs fh-synthetic-user-playwright-smoke (match-eval-001, +9.79); win vs fh-calculation-sheet-math-regression (match-eval-002, +9.8) |
| 2 | Synthetic user Playwright smoke `fh-synthetic-user-playwright-smoke` | 1490.21 | 0.8803 | 0/1/0 | 1 · 0.81 | browser_test_flakiness, scope_to_smoke_first | not_decided | fell -9.79 from start 1500 — loss vs fh-eval-failure-case-generator (match-eval-001, -9.79) |
| 3 | Calculation sheet math regression `fh-calculation-sheet-math-regression` | 1490.2 | 0.8772 | 0/1/0 | 1 · 0.675 | math_rendering_regression, report_scope | not_decided | fell -9.8 from start 1500 — loss vs fh-eval-failure-case-generator (match-eval-002, -9.8) |

## Product (`product`)

_Which hypothesis most improves practical product usefulness and user workflow value?_

| # | Hypothesis | Rating | Uncertainty | W/L/D | Evidence (count · quality) | Risk flags | Human decision | Why it rose/fell |
|---:|---|---:|---:|:---:|---|---|---|---|
| 1 | Result evidence trace panel `fh-result-evidence-trace-panel` | 1508.64 | 0.8929 | 1/0/0 | 1 · 0.72 | ui_scope, trace_data_required | not_decided | rose +8.64 from start 1500 — win vs fh-user-feedback-micro-form (match-product-001, +8.64) |
| 2 | User feedback micro-form `fh-user-feedback-micro-form` | 1491.36 | 0.8929 | 0/1/0 | 1 · 0.81 | privacy_redaction_required, feedback_quality_noise | not_decided | fell -8.64 from start 1500 — loss vs fh-result-evidence-trace-panel (match-product-001, -8.64) |

## Moat (`moat`)

_Which hypothesis most builds durable PILAR-specific data, workflow, evaluation or trust advantage?_

| # | Hypothesis | Rating | Uncertainty | W/L/D | Evidence (count · quality) | Risk flags | Human decision | Why it rose/fell |
|---:|---|---:|---:|:---:|---|---|---|---|
| 1 | Feature Hypothesis Arena v0 `fh-feature-hypothesis-arena-v0` | 1500 | 0.9428 | 0/0/1 | 1 · 0.855 | not_roadmap_manager, read_only_first, anti_goodhart_required | not_decided | held 0 from start 1500 — draw vs fh-human-review-capture-form (match-moat-001, +0) |
| 2 | Human review capture form `fh-human-review-capture-form` | 1500 | 0.9428 | 0/0/1 | 1 · 0.81 | privacy_redaction_required, professional_review_boundary | not_decided | held 0 from start 1500 — draw vs fh-feature-hypothesis-arena-v0 (match-moat-001, +0) |

## Effort (`effort`)

_Which hypothesis gives the most value per implementation risk and effort?_

| # | Hypothesis | Rating | Uncertainty | W/L/D | Evidence (count · quality) | Risk flags | Human decision | Why it rose/fell |
|---:|---|---:|---:|:---:|---|---|---|---|
| 1 | Release risk score `fh-release-risk-score` | 1511.16 | 0.8658 | 1/0/0 | 2 · 0.81 | read_only_first, no_auto_deploy | not_decided | rose +11.16 from start 1500 — win vs fh-agent-cost-latency-monitor (match-effort-001, +11.16) |
| 2 | Agent cost/latency monitor `fh-agent-cost-latency-monitor` | 1488.84 | 0.8658 | 0/1/0 | 1 · 0.81 | observability_required, do_not_log_sensitive_content | not_decided | fell -11.16 from start 1500 — loss vs fh-release-risk-score (match-effort-001, -11.16) |

## International (`international`)

_Which hypothesis most improves international mode without damaging Norwegian mode or standard separation?_

| # | Hypothesis | Rating | Uncertainty | W/L/D | Evidence (count · quality) | Risk flags | Human decision | Why it rose/fell |
|---:|---|---:|---:|:---:|---|---|---|---|
| 1 | AISC verified-source guardrail `fh-aisc-verified-source-guardrail` | 1510.66 | 0.8711 | 1/0/0 | 2 · 0.856 | professional_review_boundary, aisc_verified_source_required, may_increase_warnings | not_decided | rose +10.66 from start 1500 — win vs fh-international-shell-language-regression-pack (match-international-001, +10.66) |
| 2 | Norwegian mode regression pack `fh-norwegian-mode-regression-pack` | 1499.6 | 0.8451 | 0/0/1 | 1 · 0.902 | preserve_norwegian_mode, i18n_regression | not_decided | fell -0.4 from start 1500 — draw vs fh-international-shell-language-regression-pack (match-international-002, -0.4) |
| 3 | International shell-language regression pack `fh-international-shell-language-regression-pack` | 1489.75 | 0.7511 | 0/1/1 | 1 · 0.902 | i18n_regression, standard_language_separation | not_decided | fell -10.25 from start 1500 — loss vs fh-aisc-verified-source-guardrail (match-international-001, -10.66); draw vs fh-norwegian-mode-regression-pack (match-international-002, +0.4) |

---

High rating with high uncertainty means **promising but uncertain**, not **ready to build**. This snapshot proposes nothing and decides nothing; a human reviews the evidence and decides separately (see `qa/feature-arena/feature-decisions.jsonl`).

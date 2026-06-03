# Feature Hypothesis — Template (v0)

A feature hypothesis is a structured, testable claim about a feature PILAR could build. One JSON object per line in `qa/feature-arena/feature-hypotheses.seed.jsonl` (seeded in Sprint 35.1).

> A hypothesis is a candidate for evidence and debate — **not** an approved feature. Human remains final.

## Schema (`pilar.feature_hypothesis.v0`)

```json
{
  "schema_version": "pilar.feature_hypothesis.v0",
  "id": "fh-example-id",
  "title": "Short human-readable title",
  "claim": "If PILAR builds X, then Y measurable product/safety/eval outcome should improve.",
  "type": "guardrail",
  "status": "candidate",
  "arenas": ["safety", "trust"],
  "source_signals": [],
  "expected_impact": {
    "safety": 0.0, "trust": 0.0, "eval": 0.0, "product": 0.0,
    "moat": 0.0, "effort": 0.0, "international": 0.0
  },
  "effort_estimate": "S",
  "risk_flags": [],
  "evidence_ids": [],
  "human_review_required": true,
  "created_at": "2026-06-01",
  "last_reviewed_at": null
}
```

## Field notes

- `claim` — a falsifiable "if X then measurable Y" statement.
- `type` — one of: `product`, `safety`, `guardrail`, `eval`, `observability`, `agent`, `prompt`, `report`, `i18n`, `growth`, `infrastructure`, `meta`.
- `status` — one of: `candidate`, `needs_evidence`, `in_tournament`, `shortlisted`, `approved_for_sprint`, `implemented`, `rejected`, `archived`.
- `arenas` — subset of the arena keys (`safety`, `trust`, `eval`, `product`, `moat`, `effort`, `international`).
- `effort_estimate` — `S` | `M` | `L` | `XL`.
- `source_signals` — includes founder opinion **only** as an explicit `founder_prior` entry (below); never as evidence.
- `evidence_ids` — references to evidence records (see `EVIDENCE_TEMPLATE.md`).

## Founder prior (explicit, not evidence)

```json
{
  "source_signals": [
    {
      "type": "founder_prior",
      "priority": "high",
      "confidence": 0.9,
      "rationale": "International mode must not imply final AISC compliance."
    }
  ]
}
```

`founder_prior` belongs in `source_signals`, never in an evidence record.

## Rating view (read-only, generated in a later sprint)

When a hypothesis is rated, the per-arena view must always include `rating`, `uncertainty`, `evidence_count`, `evidence_quality`, `last_reviewed_at`, `risk_flags`, `human_decision_status`. There is no global score.

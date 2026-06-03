# Pairwise Match — Template (v0)

A pairwise match compares two hypotheses (A vs B) under **one** arena objective. One JSON object per line in `qa/feature-arena/feature-matches.sample.jsonl` (sampled in Sprint 35.3).

> The judgement is **logged, not trusted blindly**. A match never recommends implementation. It feeds the deterministic rating engine; a human still decides.

## Schema (`pilar.feature_match.v0`)

```json
{
  "schema_version": "pilar.feature_match.v0",
  "id": "match-safety-001",
  "arena": "safety",
  "hypothesis_a_id": "fh-a",
  "hypothesis_b_id": "fh-b",
  "objective": "Which hypothesis most reduces risk of misleading structural engineering output?",
  "outcome": "a_win",
  "confidence": 0.91,
  "judge_type": "agent_committee",
  "judge_version": "pairwise-judge-v0.1",
  "evidence_ids": ["ev-example-id"],
  "rationale": "Rationale based only on the provided evidence.",
  "risks": [],
  "missing_evidence": [],
  "created_at": "2026-06-01"
}
```

## Field notes

- `arena` — exactly one arena key; the `objective` must match that arena.
- `outcome` — one of: `a_win`, `b_win`, `draw`.
- `judge_type` — one of: `human`, `hybrid`, `agent_committee`, `single_agent`, `rule_based`.
- `evidence_ids` — the judge may use **only** these provided evidence IDs.
- `rationale` — **required**; must reference the provided evidence, not outside knowledge.
- `missing_evidence` — what the judge would need to be more confident (drives uncertainty and a "needs more evidence" status).

## Judge rules

1. Judge one arena objective at a time.
2. Use only the provided `evidence_ids`.
3. Always produce a `rationale`, and (when relevant) `risks` and `missing_evidence`.
4. Never recommend building/merging/deploying — that is a human decision logged separately.
5. An adversarial critic should also probe for hidden risk before the rating updates.

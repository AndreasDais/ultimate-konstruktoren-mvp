# Evidence — Template (v0)

Evidence is a typed, explicit record linked to one hypothesis. One JSON object per line in `qa/feature-arena/feature-evidence.seed.jsonl` (seeded in Sprint 35.1).

> Evidence-first: every hypothesis must link to explicit evidence. Founder opinion is **not** evidence — it is a `founder_prior` source signal on the hypothesis (see `FEATURE_HYPOTHESIS_TEMPLATE.md`).

## Schema (`pilar.feature_evidence.v0`)

```json
{
  "schema_version": "pilar.feature_evidence.v0",
  "id": "ev-example-id",
  "hypothesis_id": "fh-example-id",
  "type": "internal_doc",
  "source_ref": "PILAR_AGENT_ECOSYSTEM_STRATEGY.md",
  "source_url": null,
  "summary": "Short summary of what the evidence says.",
  "polarity": "supports",
  "strength": 0.8,
  "reliability": 0.9,
  "observed_at": "2026-06-01",
  "redaction_status": "no_user_data",
  "metadata": {}
}
```

## Field notes

- `type` — one of: `eval_failure`, `user_feedback_cluster`, `guardrail_decision`, `observability_event`, `human_review`, `internal_doc`, `web_research_source`, `post_implementation_outcome`, `manual_note`.
- `polarity` — one of: `supports`, `contradicts`, `mixed`, `context`.
- `strength`, `reliability` — `0.0`–`1.0`; these drive evidence quality and the uncertainty penalty.
- `redaction_status` — one of: `no_user_data`, `redacted_user_summary`, `synthetic`, `internal_only`.

## Forbidden in v0

- `raw_user_data`
- personally identifiable user text
- `founder_prior` used as evidence (it must be a hypothesis `source_signal` instead)

Only clusters/summaries and redacted user summaries are allowed; never raw user content.

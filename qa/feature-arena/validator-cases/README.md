# Feature Arena — validator cases

Intentionally **invalid** fixtures. Each file is otherwise well-formed and references real seed IDs, but contains **exactly one** rule violation, so the validator must fail it for that specific reason and nothing else.

These fixtures are **not** part of the Feature Arena dataset. The validator (`scripts/validate-feature-arena.mjs`) never merges them into the real data — it reads them only during its self-test to confirm each failure mode is caught.

| Fixture | Record type | Must fail because |
|---|---|---|
| `invalid-founder-prior-as-evidence.jsonl` | evidence | `type` is `founder_prior` — founder opinion belongs in a hypothesis `source_signals`, never as an evidence record. |
| `invalid-global-score.jsonl` | hypothesis | contains a `global_score` field — no global/total/overall score is allowed; ratings are per arena. |
| `invalid-match-missing-evidence.jsonl` | match | `evidence_ids` is empty — an agent/LLM judgement must cite the evidence it used. |
| `invalid-raw-user-data.jsonl` | evidence | `redaction_status` is `raw_user_data` — raw/identifiable user data is forbidden in v0. |
| `invalid-build-next-without-human.jsonl` | decision | `decision` is `build_next` with `decided_by` ≠ `human` — only a human may decide `build_next`. |

## Run

```bash
node scripts/validate-feature-arena.mjs
```

The validator first validates the real data (must print `FEATURE ARENA VALID`), then self-tests these fixtures and prints `CAUGHT <fixture>: <reason>` for each, ending with `ALL INVALID FIXTURES CAUGHT`. If the real data is invalid, or any fixture is **not** caught, the validator exits non-zero.

## Deterministic rating recompute

The validator also checks that a per-arena recompute over the matches is **deterministic** and internally consistent (`sum(matchesCount) == 2 × matches`, and `wins + losses + draws == matchesCount` per record). This is a counts-only tally — it does **not** reimplement the Elo formula. The full deterministic Elo rating recompute is owned and tested by **Sprint 35.2** (`lib/feature-arena` + `scripts/test-feature-arena-elo.mjs` + vitest), and is intentionally not duplicated in this validator.

# Feature Arena — seed data (`qa/feature-arena/`)

File-based, read-only seed data for the PILAR Feature Hypothesis Arena (Sprint 35.1).
No DB, no app/UI, no code. Record schemas are defined by the templates in `sources/feature-arena/`.

> This is **not** an AI roadmap manager. Ratings (added in a later sprint) are per arena, never global. Human remains final. See `sources/feature-arena/SAFETY_POLICY.md` and `sources/feature-arena/NON_GOALS.md`.

## Files

| File | Records | Schema | Notes |
|---|---:|---|---|
| `feature-arenas.json` | 7 | — | Safety, Trust, Eval, Product, Moat, Effort, International |
| `feature-hypotheses.seed.jsonl` | 20 | `pilar.feature_hypothesis.v0` | One hypothesis per line |
| `feature-evidence.seed.jsonl` | 17 | `pilar.feature_evidence.v0` | Typed, summarized, no raw user data |
| `feature-decisions.jsonl` | 0 | `pilar.feature_decision.v0` | Empty log; `build_next` requires `decided_by: human` |
| `feature-outcomes.jsonl` | 0 | `pilar.feature_outcome.v0` | Empty log; post-implementation reviews, none yet |

`feature-decisions.jsonl` and `feature-outcomes.jsonl` start **empty** — there are no human decisions yet and nothing has been implemented. They are append-only logs filled by real human decisions and real post-implementation reviews.

## Rules (enforced by the validator in Sprint 35.4)

- No `global_score` / `total_score` / `overall_score`. Ratings are per arena.
- Founder opinion appears only as a `founder_prior` entry in a hypothesis `source_signals` — **never** as an evidence record.
- Evidence is typed and summarized. `raw_user_data` and personally identifiable user text are forbidden. Allowed `redaction_status`: `no_user_data`, `redacted_user_summary`, `synthetic`, `internal_only`.
- No `build_next` decision may exist unless `decided_by: human`.

## Validate (before the validator script exists, Sprint 35.4)

```bash
node -e "const fs=require('fs'); for (const f of ['qa/feature-arena/feature-hypotheses.seed.jsonl','qa/feature-arena/feature-evidence.seed.jsonl','qa/feature-arena/feature-decisions.jsonl','qa/feature-arena/feature-outcomes.jsonl']) { fs.readFileSync(f,'utf8').split(/\r?\n/).filter(l=>l.trim()).forEach(l=>JSON.parse(l)); console.log('OK', f); } JSON.parse(fs.readFileSync('qa/feature-arena/feature-arenas.json','utf8')); console.log('OK feature-arenas.json');"
```

## Status

Sprint 35.1 — seed data only. Later sprints add the deterministic Elo engine (35.2), judge/critic prompts + sample matches (35.3), the validator (35.4) and a read-only leaderboard (35.5). One sprint at a time; each only on explicit request.

# Feature Arena — Non-Goals (v0)

PILAR Feature Hypothesis Arena v0 is **NOT**:

1. An AI roadmap manager.
2. A replacement for founder/product judgement.
3. A replacement for professional engineering review.
4. A production DB schema.
5. A system that auto-merges code.
6. A system that auto-deploys.
7. A system that auto-edits production prompts.
8. A system that auto-edits Supabase schema.
9. A raw user-data ingestion system.
10. A global feature voting board.
11. A truth machine.
12. A final engineering compliance engine.
13. A way to remove warnings/disclaimers.
14. A way to rank ideas without evidence.
15. A way for agents to optimize their own score.

## Specifically

- **No global score.** There is no `global_score` / `total_score` / `overall_score`. Ratings are per arena.
- **Human remains final.** The arena proposes sprint candidates; it never implements them.
- **File-based, read-only in v0.** No DB writes, no Supabase migration, no production prompt edits.

What the system *does*, and the boundaries it enforces, are in `PILAR_FEATURE_HYPOTHESIS_ARENA.md` and `SAFETY_POLICY.md`.

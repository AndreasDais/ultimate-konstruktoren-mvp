# PILAR Feature Hypothesis Arena — `sources/feature-arena/`

**Status:** Sprint 35.0 — docs + templates only (read-only, file-based).
**Scope of this sprint:** documentation and templates. No DB, no app UI, no production prompt changes, no code.

## What this is

PILAR Feature Hypothesis Arena is an **evidence-weighted product science subsystem**.
It helps PILAR learn which features deserve to exist.
It does **not** make final roadmap decisions. **Human remains final.**

> This is **not** an AI roadmap manager. It does not auto-decide the roadmap, auto-merge, auto-deploy, auto-implement, or auto-edit prompts/schema.

## Core principles (see `SAFETY_POLICY.md` and `NON_GOALS.md`)

- **Rating ≠ truth.** A rating is evidence-weighted prioritization under one explicit goal, with uncertainty.
- **No global score.** Ratings are per arena (Safety, Trust, Eval, Product, Moat, Effort, International).
- **Human final.** The arena suggests; a human decides and logs the decision.
- **Hard safety veto beats score.** Unsafe candidates are blocked regardless of rating.
- **Evidence-first.** Every hypothesis links to typed evidence. Founder opinion is explicit `founder_prior`, never hidden as evidence.
- **File-based, read-only MVP.** No DB writes and no Supabase migration in v0.

## Files in this directory (Sprint 35.0)

| File | Purpose |
|---|---|
| `README.md` | This index. |
| `PILAR_FEATURE_HYPOTHESIS_ARENA.md` | System definition: idea, principles, architecture, arenas, data model. |
| `FEATURE_HYPOTHESIS_TEMPLATE.md` | Schema + example for a feature hypothesis record. |
| `EVIDENCE_TEMPLATE.md` | Schema + example for a typed evidence record. |
| `PAIRWISE_MATCH_TEMPLATE.md` | Schema + example for a pairwise match record. |
| `SAFETY_POLICY.md` | Hard safety veto, rating-≠-truth, no-global-score, human-final, no-DB-writes. |
| `NON_GOALS.md` | Explicit non-goals for v0. |
| `PILAR_FEATURE_HYPOTHESIS_ARENA_CLAUDE_CODE_HANDOFF.md` | Full planning handoff (source of truth for later sprints). |

## Planned later sprints (not created in 35.0)

Documented in the handoff; each is implemented only when explicitly requested, one sprint at a time:

- **35.1** — seed data under `qa/feature-arena/` (arenas, hypotheses, evidence) — file-based JSON/JSONL.
- **35.2** — local deterministic Elo engine + tests under `lib/feature-arena/` and `tests/`.
- **35.3** — pairwise judge + adversarial critic prompts (docs) + sample matches.
- **35.4** — validator script + invalid-case fixtures.
- **35.5** — read-only leaderboard prototype.

## Related PILAR docs

- `sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md`
- `sources/patch-planner/PILAR_SPRINT_PATCH_WORKFLOW.md`
- `sources/codebase/PILAR_TECH_DEBT_AND_RISK_REGISTER.md`

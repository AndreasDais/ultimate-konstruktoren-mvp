# PILAR Feature Hypothesis Arena

**Status:** v0 specification (Sprint 35.0 — docs only).

**System class:**

> PILAR Feature Hypothesis Arena is an evidence-weighted product science subsystem.
> It helps PILAR learn which features deserve to exist.
> It does not make final roadmap decisions.
> Human remains final.

This document is the definition. Templates live alongside it; seed data, the rating engine, judge prompts, the validator and the leaderboard are added in later sprints (35.1–35.5), one at a time.

## 1. Core idea

PILAR should not just build features. PILAR should build a system that learns which features deserve to exist.

This is **not** an "AI roadmap manager". It is an evidence-weighted product science system:

```
PILAR Feature Hypothesis Arena
= structured feature hypotheses
+ evidence graph
+ pairwise debate/evaluation
+ Elo/TrueSkill-style rating per arena
+ uncertainty
+ human decision log
+ sprint-safe implementation gate
```

Ideas become hypotheses. Hypotheses receive typed evidence. Agents debate them pairwise under one arena objective. Deterministic ratings update per arena. Uncertainty is always visible. A human makes the final roadmap decision.

## 2. Non-negotiable principles

### 2.1 Rating is not truth
A rating means: *evidence-weighted prioritization under one explicit goal, with uncertainty.*
It does **not** mean truth, roadmap order, an automatic build decision, engineering approval, or permission to implement.

Every displayed rating must include `rating`, `uncertainty`, `evidence_count`, `evidence_quality`, `last_reviewed_at`, `risk_flags`, `human_decision_status`. If any are missing, the (later) validator fails.

### 2.2 No single global score
Do **not** create `global_score`, `total_score`, `overall_score` or similar in v0. Use multiple arenas (below). A hypothesis can be strong in Safety but weak in Effort — that distinction must stay visible.

### 2.3 Human remains final
The arena can structure ideas, attach evidence, run pairwise comparisons, update deterministic ratings, show leaderboards and suggest sprint candidates. It cannot decide the roadmap, merge code, deploy, edit prompts, or change schema. See `SAFETY_POLICY.md` and `NON_GOALS.md`.

### 2.4 Start file-based and read-only
v0 uses docs, JSON/JSONL files, a validator script, a local deterministic Elo engine, sample match data, and a read-only generated leaderboard. No Supabase schema or DB migration in v0; schema may be proposed later, only after the file format and policy are proven.

### 2.5 Evidence-first
Every hypothesis links to explicit, typed evidence. Founder opinion must be explicit as a `founder_prior` **source signal**, never hidden as an evidence record. See `EVIDENCE_TEMPLATE.md`.

### 2.6 Hard safety veto beats score
Safety-vetoed candidates are blocked regardless of rating. The veto list is defined in `SAFETY_POLICY.md`.

### 2.7 Anti-Goodhart from day one
Mechanisms: evidence decay/staleness, uncertainty penalty, diverse pairings, adversarial critic, human override log, post-implementation outcome review, built-but-failed feedback into future ratings, no global score, founder_prior transparency, safety veto beats score.

## 3. Architecture

```
Signal sources (founder_prior, eval_failures, user_feedback_clusters,
  guardrail_decisions, observability_events, human_reviews, internal_docs,
  web_research_sources, post_implementation_outcomes)
      |
      v
Feature Hypothesis Inbox  — normalizes ideas into hypotheses (claim, arenas, impact, risk flags)
      |
      v
Evidence Graph            — typed evidence; polarity, strength, reliability, staleness; no raw user data in v0
      |
      v
Safety Veto               — professional-review boundary; standard/language separation; patch/prompt/schema gates; redaction
      |
      v
Pairwise Debate           — A vs B under one arena objective; judge uses only provided evidence IDs;
                            adversarial critic; judgement logged, not trusted blindly
      |
      v
Deterministic Rating      — Elo v0; TrueSkill-compatible fields; uncertainty tracked separately; no global score
      |
      v
Human Decision Log        — build_next / build_later / needs_more_evidence / reject; reason required
      |
      v
Sprint-Safe Export        — proposes sprint candidates; never implements; never changes prompts/DB/deploy state
```

## 4. Arenas (v0)

Ratings are computed **per arena**. There is no global score.

| Key | Objective (abbreviated) | Human review |
|---|---|---|
| `safety` | Most reduces risk of misleading/unsafe structural engineering output | yes |
| `trust` | Most improves trust, explainability, traceability, professional-review clarity | yes |
| `eval` | Most improves measurable regression coverage and correctness | no |
| `product` | Most improves practical product usefulness and workflow value | no |
| `moat` | Most builds durable PILAR-specific data/workflow/eval/trust advantage | no |
| `effort` | Most value per implementation risk and effort | no |
| `international` | Most improves international mode without damaging Norwegian mode or standard separation | yes |

The canonical arena definitions are seeded in `qa/feature-arena/feature-arenas.json` in Sprint 35.1.

## 5. File-based data model (v0 overview)

Records are JSON/JSONL files (created in later sprints). Templates for the three author-facing records live in this directory:

| Record | Template | Seed/output file (later sprint) |
|---|---|---|
| Hypothesis | `FEATURE_HYPOTHESIS_TEMPLATE.md` | `qa/feature-arena/feature-hypotheses.seed.jsonl` |
| Evidence | `EVIDENCE_TEMPLATE.md` | `qa/feature-arena/feature-evidence.seed.jsonl` |
| Pairwise match | `PAIRWISE_MATCH_TEMPLATE.md` | `qa/feature-arena/feature-matches.sample.jsonl` |
| Rating snapshot | (generated, not authored) | `qa/feature-arena/feature-ratings.snapshot.json` |
| Human decision | (later sprint) | `qa/feature-arena/feature-decisions.jsonl` |
| Outcome review | (later sprint) | `qa/feature-arena/feature-outcomes.jsonl` |

## 6. Rating policy (v0 summary)

- Model: Elo v0, deterministic, recomputed from match history (never hand-edited).
- Per arena; starting rating 1500; uncertainty starts high and decreases with diverse matches.
- Uncertainty is always displayed; low evidence/quality keeps a "promising but uncertain" framing.
- Full formula and K/uncertainty policy are specified in Sprint 35.2.

## 7. v0 acceptance criteria

v0 is accepted when: no DB writes; no roadmap auto-decision; no implementation auto-trigger; no production prompt edits; no Supabase migration; deterministic rating update; all hypotheses structured JSONL; all evidence explicit and typed; `founder_prior` explicit (not hidden as evidence); all LLM judgements logged with rationale and `evidence_ids`; rating per arena (not global); uncertainty visible; a human can inspect why a hypothesis rose or fell; safety veto blocks unsafe candidates; validator catches the known failure modes.

## 8. References

- Full handoff: `PILAR_FEATURE_HYPOTHESIS_ARENA_CLAUDE_CODE_HANDOFF.md`
- Safety: `SAFETY_POLICY.md` · Non-goals: `NON_GOALS.md`
- Patch discipline: `sources/patch-planner/PILAR_SPRINT_PATCH_WORKFLOW.md`
- Agent ecosystem: `sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md`

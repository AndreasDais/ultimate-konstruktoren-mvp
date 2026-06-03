# Feature Arena — Safety Policy (v0)

This policy governs the PILAR Feature Hypothesis Arena. It is binding for every hypothesis, evidence record, pairwise match, rating and decision. When this policy conflicts with a rating, **the policy wins**.

## 1. Rating is not truth

A rating is *evidence-weighted prioritization under one explicit goal, with uncertainty*. A rating is **not** truth, roadmap order, an automatic build decision, engineering approval, or permission to implement. Every displayed rating must show `rating`, `uncertainty`, `evidence_count`, `evidence_quality`, `last_reviewed_at`, `risk_flags`, `human_decision_status`.

## 2. No global score

`global_score`, `total_score`, `overall_score` and equivalents are forbidden in v0. Ratings are per arena only.

## 3. Human remains final

The arena suggests; a human decides. Every `build_next` / `build_later` / `reject` decision requires a human `decided_by` and a written reason. Overrides require an override reason. No part of the arena may auto-decide the roadmap.

## 4. File-based, read-only — no DB writes in v0

v0 writes only docs and JSON/JSONL files in the repo. **No DB writes. No Supabase migration. No production prompt edits. No auto-merge, auto-deploy or auto-implementation.**

## 5. Hard safety veto beats score

A feature hypothesis is **blocked** (regardless of rating) if it:

1. weakens the professional-review boundary;
2. implies final professional/engineering approval;
3. hides or removes warnings/disclaimers;
4. mixes standard contexts (e.g. Eurocode and AISC/ASCE/ACI);
5. mixes `shellLanguage`, `answerLanguage` and `standardProfile`;
6. requires a DB/schema change without schema review;
7. requires a production prompt change without eval;
8. requires a large patch without testable scope;
9. uses sensitive/raw user data without redaction;
10. introduces auto-merge, auto-deploy or auto-implementation.

A vetoed hypothesis stays visible with its `risk_flags`, but cannot be exported as a sprint candidate until a human resolves the veto.

## 6. Anti-Goodhart

To stop agents optimizing the score instead of reality: evidence decay/staleness, uncertainty penalty, diverse pairings, an adversarial critic, a human override log, post-implementation outcome review, built-but-failed feedback into future ratings, no global score, `founder_prior` transparency, and safety veto beats score.

## 7. Evidence and data handling

- Every hypothesis links to typed evidence. Founder opinion is an explicit `founder_prior` source signal, **never** an evidence record.
- Forbidden in v0 evidence: `raw_user_data`, personally identifiable user text, and `founder_prior` used as evidence.
- Allowed redaction states: `no_user_data`, `redacted_user_summary`, `synthetic`, `internal_only`.

## 8. STOP conditions (safety-relevant)

Stop the sprint and correct surgically if any of these occur: a JSONL file has invalid JSON; a hypothesis has a global/total/overall score; a rating view lacks uncertainty; `founder_prior` is used as evidence; raw/sensitive user data appears; an LLM judgement lacks rationale or `evidence_ids` or recommends implementation directly; a `build_next` is not decided by a human; any file introduces a DB migration, production prompt change, or auto-merge/deploy/implementation; the hard safety veto is triggered; an AISC/ASCE hypothesis implies final compliance without verified properties; an i18n hypothesis mixes `standardProfile`, `answerLanguage` and `shellLanguage`.

See `NON_GOALS.md` for what this system is explicitly not.

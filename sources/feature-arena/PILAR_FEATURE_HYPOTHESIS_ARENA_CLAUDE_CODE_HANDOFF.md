# PILAR Feature Hypothesis Arena — Claude Code Handoff

**Status:** Planning handoff for implementation
**Date:** 2026-06-01
**Owner:** PILAR / Ray
**Target consumer:** Claude Code
**Recommended repo location:** `sources/feature-arena/PILAR_FEATURE_HYPOTHESIS_ARENA_CLAUDE_CODE_HANDOFF.md`

---

## 0. Copy-paste prompt for Claude Code

Use this prompt when starting the Claude Code session:

```txt
Read `sources/feature-arena/PILAR_FEATURE_HYPOTHESIS_ARENA_CLAUDE_CODE_HANDOFF.md` and the existing PILAR safety docs:

- `PILAR_SPRINT_PATCH_PROTOCOL.md`
- `PILAR_PATCH_SAFETY_SKILL.md`
- `PILAR_GIT_BASH_PATCH_SAFETY_SKILL.md`
- `PILAR_I18N_SAFETY_SKILL.md`
- `PILAR_DEBUGGING_ERROR_HANDLING_SKILL.md`
- `PILAR_AGENT_ECOSYSTEM_STRATEGY.md`
- `PILAR_INTERNATIONAL_LANGUAGE_POLICY.md`

Implement Sprint 35.0 only.

Hard constraints:
- This is not an AI roadmap manager.
- Start read-only and file-based.
- No DB writes.
- No Supabase migration.
- No production prompt edits.
- No auto-roadmap decision.
- No implementation auto-trigger.
- No broad TSX regex.
- No large Git Bash heredoc patches.
- Follow the sprint patch protocol exactly.

After Sprint 35.0, stop and report:
- files created
- diff summary
- tests/gates run
- risks
- exact next recommended sprint
```

For later sprints, replace `Sprint 35.0 only` with the exact sprint number.

---

# 1. Core idea

PILAR should not just build features. PILAR should build a system that learns which features deserve to exist.

This system is not an “AI roadmap manager”. It is an **evidence-weighted product science system** for PILAR.

Ideas become hypotheses. Hypotheses receive evidence. Agents debate them pairwise. Ratings are updated per arena. Uncertainty is always visible. A human makes the final roadmap decision.

```txt
PILAR Feature Hypothesis Arena
= structured feature hypotheses
+ evidence graph
+ pairwise debate/evaluation
+ Elo/TrueSkill-style rating per arena
+ uncertainty
+ human decision log
+ sprint-safe implementation gate
```

---

# 2. Non-negotiable principles

## 2.1 Rating is not truth

Rating means:

```txt
Evidence-weighted prioritization under one explicit goal, with uncertainty.
```

Rating does **not** mean:

```txt
truth
roadmap order
automatic build decision
engineering approval
permission to implement
```

Every displayed rating must include:

```txt
rating
uncertainty
evidence_count
evidence_quality
last_reviewed_at
risk_flags
human_decision_status
```

If any of these are missing, the validator should fail.

## 2.2 No single global score

Do not create `global_score`, `total_score`, `overall_score`, or similar fields in v0.

Use multiple arenas:

```txt
Safety
Trust
Eval
Product
Moat
Effort
International
```

A hypothesis can be strong in Safety but weak in Effort. That distinction must remain visible.

## 2.3 Human remains final

The Feature Arena can:

```txt
- structure ideas as hypotheses
- attach evidence
- run pairwise comparisons
- update deterministic ratings
- show leaderboards
- suggest sprint candidates
```

It cannot:

```txt
- auto-merge
- auto-deploy
- auto-edit production prompts
- auto-edit DB schema
- auto-choose roadmap
- auto-trigger implementation
- remove warnings/disclaimers
- mark engineering output as finally approved
```

## 2.4 Start file-based and read-only

The v0 implementation must use:

```txt
docs
JSON/JSONL files
validator script
local deterministic Elo engine
sample match data
read-only generated leaderboard
```

Do not start with Supabase schema or DB migration. Schema can be proposed later after the file format and policy have been proven.

## 2.5 Evidence-first

Every hypothesis must link to explicit evidence.

Allowed evidence types:

```txt
eval_failure
user_feedback_cluster
guardrail_decision
observability_event
human_review
internal_doc
web_research_source
post_implementation_outcome
manual_note
```

Founder opinion must be explicit as `founder_prior`, not hidden as evidence.

Correct:

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

Wrong:

```json
{
  "evidence_type": "founder_prior",
  "polarity": "supports"
}
```

## 2.6 Hard safety veto beats score

A feature must be blocked if it:

```txt
- weakens the professional-review boundary
- implies final professional/engineering approval
- hides or removes warnings/disclaimers
- mixes standard contexts, e.g. Eurocode and AISC/ASCE/ACI
- mixes shellLanguage, answerLanguage and standardProfile
- requires DB/schema change without schema review
- requires production prompt change without eval
- requires large patch without testable scope
- uses sensitive/raw user data without redaction
- introduces auto-merge, auto-deploy or auto-implementation
```

## 2.7 Anti-Goodhart from day one

Prevent agents from optimizing the score instead of reality.

Required mechanisms:

```txt
- evidence decay / staleness handling
- uncertainty penalty
- diverse pairings
- adversarial critic
- human override log
- post-implementation outcome review
- built-but-failed feedback into future ratings
- no global score
- founder_prior transparency
- safety veto beats score
```

---

# 3. Final architecture

```txt
┌──────────────────────────────────────────────────────────────┐
│ Signal sources                                                │
├──────────────────────────────────────────────────────────────┤
│ founder_prior                                                 │
│ eval_failures                                                 │
│ user_feedback_clusters                                        │
│ guardrail_decisions                                           │
│ observability_events                                          │
│ human_reviews                                                 │
│ internal_docs                                                 │
│ web_research_sources                                          │
│ post_implementation_outcomes                                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Feature Hypothesis Inbox                                     │
│ - normalizes ideas into hypotheses                            │
│ - requires claim, arenas, impact, risk flags                  │
│ - stores founder_prior as explicit source signal              │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Evidence Graph                                                │
│ - typed evidence records                                      │
│ - polarity, strength, reliability, staleness                  │
│ - no raw sensitive user data in v0                            │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Safety Veto                                                   │
│ - professional-review boundary                                │
│ - standard/language separation                                │
│ - patch/prompt/schema gates                                   │
│ - user-data redaction                                         │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Pairwise Debate / Evaluation                                  │
│ - A vs B under one arena objective                            │
│ - judge uses only provided evidence IDs                       │
│ - adversarial critic finds hidden risk                        │
│ - LLM judgement is logged, not trusted blindly                │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Deterministic Rating Engine                                   │
│ - Elo v0                                                       │
│ - TrueSkill-compatible fields                                  │
│ - uncertainty tracked separately                              │
│ - no global score                                              │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Human Decision Log                                            │
│ - build_next / build_later / needs_more_evidence / reject      │
│ - human reason required                                       │
│ - override reason required                                    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Sprint-Safe Export                                            │
│ - proposes sprint candidates                                  │
│ - never implements automatically                              │
│ - never changes prompts/DB/deploy state                       │
└──────────────────────────────────────────────────────────────┘
```

---

# 4. System class

Use this exact framing in docs:

```txt
PILAR Feature Hypothesis Arena is an evidence-weighted product science subsystem.
It helps PILAR learn which features deserve to exist.
It does not make final roadmap decisions.
Human remains final.
```

---

# 5. Non-goals

Create a dedicated non-goals document with this content:

```txt
PILAR Feature Hypothesis Arena v0 is NOT:

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
14. A way to rank cool ideas without evidence.
15. A way for agents to optimize their own score.
```

---

# 6. Arena model v0

Create:

```txt
qa/feature-arena/feature-arenas.json
```

Recommended content:

```json
[
  {
    "key": "safety",
    "name": "Safety",
    "objective": "Which hypothesis most reduces risk of misleading or unsafe structural engineering output?",
    "higher_is_better": true,
    "requires_human_review": true
  },
  {
    "key": "trust",
    "name": "Trust",
    "objective": "Which hypothesis most improves user trust, explainability, traceability and professional-review clarity?",
    "higher_is_better": true,
    "requires_human_review": true
  },
  {
    "key": "eval",
    "name": "Eval",
    "objective": "Which hypothesis most improves measurable regression coverage and product correctness?",
    "higher_is_better": true,
    "requires_human_review": false
  },
  {
    "key": "product",
    "name": "Product",
    "objective": "Which hypothesis most improves practical product usefulness and user workflow value?",
    "higher_is_better": true,
    "requires_human_review": false
  },
  {
    "key": "moat",
    "name": "Moat",
    "objective": "Which hypothesis most builds durable PILAR-specific data, workflow, evaluation or trust advantage?",
    "higher_is_better": true,
    "requires_human_review": false
  },
  {
    "key": "effort",
    "name": "Effort",
    "objective": "Which hypothesis gives the most value per implementation risk and effort?",
    "higher_is_better": true,
    "requires_human_review": false
  },
  {
    "key": "international",
    "name": "International",
    "objective": "Which hypothesis most improves international mode without damaging Norwegian mode or standard separation?",
    "higher_is_better": true,
    "requires_human_review": true
  }
]
```

---

# 7. File-based data model v0

## 7.1 Hypothesis record

File:

```txt
qa/feature-arena/feature-hypotheses.seed.jsonl
```

One JSON object per line.

Required shape:

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
    "safety": 0.0,
    "trust": 0.0,
    "eval": 0.0,
    "product": 0.0,
    "moat": 0.0,
    "effort": 0.0,
    "international": 0.0
  },
  "effort_estimate": "S|M|L|XL",
  "risk_flags": [],
  "evidence_ids": [],
  "human_review_required": true,
  "created_at": "2026-06-01",
  "last_reviewed_at": null
}
```

Allowed hypothesis `type` values:

```txt
product
safety
guardrail
eval
observability
agent
prompt
report
i18n
growth
infrastructure
meta
```

Allowed `status` values:

```txt
candidate
needs_evidence
in_tournament
shortlisted
approved_for_sprint
implemented
rejected
archived
```

## 7.2 Evidence record

File:

```txt
qa/feature-arena/feature-evidence.seed.jsonl
```

One JSON object per line.

Required shape:

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

Allowed evidence `type` values:

```txt
eval_failure
user_feedback_cluster
guardrail_decision
observability_event
human_review
internal_doc
web_research_source
post_implementation_outcome
manual_note
```

Allowed `polarity` values:

```txt
supports
contradicts
mixed
context
```

Allowed `redaction_status` values:

```txt
no_user_data
redacted_user_summary
synthetic
internal_only
```

Forbidden in v0:

```txt
raw_user_data
personally_identifiable_user_text
founder_prior as evidence
```

## 7.3 Pairwise match record

File:

```txt
qa/feature-arena/feature-matches.sample.jsonl
```

Required shape:

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
  "rationale": "Rationale based only on provided evidence.",
  "risks": [],
  "missing_evidence": [],
  "created_at": "2026-06-01"
}
```

Allowed `outcome` values:

```txt
a_win
b_win
draw
```

Allowed `judge_type` values:

```txt
human
hybrid
agent_committee
single_agent
rule_based
```

## 7.4 Rating snapshot

File:

```txt
qa/feature-arena/feature-ratings.snapshot.json
```

This file should be generated by the rating recompute script, not manually edited.

Required shape:

```json
{
  "schema_version": "pilar.feature_ratings_snapshot.v0",
  "rating_model": "elo_v0",
  "generated_at": "2026-06-01T00:00:00Z",
  "ratings": [
    {
      "hypothesis_id": "fh-example-id",
      "arena": "safety",
      "rating": 1500,
      "uncertainty": 1.0,
      "matches_count": 0,
      "wins": 0,
      "losses": 0,
      "draws": 0,
      "evidence_count": 0,
      "evidence_quality": 0,
      "last_reviewed_at": null,
      "risk_flags": [],
      "human_decision_status": "not_decided"
    }
  ]
}
```

## 7.5 Human decision record

File:

```txt
qa/feature-arena/feature-decisions.jsonl
```

Required shape:

```json
{
  "schema_version": "pilar.feature_decision.v0",
  "id": "decision-001",
  "hypothesis_id": "fh-example-id",
  "decision": "needs_more_evidence",
  "decided_by": "human",
  "decided_at": "2026-06-01",
  "reason": "Reason is required.",
  "linked_sprint": null,
  "override_rating": false,
  "metadata": {}
}
```

Allowed decisions:

```txt
build_next
build_later
needs_more_evidence
reject
merge_with_other
archive
```

Rules:

```txt
- build_next requires decided_by = human
- override_rating = true requires reason
- implemented/build decisions require linked_sprint when applicable
```

## 7.6 Outcome review record

File:

```txt
qa/feature-arena/feature-outcomes.jsonl
```

Required shape:

```json
{
  "schema_version": "pilar.feature_outcome.v0",
  "id": "outcome-001",
  "hypothesis_id": "fh-example-id",
  "implemented_in_sprint": "36.2",
  "reviewed_at": "2026-06-20",
  "outcome": "partially_successful",
  "measured_effects": {},
  "rating_feedback": {
    "safety": "positive",
    "product": "mixed"
  },
  "notes": "Outcome review notes."
}
```

Allowed outcomes:

```txt
successful
partially_successful
failed
inconclusive
rolled_back
```

---

# 8. Rating policy v0

Use deterministic Elo in v0.

Do not use an LLM to update ratings.

## 8.1 Formula

```ts
expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400))

scoreA =
  1.0 if A wins
  0.5 if draw
  0.0 if B wins

newA = ratingA + weightedK * (scoreA - expectedA)
newB = ratingB + weightedK * ((1 - scoreA) - (1 - expectedA))
```

## 8.2 Suggested K policy

```txt
baseK:
- 48 for new hypothesis
- 32 for active hypothesis
- 16 for established hypothesis

judgeWeight:
- human: 1.50
- hybrid: 1.00
- agent_committee: 0.60
- single_agent: 0.35
- rule_based: 0.75

confidence:
- clipped between 0.25 and 1.0

evidenceQualityMultiplier:
- 0.25 if no evidence
- 0.50 if weak evidence
- 1.00 if normal evidence
- 1.25 if strong evidence with eval/human/guardrail support

safetyMultiplier:
- 1.25 in Safety arena when risk reduction is directly evidenced
- 0.50 if safety concern is unresolved
```

## 8.3 Uncertainty policy

Uncertainty should be stored as a visible value between `0` and `1`.

```txt
1.0 = very uncertain
0.0 = very certain
```

V0 rule of thumb:

```txt
uncertainty starts at 1.0
uncertainty decreases with high-quality matches
uncertainty increases with stale/weak/missing evidence
uncertainty must never be hidden
```

A high rating with high uncertainty should be displayed as:

```txt
Promising but uncertain
```

not:

```txt
Ready to build
```

---

# 9. Pairwise judge prompt v0

Create:

```txt
sources/feature-arena/PAIRWISE_JUDGE_PROMPT.md
```

Recommended prompt:

```txt
You are PILAR Feature Arena Pairwise Judge.

Your job is to compare two feature hypotheses under one explicit arena objective.

You are not a roadmap manager.
You do not decide implementation.
You do not recommend merging, deploying, editing prompts, or changing database schema.

Use only the provided hypothesis data and evidence records.
Separate facts from inference.
If evidence is weak, say so.
If safety risk is present, say so.
If a hard safety veto may apply, flag it.

Arena objective:
{{arena_objective}}

Hypothesis A:
{{hypothesis_a}}

Hypothesis B:
{{hypothesis_b}}

Evidence records:
{{evidence_records}}

Return strict JSON:

{
  "winner": "a_win | b_win | draw",
  "confidence": 0.0,
  "rationale": "...",
  "facts_used": ["..."],
  "inferences": ["..."],
  "evidence_ids": ["..."],
  "risk_flags": ["..."],
  "hard_veto_flags": ["..."],
  "missing_evidence": ["..."],
  "implementation_decision": null
}

Rules:
- `implementation_decision` must always be null.
- Do not invent evidence.
- Do not treat founder_prior as external evidence.
- Do not hide uncertainty.
- Do not produce a global score.
```

---

# 10. Adversarial critic prompt v0

Create:

```txt
sources/feature-arena/ADVERSARIAL_CRITIC_PROMPT.md
```

Recommended prompt:

```txt
You are PILAR Feature Arena Adversarial Critic.

Your job is to find why a promising hypothesis might be overrated, unsafe, underspecified, unmeasurable, too costly, or vulnerable to Goodhart-style score optimization.

You do not decide roadmap.
You do not recommend implementation.
You only produce critique.

Review:
{{hypothesis}}

Evidence:
{{evidence_records}}

Arena:
{{arena}}

Return strict JSON:

{
  "critic_summary": "...",
  "overrating_risks": ["..."],
  "missing_evidence": ["..."],
  "measurement_risks": ["..."],
  "safety_risks": ["..."],
  "goodhart_risks": ["..."],
  "required_before_shortlist": ["..."],
  "hard_veto_flags": ["..."],
  "implementation_decision": null
}

Rules:
- Use only provided evidence.
- Separate facts from inference.
- Flag safety risks aggressively.
- Never produce final build/no-build decision.
```

---

# 11. First 20 seed hypotheses

These are the initial v0 seed hypotheses.

| ID | Title | Type | Primary arenas |
|---|---|---|---|
| `fh-aisc-verified-source-guardrail` | AISC verified-source guardrail | guardrail | Safety, Trust, International |
| `fh-eval-failure-case-generator` | Eval case generator from failed runs | eval | Eval, Moat, Safety |
| `fh-pdf-word-report-parity-checker` | PDF/Word report parity checker | report | Trust, Eval, Product |
| `fh-human-review-capture-form` | Human review capture form | product | Trust, Moat, Safety |
| `fh-observability-trace-schema` | Observability trace schema | observability | Eval, Moat, Safety |
| `fh-guardrail-decision-dashboard` | Guardrail decision dashboard | guardrail | Safety, Trust |
| `fh-synthetic-user-playwright-smoke` | Synthetic user Playwright smoke | eval | Eval, Product, Trust |
| `fh-international-shell-language-regression-pack` | International shell-language regression pack | i18n | International, Trust, Eval |
| `fh-norwegian-mode-regression-pack` | Norwegian mode regression pack | i18n | International, Trust, Eval |
| `fh-result-evidence-trace-panel` | Result evidence trace panel | product | Trust, Product, Safety |
| `fh-preliminary-status-explainer` | Preliminary status explainer | product | Trust, Safety, Product |
| `fh-user-feedback-micro-form` | User feedback micro-form | product | Product, Moat, Eval |
| `fh-agent-disagreement-clustering` | Agent disagreement clustering | observability | Eval, Safety, Moat |
| `fh-report-qa-agent-v0` | Report QA Agent v0 | agent | Trust, Safety, Eval |
| `fh-prompt-version-comparison-memo` | Prompt version comparison memo | prompt | Eval, Safety, Effort |
| `fh-release-risk-score` | Release risk score | safety | Safety, Effort, Trust |
| `fh-standards-source-monitor-readonly` | Standards source monitor, read-only | agent | International, Safety, Moat |
| `fh-calculation-sheet-math-regression` | Calculation sheet math regression | report | Trust, Eval, Product |
| `fh-agent-cost-latency-monitor` | Agent cost/latency monitor | observability | Effort, Product |
| `fh-feature-hypothesis-arena-v0` | Feature Hypothesis Arena v0 | meta | Moat, Eval, Product |

---

# 12. Suggested initial JSONL seed content

Claude Code can use this as the first draft for `qa/feature-arena/feature-hypotheses.seed.jsonl`.

```jsonl
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-aisc-verified-source-guardrail","title":"AISC verified-source guardrail","claim":"If PILAR blocks final approval language when verified AISC section properties are missing, false confidence in US/AISC runs will decrease.","type":"guardrail","status":"candidate","arenas":["safety","trust","international"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.9,"rationale":"International mode must never present unsupported AISC compliance as final."}],"expected_impact":{"safety":0.95,"trust":0.85,"eval":0.7,"product":0.45,"moat":0.7,"effort":0.45,"international":0.95},"effort_estimate":"M","risk_flags":["professional_review_boundary","aisc_verified_source_required","may_increase_warnings"],"evidence_ids":["ev-international-policy-aisc-001","ev-agent-ecosystem-guardrail-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-eval-failure-case-generator","title":"Eval case generator from failed runs","claim":"If PILAR converts failed runs and known defects into eval cases, regression coverage and product correctness will improve.","type":"eval","status":"candidate","arenas":["eval","moat","safety"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.85,"rationale":"PILAR needs measurable feedback loops before prompt optimization gets more power."}],"expected_impact":{"safety":0.8,"trust":0.65,"eval":0.95,"product":0.55,"moat":0.85,"effort":0.6,"international":0.65},"effort_estimate":"M","risk_flags":["eval_quality_required","may_create_noisy_tests"],"evidence_ids":["ev-agent-ecosystem-eval-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-pdf-word-report-parity-checker","title":"PDF/Word report parity checker","claim":"If PILAR checks PDF, Word and web report parity, users will see fewer mismatched warnings, labels and conclusions across report formats.","type":"report","status":"candidate","arenas":["trust","eval","product"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.8,"rationale":"Report trust depends on consistent web, PDF and Word output."}],"expected_impact":{"safety":0.65,"trust":0.9,"eval":0.8,"product":0.75,"moat":0.55,"effort":0.5,"international":0.75},"effort_estimate":"M","risk_flags":["report_rendering_scope","pdf_docx_parity"],"evidence_ids":["ev-agent-ecosystem-report-qa-001","ev-i18n-policy-report-parity-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-human-review-capture-form","title":"Human review capture form","claim":"If PILAR captures professional corrections as structured data, future evals, guardrails and product trust will improve.","type":"product","status":"candidate","arenas":["trust","moat","safety"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.85,"rationale":"Fagpersonrettingar are high-value PILAR learning data."}],"expected_impact":{"safety":0.8,"trust":0.85,"eval":0.75,"product":0.7,"moat":0.95,"effort":0.45,"international":0.55},"effort_estimate":"M","risk_flags":["privacy_redaction_required","professional_review_boundary"],"evidence_ids":["ev-agent-ecosystem-brain-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-observability-trace-schema","title":"Observability trace schema","claim":"If PILAR standardizes trace events for the agent pipeline, silent failures and disagreement patterns will become measurable.","type":"observability","status":"candidate","arenas":["eval","moat","safety"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.8,"rationale":"PILAR needs traceable run history before advanced self-improvement."}],"expected_impact":{"safety":0.75,"trust":0.7,"eval":0.85,"product":0.55,"moat":0.9,"effort":0.5,"international":0.6},"effort_estimate":"M","risk_flags":["schema_proposal_before_db","avoid_raw_user_data"],"evidence_ids":["ev-agent-ecosystem-observability-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-guardrail-decision-dashboard","title":"Guardrail decision dashboard","claim":"If PILAR exposes pass/warn/block decisions and reason codes, safety debugging and user trust will improve.","type":"guardrail","status":"candidate","arenas":["safety","trust"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.75,"rationale":"Guardrail decisions should be observable before they become more automated."}],"expected_impact":{"safety":0.85,"trust":0.8,"eval":0.65,"product":0.55,"moat":0.65,"effort":0.5,"international":0.55},"effort_estimate":"M","risk_flags":["read_only_first","no_raw_user_data"],"evidence_ids":["ev-agent-ecosystem-guardrail-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-synthetic-user-playwright-smoke","title":"Synthetic user Playwright smoke","claim":"If PILAR runs a deterministic Playwright smoke from input to result to report to PDF/Word, product regressions will be caught earlier.","type":"eval","status":"candidate","arenas":["eval","product","trust"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.8,"rationale":"PILAR must be tested like a real user uses it."}],"expected_impact":{"safety":0.65,"trust":0.75,"eval":0.9,"product":0.85,"moat":0.55,"effort":0.55,"international":0.7},"effort_estimate":"M","risk_flags":["browser_test_flakiness","scope_to_smoke_first"],"evidence_ids":["ev-agent-ecosystem-synthetic-user-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-international-shell-language-regression-pack","title":"International shell-language regression pack","claim":"If PILAR tests non-Norwegian profiles for English shell labels and no Norwegian leakage, international trust will improve without damaging standard separation.","type":"i18n","status":"candidate","arenas":["international","trust","eval"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.9,"rationale":"International/AISC mode must preserve English shell labels and avoid Norwegian leakage."}],"expected_impact":{"safety":0.55,"trust":0.85,"eval":0.85,"product":0.75,"moat":0.55,"effort":0.7,"international":0.95},"effort_estimate":"S","risk_flags":["i18n_regression","standard_language_separation"],"evidence_ids":["ev-i18n-policy-shell-language-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-norwegian-mode-regression-pack","title":"Norwegian mode regression pack","claim":"If PILAR tests Norwegian/Nynorsk Eurocode after international fixes, Norwegian mode will be protected from regressions.","type":"i18n","status":"candidate","arenas":["international","trust","eval"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.85,"rationale":"International work must not break Norwegian mode."}],"expected_impact":{"safety":0.55,"trust":0.85,"eval":0.8,"product":0.75,"moat":0.55,"effort":0.75,"international":0.85},"effort_estimate":"S","risk_flags":["preserve_norwegian_mode","i18n_regression"],"evidence_ids":["ev-i18n-policy-norwegian-mode-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-result-evidence-trace-panel","title":"Result evidence trace panel","claim":"If PILAR shows which inputs, assumptions, warnings and checks support a conclusion, user trust and reviewability will improve.","type":"product","status":"candidate","arenas":["trust","product","safety"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.75,"rationale":"Users need to understand why an output is preliminary or trustworthy."}],"expected_impact":{"safety":0.75,"trust":0.9,"eval":0.55,"product":0.8,"moat":0.75,"effort":0.35,"international":0.6},"effort_estimate":"L","risk_flags":["ui_scope","trace_data_required"],"evidence_ids":["ev-agent-ecosystem-traceability-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-preliminary-status-explainer","title":"Preliminary status explainer","claim":"If PILAR explains why a result is preliminary and what is missing before professional use, user trust and safety clarity will improve.","type":"product","status":"candidate","arenas":["trust","safety","product"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.85,"rationale":"PILAR must avoid false confidence and explain review boundaries clearly."}],"expected_impact":{"safety":0.85,"trust":0.9,"eval":0.5,"product":0.75,"moat":0.5,"effort":0.8,"international":0.7},"effort_estimate":"S","risk_flags":["professional_review_boundary","wording_review_required"],"evidence_ids":["ev-agent-ecosystem-guardrail-001","ev-international-policy-aisc-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-user-feedback-micro-form","title":"User feedback micro-form","claim":"If PILAR asks users for lightweight feedback after each run, product pain and confusing outputs will become measurable.","type":"product","status":"candidate","arenas":["product","moat","eval"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.7,"rationale":"User feedback clusters should feed future evidence and eval cases."}],"expected_impact":{"safety":0.45,"trust":0.65,"eval":0.65,"product":0.85,"moat":0.8,"effort":0.75,"international":0.45},"effort_estimate":"S","risk_flags":["privacy_redaction_required","feedback_quality_noise"],"evidence_ids":["ev-agent-ecosystem-brain-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-agent-disagreement-clustering","title":"Agent disagreement clustering","claim":"If PILAR clusters cases where Engineer A/B or Controller disagree, recurring failure modes will become visible and actionable.","type":"observability","status":"candidate","arenas":["eval","safety","moat"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.75,"rationale":"Agent disagreement is likely a strong signal of ambiguous or risky runs."}],"expected_impact":{"safety":0.75,"trust":0.55,"eval":0.85,"product":0.55,"moat":0.85,"effort":0.45,"international":0.6},"effort_estimate":"M","risk_flags":["trace_data_required","avoid_overinterpreting_disagreement"],"evidence_ids":["ev-agent-ecosystem-observability-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-report-qa-agent-v0","title":"Report QA Agent v0","claim":"If PILAR reviews finished reports for assumptions, units, conclusion strength and standard consistency, report trust and safety will improve.","type":"agent","status":"candidate","arenas":["trust","safety","eval"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.8,"rationale":"Report quality is core to PILAR's user value."}],"expected_impact":{"safety":0.85,"trust":0.9,"eval":0.75,"product":0.75,"moat":0.7,"effort":0.4,"international":0.7},"effort_estimate":"M","risk_flags":["suggest_only_first","no_auto_block_without_policy"],"evidence_ids":["ev-agent-ecosystem-report-qa-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-prompt-version-comparison-memo","title":"Prompt version comparison memo","claim":"If PILAR compares prompt versions against eval outcomes before human review, prompt changes will become safer and more measurable.","type":"prompt","status":"candidate","arenas":["eval","safety","effort"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.7,"rationale":"Prompt optimizer should be suggest-only and eval-gated."}],"expected_impact":{"safety":0.7,"trust":0.55,"eval":0.85,"product":0.55,"moat":0.65,"effort":0.65,"international":0.55},"effort_estimate":"S","risk_flags":["no_production_prompt_edit","eval_required"],"evidence_ids":["ev-agent-ecosystem-prompt-optimizer-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-release-risk-score","title":"Release risk score","claim":"If PILAR shows a read-only release risk status based on tsc, build, evals, i18n and runtime checks, unsafe releases will be easier to block.","type":"safety","status":"candidate","arenas":["safety","effort","trust"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.75,"rationale":"Release readiness should be explicit and gate-based."}],"expected_impact":{"safety":0.8,"trust":0.7,"eval":0.7,"product":0.55,"moat":0.55,"effort":0.8,"international":0.55},"effort_estimate":"S","risk_flags":["read_only_first","no_auto_deploy"],"evidence_ids":["ev-patch-protocol-gates-001","ev-agent-ecosystem-release-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-standards-source-monitor-readonly","title":"Standards source monitor, read-only","claim":"If PILAR monitors relevant standards and source changes without interpreting paid standards from memory, international safety and research quality will improve.","type":"agent","status":"candidate","arenas":["international","safety","moat"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.7,"rationale":"PILAR should know when standards/source context may have changed but never hallucinate code provisions."}],"expected_impact":{"safety":0.75,"trust":0.65,"eval":0.55,"product":0.5,"moat":0.8,"effort":0.35,"international":0.85},"effort_estimate":"L","risk_flags":["read_only_only","no_paid_standard_hallucination","verified_sources_required"],"evidence_ids":["ev-agent-ecosystem-standards-monitor-001","ev-international-policy-aisc-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-calculation-sheet-math-regression","title":"Calculation sheet math regression","claim":"If PILAR tests calculation sheet rendering for formulas, units and symbols, report quality regressions will decrease.","type":"report","status":"candidate","arenas":["trust","eval","product"],"source_signals":[{"type":"founder_prior","priority":"medium","confidence":0.75,"rationale":"Calculation sheets must render cleanly for student/report use."}],"expected_impact":{"safety":0.5,"trust":0.85,"eval":0.8,"product":0.75,"moat":0.45,"effort":0.65,"international":0.55},"effort_estimate":"S","risk_flags":["math_rendering_regression","report_scope"],"evidence_ids":["ev-i18n-policy-known-issues-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-agent-cost-latency-monitor","title":"Agent cost/latency monitor","claim":"If PILAR logs cost and latency per agent step, expensive or slow workflows can be improved without guessing.","type":"observability","status":"candidate","arenas":["effort","product"],"source_signals":[{"type":"founder_prior","priority":"low","confidence":0.6,"rationale":"Useful but less urgent than safety and eval infrastructure."}],"expected_impact":{"safety":0.25,"trust":0.35,"eval":0.45,"product":0.65,"moat":0.45,"effort":0.85,"international":0.25},"effort_estimate":"S","risk_flags":["observability_required","do_not_log_sensitive_content"],"evidence_ids":["ev-agent-ecosystem-observability-001"],"human_review_required":false,"created_at":"2026-06-01","last_reviewed_at":null}
{"schema_version":"pilar.feature_hypothesis.v0","id":"fh-feature-hypothesis-arena-v0","title":"Feature Hypothesis Arena v0","claim":"If PILAR implements a read-only evidence-weighted feature hypothesis arena, future feature prioritization will become more systematic, inspectable and safer.","type":"meta","status":"candidate","arenas":["moat","eval","product"],"source_signals":[{"type":"founder_prior","priority":"high","confidence":0.95,"rationale":"PILAR should learn which features deserve to exist."}],"expected_impact":{"safety":0.6,"trust":0.75,"eval":0.85,"product":0.8,"moat":0.95,"effort":0.55,"international":0.6},"effort_estimate":"M","risk_flags":["not_roadmap_manager","read_only_first","anti_goodhart_required"],"evidence_ids":["ev-agent-ecosystem-feedback-loop-001"],"human_review_required":true,"created_at":"2026-06-01","last_reviewed_at":null}
```

---

# 13. Suggested initial evidence seed content

Claude Code can use this as first draft for `qa/feature-arena/feature-evidence.seed.jsonl`.

```jsonl
{"schema_version":"pilar.feature_evidence.v0","id":"ev-international-policy-aisc-001","hypothesis_id":"fh-aisc-verified-source-guardrail","type":"internal_doc","source_ref":"PILAR_INTERNATIONAL_LANGUAGE_POLICY.md","source_url":null,"summary":"AISC/ASCE experimental mode must not invent verified section properties or claim final compliance without verified input/source.","polarity":"supports","strength":0.95,"reliability":0.95,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"risk_area":"engineering_safety"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-guardrail-001","hypothesis_id":"fh-aisc-verified-source-guardrail","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"The agent ecosystem strategy recommends guardrails that block final approval language, invented AISC values, mixed standards and hidden missing assumptions.","polarity":"supports","strength":0.9,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Guardrail Agent"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-eval-001","hypothesis_id":"fh-eval-failure-case-generator","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"The strategy defines Eval Agent as P0 and states that PILAR should build testsets from previous runs, known failures, user feedback and professional reviews.","polarity":"supports","strength":0.9,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Eval Agent"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-report-qa-001","hypothesis_id":"fh-report-qa-agent-v0","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"The strategy proposes a Report QA Agent that checks finished reports for assumptions, units, traceability, standard consistency, warnings and PDF/Word parity.","polarity":"supports","strength":0.85,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Report QA Agent"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-i18n-policy-report-parity-001","hypothesis_id":"fh-pdf-word-report-parity-checker","type":"internal_doc","source_ref":"PILAR_INTERNATIONAL_LANGUAGE_POLICY.md","source_url":null,"summary":"The international language policy lists full report PDF/DOCX i18n parity as a known follow-up issue after result-view fixes.","polarity":"supports","strength":0.75,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"area":"report_i18n"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-brain-001","hypothesis_id":"fh-human-review-capture-form","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"PILAR Brain should preserve known failures, approved solution patterns, user corrections, professional reviews, eval history and decision logs as durable learning data.","polarity":"supports","strength":0.9,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Knowledge Brain"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-observability-001","hypothesis_id":"fh-observability-trace-schema","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"The strategy proposes observability events for run_id, input quality, domain, standard context, display language, agent versions, scores, flags and artifacts.","polarity":"supports","strength":0.9,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Observability Agent"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-synthetic-user-001","hypothesis_id":"fh-synthetic-user-playwright-smoke","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"The strategy defines Synthetic User Agent as P0 and recommends starting with Playwright plus deterministic checks across input, result page, full report, PDF and Word.","polarity":"supports","strength":0.9,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Synthetic User Agent"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-i18n-policy-shell-language-001","hypothesis_id":"fh-international-shell-language-regression-pack","type":"internal_doc","source_ref":"PILAR_INTERNATIONAL_LANGUAGE_POLICY.md","source_url":null,"summary":"Non-Norwegian profiles should use English shell labels and must not show Norwegian role/status labels such as Konstruktør, Kontrollør, HØG, GOD or FØREBELS GODKJENT.","polarity":"supports","strength":0.95,"reliability":0.95,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"area":"i18n"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-i18n-policy-norwegian-mode-001","hypothesis_id":"fh-norwegian-mode-regression-pack","type":"internal_doc","source_ref":"PILAR_INTERNATIONAL_LANGUAGE_POLICY.md","source_url":null,"summary":"Norwegian profiles should preserve localized shell labels and must not leak English role/status labels in Norwegian mode.","polarity":"supports","strength":0.95,"reliability":0.95,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"area":"i18n"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-traceability-001","hypothesis_id":"fh-result-evidence-trace-panel","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"The strategy emphasizes traceability, evals, guardrails and structured learning from each run, correction, report and professional review.","polarity":"supports","strength":0.8,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"area":"traceability"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-prompt-optimizer-001","hypothesis_id":"fh-prompt-version-comparison-memo","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"Prompt Optimizer is P2 and should suggest changes only after eval failure, root cause analysis, test branch, eval rerun and human review.","polarity":"supports","strength":0.85,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Prompt Optimizer"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-patch-protocol-gates-001","hypothesis_id":"fh-release-risk-score","type":"internal_doc","source_ref":"PILAR_SPRINT_PATCH_PROTOCOL.md","source_url":null,"summary":"Every sprint must run TypeScript and build gates, use scoped patches, report changes, provide rollback and avoid starting new sprint when compile is broken.","polarity":"supports","strength":0.9,"reliability":0.95,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"area":"release_safety"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-release-001","hypothesis_id":"fh-release-risk-score","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"Release Manager Agent should report RELEASE READY, RELEASE BLOCKED or RELEASE RISKY based on gates and runtime tests without deploying by itself.","polarity":"supports","strength":0.85,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Release Manager Agent"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-standards-monitor-001","hypothesis_id":"fh-standards-source-monitor-readonly","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"Standards Monitor Agent should flag possible changes and link to sources, but must not interpret paid standards from memory or invent provisions.","polarity":"supports","strength":0.85,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"agent":"Standards Monitor Agent"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-i18n-policy-known-issues-001","hypothesis_id":"fh-calculation-sheet-math-regression","type":"internal_doc","source_ref":"PILAR_INTERNATIONAL_LANGUAGE_POLICY.md","source_url":null,"summary":"The international language policy lists calculation sheet language labels and math rendering issues as known follow-up issues outside the initial result-view sprint.","polarity":"supports","strength":0.75,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"area":"calculation_sheet"}}
{"schema_version":"pilar.feature_evidence.v0","id":"ev-agent-ecosystem-feedback-loop-001","hypothesis_id":"fh-feature-hypothesis-arena-v0","type":"internal_doc","source_ref":"PILAR_AGENT_ECOSYSTEM_STRATEGY.md","source_url":null,"summary":"The strategy states that PILAR's moat should come from closed feedback loops where each run, error, correction, prompt change, report and professional review becomes structured learning data.","polarity":"supports","strength":0.95,"reliability":0.9,"observed_at":"2026-05-25","redaction_status":"no_user_data","metadata":{"area":"product_science"}}
```

Note: Some evidence records above point to only one hypothesis, but the same source can support multiple hypotheses. The validator should allow evidence IDs to be referenced by multiple hypotheses only if this is made explicit later. For v0, keep one primary `hypothesis_id` per evidence record.

---

# 14. Validator design

Create:

```txt
scripts/validate-feature-arena.mjs
```

It should read:

```txt
qa/feature-arena/feature-arenas.json
qa/feature-arena/feature-hypotheses.seed.jsonl
qa/feature-arena/feature-evidence.seed.jsonl
qa/feature-arena/feature-matches.sample.jsonl
qa/feature-arena/feature-decisions.jsonl
qa/feature-arena/feature-outcomes.jsonl
```

## 14.1 Required checks

```txt
Schema checks:
- every JSONL line parses
- schema_version is correct
- required fields exist
- no unknown arena keys
- no unknown status/type enums
- no duplicate IDs
- IDs use stable kebab-case format

Hypothesis checks:
- title, claim, type, status, arenas required
- every hypothesis has at least one arena
- every hypothesis has expected_impact object
- every hypothesis has risk_flags array
- every hypothesis has human_review_required boolean
- no field named global_score
- no field named total_score
- no field named overall_score
- founder_prior only allowed in source_signals
- founder_prior not allowed as evidence item

Evidence checks:
- evidence references known hypothesis
- evidence has polarity: supports / contradicts / mixed / context
- evidence has strength 0..1
- evidence has reliability 0..1
- evidence has redaction_status
- raw_user_data is forbidden in v0
- user feedback must be cluster/summary, not raw identifiable text
- web sources must have source_url or source_ref

Match checks:
- match references two known hypotheses
- A and B cannot be same hypothesis
- arena must exist
- outcome must be a_win / b_win / draw
- confidence must be 0..1
- judge_type required
- rationale required
- agent/LLM judgement must include evidence_ids and missing_evidence
- evidence_ids must exist
- safety arena match must include risk analysis
- implementation_decision field is forbidden unless null

Rating checks:
- rating update must be deterministic
- snapshot, if present, must match recomputed ratings
- uncertainty must be present
- evidence_count must be present
- evidence_quality must be present
- last_reviewed_at must be present or null
- human_decision_status must be present

Decision checks:
- decisions reference known hypotheses
- build_next requires decided_by = human
- override_rating = true requires reason
- implemented/build decisions require linked_sprint when applicable
```

## 14.2 Expected validator success output

```txt
OK qa/feature-arena/feature-arenas.json
OK qa/feature-arena/feature-hypotheses.seed.jsonl: 20 hypotheses
OK qa/feature-arena/feature-evidence.seed.jsonl: 17 evidence records
OK qa/feature-arena/feature-matches.sample.jsonl: 8 matches
OK deterministic rating recompute
FEATURE ARENA VALID
```

## 14.3 Expected validator failure examples

```txt
FAILED feature-hypotheses.seed.jsonl line 7:
field "global_score" is forbidden. Use per-arena ratings only.
```

```txt
FAILED feature-evidence.seed.jsonl line 3:
founder_prior cannot be used as evidence. Put it in source_signals.
```

```txt
FAILED feature-matches.sample.jsonl line 2:
LLM judgement missing evidence_ids.
```

---

# 15. Exact files to create by sprint

## Sprint 35.0 files

```txt
sources/feature-arena/PILAR_FEATURE_HYPOTHESIS_ARENA.md
sources/feature-arena/FEATURE_HYPOTHESIS_TEMPLATE.md
sources/feature-arena/EVIDENCE_TEMPLATE.md
sources/feature-arena/PAIRWISE_MATCH_TEMPLATE.md
sources/feature-arena/SAFETY_POLICY.md
sources/feature-arena/NON_GOALS.md
sources/feature-arena/README.md
```

## Sprint 35.1 files

```txt
qa/feature-arena/README.md
qa/feature-arena/feature-arenas.json
qa/feature-arena/feature-hypotheses.seed.jsonl
qa/feature-arena/feature-evidence.seed.jsonl
qa/feature-arena/feature-decisions.jsonl
qa/feature-arena/feature-outcomes.jsonl
```

## Sprint 35.2 files

```txt
lib/feature-arena/types.ts
lib/feature-arena/elo.ts
lib/feature-arena/rating-policy.ts
lib/feature-arena/recompute-ratings.ts
tests/feature-arena/elo.test.ts
scripts/test-feature-arena-elo.mjs
```

If the repo has no test framework available, `scripts/test-feature-arena-elo.mjs` is acceptable for v0.

## Sprint 35.3 files

```txt
sources/feature-arena/PAIRWISE_JUDGE_PROMPT.md
sources/feature-arena/ADVERSARIAL_CRITIC_PROMPT.md
qa/feature-arena/feature-matches.sample.jsonl
qa/feature-arena/judgements/.gitkeep
qa/feature-arena/judgements/sample-judgement.json
```

## Sprint 35.4 files

```txt
scripts/validate-feature-arena.mjs
qa/feature-arena/validator-cases/README.md
qa/feature-arena/validator-cases/invalid-founder-prior-as-evidence.jsonl
qa/feature-arena/validator-cases/invalid-global-score.jsonl
qa/feature-arena/validator-cases/invalid-match-missing-evidence.jsonl
qa/feature-arena/validator-cases/invalid-raw-user-data.jsonl
qa/feature-arena/validator-cases/invalid-build-next-without-human.jsonl
```

## Sprint 35.5 files

```txt
scripts/build-feature-arena-leaderboard.mjs
qa/feature-arena/leaderboard.snapshot.md
qa/feature-arena/feature-ratings.snapshot.json
```

Full UI should be deferred until after 35.5. If a UI is later approved, consider:

```txt
app/admin/feature-arena/page.tsx
components/feature-arena/ArenaLeaderboard.tsx
components/feature-arena/HypothesisCard.tsx
lib/feature-arena/queries.ts
```

Do not create these UI files in v0 unless explicitly approved.

---

# 16. Implementation sprints

## Sprint 35.0 — Feature Arena docs + templates

**Goal:**
Define Feature Hypothesis Arena as a read-only, evidence-weighted product-science system.

**Scope:**
Docs only. No DB. No app UI. No production prompt changes.

**Files:**

```txt
sources/feature-arena/PILAR_FEATURE_HYPOTHESIS_ARENA.md
sources/feature-arena/FEATURE_HYPOTHESIS_TEMPLATE.md
sources/feature-arena/EVIDENCE_TEMPLATE.md
sources/feature-arena/PAIRWISE_MATCH_TEMPLATE.md
sources/feature-arena/SAFETY_POLICY.md
sources/feature-arena/NON_GOALS.md
sources/feature-arena/README.md
```

**Risk:**
Low.

**Test:**

```bash
git diff -- sources/feature-arena
```

**Acceptance:**

```txt
- states explicitly that this is not an AI roadmap manager
- defines rating != truth
- defines no global score
- defines human final
- defines hard safety veto
- defines no DB writes in v0
- defines file-based read-only MVP
```

**Rollback:**

```bash
git checkout -- sources/feature-arena
```

---

## Sprint 35.1 — Seed 20 feature hypotheses

**Goal:**
Add the first seed data set with 20 hypotheses, arenas and evidence placeholders.

**Scope:**
File-based JSON/JSONL only.

**Files:**

```txt
qa/feature-arena/README.md
qa/feature-arena/feature-arenas.json
qa/feature-arena/feature-hypotheses.seed.jsonl
qa/feature-arena/feature-evidence.seed.jsonl
qa/feature-arena/feature-decisions.jsonl
qa/feature-arena/feature-outcomes.jsonl
```

**Risk:**
Low.

**Test before validator exists:**

```bash
node -e "const fs=require('fs'); for (const f of ['qa/feature-arena/feature-hypotheses.seed.jsonl','qa/feature-arena/feature-evidence.seed.jsonl']) { fs.readFileSync(f,'utf8').trim().split(/\n+/).forEach((l,i)=>JSON.parse(l)); console.log('OK', f); }"
```

**Acceptance:**

```txt
- exactly 20 seed hypotheses
- no global_score
- founder_prior appears only in source_signals
- each hypothesis has arenas
- each hypothesis has risk_flags
- each hypothesis has human_review_required
```

**Rollback:**

```bash
git checkout -- qa/feature-arena
```

---

## Sprint 35.2 — Local Elo engine with tests

**Goal:**
Create deterministic rating engine without LLM and without DB.

**Scope:**
TypeScript library + local tests.

**Files:**

```txt
lib/feature-arena/types.ts
lib/feature-arena/elo.ts
lib/feature-arena/rating-policy.ts
lib/feature-arena/recompute-ratings.ts
tests/feature-arena/elo.test.ts
scripts/test-feature-arena-elo.mjs
```

**Functions:**

```ts
expectedScore(ratingA, ratingB)
updateElo({ ratingA, ratingB, outcome, k, confidence, judgeWeight })
deriveKFactor(...)
deriveUncertainty(...)
recomputeRatingsFromMatches(...)
```

**Risk:**
Low-medium.

**Test:**

```bash
npx tsc --noEmit --pretty false
node scripts/test-feature-arena-elo.mjs
```

**Acceptance:**

```txt
- same input gives same output
- A win increases A and decreases B
- B win increases B and decreases A
- draw works
- confidence affects update magnitude
- uncertainty is present
- no LLM call
- no DB call
```

**Rollback:**

```bash
git checkout -- lib/feature-arena tests/feature-arena scripts/test-feature-arena-elo.mjs
```

---

## Sprint 35.3 — Pairwise judge prompt + sample matches

**Goal:**
Define how agents evaluate A vs B without updating ratings directly.

**Scope:**
Prompt + sample data only.

**Files:**

```txt
sources/feature-arena/PAIRWISE_JUDGE_PROMPT.md
sources/feature-arena/ADVERSARIAL_CRITIC_PROMPT.md
qa/feature-arena/feature-matches.sample.jsonl
qa/feature-arena/judgements/.gitkeep
qa/feature-arena/judgements/sample-judgement.json
```

**Prompt requirements:**

```txt
- use only provided evidence
- separate facts from inference
- return winner/draw
- include confidence
- include rationale
- include evidence_ids
- include missing_evidence
- include risk_flags
- include safety concerns
- never recommend implementation directly
```

**Risk:**
Low.

**Test:**

```bash
node -e "const fs=require('fs'); fs.readFileSync('qa/feature-arena/feature-matches.sample.jsonl','utf8').trim().split(/\n+/).forEach((l,i)=>JSON.parse(l)); console.log('OK sample matches');"
```

**Acceptance:**

```txt
- at least 8 sample matches
- at least one draw
- at least one Safety arena match
- at least one International arena match
- all sample judgements have rationale and evidence_ids
- no output field named implementation_decision unless null
```

**Rollback:**

```bash
git checkout -- sources/feature-arena/PAIRWISE_JUDGE_PROMPT.md sources/feature-arena/ADVERSARIAL_CRITIC_PROMPT.md qa/feature-arena/feature-matches.sample.jsonl qa/feature-arena/judgements
```

---

## Sprint 35.4 — Feature Arena validator

**Goal:**
Create validator that stops bad data, Goodhart traps and safety-policy violations.

**Scope:**
Node script. No DB. No UI.

**Files:**

```txt
scripts/validate-feature-arena.mjs
qa/feature-arena/validator-cases/README.md
qa/feature-arena/validator-cases/invalid-founder-prior-as-evidence.jsonl
qa/feature-arena/validator-cases/invalid-global-score.jsonl
qa/feature-arena/validator-cases/invalid-match-missing-evidence.jsonl
qa/feature-arena/validator-cases/invalid-raw-user-data.jsonl
qa/feature-arena/validator-cases/invalid-build-next-without-human.jsonl
```

**Risk:**
Medium, because validator defines policy that later sprints depend on.

**Test:**

```bash
node scripts/validate-feature-arena.mjs
npx tsc --noEmit --pretty false
```

**Acceptance:**

```txt
- fails on global_score
- fails on duplicate hypothesis IDs
- fails on founder_prior as evidence
- fails on match without evidence_ids
- fails on match without rationale
- fails on raw sensitive user data
- fails on build_next decision not decided_by human
- recomputes ratings deterministically
- prints clear OK/FAILED output
```

**Rollback:**

```bash
git checkout -- scripts/validate-feature-arena.mjs qa/feature-arena/validator-cases
```

---

## Sprint 35.5 — Read-only leaderboard prototype

**Goal:**
Generate a read-only overview from JSONL, matches and ratings.

**Scope:**
Static Markdown/JSON output, not full UI.

**Files:**

```txt
scripts/build-feature-arena-leaderboard.mjs
qa/feature-arena/leaderboard.snapshot.md
qa/feature-arena/feature-ratings.snapshot.json
```

**Risk:**
Low-medium.

**Test:**

```bash
node scripts/validate-feature-arena.mjs
node scripts/build-feature-arena-leaderboard.mjs
```

**Acceptance:**

```txt
- shows leaderboard per arena
- shows rating + uncertainty
- shows evidence_count + evidence_quality
- shows risk_flags
- shows human_decision_status
- shows why hypothesis rose/fell
- no write action
- no roadmap decision button
```

**Rollback:**

```bash
git checkout -- scripts/build-feature-arena-leaderboard.mjs qa/feature-arena/leaderboard.snapshot.md qa/feature-arena/feature-ratings.snapshot.json
```

---

# 17. Gates to run

For every sprint:

```bash
git status --short
```

For docs/data-only sprints:

```bash
git diff -- sources/feature-arena qa/feature-arena
```

For JSONL before the validator exists:

```bash
node -e "const fs=require('fs'); for (const f of process.argv.slice(1)) { fs.readFileSync(f,'utf8').trim().split(/\n+/).forEach((l,i)=>JSON.parse(l)); console.log('OK', f); }" qa/feature-arena/feature-hypotheses.seed.jsonl qa/feature-arena/feature-evidence.seed.jsonl
```

When validator exists:

```bash
node scripts/validate-feature-arena.mjs
```

When TypeScript files are added:

```bash
npx tsc --noEmit --pretty false
```

Full build gate:

```bash
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

Use new runs for agentprompt/report-output changes. However, this Feature Arena v0 should not change production prompts.

---

# 18. STOP conditions

Stop the sprint if any of these occur:

```txt
1. npx tsc --noEmit --pretty false fails.
2. npm run build fails.
3. validator fails.
4. a JSONL file contains invalid JSON.
5. a hypothesis has global_score, total_score or overall_score.
6. a rating view lacks uncertainty.
7. founder_prior is used as evidence.
8. raw or sensitive user data appears in evidence.
9. an LLM judgement lacks rationale.
10. an LLM judgement lacks evidence_ids.
11. an LLM judgement recommends implementation directly.
12. a build_next decision is not decided_by human.
13. any file introduces DB migration before v0 is proven.
14. any file introduces production prompt changes.
15. any file introduces auto-merge, auto-deploy or auto-implementation.
16. hard safety veto is triggered.
17. AISC/ASCE hypothesis implies final compliance without verified properties.
18. i18n hypothesis mixes standardProfile, answerLanguage and shellLanguage.
19. patch script fails before final wrote line.
20. same file fails twice during patching.
```

On STOP:

```txt
- do not start a new sprint
- do not make a larger patch
- fix validation/compilation first
- log STOP reason
- rollback or correct surgically
```

---

# 19. Risk register

| Risk | Severity | Mitigation |
|---|---:|---|
| System becomes perceived as AI roadmap manager | High | Repeat non-goal in docs, prompts, dashboard and validator. Human final. |
| Agents optimize score instead of product value | High | Anti-Goodhart: evidence quality, uncertainty, critic, outcome reviews, no global score. |
| Founder opinion becomes hidden evidence | Medium | `founder_prior` only in `source_signals`; validator fails otherwise. |
| Weak evidence creates false confidence | High | Evidence quality visible; uncertainty penalty; “promising but uncertain” label. |
| Safety features lose to product polish | High | Safety veto beats score; Safety arena visible separately. |
| DB migration too early | Medium | v0 is file-based; schema later only after policy is proven. |
| Prompt optimizer gains too much power | High | No production prompt edits; prompt changes require eval + human review. |
| Raw user data enters evidence graph | High | v0 allows only clusters/summaries and redacted user summaries. |
| i18n regression | Medium | International and Norwegian regression packs seeded early. |
| Large patch breaks TSX/build | Medium | Follow PILAR patch safety; no broad regex; run tsc/build gates. |

---

# 20. Claude Code implementation rules

Claude Code should treat this document as a planning source, not permission to implement everything at once.

Rules:

```txt
1. Implement one sprint at a time.
2. Do not start next sprint unless user explicitly asks.
3. Follow `Sprint XX.Y — name / Goal / Scope / Files / Risk / Test / Rollback`.
4. Prefer small additive files.
5. Do not edit existing TSX unless explicitly required by a later approved sprint.
6. Do not create Supabase migrations in v0.
7. Do not create app/admin UI until after file-based MVP is proven.
8. Do not use large heredoc patch instructions.
9. After changes, run the required gates.
10. Report exact files changed and exact tests run.
```

Recommended first Claude Code command:

```txt
Implement Sprint 35.0 only from `sources/feature-arena/PILAR_FEATURE_HYPOTHESIS_ARENA_CLAUDE_CODE_HANDOFF.md`. Follow PILAR patch safety. Stop after docs are created and show the diff summary.
```

---

# 21. v0 acceptance criteria

Feature Hypothesis Arena v0 is accepted when:

```txt
- no DB writes
- no roadmap auto-decision
- no implementation auto-trigger
- no production prompt edits
- no Supabase migration
- deterministic rating update
- all hypotheses are structured JSONL
- all evidence is explicit and typed
- founder_prior is explicit and not hidden as evidence
- all LLM judgments are logged with rationale and evidence_ids
- rating is per arena, not global
- uncertainty is visible
- human can inspect why a hypothesis rose or fell
- safety veto blocks unsafe candidates
- validator catches the known failure modes
```

---

# 22. Optional later phase: Supabase schema proposal

Do not implement this in v0.

Only after Sprint 35.5 is accepted, create a schema proposal document:

```txt
sources/database/PILAR_FEATURE_ARENA_SCHEMA.md
```

Possible tables later:

```txt
feature_hypotheses
feature_hypothesis_evidence
feature_rating_arenas
feature_hypothesis_ratings
feature_hypothesis_matches
feature_decisions
feature_outcomes
```

Rules before DB migration:

```txt
- schema proposal reviewed
- validator stable
- file-based data model accepted
- no unresolved safety veto
- no raw user data ingestion
- explicit migration rollback plan
```

---

# 23. References to existing PILAR docs

This Feature Arena must respect these internal policies:

```txt
PILAR_SPRINT_PATCH_PROTOCOL.md
PILAR_PATCH_SAFETY_SKILL.md
PILAR_GIT_BASH_PATCH_SAFETY_SKILL.md
PILAR_I18N_SAFETY_SKILL.md
PILAR_DEBUGGING_ERROR_HANDLING_SKILL.md
PILAR_AGENT_ECOSYSTEM_STRATEGY.md
PILAR_INTERNATIONAL_LANGUAGE_POLICY.md
```

Most important inherited rules:

```txt
- stability first
- small surgical changes beat broad automated replacements
- no new sprint while TypeScript/build is broken
- prompt/report changes require new runs
- Norwegian mode must not be broken by English/AISC fixes
- AISC/ASCE experimental mode must not invent section properties
- patch agents must not get direct production power without human review
```

---

# 24. External implementation notes for Claude Code

Claude Code can use repo files as persistent project context. If the repo has no `CLAUDE.md`, run `/init` first and then add a short pointer to this Feature Arena handoff. If `CLAUDE.md` already exists, do not overwrite it; add only a concise reference.

Suggested `CLAUDE.md` addition:

```md
## PILAR Feature Hypothesis Arena

For Feature Hypothesis Arena work, read:

- `sources/feature-arena/PILAR_FEATURE_HYPOTHESIS_ARENA_CLAUDE_CODE_HANDOFF.md`
- `PILAR_SPRINT_PATCH_PROTOCOL.md`
- `PILAR_PATCH_SAFETY_SKILL.md`
- `PILAR_GIT_BASH_PATCH_SAFETY_SKILL.md`
- `PILAR_I18N_SAFETY_SKILL.md`
- `PILAR_AGENT_ECOSYSTEM_STRATEGY.md`
- `PILAR_INTERNATIONAL_LANGUAGE_POLICY.md`

Implement one sprint at a time. Start read-only/file-based. No DB writes, no production prompt edits, no auto-roadmap decision.
```

If Feature Arena procedures become repeated, they can later be split into a Claude Code skill:

```txt
.claude/skills/pilar-feature-arena/SKILL.md
```

Do not do this in Sprint 35.0 unless explicitly asked.

---

# 25. Final short version

Build the boring, safe version first:

```txt
docs
+ templates
+ JSONL
+ validator
+ deterministic Elo
+ sample pairwise judgements
+ read-only leaderboard
```

Do not build the dangerous version:

```txt
AI roadmap manager
+ global score
+ hidden founder priors
+ prompt auto-edits
+ DB auto-migrations
+ auto-implementation
```

The guiding rule:

```txt
Rating is not truth.
Rating is evidence-weighted prioritization under a goal, with uncertainty.
Human remains final.
```

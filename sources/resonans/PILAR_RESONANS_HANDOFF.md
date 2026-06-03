# PILAR RESONANS Handoff

**Status:** Draft handoff for review. Docs only.
**Purpose:** Convert the RESONANS marketing-agent ecosystem idea into a PILAR-safe, file-based plan that can be implemented one gated sprint at a time.
**Current implementation state:** Not implemented.

RESONANS is a proposed marketing and growth-agent ecosystem for PILAR. It should help produce truthful launch copy, learn from public feedback, and surface evidence candidates for the Feature Hypothesis Arena. It must not become an autonomous marketing machine, roadmap manager, social-scraping system, or public posting bot.

This handoff intentionally narrows the original plan. The original concept had useful ideas, especially `Vaktar` as a hard truth gate, but it also proposed DB tables, cron jobs, social listening, MCP/A2A, and multi-agent automation too early. PILAR's current safe pattern is file-based, scoped, review-gated work. RESONANS should follow that pattern.

## Core Principle

RESONANS can suggest. A human decides.

Every public-facing marketing draft must pass through a truth and humility gate before it can be used. No content may imply that PILAR replaces a structural engineer, guarantees compliance, or provides final professional approval.

## Product Fit

PILAR already has a safety-first pattern:

- professional review remains required;
- AI confidence is not professional approval;
- AISC remains diagnostic-only unless the product has verified capacity logic;
- EC3 capacity is preliminary and scoped;
- Feature Arena is file-based and cannot decide `build_next`.

RESONANS must inherit the same rules.

## Proposed v0 Architecture

For v0, RESONANS is not a runtime system. It is a set of docs, templates, and file-based review artifacts.

```txt
Founder brief
  -> Strateg draft notes
  -> Skribent public-copy draft
  -> Vaktar truth review
  -> Human approval
  -> Optional Feature Arena evidence candidate
```

### Roles

| Role | Purpose | v0 status |
|---|---|---|
| Strateg | Converts a launch or growth goal into a narrow message hypothesis. | File-based only |
| Skribent | Drafts public copy in PILAR's humble engineering voice. | File-based only |
| Vaktar | Blocks oversell, unsafe claims, missing disclaimers, and platform-risk behavior. | First role to formalize |
| Maalaren | Records observed outcome after a human-posted experiment. | Deferred |
| Synteser | Converts feedback into product or Feature Arena evidence candidates. | Deferred |

The original plan also named Speidar, Lyttar, Planleggjar, Samtalar, MCP, A2A, and server-side orchestration. These are deferred until RESONANS proves value in a manual, review-gated workflow.

## Recommended Sprint Sequence

### R0 - Docs-Only Handoff

Create the safe handoff, voice/truth policy, and non-goals.

Files:

```txt
sources/resonans/PILAR_RESONANS_HANDOFF.md
sources/resonans/VOICE_AND_TRUTH_POLICY.md
sources/resonans/NON_GOALS.md
```

Acceptance:

- no code;
- no DB or Supabase changes;
- no production prompt changes;
- no auto-posting;
- no scraping;
- no MCP/A2A;
- explicit STOP conditions.

### R1 - Vaktar Policy and Sample Reviews

File-based policy and examples only.

Possible files:

```txt
sources/resonans/VAKTAR_REVIEW_POLICY.md
qa/resonans/sample-public-copy-drafts.jsonl
qa/resonans/sample-vaktar-reviews.jsonl
```

Acceptance:

- Vaktar can classify `allow`, `revise`, or `block`;
- every sample includes rationale;
- unsafe examples are blocked;
- no runtime agent or API.

### R2 - Manual Reddit Launch Draft Flow

Create a local/manual draft packet for one launch post. The output is a draft only.

Possible files:

```txt
sources/resonans/reddit-launch-draft-template.md
qa/resonans/reddit-launch-sample-review.json
```

Acceptance:

- draft copy includes clear scope and professional-review caveat;
- Vaktar review is attached;
- human approval is required before public use.

### R3 - Feature Arena Evidence Bridge

Convert marketing observations into evidence candidates, not roadmap decisions.

Possible files:

```txt
qa/resonans/feature-arena-evidence-candidates.sample.jsonl
sources/resonans/FEATURE_ARENA_BRIDGE.md
```

Acceptance:

- candidate evidence has source, summary, polarity, reliability, and redaction status;
- no `build_next`;
- no rating update unless a later sprint explicitly validates it.

### R4 - Metrics and Learning, Still File-Based

Record manual outcomes from human-approved posts.

Possible files:

```txt
qa/resonans/marketing-experiments.sample.jsonl
qa/resonans/marketing-outcomes.sample.jsonl
```

Acceptance:

- metrics are descriptive, not authoritative;
- trust and safety vetoes override engagement;
- no automatic posting or scraping.

### R5+ - Runtime, DB, Cron, MCP, A2A

Deferred until after the file-based flow proves useful and receives a dedicated architecture review.

These require separate review-gated lanes and must not be bundled with early RESONANS work.

## STOP Conditions

Stop and route back to Ops/Monitor if any sprint:

- adds or edits DB, Supabase, schema, migration, or SQL files;
- runs DB/Supabase CLI, SQL, repair, `db push`, or dry-run;
- adds cron jobs, external scraping, social listening, or platform automation;
- posts publicly or drafts a system that can post publicly without human approval;
- edits production prompts;
- changes agent runtime, report, PDF, Word, or structural calculation behavior;
- introduces auto-roadmap, auto-implementation, auto-merge, or auto-deploy behavior;
- treats marketing metrics as more important than truth, safety, or professional-review boundaries;
- implies PILAR provides final professional approval, compliance, or guaranteed adequacy;
- uses raw user data or private feedback without redaction.

## Integration Rules

For early RESONANS sprints:

- keep changes docs/data only;
- commit one sprint at a time;
- use explicit path staging;
- keep `git diff --check` clean;
- no package changes;
- no app UI until a separate design sprint is approved;
- no runtime code until Vaktar policy is accepted.

## Final Recommendation

Proceed with RESONANS as a slow, safety-first lane. Start with `Vaktar`, manual public-copy review, and Feature Arena evidence candidates. Do not build the full agent ecosystem yet.

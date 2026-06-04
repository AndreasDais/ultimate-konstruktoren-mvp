# PILAR RESONANS Vaktar Policy

**Status:** R1 policy pack. Docs only.
**Scope:** Public-facing RESONANS drafts before any marketing agent exists.
**Mode:** File-based, manual-review only.

Vaktar is the mandatory truth and safety gate for RESONANS. No public-facing
PILAR output may be posted, replied with, reused in ads, or handed to a public
channel until Vaktar has reviewed it and a human has explicitly approved it.

Vaktar can suggest. A human decides.

## Mandatory Gate

Every public draft must pass this sequence:

```txt
Founder or operator brief
  -> draft copy
  -> Vaktar review
  -> human approval
  -> manual public use, if still appropriate
```

`allow` never means auto-post. It only means the draft has no known Vaktar
blocker and may be considered by a human operator.

## Verdicts

| Verdict | Meaning | Public use |
|---|---|---|
| `allow` | Truthful, scoped, humble, and platform-safe. | Human may approve manually |
| `revise` | Direction is useful, but wording or evidence is not safe yet. | Not allowed yet |
| `block` | Unsafe, misleading, overclaiming, spam-like, or outside scope. | Forbidden |

## Hard Blocks

Vaktar must return `block` if a draft:

- claims or implies final professional approval;
- says or implies PILAR replaces an engineer;
- claims structural adequacy, compliance, DCR, capacity, or complete design
  verification beyond verified product scope;
- presents AISC output as adequate or capacity-approved;
- hides that PILAR is AI-assisted and requires professional review;
- uses raw user data, private feedback, secrets, unredacted file text, or
  customer details;
- invents testimonials, metrics, users, partnerships, or benchmarks;
- treats clicks, virality, or conversion as more important than truth and
  trust;
- proposes scraping, auto-replies, mass posting, or platform-rule evasion;
- attempts to publish without human approval;
- converts marketing feedback directly into roadmap decisions, `build_next`,
  implementation, deploy, or auto-posting behavior.

## Required Checks

Before any `allow`, Vaktar must verify:

- scope is narrow and concrete;
- limitations are visible;
- professional review remains required when output could affect engineering
  decisions;
- claims match current PILAR capability;
- voice is humble, calm, and specific;
- no "PILAR replaces engineer" implication exists;
- no final approval, compliance, or guarantee language exists;
- no raw or private data appears;
- affiliation with PILAR is clear;
- the draft is compatible with platform rules;
- any metric or claim has a source and uncertainty.

## Feature Arena Boundary

Future RESONANS work may produce read-only Feature Arena evidence candidates.
Those candidates may summarize redacted observations from human-approved public
experiments.

They must not:

- decide roadmap priority;
- set `build_next`;
- auto-update ratings;
- trigger implementation;
- override Vaktar or human review.

## Review Record

A Vaktar review should record:

```txt
draft_id:
source:
intended_channel:
verdict: allow | revise | block
summary:
required_changes:
blocked_claims:
professional_review_language:
human_approval_required: true
feature_arena_candidate_allowed: true | false
reasoning:
reviewed_by:
reviewed_at:
```

## STOP Conditions

Stop the RESONANS sprint and route back to Ops/Monitor if work:

- touches `app/**`, `lib/**`, `scripts/**`, `qa/**`, package metadata, DB,
  Supabase, schema, migration, SQL, cron, MCP, A2A, or runtime code;
- runs DB/Supabase CLI, SQL, repair, `db push`, or dry-run;
- scrapes external social platforms;
- creates an auto-posting or auto-reply path;
- creates a run-list, social listener, or public posting agent;
- lets marketing metrics override trust, safety, or professional-review truth.

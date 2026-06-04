# PILAR RESONANS Sample Reddit Review

**Status:** R1 sample review pack. Docs only.
**Data source:** Synthetic sample copy. No Reddit scraping. No public posting.

This file shows how Vaktar should review Reddit-style launch copy before any
human posts it manually. These are examples, not approved production copy.

## Sample A - Allow After Human Approval

### Draft

```txt
I am building PILAR, an AI-assisted workflow for early structural calculation
checks. It interprets an engineering task, runs two independent draft
calculations, compares them, and prepares a report. The output is preliminary
and still needs qualified engineering review.

I am looking for careful feedback from structural engineers: where would this
workflow be useful, where is it too limited, and what would make it trustworthy?
```

### Vaktar Review

```txt
draft_id: reddit-sample-a
intended_channel: Reddit engineering/product feedback thread
verdict: allow
summary: Humble, scoped, and clear that PILAR is AI-assisted and preliminary.
required_changes: none
blocked_claims: none
professional_review_language: present
human_approval_required: true
feature_arena_candidate_allowed: true
reasoning: The draft asks for feedback without claiming final approval,
  compliance, replacement of engineers, or unsupported capacity coverage.
```

Human may still decide not to post.

## Sample B - Revise

### Draft

```txt
PILAR cuts engineering report time dramatically by turning a prompt into a
ready report with parallel AI checks. We want beta users who need faster
Eurocode workflows.
```

### Vaktar Review

```txt
draft_id: reddit-sample-b
intended_channel: Reddit launch feedback
verdict: revise
summary: Direction is usable, but "ready report" and "dramatically" can
  oversell maturity and imply production readiness.
required_changes:
  - Replace "ready report" with "draft report for professional review".
  - Replace "dramatically" with a measured claim or remove it.
  - Add that supported checks are scoped and preliminary.
blocked_claims: ready_report_implication, unsupported_speed_claim
professional_review_language: missing
human_approval_required: true
feature_arena_candidate_allowed: false
reasoning: The copy may be made safe, but it needs clearer limits and review
  framing before any public use.
```

## Sample C - Block

### Draft

```txt
PILAR replaces slow structural engineers. Paste your problem and get an
approved design report in minutes.
```

### Vaktar Review

```txt
draft_id: reddit-sample-c
intended_channel: Reddit launch post
verdict: block
summary: The draft makes forbidden replacement and final approval claims.
required_changes:
  - Do not reuse this framing.
blocked_claims:
  - replaces_engineer
  - final_professional_approval
  - approved_design_report
professional_review_language: contradicted
human_approval_required: true
feature_arena_candidate_allowed: false
reasoning: PILAR must never imply it replaces engineers or approves designs.
  This draft would damage trust and violate the product safety boundary.
```

## Operator Notes

- Vaktar `allow` is still not publication approval.
- A human must approve and manually post any final text.
- RESONANS v0 does not scrape Reddit, auto-reply, post, schedule, or monitor
  public platforms.
- Marketing feedback may later become a redacted Feature Arena evidence
  candidate, but never an automatic roadmap or implementation decision.

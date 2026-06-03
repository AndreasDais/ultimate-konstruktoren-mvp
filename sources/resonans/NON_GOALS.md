# PILAR RESONANS Non-Goals

**Status:** Draft non-goals for early RESONANS work.
**Purpose:** Prevent scope creep and protect PILAR's safety posture.

RESONANS is not a launch blocker and not an autonomous growth machine. Early RESONANS work must stay narrow, manual, and review-gated.

## Non-Goals for v0

RESONANS v0 is not:

1. An autonomous posting system.
2. A social-media bot.
3. A scraper for Reddit, LinkedIn, X, HN, or forums.
4. A system that writes to DB or Supabase.
5. A system that changes production prompts.
6. A cron or scheduled worker.
7. A public API.
8. An MCP server.
9. An A2A server.
10. A replacement for human product judgement.
11. A roadmap decision-maker.
12. A system that can set `build_next`.
13. A system that can merge, deploy, or implement code.
14. A system that ranks growth above trust or safety.
15. A place to store raw user data or private feedback.

## Deferred Until Separate Approval

The following ideas from the original RESONANS concept are deferred:

- Supabase tables for signals, content, publications, metrics, or agent events;
- Vercel Cron;
- server-side orchestrator runtime;
- external social listening;
- Reddit/LinkedIn/X/HN automation;
- MCP tools;
- A2A Agent Cards;
- automatic Feature Arena rating updates from marketing outcomes;
- campaign calendar automation;
- auto-replies to community comments;
- cost-bearing agent loops.

Each deferred item needs its own architecture review, safety review, and integration gate.

## Allowed in Early Sprints

Early RESONANS work may include:

- docs;
- policies;
- templates;
- sample JSON/JSONL;
- manual draft packets;
- Vaktar review examples;
- Feature Arena evidence candidates;
- redacted, human-approved observations.

## Hard Boundaries

Stop if a proposed change:

- touches `app/**`, `lib/**`, `components/**`, `scripts/**`, `package.json`, or `package-lock.json` during a docs-only sprint;
- adds DB, Supabase, migration, schema, or SQL files;
- requires DB/Supabase CLI, SQL, repair, `db push`, or dry-run;
- introduces public posting automation;
- introduces scraping or platform monitoring;
- edits production prompts;
- weakens professional-review language;
- implies final engineering approval;
- treats AISC output as adequate or compliant;
- hides that a public message is from PILAR/founder context;
- stores private or raw user data.

## Relationship to Feature Arena

RESONANS may produce Feature Arena evidence candidates in a later file-based sprint.

It must not:

- decide roadmap priority;
- write `build_next`;
- auto-update ratings from weak marketing metrics;
- treat founder prior as evidence;
- let virality override safety.

The safe bridge is:

```txt
human-approved public experiment
  -> observed outcome
  -> redacted evidence candidate
  -> Feature Arena review
  -> human decision
```

## Launch Position

PILAR can launch without RESONANS. RESONANS may help make launch copy safer and more coherent, but it must not delay core product safety, report correctness, PDF/Word parity, or professional-review truth.

# LANES.md — who owns which files

**Status:** Active ownership map (current snapshot)
**Updated:** 2026-05-29
**Authoritative for:** which paths each parallel agent may edit *right now*.
**Defers to:** `sources/agent-research/THREE_CHAT_PARALLEL_WORKFLOW.md` for lane
missions, sprint sequences and the merge/integration protocol.

> Purpose: let Codex, Claude and future agents work PILAR in parallel without
> editing the same files. If a file is not in your lane, do not touch it — open
> a handoff note instead. This file is the boundary; the charter is the mission.

---

## Current state (git reality)

| Lane | Branch | Worktree | Active worker | Status |
|---|---|---|---|---|
| Integrator | `main` | `Code/ultimate-konstruktoren-mvp` | merges lanes | ahead of origin; integrator + UI lane live here |
| Runtime | `codex/lane-runtime` | `Code/pilar-lane-runtime` | Codex | active |
| Ops | `codex/lane-ops` | `Code/pilar-lane-ops` | Codex | active |
| Eval | `codex/lane-evals` *(not created)* | — | parallel Claude session | **runs on `main`, no worktree** |
| UI / Landing | `main` (or own branch) | `Code/ultimate-konstruktoren-mvp` | Claude (this track) | active — landing page |
| Synthetic User / E2E | `main` | `Code/ultimate-konstruktoren-mvp` | Claude | active — `qa/e2e` runner |

The integrator merges finished lane branches into `main` one at a time
(`git checkout main && git merge codex/lane-<name>`).

---

## Ownership map (the boundary)

### Runtime lane — Codex (`codex/lane-runtime`)

Make each agent run traceable, predictable, safe to replay.

```txt
app/api/agent-c/route.ts
app/api/agent-d/route.ts
lib/report/**
lib/result/**
lib/international/**
lib/step-messages/**
```

### Ops lane — Codex (`codex/lane-ops`)

Release gates, guardrails, observability. Non-writing, explainable.

```txt
scripts/validate-guardrail-reason-codes.mjs
scripts/validate-observability-event-taxonomy.mjs
scripts/validate-release-gates.mjs
scripts/write-release-readiness-report.mjs
sources/guardrails/**
sources/observability/**
sources/release-manager/**
```

### Eval lane — parallel Claude session (no worktree; on `main`)

Catch regressions before users do. Eval metadata, coverage, offline summaries.

```txt
qa/evals/**
scripts/run-eval-suite.mjs
scripts/validate-eval-cases.mjs
scripts/run-eval-case-live.mjs        # currently UNTRACKED on main
scripts/summarize-eval-coverage.mjs
scripts/grade-eval-artifact.mjs
sources/agent-research/eval/**
```

### Synthetic User / E2E lane — Claude (no worktree; on `main`)

Browser-driven end-to-end flows that test PILAR the way a real user does
(input → interpret → run → report), asserting must-show / must-not-show strings
from the checklist. Read-only against the app — never edits app code, prompts,
schema, report/PDF/Word code, or i18n; findings are filed for the owning lane.

```txt
qa/e2e/**                              # runner, prompts, checklist, evidence bundles
```

Distinct from the Eval lane: `qa/e2e/` (synthetic-user browser flows) vs
`qa/evals/` (offline eval cases). Do not touch `qa/evals/` from this lane.

### UI / Landing lane — Claude (this track)

App-level page UI, styling, and the marketing landing page. App surface only —
never runtime libs or agent APIs.

```txt
app/heim/**                            # landing page (new)
app/components/MarketingHeader.tsx     # new
app/components/ConditionalAppHeader.tsx # new
app/**  (page UI + components)  EXCEPT  app/api/**   and the runtime files above
docs/landing-page-plan.md
```

Current active work: `docs/landing-page-plan.md` (4 tasks).

### Integrator — owner / human (`main`)

```txt
git merges of lane branches
AGENTS.md, CLAUDE.md, README.md, LANES.md   # coordination docs
supabase/migrations/**                       # schema (review-gated)
```

---

## Shared files — coordinate before editing

These are not owned by one lane. Announce in your summary before touching, and
stage only the lines you changed:

```txt
app/layout.tsx        # root layout — high blast radius (UI lane wires the header here)
app/tokens.css        # design tokens — UI lane edits, everyone reads
middleware.ts         # auth/routing
package.json          # npm aliases (agent/eval scripts live here)
AGENTS.md / CLAUDE.md / LANES.md / README.md
```

---

## Known drift & live hazards (2026-05-28)

1. **Stale boundary doc.** `sources/agent-research/AGENT_ECOSYSTEM_HANDOFF.md`
   (sprint 34.15) lists `lib/report/**` and `lib/result/**` as "Claude-owned /
   out of scope." That is **superseded** — the charter assigns them to the
   Runtime lane, and `codex/lane-runtime` already owns them. Trust this file +
   the charter, not the 34.15 handoff, for report/result ownership.
2. **Eval lane has no worktree.** `codex/lane-evals` was never created, so eval
   work runs directly on `main` (e.g. untracked `scripts/run-eval-case-live.mjs`,
   plus `qa/evals/`). Anyone on `main` must avoid `scripts/` + `qa/evals/` and
   must NOT run `npm run debug:sweep` while the eval session is active (the
   sweep gate writes to `qa/evals/` too).
3. **`main` moves under you.** UI/Landing work commits directly to `main` (e.g.
   the `/heim` landing page), so `HEAD` can advance mid-session. Re-run
   `git log --oneline -3` before staging, and stage only your lane's files
   (never `git add -A`) so you don't sweep up another session's pending work.
4. **YELLOW: Runtime sync needed.** `1f73dfd test: inventory input prompt
   version gap` was test-only on `main`, but touched Runtime-owned `lib/report/**`;
   Runtime must sync/acknowledge before follow-up work continues.

---

## Before you edit — 30-second checklist

```bash
git status --short                 # is the tree clean? whose changes are pending?
# 2. find your target file in the ownership map above. Not your lane? Stop.
# 3. stage ONLY your lane's files:
git add <your-files>               # never `git add -A` during parallel work
git status --short                 # confirm nothing else is staged
npx tsc --noEmit --pretty false    # exit 0 before commit
```

Commit message prefix per lane (ASCII titles, no æøå):
`RUNTIME:` / `OPS:` / `EVAL:` / `QA:` / `UI:` / `DOCS:`.

---

## Pointers

- Lane charter (missions, sprints, merge protocol):
  `sources/agent-research/THREE_CHAT_PARALLEL_WORKFLOW.md`
- Ecosystem strategy: `sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md`
- Coding rules: `AGENTS.md`
- Release checklist: `sources/agent-research/AGENT_ECOSYSTEM_RELEASE_CHECKLIST.md`

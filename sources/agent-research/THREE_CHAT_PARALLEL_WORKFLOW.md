# Three-Chat Parallel Workflow

**Status:** Working plan  
**Purpose:** Let three Codex/agent chats improve the PILAR agent ecosystem in parallel without blocking each other or editing the same files.  
**Goal:** Build a world-class agent ecosystem with strong evals, reliable runtime traces, clear guardrails, and non-writing release gates.

## Core model

Do not run one shared sprint across all chats. Run three independent lanes:

```txt
Chat A / Eval Lane:     67A.1 -> 67A.2 -> 67A.3 -> ...
Chat B / Runtime Lane:  67B.1 -> 67B.2 -> 67B.3 -> ...
Chat C / Ops Lane:      67C.1 -> 67C.2 -> 67C.3 -> ...
```

Each chat can continue to the next sprint in its own lane as soon as its current sprint is committed on its branch. It does not wait for the other chats unless it needs files outside its lane or the integrator is merging branches.

## Worktree setup

Use one worktree and branch per chat:

```bash
git worktree add -b codex/lane-evals ../pilar-lane-evals
git worktree add -b codex/lane-runtime ../pilar-lane-runtime
git worktree add -b codex/lane-ops ../pilar-lane-ops
```

Keep the main checkout as the integration checkout. Avoid direct sprint work there.

## Global rules for every chat

1. Start every sprint with `git status --short`.
2. If the lane worktree is not clean, stop and resolve that lane before editing.
3. Keep each sprint to one or two files where possible.
4. Do not edit files outside the lane's allowed paths.
5. Do not refresh generated reports unless the sprint explicitly says to refresh that artifact.
6. Do not change `package.json`, shared hub scripts, migrations, or agent prompts unless the sprint explicitly allows it.
7. After every edit, show `git status --short` and `git diff --stat`.
8. After tests, show only `git status --short`.
9. Commit on the lane branch only.
10. Do not merge lane branches from inside a lane chat.

## Chat A: Eval Intelligence Lane

### Mission

Make PILAR's eval system catch regressions before users do. This lane owns eval metadata, eval coverage, offline eval summaries, and future eval expansion planning.

### Allowed files

```txt
qa/evals/**
scripts/*eval*
scripts/summarize-eval-coverage.mjs
scripts/run-eval-suite.mjs
scripts/validate-eval-cases.mjs
```

### Forbidden files

```txt
app/**
components/**
lib/agents/**
lib/report/**
sources/**
supabase/**
package.json
```

### Backlog

```txt
67A.1 - Eval metadata strictness audit
Check domain, target_agents, standard_context, display_language, and tags for consistency.

67A.2 - Eval tag consistency cleanup
Normalize inconsistent tags without changing eval intent.

67A.3 - Rules-only grader summary
Add a small non-writing summary for must_include, must_not_include, and unit_expectations coverage.

67A.4 - Eval risk backlog
Document missing evals for approval language, blocked_fields, report parity, old DB report proof, and intl role labels.

67A.5 - Strict coverage mode candidate
Investigate whether coverage warnings should fail in a separate strict command, not in ordinary agent:all.

67A.6 - Eval-to-runtime gap report
Document which eval cases still do not execute against the live PILAR pipeline.
```

### Gates

```bash
node scripts/validate-eval-cases.mjs
node scripts/run-eval-suite.mjs --check
node scripts/summarize-eval-coverage.mjs --check
npm run agent:all
```

### Prompt for Chat A

```txt
You are Chat A, the Eval Intelligence Lane for PILAR.

Worktree:
<path to ../pilar-lane-evals>

Start with:
git status --short

If the tree is not clean, stop.

Allowed files:
qa/evals/**
scripts/*eval*
scripts/summarize-eval-coverage.mjs
scripts/run-eval-suite.mjs
scripts/validate-eval-cases.mjs

Forbidden files:
app/**
components/**
lib/agents/**
lib/report/**
sources/**
supabase/**
package.json

Current sprint:
<insert 67A.N sprint>

Rules:
- Keep changes to one or two files.
- Do not call LLM APIs.
- Do not refresh generated reports unless the sprint explicitly says so.
- After edits, show git status --short and git diff --stat.
- After tests, show only git status --short.
- Commit only on this lane branch.
- Do not merge.
```

## Chat B: Runtime Agent Reliability Lane

### Mission

Make the live agent pipeline more reliable, traceable, and deterministic without mixing in eval/docs/ops work.

### Allowed files

```txt
app/api/**
lib/agents/**
lib/step-messages/**
lib/international/**
lib/report/**
lib/result/**
```

### Forbidden files

```txt
qa/evals/**
sources/**
supabase/migrations/**
package.json
scripts/pilar-agent-ecosystem-hub.mjs
```

### Backlog

```txt
67B.1 - Runtime route reliability audit
Find one concrete runtime invariant that lacks test coverage. Do not change prompts.

67B.2 - Intl role-label invariant test
Add or strengthen a test that intl mode does not leak Norwegian role labels in English shell output.

67B.3 - Step message consistency test
Verify that step message recording uses consistent run and step identifiers across agents.

67B.4 - Structured output fallback audit
Inspect jsonrepair and fallback paths for agents C/D/E. Add a small test only if a concrete risk is found.

67B.5 - Report model parity invariant
Verify that web report, Word export, and PDF print depend on canonical report data.

67B.6 - Blocked fields runtime audit
Pick one user-facing path and verify controller blocked_fields are respected.
```

### Gates

```bash
npx tsc --noEmit --pretty false
npm test
npm run agent:all
```

### Stop conditions

Stop and produce a plan before coding if the sprint requires:

```txt
database migrations
agent prompt behavior changes
report schema changes
new production routes
service-role Supabase changes
```

### Prompt for Chat B

```txt
You are Chat B, the Runtime Agent Reliability Lane for PILAR.

Worktree:
<path to ../pilar-lane-runtime>

Start with:
git status --short

If the tree is not clean, stop.

Allowed files:
app/api/**
lib/agents/**
lib/step-messages/**
lib/international/**
lib/report/**
lib/result/**

Forbidden files:
qa/evals/**
sources/**
supabase/migrations/**
package.json
scripts/pilar-agent-ecosystem-hub.mjs

Current sprint:
<insert 67B.N sprint>

Rules:
- Keep changes to one or two files.
- Do not change prompts unless the sprint explicitly allows it.
- Do not add DB migrations in this lane without a separate plan.
- Preserve nb/nn/en locale behavior.
- Preserve trust language: no final professional approval.
- After edits, show git status --short and git diff --stat.
- After tests, show only git status --short.
- Commit only on this lane branch.
- Do not merge.
```

## Chat C: Ops, Guardrails, and Observability Lane

### Mission

Make release confidence, guardrail policy, observability, and local agent gates clear, non-writing, and explainable.

### Allowed files

```txt
sources/release-manager/**
sources/guardrails/**
sources/observability/**
scripts/validate-release-gates.mjs
scripts/validate-guardrail-reason-codes.mjs
scripts/validate-observability-event-taxonomy.mjs
scripts/write-release-readiness-report.mjs
scripts/write-agent-ecosystem-health-snapshot.mjs
```

### Forbidden files

```txt
qa/evals/**
app/**
components/**
lib/agents/**
lib/report/**
supabase/**
package.json
sources/agent-research/**
```

### Backlog

```txt
67C.1 - Release artifact freshness audit
Document which release/eval/health reports are checkpoints, which are stale, and which must not auto-refresh.

67C.2 - Guardrail reason-code gap
Check whether reason codes cover professional review required, not final approval, unsupported standard, and missing data.

67C.3 - Observability taxonomy gap
Check whether observability taxonomy covers trace_events, step_messages, release gates, and Report QA warnings.

67C.4 - Release gate wording cleanup
Make release readiness wording clearer about RELEASE_RISKY versus script failure.

67C.5 - Health snapshot non-writing proof
Verify and document that health check mode does not rewrite artifacts.

67C.6 - Ops escalation map
Document which gate to use for eval, Report QA, release, guardrails, observability, and patch planning.
```

### Gates

```bash
npm run release:check
npm run guardrails:check
npm run observability:check
npm run agent:all
```

### Prompt for Chat C

```txt
You are Chat C, the Ops, Guardrails, and Observability Lane for PILAR.

Worktree:
<path to ../pilar-lane-ops>

Start with:
git status --short

If the tree is not clean, stop.

Allowed files:
sources/release-manager/**
sources/guardrails/**
sources/observability/**
scripts/validate-release-gates.mjs
scripts/validate-guardrail-reason-codes.mjs
scripts/validate-observability-event-taxonomy.mjs
scripts/write-release-readiness-report.mjs
scripts/write-agent-ecosystem-health-snapshot.mjs

Forbidden files:
qa/evals/**
app/**
components/**
lib/agents/**
lib/report/**
supabase/**
package.json
sources/agent-research/**

Current sprint:
<insert 67C.N sprint>

Rules:
- Keep changes to one or two files.
- Prefer docs or registry validation over runtime changes.
- Do not refresh generated reports unless the sprint explicitly says so.
- Keep agent:all non-writing.
- After edits, show git status --short and git diff --stat.
- After tests, show only git status --short.
- Commit only on this lane branch.
- Do not merge.
```

## Integration workflow

The integrator merges finished lane branches one at a time. If one chat is not ready, skip it and merge another ready lane.

```bash
git status --short
git merge codex/lane-evals
npm run agent:all
npx tsc --noEmit --pretty false
npm test
```

Repeat for `codex/lane-runtime` and `codex/lane-ops`, one branch at a time.

If a merge fails, stop and resolve only that integration conflict. Do not ask lane chats to keep editing around an unresolved merge.

## Done format for each lane sprint

Every chat should end a sprint with:

```txt
Sprint:
Branch:
Files changed:
Behavior changed:
Gates run:
Known risks:
Commit:
git add <exact files>
git commit -m "<message>"
Next sprint:
```

## What world-class means here

World-class does not mean a large number of agents. It means the system becomes safer and more measurable every sprint:

```txt
Eval Lane: catches regressions early.
Runtime Lane: makes each run traceable and predictable.
Ops Lane: keeps release gates non-writing, explainable, and hard to misuse.
Integrator: merges finished work calmly, one lane at a time.
```


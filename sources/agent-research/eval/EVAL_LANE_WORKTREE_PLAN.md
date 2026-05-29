# Eval lane worktree plan

**Sprint:** 68A.1  
**Lane:** Chat A / Eval  
**Status:** Plan only; no worktree created by this sprint  
**Runtime impact:** None  

## Current state

`LANES.md` currently says the Eval lane runs on `main` and has no separate
worktree. That is workable for small documentation or dry-run eval changes, but
it is not the preferred long-running setup while UI, E2E, and integrator work
also happen on `main`.

## Preferred next setup

Before larger Eval lane edits, create a dedicated eval worktree from the
integrator-approved base:

```bash
git worktree add C:/Users/rayma/Code/pilar-lane-evals -b codex/lane-evals main
```

The branch should own only Eval lane paths:

```txt
qa/evals/**
scripts/*eval*
scripts/summarize-eval-coverage.mjs
scripts/run-eval-suite.mjs
scripts/validate-eval-cases.mjs
scripts/run-eval-case-live.mjs
sources/agent-research/eval/**
```

## Until the worktree exists

Main-branch Eval edits should stay small and should stop if there is unknown
dirty state outside explicitly agreed residue. Do not stage shared or
non-Eval files. Do not treat dry-run output as live proof.

## Verification checklist

When the eval worktree is created, verify:

```bash
git -C C:/Users/rayma/Code/pilar-lane-evals status --short
git -C C:/Users/rayma/Code/pilar-lane-evals branch --show-current
```

Expected result:

```txt
clean status
codex/lane-evals
```

If that is not true, stop and ask the integrator before continuing Eval lane
implementation.

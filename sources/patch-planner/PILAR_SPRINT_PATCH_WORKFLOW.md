# PILAR sprint patch workflow

Sprint: 57.1
Status: workflow hardening rule
Scope: local sprint patches, command discipline and commit gates

## Purpose

This document freezes the sprint workflow that worked reliably in the Report QA fixture expansion track.

The goal is to keep PILAR patching boring, reversible and easy to audit in Git Bash on Windows.

## Non-negotiable rule

After any apply, test or commit-check run, the clipboard status must contain only `git status --short` output.

Do not copy full test logs, diffs or stack traces into the clipboard status artifact. Full logs may be shown in the terminal or saved separately, but the sprint gate status is always a short Git status snapshot.

## Standard sprint loop

Each sprint should follow this order:

1. Confirm clean repo.
2. Apply one small change set.
3. Capture status only.
4. Review status and diff before tests.
5. Run the relevant tests.
6. Capture status only again.
7. Commit only when the expected files and tests match.
8. Confirm clean repo after commit.

A sprint is not closed until `git status --short` has no output after the commit.

## Clean-status command

Use this after commit and at the start of a new sprint:

```bash
git status --short > /tmp/pilar-status-short.log
if [ ! -s /tmp/pilar-status-short.log ]; then echo "CLEAN: git status --short has no output" > /tmp/pilar-status-short.log; fi
clip < /tmp/pilar-status-short.log
cat /tmp/pilar-status-short.log
```

## Status-only command after a run

Use this after apply and after tests:

```bash
git status --short > /tmp/pilar-status-short.log
if [ ! -s /tmp/pilar-status-short.log ]; then echo "CLEAN: git status --short has no output" > /tmp/pilar-status-short.log; fi
clip < /tmp/pilar-status-short.log
cat /tmp/pilar-status-short.log
```

The clipboard should contain only the status lines, for example:

```txt
 M sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
```

or:

```txt
CLEAN: git status --short has no output
```

## Preferred patch artifact

For small source or documentation changes, prefer a small ZIP that contains a single `.patch` file and a short `README.md`.

Apply with a guarded check:

```bash
PATCH="PILAR_XX.Y_short_name/sprint-XX-Y-short-name.patch"

if git apply --check --verbose "$PATCH"; then
  git apply --verbose "$PATCH"
else
  echo "PATCH CHECK FAILED — not applying"
  git status --short
  exit 1
fi
```

Do not run tests if `git apply --check` fails.

## Allowed direct-command sprint

A direct command is acceptable when the change is a tiny package metadata update such as npm aliases:

```bash
npm pkg set "scripts.some-alias=node scripts/some-script.mjs"
```

After the command, capture short status only, then inspect the diff separately when needed.

## Avoided workflow

Do not use huge Git Bash heredocs as the normal patch mechanism.

Avoid:

```txt
cat > some-script.mjs <<'EOF'
...hundreds of lines...
EOF
node some-script.mjs
```

Avoid mixing apply, tests, diff and commit in one giant command block. It makes failures hard to locate and can hide whether a file was actually changed.

## Diff inspection gate

The assistant may ask for a diff, but it must be separate from the status clipboard.

Use this when diff inspection is needed:

```bash
git diff --stat
git diff -- path/to/file
```

Do not pipe this into the status clipboard unless explicitly requested.

## Test gate

Only run tests after the expected changed files are visible in `git status --short`.

For docs-only command hub changes, a typical test set is:

```bash
npm run agent:hub -- report-qa-nynorsk-check
npm run agent:hub -- report-qa-english-aisc-diagnostic-check
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

For feature or source changes, choose the smallest relevant test set first, then run broader gates before commit.

## Commit gate

Before commit, confirm:

- status contains only the expected files;
- tests are green enough for the sprint scope;
- no patch folders, `.bak` files, ZIP contents, temp scripts or package-lock changes are unexpected.

Then stage only the expected files:

```bash
git add path/to/expected-file
```

After commit, run the clean-status command.

## Stop conditions

Stop and backtrack when any of these happen:

- `git apply --check` fails;
- a patch runs but `git status --short` is empty when a change was expected;
- the same file fails twice;
- a terminal paste is interrupted with `^C`;
- a script reports success but no diff exists;
- test logs are green but the sprint objective was a docs or patch-shape change that did not occur.

When this happens, reset to clean status and restart the sprint from exact file context.

## Assistant response rule

The assistant should ask for clipboard status after each run, not full logs, unless a failure needs diagnosis.

Expected prompt pattern:

```txt
Run this. Then paste only the status copied by the final git status --short command.
```

## Sprint 57.1 acceptance

This workflow document is accepted when:

- it is added under `sources/patch-planner/`;
- the only changed file is this document;
- `agent:all`, health snapshot and TypeScript checks remain green;
- the post-commit status is clean.

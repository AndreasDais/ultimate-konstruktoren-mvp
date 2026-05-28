# PILAR sprint patch workflow final checkpoint

Sprint: 57.4
Status: final checkpoint
Scope: patch workflow discipline, context handling and health coverage
Runtime effect: None

## Purpose

This checkpoint closes the Sprint 57 patch workflow hardening track.

The sprint series moved PILAR local patching toward a smaller, safer and easier-to-audit workflow for Git Bash on Windows.

## Completed track

```txt
57.0  Command Hub docs cleanup
57.1  Sprint patch workflow document
57.2a Patch Planner registry reference
57.2b Health snapshot coverage for workflow document
57.3  Context-clip workflow documentation
57.4  Final checkpoint
```

## Accepted operating model

PILAR sprint work now uses two separate clipboard modes:

```txt
status-clip  = after apply, tests and commit checks; contains only git status --short
context-clip = before patch preparation; contains file context requested by the assistant
```

The two modes must not be mixed.

Status-clip is the sprint gate. Context-clip is only an input-gathering helper.

## Patch artifact rule

For non-trivial changes, prefer a small downloadable ZIP containing:

```txt
- one .patch file
- optionally one short README.md
```

The operator should apply patches one command at a time:

```bash
unzip -o ~/Downloads/PILAR_XX.Y_short_name.zip
git apply --check --verbose PILAR_XX.Y_short_name/sprint-XX-Y-short-name.patch
git apply --verbose PILAR_XX.Y_short_name/sprint-XX-Y-short-name.patch
rm -rf PILAR_XX.Y_short_name
```

If `git apply --check` fails, stop. Do not apply, test or commit.

## Git Bash discipline

The following patterns are now avoided by default:

```txt
- huge heredocs pasted into Git Bash
- multi-step patch + test + diff + commit mega-blocks
- patch scripts that can claim success without producing a diff
- copying full logs into the status clipboard
```

The preferred workflow is boring and narrow:

```txt
clean -> context if needed -> patch check -> patch apply -> status -> tests -> status -> commit -> clean
```

## Health and registry coverage

The workflow document is part of Patch Planner documentation and is included in the agent ecosystem health snapshot required files.

Relevant files:

```txt
sources/patch-planner/PILAR_SPRINT_PATCH_WORKFLOW.md
sources/patch-planner/PATCH_PLANNER_RULE_REGISTRY.md
scripts/write-agent-ecosystem-health-snapshot.mjs
sources/agent-research/status/README.md
```

## Acceptance criteria

Sprint 57.4 is accepted when:

```txt
- this checkpoint file exists under sources/patch-planner/
- only this checkpoint file is changed in the sprint
- patch-planner check passes
- agent:all passes
- health snapshot check passes
- TypeScript check passes
- post-commit git status --short is clean
```

## Next suggested direction

After this checkpoint, the next sprint should return to product-facing or QA value. Good candidates:

```txt
58.0 Report QA fixture expansion: mixed-language negative case
58.0 Patch Planner rule upgrade: explicit context-clip rule in JSON validator
58.0 Agent Hub ergonomics: list available commands by family
```

Choose only one track and keep the same small-patch workflow.

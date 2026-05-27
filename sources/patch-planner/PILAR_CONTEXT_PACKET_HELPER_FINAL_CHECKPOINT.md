# PILAR Context Packet Helper — Final Checkpoint

**Status:** accepted checkpoint
**Sprint:** 58.3
**Owner:** PILAR Patch Planner / local sprint workflow
**Runtime effect:** None

## Purpose

This checkpoint closes the first context-packet helper track.

The goal of the helper is to remove manual terminal selection and copy/paste from normal patch-planning workflow while preserving the strict status-only clipboard rule after apply, test and commit-check runs.

## Accepted workflow

Use `context:packet` only before patch generation when the assistant needs exact file context:

```bash
npm run context:packet -- <file-or-directory> [...more files]
```

The helper writes a context packet to:

```txt
/tmp/pilar-context.md
```

It also copies the packet to the Windows clipboard through `clip`, then prints a small confirmation with the byte count.

## Clipboard modes

PILAR sprint workflow now separates clipboard use into two modes:

```txt
context-clip = file and command context before patch generation
status-clip  = git status --short after apply, test or commit-check
```

The context packet must not be treated as sprint status.

After apply, test or commit-check runs, always return to the status-only command:

```bash
git status --short > /tmp/pilar-status-short.log
if [ ! -s /tmp/pilar-status-short.log ]; then echo "CLEAN: git status --short has no output" > /tmp/pilar-status-short.log; fi
clip < /tmp/pilar-status-short.log
cat /tmp/pilar-status-short.log
```

## Implemented pieces

This helper track is accepted when these pieces are present:

```txt
scripts/write-pilar-context-packet.mjs
package.json script: context:packet
scripts/write-agent-ecosystem-health-snapshot.mjs requires the helper file
scripts/write-agent-ecosystem-health-snapshot.mjs requires the context:packet npm script
sources/agent-research/status/README.md documents the health coverage
```

## Verification commands

Use these commands during ordinary sprint verification:

```bash
npm run context:packet -- --help
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npx tsc --noEmit --pretty false
```

Do not use the context packet itself as a status signal. The final sprint signal remains the clean `git status --short` output.

## Stop conditions

Stop and reset to clean status if any of these happen:

```txt
context:packet fails or writes no packet
context packet is accidentally pasted as post-run status
status-clip contains anything except git status --short output
health snapshot reports missing helper file or missing context:packet script
any unrelated file appears in git status --short
```

## Result

The sprint workflow can now request exact file context with one command and no manual terminal selection, while keeping post-run status small, reliable and auditable.

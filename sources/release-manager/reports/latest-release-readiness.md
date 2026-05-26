# PILAR Release Readiness Report

**Generated:** 2026-05-26T21:55:48.607Z
**Mode:** write
**Status:** RELEASE_READY

## Summary

- Blocking gates failed: 0
- Warning gates failed: 0
- Gates skipped by recursion guard: 0
- Gates checked: 5

## Release decision

All local blocking and warning gates passed at report time.

## Action plan

- No blocking or warning gates failed.

## Gate results

| Gate | Severity | Status | Command | First output line | Recommended action | Note |
|---|---:|---:|---|---|---|---|
| Working tree clean | WARN | PASS | git status --short | - | No action needed. | Clean working tree |
| Release gate registry | BLOCK | PASS | npm.cmd run release:check | > ultimate-konstruktoren-mvp@0.1.0 release:check | No action needed. | - |
| Agent ecosystem gate | BLOCK | PASS | npm.cmd run agent:all | > ultimate-konstruktoren-mvp@0.1.0 agent:all | No action needed. | - |
| Health snapshot check mode | BLOCK | PASS | node scripts/write-agent-ecosystem-health-snapshot.mjs --check | Status: PASS | No action needed. | - |
| TypeScript gate | BLOCK | PASS | npx.cmd tsc --noEmit --pretty false | - | No action needed. | - |

## Fast/full check modes

Default `--check` mode is intentionally fast. It validates the release registry and working tree status, but skips nested expensive gates that are already covered by `agent:all`, `agent:health`, or explicit manual checks.

Use full mode when you intentionally want the release-readiness reporter to execute nested gates:

```bash
node scripts/write-release-readiness-report.mjs --check --full
```

## Recursion guard

The reporter may be called directly or from `agent:all`. When it detects fast check mode, the agent hub, or a nested release-readiness run, it skips heavy nested gates to avoid long recursive gate execution.

## Gates intentionally not executed in v0.2

- Production build gate: run manually with `{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log`.
- Runtime smoke tests: run when app/UI/runtime behavior changed.
- New PILAR run: required when prompts, report generation, or stored output behavior changed.
- i18n regression: required when shell language, answer language, or standard-profile behavior changed.
- PDF/Word parity review: required when report rendering or artifact generation changed.

## Standard follow-up commands

```bash
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
npm run release:readiness:check
npx tsc --noEmit --pretty false
{ rm -rf .next && npm run debug:sweep && npm run build; } 2>&1 | tee last-run.log
```

## Raw command outputs

### Working tree clean

```txt
No output.
```

### Release gate registry

```txt
> ultimate-konstruktoren-mvp@0.1.0 release:check
> node scripts/validate-release-gates.mjs

OK sources\release-manager\release-gates.json: 15 release gates validated, 0 errors, 0 warnings
```

### Agent ecosystem gate

```txt
> ultimate-konstruktoren-mvp@0.1.0 agent:all
> node scripts/pilar-agent-ecosystem-hub.mjs all

PILAR Agent Ecosystem Hub
Root: C:\Users\rayma\Code\ultimate-konstruktoren-mvp

OK sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md
OK sources/agent-research/AGENT_ECOSYSTEM_INDEX.md
OK sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md
OK sources/agent-research/AGENT_ECOSYSTEM_FINAL_CHECKPOINT.md
OK sources/agent-research/RESEARCH_AGENT_FINAL_CHECKPOINT.md
OK sources/agent-research/topics/topic-registry.json
OK sources/agent-research/memos/agent-opportunity-ai-agent-testing.md
OK qa/evals/pilar-core-evals.jsonl
OK qa/evals/taxonomy/eval-case-taxonomy.json
OK qa/evals/reports/latest-eval-readiness.md
OK qa/evals/reports/latest-eval-coverage.md
OK sources/release-manager/release-gates.json
OK sources/release-manager/RELEASE_MANAGER_GATE_REGISTRY.md
OK scripts/validate-release-gates.mjs
OK scripts/write-release-readiness-report.mjs
OK sources/release-manager/RELEASE_READINESS_REPORTER.md
OK sources/release-manager/reports/README.md
OK sources/release-manager/reports/latest-release-readiness.md
OK scripts/validate-eval-cases.mjs
OK scripts/run-eval-suite.mjs
OK scripts/summarize-eval-coverage.mjs
OK scripts/create-agent-opportunity-memo.mjs
OK scripts/validate-agent-research-topics.mjs
OK scripts/validate-agent-research-memos.mjs
OK scripts/write-agent-ecosystem-health-snapshot.mjs
OK sources/guardrails/guardrail-reason-codes.json
OK sources/guardrails/GUARDRAIL_REASON_CODE_REGISTRY.md
OK scripts/validate-guardrail-reason-codes.mjs
OK sources/observability/observability-event-taxonomy.json
OK sources/observability/OBSERVABILITY_EVENT_TAXONOMY.md
OK scripts/validate-observability-event-taxonomy.mjs
OK sources/patch-planner/patch-planner-rules.json
OK sources/patch-planner/PATCH_PLANNER_RULE_REGISTRY.md
OK scripts/validate-patch-planner-rules.mjs
OK scripts/pilar-agent-ecosystem-hub.mjs

Available commands:
- status: Show local file and command readiness for the PILAR agent ecosystem.
- validate: Validate eval case JSONL structure.
- eval-readiness: Run eval readiness report workflow.
- eval-coverage: Run eval coverage check without rewriting the coverage artifact.
- eval-coverage-write: Write/update qa/evals/reports/latest-eval-coverage.md.
- research-topics: Validate Research Agent topic registry and registry-to-memo coverage.
- research-memos: Validate Research Agent memo quality.
- research-memo: Generate one Agent Opportunity Memo from a topic id.
- research-check: Run both Research Agent topic coverage and memo-quality checks.
- guardrails-codes: Validate Guardrail Agent reason-code registry.
- guardrails-check: Run Guardrail Agent registry checks.
- observability-events: Validate Observability Agent event taxonomy.
- observability-check: Run Observability Agent taxonomy checks.
- report-qa-check: Run Report QA Agent check registry validation.
- release-gates: Validate Release Manager gate registry.
- release-check: Run Release Manager gate registry checks.
- release-readiness: Run release readiness reporter in check mode without rewriting latest-release-readiness.md.
- release-readiness-write: Write/update sources/release-manager/reports/latest-release-readiness.md.
- patch-planner-rules: Validate Patch Planner Agent rule registry.
- patch-planner-check: Run Patch Planner Agent registry checks.
- health: Run health snapshot check mode without rewriting latest-agent-ecosystem-health.md.
- health-write: Write/update sources/agent-research/status/latest-agent-ecosystem-health.md.
- all: Run the non-writing local agent-ecosystem gate.

OK status: required agent ecosystem files are present

=== scripts/validate-eval-cases.mjs  ===
OK qa/evals/pilar-core-evals.jsonl: 10 eval cases validated

=== scripts/run-eval-suite.mjs  ===
OK eval suite report: 10 cases, 0 errors, 0 warnings
Wrote qa/evals/reports/latest-eval-readiness.md

=== scripts/summarize-eval-coverage.mjs --check ===
OK eval coverage: 10 cases, 0 errors, 4 warnings
CHECK mode: no report file written

=== scripts/validate-agent-research-topics.mjs  ===
OK registry-to-memo coverage: 4 topics, 4 topic files, 4 memo files, 0 errors, 0 warnings

=== scripts/validate-agent-research-memos.mjs  ===
OK sources/agent-research/memos/MEMO_QUALITY_CHECKS.md: quality score 100/100
OK sources/agent-research/memos/agent-opportunity-agent-observability.md: quality score 100/100
OK sources/agent-research/memos/agent-opportunity-ai-agent-testing.md: quality score 100/100
OK sources/agent-research/memos/agent-opportunity-guardrail-runtime-actions.md: quality score 100/100
OK sources/agent-research/memos/agent-opportunity-report-qa-agent.md: quality score 100/100
OK research memo quality: 5 memos checked, 0 errors, 0 warnings

=== scripts/validate-guardrail-reason-codes.mjs  ===
OK sources\guardrails\guardrail-reason-codes.json: 14 guardrail reason codes validated, 0 errors, 0 warnings

=== scripts/validate-observability-event-taxonomy.mjs  ===
OK sources/observability/observability-event-taxonomy.json: 16 observability events validated, 0 errors, 0 warnings

=== scripts/validate-report-qa-checks.mjs  ===
OK sources\report-qa\report-qa-checks.json: 14 report QA checks validated, 0 errors, 1 warnings

=== scripts/validate-release-gates.mjs  ===
OK sources\release-manager\release-gates.json: 15 release gates validated, 0 errors, 0 warnings

=== scripts/write-release-readiness-report.mjs --check ===
Status: RELEASE_RISKY
Fast check mode: yes
Blocking failures: 0
Warnings: 0
Skipped gates: 3
Gates checked: 5

=== scripts/validate-patch-planner-rules.mjs  ===
OK sources/patch-planner/patch-planner-rules.json: 15 patch planner rules validated, 0 errors, 0 warnings

=== scripts/write-agent-ecosystem-health-snapshot.mjs --check ===
Status: PASS
Required files: 47/47
Required npm scripts: 27/27
Local checks: 9/9

OK agent ecosystem gate completed

WARN sources\report-qa\report-qa-checks.json: checks[13].applies_to does not include web_report
(node:31044) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
```

### Health snapshot check mode

```txt
Status: PASS
Required files: 47/47
Required npm scripts: 27/27
Local checks: 9/9
```

### TypeScript gate

```txt
No output.
```


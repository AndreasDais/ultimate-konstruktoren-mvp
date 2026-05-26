# PILAR Agent Ecosystem Health Snapshot

**Generated:** 2026-05-26T02:21:16.003Z
**Status:** PASS
**Git HEAD:** 7f43ffd

## 1. Summary

- Eval cases detected: **10**
- Eval validator: **PASS**
- Eval readiness runner: **PASS**
- Readiness report artifact: **present**
- Critical failures: **0**

## 2. Required file map

| Status | File | Detail |
|---|---|---|
| OK | sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md | present |
| OK | sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md | present |
| OK | sources/agent-research/AGENT_ECOSYSTEM_COMMAND_HUB.md | present |
| OK | sources/agent-research/AGENT_ECOSYSTEM_INDEX.md | present |
| OK | sources/agent-research/topics/README.md | present |
| OK | sources/agent-research/topics/ai-agent-testing.md | present |
| OK | sources/agent-research/memos/README.md | present |
| OK | sources/agent-research/memos/agent-opportunity-ai-agent-testing.md | present |
| OK | sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md | present |
| OK | sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md | present |
| OK | qa/evals/README.md | present |
| OK | qa/evals/pilar-core-evals.jsonl | present |
| OK | qa/evals/reports/README.md | present |
| OK | qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md | present |
| OK | qa/e2e/prompts/english-aisc-simple-beam.txt | present |
| OK | qa/e2e/prompts/norwegian-simple-beam.txt | present |
| OK | scripts/validate-eval-cases.mjs | present |
| OK | scripts/create-agent-opportunity-memo.mjs | present |
| OK | scripts/run-eval-suite.mjs | present |
| OK | scripts/pilar-agent-ecosystem-hub.mjs | present |

## 3. NPM command map

| Status | Script | Command |
|---|---|---|
| OK | eval:readiness | node scripts/run-eval-suite.mjs |
| OK | agent:hub | node scripts/pilar-agent-ecosystem-hub.mjs |
| OK | agent:status | node scripts/pilar-agent-ecosystem-hub.mjs status |
| OK | agent:validate | node scripts/pilar-agent-ecosystem-hub.mjs validate |
| OK | agent:readiness | node scripts/pilar-agent-ecosystem-hub.mjs eval-readiness |
| OK | agent:research | node scripts/pilar-agent-ecosystem-hub.mjs research-memo |
| OK | agent:all | node scripts/pilar-agent-ecosystem-hub.mjs all |

## 4. Command results

### node scripts/validate-eval-cases.mjs

Exit code: 0
```txt
OK qa/evals/pilar-core-evals.jsonl: 10 eval cases validated
```

### node scripts/run-eval-suite.mjs

Exit code: 0
```txt
OK eval suite report: 10 cases, 0 errors, 0 warnings
Wrote qa/evals/reports/latest-eval-readiness.md
```

## 5. Git status at snapshot start

```txt
M app/admin/login/page.tsx
 M app/innstillingar/page.tsx
 M app/vilkar/page.tsx
 M lib/result/tile-heuristics.ts
 M lib/workbench/constants.ts
 M package.json
?? scripts/write-agent-ecosystem-health-snapshot.mjs
?? sources/agent-research/status/
```

## 6. Critical failures

No critical failures detected.

## 7. Next recommended checks

```bash
npm run agent:all
npm run eval:readiness
npx tsc --noEmit --pretty false
```


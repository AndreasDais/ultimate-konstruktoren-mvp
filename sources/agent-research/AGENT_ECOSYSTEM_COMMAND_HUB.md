# PILAR Agent Ecosystem Command Hub

**Status:** Local command hub / implementation reference  
**Sprint:** 36.2  
**Purpose:** Provide one controlled entry point for the local PILAR agent-ecosystem checks.

---

## 1. Command hub

The command hub is:

```txt
scripts/pilar-agent-ecosystem-hub.mjs
```

It wraps the local scripts added through Sprint 34–36 into one small command surface.

The npm alias is:

```bash
npm run agent:hub -- <command>
```

Common direct aliases also exist:

```bash
npm run agent:status
npm run agent:validate
npm run agent:readiness
npm run agent:research -- ai-agent-testing
npm run agent:health
npm run agent:all
```

---

## 2. Available hub commands

```bash
node scripts/pilar-agent-ecosystem-hub.mjs status
node scripts/pilar-agent-ecosystem-hub.mjs validate
node scripts/pilar-agent-ecosystem-hub.mjs eval-readiness
node scripts/pilar-agent-ecosystem-hub.mjs eval-coverage
node scripts/pilar-agent-ecosystem-hub.mjs eval-coverage-write
node scripts/pilar-agent-ecosystem-hub.mjs research-topics
node scripts/pilar-agent-ecosystem-hub.mjs research-memos
node scripts/pilar-agent-ecosystem-hub.mjs research-check
node scripts/pilar-agent-ecosystem-hub.mjs research-memo ai-agent-testing
node scripts/pilar-agent-ecosystem-hub.mjs health
node scripts/pilar-agent-ecosystem-hub.mjs health-write
node scripts/pilar-agent-ecosystem-hub.mjs all
```

---

## 3. Non-writing gate

Use this as the normal local gate:

```bash
npm run agent:all
```

As of Sprint 36.2 this runs:

```txt
1. status
2. validate
3. eval-readiness
4. eval-coverage        # check mode, does not rewrite latest-eval-coverage.md
5. research-topics
6. research-memos
7. health               # check mode, does not rewrite latest-agent-ecosystem-health.md
```

The important Sprint 36.2 change is that **eval coverage is now part of the hub gate**, not just a separate Eval Agent command.

---

## 4. Writing commands

These commands intentionally update repo artifacts:

```bash
node scripts/pilar-agent-ecosystem-hub.mjs eval-coverage-write
node scripts/pilar-agent-ecosystem-hub.mjs health-write
npm run eval:coverage
npm run agent:health
```

Expected generated artifacts:

```txt
qa/evals/reports/latest-eval-coverage.md
sources/agent-research/status/latest-agent-ecosystem-health.md
```

Do not run writing commands inside a docs-only sprint unless the generated artifact is intentionally part of the commit.

---

## 5. Research commands

Registry/topic/memo coverage:

```bash
npm run research:coverage
npm run research:topics
```

Memo-quality checks:

```bash
npm run research:memos
```

Combined Research Agent gate:

```bash
npm run research:check
```

Generate or refresh a memo:

```bash
npm run research:memo -- ai-agent-testing
```

---

## 6. Eval commands

Eval case validation:

```bash
node scripts/validate-eval-cases.mjs
npm run agent:validate
```

Eval readiness:

```bash
npm run eval:readiness
npm run agent:readiness
```

Eval coverage:

```bash
npm run eval:coverage:check
npm run eval:coverage
npm run agent:hub -- eval-coverage
```

Use `eval:coverage:check` or `agent:hub -- eval-coverage` when you want a non-writing gate.
Use `eval:coverage` when the latest coverage report should be updated and committed.

---

## 7. Standard verification after hub changes

```bash
node --check scripts/pilar-agent-ecosystem-hub.mjs
npm run agent:status
npm run agent:validate
npm run agent:readiness
npm run eval:coverage:check
npm run research:check
npm run agent:all
npx tsc --noEmit --pretty false
```

Copy status back to chat:

```bash
git status --short > /tmp/pilar-agent-hub-status.log
git diff --stat >> /tmp/pilar-agent-hub-status.log
cat /tmp/pilar-agent-hub-status.log | clip
```

---

## 8. Scope rules

The command hub may orchestrate local docs/eval/research scripts.

It must not:

```txt
- call production agent routes
- write Supabase data
- change app UI
- change agent prompts
- auto-commit
- auto-deploy
- rewrite generated artifacts unless the command name clearly says write
```

---

## 9. Next safe improvements

```txt
36.3 — Eval coverage docs index
36.4 — Eval taxonomy coverage check
36.5 — Eval case expansion by domain
36.6 — Guardrail reason-code registry
```

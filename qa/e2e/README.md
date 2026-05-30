# PILAR Synthetic User / E2E runner

`synthetic-user.mjs` drives a real (headless) browser through PILAR the way a
user does — **input → interpret → Start calculation → `/rapport/<runId>`** — then
checks the report for required / forbidden strings and writes an evidence bundle.

It is the automation of `PILAR_SYNTHETIC_USER_CHECKLIST.md` (Flow A & Flow B).
Read-only against the app: it touches **no** app code, prompts, schema, report/
PDF/Word code, or i18n.

## Prerequisites

- Dev server running: `npm run dev` (defaults to `http://localhost:3000`).
- Live PILAR pipeline reachable (Supabase + Anthropic). The flows execute a real
  run, so they need real infra and burn Anthropic quota.
- `puppeteer` installed (already a dev dependency; downloads its own Chromium).

## Usage

```bash
npm run qa:e2e -- --flow A,B          # both flows (default if --flow omitted)
npm run qa:e2e -- --flow A            # English/AISC only
npm run qa:e2e -- --flow B            # Norwegian/Eurocode only

# or directly:
node qa/e2e/synthetic-user.mjs --flow A,B --timeout 240
node qa/e2e/synthetic-user.mjs --flow A --base http://localhost:3000 --headful
```

Flags: `--flow A|B|A,B` · `--base <url>` · `--timeout <seconds>` (report wait,
default 180) · `--headful` (watch the browser).

Exit code: `0` if all requested flows PASS / PASS-WITH-WARNINGS, `1` if any FAIL,
`2` on setup error.

## What each flow does

| Flow | Mode | display_language | Prompt |
|---|---|---|---|
| A | International / US (AISC) | `en` | `prompts/english-aisc-simple-beam.txt` |
| B | Norwegian / Eurocode | `nb` | `prompts/norwegian-simple-beam.txt` |

**Display language is activated, not assumed.** Flow A seeds `localStorage`
(`pilar-engineering-context-v2`) with a US/AISC engineering context — the same
thing the `/international` selector persists — so PILAR renders in English. Flow
B clears it (Norwegian default). The runner then **verifies** the real
`display_language` via `GET /api/runs/[id]` and fails the flow as an *invalid
test* if the mode didn't take. ⚠️ Pasting an English prompt alone is **not**
enough — without the context PILAR stays Norwegian, and that is correct behavior,
not a defect.

The workbench is driven **bilingually** (matches both "Start beregning" /
"Start calculation", "Tolk oppgaven" / "Interpret task", etc.).

## Checks

- **must-show** — required strings (OR-groups; case-insensitive). Missing → WARN.
- **must-not-show** — forbidden cross-locale strings, matched on Unicode letter
  boundaries (so "ft" doesn't match "skjær­kraft"). Present → FAIL.
- Both run against the **generated** report only — verbatim prompt echoes are
  stripped, so the model is judged on its output, not the user's wording.

## Evidence (written to `reports/`)

```
flow-<X>-result.json            verdict, runId, display_language, missing/forbidden, …
flow-<X>-<runId>.txt            full report innerText
flow-<X>-<runId>.png            full-page report screenshot
flow-<X>-api.log                /api/* call trace for the run
flow-<X>-noid.{txt,png}         interpret-stage snapshot (fallback evidence)
RUN_REPORT.md                   human-readable summary of the latest run
```

## Caveats

- **Intermittent pipeline stall ≠ runner bug.** If a flow fails with
  `reportReady:false` and `stalled:true`, the run stuck server-side at
  `run_status='running'` with no controller decision (agent-c/agent-d never
  finished — the known Cloudflare/Anthropic degradation). Just re-run that flow.
- **Not a hermetic CI gate.** Because it needs a live app + Supabase + Anthropic
  (and is subject to that infra flakiness + quota), this is a local/manual QA
  tool, not a blocking CI check.
- **Coverage:** Flow A & B only. The checklist's Flow C (blocked-fields) and
  Flow D (nb/nn preservation) are not automated here yet.

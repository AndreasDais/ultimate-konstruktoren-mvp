# DB-write resilience findings — handoff to Codex

**Source:** intl test sweep (`scripts/run-intl-tests.mjs --execute`), 2026-05-28.
**Author:** parallel Claude session (off-roadmap bug-fix + observability lane).
**Status:** findings only — agent-route changes are Codex's domain; this is a triage handoff so the route work isn't re-investigated. Slot the two open findings into [AGENT_ROUTE_AUDIT.md](AGENT_ROUTE_AUDIT.md)'s F-series as you see fit.

Related (do not duplicate):
- [AGENT_ROUTE_AUDIT.md](AGENT_ROUTE_AUDIT.md) — route hardening matrix + F1–F6.
- [PILAR_PIPELINE_DATAFLOW.md](../codebase/PILAR_PIPELINE_DATAFLOW.md) — DB writes per step.

---

## What triggered this

A 10-scenario intl sweep ran while the network route to Cloudflare (which fronts **both** Supabase and `api.anthropic.com`) degraded mid-run. Outcomes:

| # | Stage reached | Outcome | Cause |
|---|---|---|---|
| 1,2,3 | full pipeline | OK (persisted clean) | network healthy |
| 4,8 | Tolkar | TOLKAR_STOP (`mangelfull`/`avvist`) | correct guardrail |
| 5 | agent-e | **HTTP 500 "Failed to save report"** | report INSERT hit the outage ~3 min in; run `cabefed9` has A/B/C/D but no report |
| 6,7 | Tolkar | **HTTP 500 (generic)** | Anthropic call threw `APIConnectionError` after maxRetries:5 |
| 9,10 | — | `fetch failed` (test 10 in 2 ms = conn refused) | dev server briefly down; new PIDs ~3 s later → restart |

No calculation-logic bugs. The gap is **resilience to a transient network/DB outage** — three pipeline stages respond to the same outage three different ways.

---

## ✅ Already fixed this session (do not redo)

**Error classifier:** `APIConnectionError` (status=undefined, "Connection error.") fell through every status branch in `formatAnthropicError` to the generic 500 "møtte ein uventa feil" — misreporting a network outage as an internal bug. Fixed in **commit `7fcfdbe`**: explicit `instanceof` checks (`APIConnectionTimeoutError` → 504, `APIConnectionError` → 503 network message) added before the status branches, with first test coverage in `lib/anthropic-errors.test.ts`. Not an agent route (shared lib / observability), so taken in the bug-fix lane.

---

## 🟥 F-open-1 — Inconsistent DB-write failure policy across routes

Same failure (DB write fails because Supabase is briefly unreachable), three behaviours:

| Route | DB-write failure behaviour | Evidence |
|---|---|---|
| Tolkar (`input-agent`) | **soft-fail**, logged only; but if the `requests` insert fails, `requestId` stays `null` → downstream `init-run` cannot proceed | [input-agent/route.ts:522](../../app/api/input-agent/route.ts) (try) … `:562` (requests err logged) … `:613` (catch "Database-feil") |
| Kontrollør (`agent-d`) | **silent soft-fail** → run continues with **no `controller_decisions` row** (null verdict) | confirmed via run `f9eae607`: HTTP returned `uncertain`, DB row absent |
| Rapportør (`agent-e`) | **hard-fail** → HTTP 500 "Failed to save report", run left without a report | [agent-e/route.ts:642](../../app/api/agent-e/route.ts) |

**Why it matters:** neither extreme is clearly right. agent-e's hard-fail *surfaces* the problem but kills the run; agent-d's silent soft-fail keeps the run "alive" but persists a half-run with a null verdict — which cost a previous debugging session a detour chasing a "null decision_status" that was really lost telemetry. The soft-fail-telemetry architecture (`recordStepMetric`/`recordStepMessage`, both correctly never-throw) was meant to keep calculations alive through outages, but the **entity** writes (requests / controller_decisions / reports) have no shared policy.

**Direction (Codex's call):** decide one policy for transient entity-write failure — e.g. (a) a small retry/backoff on the central client (see F-open-2), and (b) a consistent run-status marker (`run_status = 'persistence_degraded'` or similar) so a half-persisted run is *visibly* incomplete rather than silently null or a bare 500.

---

## 🟥 F-open-2 — No timeout/retry on the Supabase client

`getSupabase()` builds the client with only `auth: { persistSession: false }` — **no `global.fetch` timeout, no retry** — unlike the Anthropic client (`maxRetries: 5` everywhere).

**Evidence:** [lib/supabase.ts:17](../../lib/supabase.ts).

**✅ RESOLVED — commit `1472b68`.** `lib/supabase.ts` now wraps `global.fetch` with `createResilientFetch` ([lib/resilient-fetch.ts](../../lib/resilient-fetch.ts), 8 unit tests): bounded retry-with-backoff + per-attempt timeout. SAFETY: a WRITE retries ONLY on provably pre-send connect errors (`UND_ERR_CONNECT_TIMEOUT`/`ECONNREFUSED`/`ENOTFOUND`/`EAI_AGAIN`) — a retry can never duplicate a row; idempotent GET/HEAD retry on any transient error; HTTP responses (incl. 5xx) pass through untouched; caller aborts propagate. F-open-1 (consistent failure *policy* across routes) is still open.

**Impact:** each failing write blocks on undici's default ~10 s connect timeout with no overall request cap; a multi-write request can stack to minute-long hangs during an outage. A central fetch timeout + small retry (mirroring the Anthropic `maxRetries: 5` convention) would bound the blast radius and likely prevent the request pile-up that preceded the dev-server restart window (tests 9–10).

---

## 🟡 Watchpoint — dev-server down at tail (tests 9–10)

Test 10 failed in 2 ms (connection refused) and new `node` PIDs appeared ~3 s after → a **dev-server restart**, not confirmed a crash. Could be Turbopack recompile (a watched-file change from the other session), manual restart, or a fatal under load. Unproven without the dev terminal log. Flag only — telemetry helpers are ruled out as a crash source (both never throw: [step-metrics.ts:115](../../lib/step-metrics.ts), [record-message.ts:92](../../lib/step-messages/record-message.ts)).

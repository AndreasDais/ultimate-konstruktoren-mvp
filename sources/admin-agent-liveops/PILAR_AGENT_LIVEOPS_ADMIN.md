# PILAR Agent LiveOps — admin concept (v0)

**Status:** Sprint 36.0 — **docs only**. No UI, no routes, no data, no code.

`/admin/agent-liveops` is a planned **read-only, admin-only** observability module — a "mission control" view of PILAR's multi-agent pipeline. It shows *what happened* in a run (status, timing, guardrail decisions, artifacts, evidence) from **sanitized events**. It never edits prompts, never decides the roadmap, never merges or deploys, and shows no hidden reasoning. **Human remains final.** See `SAFETY_POLICY.md` and `NON_GOALS.md`.

## 1. What admin can see

The page answers operational questions about a run:

- Which agents are running right now? Which steps finished? Which agent is waiting? Which failed?
- Which agent overrode another? Which guardrail stopped or qualified output?
- What did the run cost, and where did the time go?
- Which evidence was used? Which output artifacts (web / PDF / Word) were produced?
- What should a human check before the result is trusted?

Concretely, admin can see:

- **Agent run list** — recent and active runs with status, standard profile (e.g. AISC vs Eurocode), language, and latency.
- **The real PILAR pipeline**, node by node:
  - **Tolkar / Input Agent** — interprets and classifies the task.
  - **Konstruktør A** (Engineer A) and **Konstruktør B** (Engineer B) — parallel, independent calculations.
  - **Samanliknar** (Comparator) — compares A vs B.
  - **Kontrollør** (Controller) — the final controller decision.
  - **Rapportør** (Reporter) — generates the report.
- **Guardrail events** — pass / warn / block with reason codes (e.g. `missing_verified_section_properties`).
- **Eval / report QA events** — eval passed / failed / needs human review.
- **PDF / Word / report artifact status** — web_ready / pdf_ready / docx_ready / failed.
- **Feature Arena evidence candidates** — `feature.evidence_created` events linking to the Feature Hypothesis Arena (read-only; no roadmap decision).
- **Release-gate / human-review status** — gate ready / risky / blocked, and `human.review_required`.

## 2. Surfaces (layout)

A header band (active runs · guardrail warns · blocks · avg latency) over five surfaces:

- **Live Runs** — the run list + filters (active / failed / AISC / Norwegian).
- **Agent Graph** — nodes = agents, edges = handoffs: `Input → Engineer A / Engineer B → Comparator → Controller → Reporter`, with Guardrail attached to the relevant steps.
- **Inspector Drawer** — the selected node's status, duration, tokens, warnings, evidence, and the sanitized raw event.
- **Timeline / Waterfall** — per-agent duration bars.
- **Event Feed** — a terminal-like, timestamped, sanitized event log.
- **Replay** — step through a finished run's recorded events (no live re-execution).

**Admin tabs (v0):** Live Runs · Replay · Agent Health · Guardrails · Eval Monitor · Feature Arena Evidence. All read-only.

## 3. Nodes, edges, statuses

- **Nodes:** the pipeline agents above, plus Guardrail, Eval / Report QA, and Reporter artifacts.
- **Edges:** handoffs between agents (`agent.handoff`), with parallel start/join for A/B.
- **Statuses:** `idle, queued, running, streaming, waiting_for_tool, waiting_for_handoff, waiting_for_human, completed, completed_with_warning, blocked, failed, cancelled` (colors in `AGENT_VISUAL_LANGUAGE.md`).
- **Event taxonomy** and the sanitized event record: see `AGENT_EVENT_SCHEMA.md`.

## 4. v0 principles

- **Read-only.** No write buttons, no deploy / merge / prompt / release controls (`NON_GOALS.md`).
- **File / mock first.** v0 reads sanitized event files; no DB and no live stream until a later sprint with schema review.
- **Event-driven visuals, no fake progress.** Every animation is backed by a real event with a timestamp (`AGENT_VISUAL_LANGUAGE.md`).
- **Sanitized only.** No raw prompt, no raw user data, no chain-of-thought (`AGENT_EVENT_SCHEMA.md`, `SAFETY_POLICY.md`).
- **Admin-only + authenticated.** The route and any future API require an admin session.

## 5. Sprint roadmap — this is Sprint 36.0 (docs only)

| Sprint | Scope | Status |
|---|---|---|
| **36.0** | These five concept docs | **this sprint — docs only** |
| 36.1 | Mock events + validator (`qa/agent-liveops/**`, `scripts/validate-agent-liveops-events.mjs`) | deferred |
| 36.2 | Pure types + graph/timeline/redaction helpers (`lib/agent-liveops/**`) | deferred |
| 36.3 | Static animated admin prototype (`app/admin/agent-liveops/`, `components/admin/agent-liveops/**`) | deferred |
| 36.4 | Read-only live event adapter (API routes) | deferred |
| 36.5 | Real pipeline instrumentation v0 | deferred |

Each later sprint is implemented only on explicit request, one at a time. **No implementation files are added in 36.0.**

## Files in this directory

- `PILAR_AGENT_LIVEOPS_ADMIN.md` — this concept.
- `AGENT_EVENT_SCHEMA.md` — sanitized event record + taxonomy + status model.
- `AGENT_VISUAL_LANGUAGE.md` — read-only visual language, status colors, event-driven animation.
- `NON_GOALS.md` — what v0 is not.
- `SAFETY_POLICY.md` — safety + privacy.
- `PILAR_AGENT_LIVEOPS_CLAUDE_CODE_HANDOFF.md` — full planning handoff (source of truth for later sprints).

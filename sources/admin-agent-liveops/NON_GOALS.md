# Agent LiveOps — non-goals (v0)

Agent LiveOps v0 is a **read-only** observability surface. It is **NOT**:

1. An auto-merge system.
2. An auto-deploy system.
3. A prompt editor — it never edits production prompts.
4. A DB / schema / Supabase change — no migrations; v0 is file/mock-based.
5. A roadmap decision-maker.
6. A view of raw chain-of-thought / hidden reasoning.
7. A surface with **write buttons** — no deploy / merge / prompt / release controls in v0.

Additionally, v0 does **not**:

- show raw user data, full prompts, or unredacted file contents;
- decide release readiness or `build_next`;
- create Feature Arena roadmap decisions (it may *surface* evidence candidates, read-only);
- run a live event stream or write events to a DB (that needs a later sprint **and** schema review).

## Out of scope for Sprint 36.0 (docs-only)

Sprint 36.0 adds **only** the five concept docs in this directory. The following are explicitly **deferred** to later, separately-requested sprints:

- **36.1** — mock events + validator (`qa/agent-liveops/**`, `scripts/validate-agent-liveops-events.mjs`).
- **36.2** — pure types + graph / timeline / redaction helpers (`lib/agent-liveops/**`).
- **36.3** — static animated admin prototype (`app/admin/agent-liveops/`, `components/admin/agent-liveops/**`, React Flow / Motion / Recharts).
- **36.4** — read-only live event adapter (API routes).
- **36.5** — real pipeline instrumentation.

No implementation files, React components, mock-event files, validator, API routes, DB/Supabase schema, cron, live stream, or new dependencies (React Flow / Motion / Recharts) are added in 36.0. See `SAFETY_POLICY.md`.

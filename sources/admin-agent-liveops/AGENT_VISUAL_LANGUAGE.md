# Agent LiveOps — visual language (v0)

A **read-only**, "mission control" view of PILAR's agent pipeline: technical, calm, audit-ready, precise, premium. It uses the existing **PILAR admin token style** — dark background, glass cards, clear status badges, subtle animated edges, a terminal-like event feed, a timeline/waterfall, and **low animation density**. **Read-only admin v0** — no write controls.

## Status colors

Status drives color. v0 uses these states, mapped to PILAR admin status tokens (not new ad-hoc colors):

| Status | Covers | Tone |
|---|---|---|
| **running** | `running` / `streaming` / `queued` — agent active | info / blue |
| **completed** | finished cleanly | ok / green |
| **warning** | `completed_with_warning` / guardrail warn | amber |
| **blocked** | guardrail block / gate blocked | red (gate) |
| **failed** | agent or run failed | red (error) |
| **evidence** | Feature Arena evidence created | evidence accent |

A guardrail **block** is never shown as pass/success. Color comes only from a real guardrail decision.

## Animations are event-driven (semantic, not decoration)

Every animation is backed by a real event with a timestamp:

| Event | Visual |
|---|---|
| `agent.queued` | dimmed node with a small clock |
| `agent.started` | slow pulsing ring around the node |
| `agent.streaming` | subtle activity in the node body |
| `tool.started` | small "tool chip" appears under the node |
| `agent.handoff` | light travels along the edge to the next agent (600–900 ms) |
| `agent.completed` | node gets a checkmark |
| `agent.completed_with_warning` | amber halo + warning chip |
| `guardrail.warn` | shield icon + one amber flash + persistent badge |
| `guardrail.block` | red gate stops the downstream edge |
| `agent.failed` | node collapses to an error card (no infinite flashing) |
| `human.review_required` | pause symbol + "awaiting human" |
| `report.pdf_ready` / `report.docx_ready` | PDF / DOCX artifact chip becomes active |
| `eval.failed` | eval node gets a fail badge + link to the case |
| `feature.evidence_created` | a small evidence dot moves toward Feature Arena |

## No fake progress

These rules MUST hold:

```
No animation without an event.
No progress without a timestamp.
No success without a completed event.
No guardrail color without a guardrail decision.
No generated "thought bubbles".
```

- **No fake AI-thinking animation.** Forbidden: "Agent thinking…", "Agent considering…", "AI confidence 87%".
- **Animation is only for event replay and sanitized state** — replaying recorded events, or reflecting a real status change. Never invented motion.
- Good (real, event-backed): `Engineer A started` → `Guardrail warn: missing_verified_section_properties` → `Controller decision: show_preliminary_with_warning` → `Reporter generated DOCX artifact`.

## Motion budget + reduced-motion fallback

- handoff pulse: 600–900 ms · node running pulse: slow · guardrail warning: one flash + persistent badge · error: no infinite flashing · replay: slider-controlled.
- Low animation density; the page must never feel busy or slow.
- **Reduced-motion fallback (required):** respect `prefers-reduced-motion`. With reduced motion, drop pulses / particles / edge travel and show **static status badges + the event feed** — all information remains available without any animation.

"use client";

import { useMemo, useState } from "react";

import type {
  AgentLiveOpsEvent,
  AgentLiveOpsGraph,
  AgentLiveOpsRunSummary,
  AgentLiveOpsTimeline,
} from "@/lib/agent-liveops/types";

import { AgentEventFeed } from "./AgentEventFeed";
import { AgentGraphCanvas } from "./AgentGraphCanvas";
import { AgentInspectorDrawer } from "./AgentInspectorDrawer";
import { AgentTimeline } from "./AgentTimeline";
import { ReplayControls } from "./ReplayControls";
import { StatusBadge } from "./StatusBadge";
import styles from "./AgentLiveOpsDashboard.module.css";

type AgentLiveOpsDashboardProps = {
  events: AgentLiveOpsEvent[];
  graph: AgentLiveOpsGraph;
  summary: AgentLiveOpsRunSummary;
  timeline: AgentLiveOpsTimeline;
};

function formatTime(value: string | null) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AgentLiveOpsDashboard({
  events,
  graph,
  summary,
  timeline,
}: AgentLiveOpsDashboardProps) {
  const [activeIndex, setActiveIndex] = useState(timeline.items.length - 1);
  const [selectedEventId, setSelectedEventId] = useState(
    timeline.items.at(-1)?.event_id ?? null,
  );

  const eventById = useMemo(
    () => new Map(events.map((event) => [event.event_id, event])),
    [events],
  );
  const activeItem = timeline.items[activeIndex] ?? timeline.items.at(-1) ?? null;
  const selectedEvent = selectedEventId ? eventById.get(selectedEventId) ?? null : null;
  const lastUpdated = timeline.run_state.last_updated_at;

  function selectEvent(eventId: string) {
    setSelectedEventId(eventId);
    const index = timeline.items.findIndex((item) => item.event_id === eventId);
    if (index >= 0) setActiveIndex(index);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>PILAR Agent LiveOps</p>
          <h1>Read-only agent run monitor</h1>
          <p>
            Static admin prototype backed by sanitized Sprint 36.1 mock events.
            It surfaces recorded status, warnings, handoffs and artifacts only.
          </p>
        </div>
        <div className={styles.heroStatus}>
          <StatusBadge
            displayState={timeline.run_state.display_state}
            status={timeline.run_state.status}
          />
          <dl>
            <div>
              <dt>Run</dt>
              <dd>{summary.run_id}</dd>
            </div>
            <div>
              <dt>Last event</dt>
              <dd>{formatTime(lastUpdated)}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>mock data only</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className={styles.safetyStrip} aria-label="Safety boundary">
        <span>Admin-only</span>
        <span>Read-only</span>
        <span>Human review remains final</span>
        <span>No deploy, merge, prompt, release or roadmap action</span>
      </section>

      <section className={styles.metrics} aria-label="Run summary">
        <article>
          <span>Events</span>
          <strong>{summary.event_count}</strong>
          <small>{timeline.items.length} loaded from JSONL</small>
        </article>
        <article>
          <span>Warnings</span>
          <strong>{timeline.run_state.warning_count}</strong>
          <small>{summary.warning_count} in summary</small>
        </article>
        <article>
          <span>Blocked</span>
          <strong>{timeline.run_state.blocked_count}</strong>
          <small>No guardrail block in fixture</small>
        </article>
        <article>
          <span>Redaction</span>
          <strong>{summary.redaction_status}</strong>
          <small>safe summary boundary</small>
        </article>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.leftColumn}>
          <ReplayControls
            activeIndex={activeIndex}
            eventCount={timeline.items.length}
            onChange={setActiveIndex}
          />
          <AgentGraphCanvas
            activeEventId={activeItem?.event_id ?? null}
            graph={graph}
            items={timeline.items}
            onSelectEvent={selectEvent}
            selectedEventId={selectedEventId}
          />
          <AgentTimeline
            activeEventId={activeItem?.event_id ?? null}
            onSelectEvent={selectEvent}
            timeline={timeline}
          />
        </div>

        <div className={styles.rightColumn}>
          <AgentInspectorDrawer event={selectedEvent} runState={timeline.run_state} />
          <AgentEventFeed
            activeEventId={activeItem?.event_id ?? null}
            items={timeline.items}
            onSelectEvent={selectEvent}
            selectedEventId={selectedEventId}
          />
        </div>
      </section>

      <section className={styles.safetyNotes} aria-label="Safety notes">
        {summary.safety_notes?.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </section>
    </main>
  );
}

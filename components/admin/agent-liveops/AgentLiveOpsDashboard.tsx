"use client";

import { useMemo, useState } from "react";

import type {
  AgentLiveOpsEvent,
  AgentLiveOpsGraph,
  AgentLiveOpsRunSummary,
  AgentLiveOpsTimeline,
} from "@/lib/agent-liveops/types";
import { buildAgentLiveOpsGraph } from "@/lib/agent-liveops/build-graph";
import { buildAgentLiveOpsTimeline } from "@/lib/agent-liveops/build-timeline";
import { parseAgentLiveOpsLiveResponse } from "@/lib/agent-liveops/live-api-response";

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
    // Pin the zone so SSR (server TZ) and hydration (browser TZ) render the
    // same text — avoids React #418 hydration mismatch. Format unchanged.
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type LiveOpsMode = "mock" | "live";
type LoadStatus = "idle" | "loading" | "loaded" | "error";
type LiveDataset = AgentLiveOpsDashboardProps;

const DIAGNOSTIC_ERRORS = {
  notFound: "Run not found",
  auth: "Admin session required",
  generic: "Could not load diagnostic events",
} as const;

function httpErrorMessage(status: number): string {
  if (status === 404) return DIAGNOSTIC_ERRORS.notFound;
  if (status === 401 || status === 403) return DIAGNOSTIC_ERRORS.auth;
  return DIAGNOSTIC_ERRORS.generic;
}

function buildLiveSummary(
  runId: string,
  liveEvents: AgentLiveOpsEvent[],
  liveTimeline: AgentLiveOpsTimeline,
): AgentLiveOpsRunSummary {
  const redactionStatus = liveEvents.some(
    (event) => event.redaction_status === "safe_summary_only",
  )
    ? "safe_summary_only"
    : "no_user_data";
  return {
    run_id: runId,
    event_count: liveEvents.length,
    warning_count: liveTimeline.run_state.warning_count,
    blocked_count: liveTimeline.run_state.blocked_count,
    artifact_statuses: {},
    redaction_status: redactionStatus,
    read_only: true,
    human_final: true,
    safety_notes: [
      "Diagnostic live read of sanitized event metadata. Human review remains final.",
    ],
  };
}

export function AgentLiveOpsDashboard(props: AgentLiveOpsDashboardProps) {
  const [mode, setMode] = useState<LiveOpsMode>("mock");
  const [live, setLive] = useState<LiveDataset | null>(null);
  const [runIdInput, setRunIdInput] = useState("");
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default view is the server-provided mock fixture. Live data is only used
  // after an explicit, successful manual load — never auto-fetched on mount.
  const active: LiveDataset = mode === "live" && live ? live : props;
  const { events, graph, summary, timeline } = active;

  const [activeIndex, setActiveIndex] = useState(props.timeline.items.length - 1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    props.timeline.items.at(-1)?.event_id ?? null,
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

  function resetSelection(next: AgentLiveOpsTimeline) {
    setActiveIndex(next.items.length > 0 ? next.items.length - 1 : 0);
    setSelectedEventId(next.items.at(-1)?.event_id ?? null);
  }

  function returnToMock() {
    setMode("mock");
    setLive(null);
    setLoadStatus("idle");
    setErrorMessage(null);
    resetSelection(props.timeline);
  }

  async function loadDiagnostic(formEvent?: { preventDefault: () => void }) {
    formEvent?.preventDefault();
    const runId = runIdInput.trim();
    if (!runId || loadStatus === "loading") return;

    setLoadStatus("loading");
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/admin/agent-liveops/runs/${encodeURIComponent(runId)}/events`,
        { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" },
      );
      if (!response.ok) {
        setErrorMessage(httpErrorMessage(response.status));
        setLoadStatus("error");
        return;
      }
      const payload: unknown = await response.json().catch(() => null);
      const parsed = parseAgentLiveOpsLiveResponse(payload);
      if (!parsed.ok) {
        setErrorMessage(DIAGNOSTIC_ERRORS.generic);
        setLoadStatus("error");
        return;
      }
      const liveTimeline = buildAgentLiveOpsTimeline(parsed.events);
      const liveGraph = buildAgentLiveOpsGraph(parsed.events);
      setLive({
        events: parsed.events,
        graph: liveGraph,
        timeline: liveTimeline,
        summary: buildLiveSummary(parsed.runId, parsed.events, liveTimeline),
      });
      setMode("live");
      resetSelection(liveTimeline);
      setLoadStatus("loaded");
    } catch {
      setErrorMessage(DIAGNOSTIC_ERRORS.generic);
      setLoadStatus("error");
    }
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
              <dd>{mode === "live" ? "Diagnostic live read" : "Mock data"}</dd>
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

      <section className={styles.diagnostic} aria-label="Diagnostic live read">
        <div className={styles.diagnosticHead}>
          <div>
            <p className={styles.eyebrow}>Diagnostic live read (opt-in)</p>
            <p className={styles.diagnosticNote}>
              Default view is mock data. Loads one known run on request only —
              never automatically. Read-only; human review remains final.
            </p>
          </div>
          <span
            className={`${styles.modeBadge} ${
              mode === "live" ? styles.modeBadgeLive : styles.modeBadgeMock
            }`}
          >
            {mode === "live" ? "Diagnostic live read" : "Mock data"}
          </span>
        </div>
        <form className={styles.diagnosticRow} onSubmit={loadDiagnostic}>
          <label className={styles.diagnosticField}>
            <span>Run ID</span>
            <input
              className={styles.diagnosticInput}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="known run id"
              value={runIdInput}
              onChange={(changeEvent) => setRunIdInput(changeEvent.target.value)}
            />
          </label>
          <button
            className={styles.diagnosticButton}
            type="submit"
            disabled={loadStatus === "loading" || runIdInput.trim().length === 0}
          >
            {loadStatus === "loading" ? "Loading…" : "Load diagnostic live events"}
          </button>
          {mode === "live" ? (
            <button
              className={styles.diagnosticReset}
              type="button"
              onClick={returnToMock}
            >
              Return to mock data
            </button>
          ) : null}
        </form>
        <p className={styles.diagnosticStatus} role="status" aria-live="polite">
          {loadStatus === "error" && errorMessage ? (
            <span className={styles.diagnosticError}>{errorMessage}</span>
          ) : mode === "live" ? (
            <span>Showing diagnostic live read for run {summary.run_id}.</span>
          ) : (
            <span>Showing mock fixture data.</span>
          )}
        </p>
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

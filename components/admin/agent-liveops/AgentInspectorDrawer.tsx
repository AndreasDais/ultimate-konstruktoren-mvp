import type {
  AgentLiveOpsEvent,
  AgentLiveOpsRunState,
} from "@/lib/agent-liveops/types";

import { deriveAgentLiveOpsDisplayState } from "@/lib/agent-liveops/status";

import { StatusBadge } from "./StatusBadge";
import styles from "./AgentLiveOpsDashboard.module.css";

type AgentInspectorDrawerProps = {
  event: AgentLiveOpsEvent | null;
  runState: AgentLiveOpsRunState;
};

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "none";
  return String(value);
}

export function AgentInspectorDrawer({
  event,
  runState,
}: AgentInspectorDrawerProps) {
  const displayState = event
    ? deriveAgentLiveOpsDisplayState(event)
    : runState.display_state;

  return (
    <aside className={styles.inspectorPanel} aria-label="Selected event inspector">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>Inspector</p>
          <h2>{event?.event_id ?? runState.last_event_id ?? "No event"}</h2>
        </div>
        <StatusBadge
          compact
          displayState={displayState}
          status={event?.status ?? runState.status}
        />
      </div>

      {event ? (
        <>
          <p className={styles.inspectorSummary}>{event.summary ?? event.message}</p>
          <dl className={styles.inspectorGrid}>
            <div>
              <dt>Agent</dt>
              <dd>{event.agent_label ?? event.agent ?? event.agent_key}</dd>
            </div>
            <div>
              <dt>Event type</dt>
              <dd>{event.event_type}</dd>
            </div>
            <div>
              <dt>Trace</dt>
              <dd>{event.trace_id}</dd>
            </div>
            <div>
              <dt>Span</dt>
              <dd>{event.span_id}</dd>
            </div>
            <div>
              <dt>Parent span</dt>
              <dd>{displayValue(event.parent_span_id)}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{typeof event.duration_ms === "number" ? `${event.duration_ms}ms` : "pending"}</dd>
            </div>
            <div>
              <dt>Artifact</dt>
              <dd>{displayValue(event.artifact_ref)}</dd>
            </div>
            <div>
              <dt>Redaction</dt>
              <dd>{event.redaction_status}</dd>
            </div>
          </dl>

          {event.reason_codes?.length ? (
            <div className={styles.reasonBlock}>
              <h3>Reason codes</h3>
              <div>
                {event.reason_codes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
            </div>
          ) : null}

          {event.metadata ? (
            <div className={styles.metadataBlock}>
              <h3>Sanitized metadata</h3>
              <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
            </div>
          ) : null}
        </>
      ) : (
        <p className={styles.inspectorSummary}>Select a recorded event from the graph, timeline or feed.</p>
      )}
    </aside>
  );
}

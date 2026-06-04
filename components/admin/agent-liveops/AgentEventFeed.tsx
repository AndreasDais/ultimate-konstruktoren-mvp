import type { AgentLiveOpsTimelineItem } from "@/lib/agent-liveops/types";

import { StatusBadge } from "./StatusBadge";
import styles from "./AgentLiveOpsDashboard.module.css";

type AgentEventFeedProps = {
  activeEventId: string | null;
  items: AgentLiveOpsTimelineItem[];
  onSelectEvent: (eventId: string) => void;
  selectedEventId: string | null;
};

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AgentEventFeed({
  activeEventId,
  items,
  onSelectEvent,
  selectedEventId,
}: AgentEventFeedProps) {
  return (
    <section className={styles.feedPanel} aria-label="Sanitized event feed">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>Event feed</p>
          <h2>Sanitized JSONL replay</h2>
        </div>
        <span>{items.length} events</span>
      </div>
      <ol className={styles.feedList}>
        {items.map((item, index) => (
          <li key={item.event_id}>
            <button
              className={[
                styles.feedItem,
                activeEventId === item.event_id ? styles.feedItemActive : "",
                selectedEventId === item.event_id ? styles.feedItemSelected : "",
              ].join(" ")}
              onClick={() => onSelectEvent(item.event_id)}
              type="button"
            >
              <span className={styles.feedIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.feedBody}>
                <span className={styles.feedTopline}>
                  <strong>{item.agent_label}</strong>
                  <em>{timeLabel(item.timestamp)}</em>
                </span>
                <span className={styles.feedType}>{item.event_type}</span>
                <span className={styles.feedText}>{item.safe_text}</span>
              </span>
              <StatusBadge compact displayState={item.display_state} status={item.status} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

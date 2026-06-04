import type { AgentLiveOpsTimeline } from "@/lib/agent-liveops/types";

import { StatusBadge } from "./StatusBadge";
import styles from "./AgentLiveOpsDashboard.module.css";

type AgentTimelineProps = {
  activeEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  timeline: AgentLiveOpsTimeline;
};

function formatMs(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${value}ms`;
}

export function AgentTimeline({
  activeEventId,
  onSelectEvent,
  timeline,
}: AgentTimelineProps) {
  const totalMs = Math.max(
    1,
    ...timeline.waterfall.map((segment) => segment.offset_ms + segment.duration_ms),
  );

  return (
    <section className={styles.timelinePanel} aria-label="Event timeline">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>Timeline</p>
          <h2>Waterfall from recorded timestamps</h2>
        </div>
        <span>{formatMs(totalMs)}</span>
      </div>
      <div className={styles.waterfall}>
        {timeline.waterfall.map((segment) => (
          <button
            className={[
              styles.waterfallRow,
              activeEventId === segment.event_id ? styles.waterfallRowActive : "",
            ].join(" ")}
            key={segment.id}
            onClick={() => onSelectEvent(segment.event_id)}
            type="button"
          >
            <span className={styles.waterfallLabel}>{segment.agent_label}</span>
            <span className={styles.waterfallTrack}>
              <i
                style={{
                  left: `${(segment.offset_ms / totalMs) * 100}%`,
                  width: `${Math.max(2, (segment.duration_ms / totalMs) * 100)}%`,
                }}
              />
            </span>
            <StatusBadge compact displayState={segment.display_state} status={segment.status} />
          </button>
        ))}
      </div>
    </section>
  );
}

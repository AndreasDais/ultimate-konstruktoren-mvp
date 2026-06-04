import type {
  AgentLiveOpsGraphNode,
  AgentLiveOpsTimelineItem,
} from "@/lib/agent-liveops/types";

import { StatusBadge } from "./StatusBadge";
import styles from "./AgentLiveOpsDashboard.module.css";

type AgentNodeCardProps = {
  active: boolean;
  node: AgentLiveOpsGraphNode;
  selected: boolean;
  latestItem?: AgentLiveOpsTimelineItem;
  onSelectEvent: (eventId: string) => void;
};

function formatDuration(value: number | null) {
  if (typeof value !== "number") return "pending";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${value}ms`;
}

export function AgentNodeCard({
  active,
  latestItem,
  node,
  onSelectEvent,
  selected,
}: AgentNodeCardProps) {
  return (
    <button
      className={[
        styles.nodeCard,
        active ? styles.nodeCardActive : "",
        selected ? styles.nodeCardSelected : "",
      ].join(" ")}
      onClick={() => onSelectEvent(latestItem?.event_id ?? node.last_event_id)}
      type="button"
    >
      <span className={styles.nodeTopline}>
        <strong>{node.label}</strong>
        <StatusBadge compact displayState={node.display_state} status={node.status} />
      </span>
      <span className={styles.nodeMeta}>
        {node.event_count} events - {formatDuration(node.duration_ms)}
      </span>
      {node.warning_count > 0 || node.error_count > 0 ? (
        <span className={styles.nodeSignals}>
          {node.warning_count > 0 ? <em>{node.warning_count} warn</em> : null}
          {node.error_count > 0 ? <em>{node.error_count} error</em> : null}
        </span>
      ) : null}
      {node.artifact_refs.length > 0 ? (
        <span className={styles.nodeArtifacts}>
          {node.artifact_refs.map((artifact) => (
            <small key={artifact}>{artifact.split("/").at(-1)}</small>
          ))}
        </span>
      ) : null}
    </button>
  );
}

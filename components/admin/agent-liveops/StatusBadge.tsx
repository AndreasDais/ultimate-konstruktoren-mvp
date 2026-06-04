import type {
  AgentLiveOpsDisplayState,
  AgentLiveOpsStatus,
} from "@/lib/agent-liveops/types";

import styles from "./AgentLiveOpsDashboard.module.css";

type StatusBadgeProps = {
  displayState: AgentLiveOpsDisplayState;
  status?: AgentLiveOpsStatus;
  compact?: boolean;
};

const LABELS: Record<AgentLiveOpsDisplayState, string> = {
  active: "running",
  blocked: "blocked",
  completed: "completed",
  evidence: "evidence",
  failed: "failed",
  idle: "idle",
  waiting_for_human: "human review",
  warning: "warning",
};

const STATE_CLASS: Record<AgentLiveOpsDisplayState, string> = {
  active: styles.badgeActive,
  blocked: styles.badgeBlocked,
  completed: styles.badgeCompleted,
  evidence: styles.badgeEvidence,
  failed: styles.badgeFailed,
  idle: styles.badgeIdle,
  waiting_for_human: styles.badgeWarning,
  warning: styles.badgeWarning,
};

export function StatusBadge({
  compact = false,
  displayState,
  status,
}: StatusBadgeProps) {
  return (
    <span
      className={[
        styles.statusBadge,
        STATE_CLASS[displayState],
        compact ? styles.statusBadgeCompact : "",
      ].join(" ")}
      title={status}
    >
      <span aria-hidden="true" />
      {LABELS[displayState]}
    </span>
  );
}

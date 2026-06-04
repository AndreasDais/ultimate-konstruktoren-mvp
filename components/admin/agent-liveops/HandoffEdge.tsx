import type { AgentLiveOpsDisplayState } from "@/lib/agent-liveops/types";

import styles from "./AgentLiveOpsDashboard.module.css";

type Point = {
  x: number;
  y: number;
};

type HandoffEdgeProps = {
  active: boolean;
  displayState: AgentLiveOpsDisplayState;
  from: Point;
  to: Point;
};

const EDGE_CLASS: Record<AgentLiveOpsDisplayState, string> = {
  active: styles.edgeActive,
  blocked: styles.edgeBlocked,
  completed: styles.edgeCompleted,
  evidence: styles.edgeEvidence,
  failed: styles.edgeFailed,
  idle: styles.edgeIdle,
  waiting_for_human: styles.edgeWarning,
  warning: styles.edgeWarning,
};

export function HandoffEdge({
  active,
  displayState,
  from,
  to,
}: HandoffEdgeProps) {
  const pulseX = (from.x + to.x) / 2;
  const pulseY = (from.y + to.y) / 2;

  return (
    <g className={[styles.edge, EDGE_CLASS[displayState], active ? styles.edgeIsActive : ""].join(" ")}>
      <line x1={from.x} x2={to.x} y1={from.y} y2={to.y} />
      {active ? <circle cx={pulseX} cy={pulseY} r="1.5" /> : null}
    </g>
  );
}

import type {
  AgentLiveOpsGraph,
  AgentLiveOpsTimelineItem,
} from "@/lib/agent-liveops/types";

import { AgentNodeCard } from "./AgentNodeCard";
import { HandoffEdge } from "./HandoffEdge";
import styles from "./AgentLiveOpsDashboard.module.css";

type AgentGraphCanvasProps = {
  activeEventId: string | null;
  graph: AgentLiveOpsGraph;
  items: AgentLiveOpsTimelineItem[];
  onSelectEvent: (eventId: string) => void;
  selectedEventId: string | null;
};

type Point = {
  x: number;
  y: number;
};

const NODE_POSITIONS: Record<string, Point> = {
  comparator: { x: 67, y: 32 },
  controller: { x: 84, y: 54 },
  engineer_a: { x: 46, y: 16 },
  engineer_b: { x: 46, y: 48 },
  feature_arena: { x: 42, y: 82 },
  guardrail_agent: { x: 84, y: 30 },
  human_review: { x: 14, y: 82 },
  input_agent: { x: 25, y: 32 },
  pipeline: { x: 8, y: 32 },
  report_qa: { x: 62, y: 82 },
  reporter: { x: 82, y: 78 },
};

function fallbackPoint(index: number): Point {
  return {
    x: 12 + (index % 5) * 18,
    y: 18 + Math.floor(index / 5) * 22,
  };
}

export function AgentGraphCanvas({
  activeEventId,
  graph,
  items,
  onSelectEvent,
  selectedEventId,
}: AgentGraphCanvasProps) {
  const positions = new Map(
    graph.nodes.map((node, index) => [
      node.id,
      NODE_POSITIONS[node.id] ?? fallbackPoint(index),
    ]),
  );
  const latestByNode = new Map<string, AgentLiveOpsTimelineItem>();
  const activeNodeKey = items.find((item) => item.event_id === activeEventId)?.agent_key;
  const selectedNodeKey = items.find((item) => item.event_id === selectedEventId)?.agent_key;

  for (const item of items) {
    latestByNode.set(item.agent_key, item);
  }

  return (
    <section className={styles.graphPanel} aria-label="Agent graph">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>Agent graph</p>
          <h2>Recorded PILAR pipeline</h2>
        </div>
        <span>{graph.edges.length} handoffs</span>
      </div>
      <div className={styles.graphSurface}>
        <svg
          className={styles.edgeLayer}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {graph.edges.map((edge) => {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);
            if (!from || !to) return null;
            return (
              <HandoffEdge
                active={activeEventId ? edge.event_ids.includes(activeEventId) : false}
                displayState={edge.display_state}
                from={from}
                key={edge.id}
                to={to}
              />
            );
          })}
        </svg>

        <div className={styles.nodeLayer}>
          {graph.nodes.map((node) => {
            const point = positions.get(node.id) ?? { x: 50, y: 50 };
            const latestItem = latestByNode.get(node.id);
            return (
              <div
                className={styles.nodePosition}
                key={node.id}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                <AgentNodeCard
                  active={activeNodeKey === node.id}
                  latestItem={latestItem}
                  node={node}
                  onSelectEvent={onSelectEvent}
                  selected={selectedNodeKey === node.id}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

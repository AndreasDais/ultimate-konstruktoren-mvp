import {
  deriveAgentLiveOpsDisplayState,
  deriveAgentLiveOpsRunState,
  getAgentLiveOpsAgentKey,
  sortAgentLiveOpsEvents,
} from "./status";
import type {
  AgentLiveOpsEvent,
  AgentLiveOpsGraph,
  AgentLiveOpsGraphEdge,
  AgentLiveOpsGraphNode,
  AgentLiveOpsRedactionStatus,
} from "./types";

type MutableNode = AgentLiveOpsGraphNode & {
  artifactRefSet: Set<string>;
  reasonCodeSet: Set<string>;
  redactionStatusSet: Set<AgentLiveOpsRedactionStatus>;
};

function displayLabelFor(event: AgentLiveOpsEvent): string {
  return event.agent_label || getAgentLiveOpsAgentKey(event);
}

function createMutableNode(event: AgentLiveOpsEvent): MutableNode {
  const artifactRefs = event.artifact_ref ? [event.artifact_ref] : [];
  const reasonCodes = event.reason_codes ?? [];

  return {
    id: getAgentLiveOpsAgentKey(event),
    agent_key: getAgentLiveOpsAgentKey(event),
    label: displayLabelFor(event),
    status: event.status,
    display_state: deriveAgentLiveOpsDisplayState(event),
    event_count: 1,
    warning_count: deriveAgentLiveOpsDisplayState(event) === "warning" ||
      deriveAgentLiveOpsDisplayState(event) === "waiting_for_human"
      ? 1
      : 0,
    error_count: deriveAgentLiveOpsDisplayState(event) === "failed" ||
      deriveAgentLiveOpsDisplayState(event) === "blocked"
      ? 1
      : 0,
    last_event_id: event.event_id,
    last_updated_at: event.timestamp,
    duration_ms: typeof event.duration_ms === "number" ? event.duration_ms : null,
    artifact_refs: artifactRefs,
    reason_codes: reasonCodes,
    redaction_statuses: [event.redaction_status],
    human_final: true,
    read_only: true,
    artifactRefSet: new Set(artifactRefs),
    reasonCodeSet: new Set(reasonCodes),
    redactionStatusSet: new Set([event.redaction_status]),
  };
}

function addEventToNode(node: MutableNode, event: AgentLiveOpsEvent) {
  node.event_count += 1;
  node.label = event.agent_label || node.label;
  node.status = event.status;
  node.display_state = deriveAgentLiveOpsDisplayState(event);
  node.last_event_id = event.event_id;
  node.last_updated_at = event.timestamp;

  if (typeof event.duration_ms === "number") {
    node.duration_ms = (node.duration_ms ?? 0) + event.duration_ms;
  }

  if (node.display_state === "warning" || node.display_state === "waiting_for_human") {
    node.warning_count += 1;
  }
  if (node.display_state === "failed" || node.display_state === "blocked") {
    node.error_count += 1;
  }

  if (event.artifact_ref) node.artifactRefSet.add(event.artifact_ref);
  for (const reasonCode of event.reason_codes ?? []) {
    node.reasonCodeSet.add(reasonCode);
  }
  node.redactionStatusSet.add(event.redaction_status);

  node.artifact_refs = [...node.artifactRefSet];
  node.reason_codes = [...node.reasonCodeSet];
  node.redaction_statuses = [...node.redactionStatusSet];
}

export function buildAgentLiveOpsGraph(events: readonly AgentLiveOpsEvent[]): AgentLiveOpsGraph {
  const ordered = sortAgentLiveOpsEvents(events);
  const nodes = new Map<string, MutableNode>();
  const spanToAgent = new Map<string, string>();
  const edges = new Map<string, AgentLiveOpsGraphEdge>();

  for (const event of ordered) {
    const agentKey = getAgentLiveOpsAgentKey(event);
    const existing = nodes.get(agentKey);
    if (existing) {
      addEventToNode(existing, event);
    } else {
      nodes.set(agentKey, createMutableNode(event));
    }

    spanToAgent.set(event.span_id, agentKey);

    if (!event.parent_span_id) continue;
    const parentAgent = spanToAgent.get(event.parent_span_id);
    if (!parentAgent || parentAgent === agentKey) continue;

    const edgeId = `${parentAgent}->${agentKey}`;
    const existingEdge = edges.get(edgeId);
    if (existingEdge) {
      existingEdge.event_ids.push(event.event_id);
      existingEdge.status = event.status;
      existingEdge.display_state = deriveAgentLiveOpsDisplayState(event);
      existingEdge.timestamp = event.timestamp;
      existingEdge.handoff_event_type = event.event_type;
    } else {
      edges.set(edgeId, {
        id: edgeId,
        source: parentAgent,
        target: agentKey,
        event_ids: [event.event_id],
        trace_id: event.trace_id,
        status: event.status,
        display_state: deriveAgentLiveOpsDisplayState(event),
        timestamp: event.timestamp,
        handoff_event_type: event.event_type,
      });
    }
  }

  return {
    run_id: ordered[0]?.run_id ?? "unknown_run",
    nodes: [...nodes.values()].map(({ artifactRefSet, reasonCodeSet, redactionStatusSet, ...node }) => node),
    edges: [...edges.values()],
    run_state: deriveAgentLiveOpsRunState(ordered),
  };
}

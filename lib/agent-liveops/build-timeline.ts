import {
  deriveAgentLiveOpsDisplayState,
  deriveAgentLiveOpsRunState,
  getAgentLiveOpsAgentKey,
  getAgentLiveOpsSafeText,
  sortAgentLiveOpsEvents,
} from "./status";
import type {
  AgentLiveOpsEvent,
  AgentLiveOpsTimeline,
  AgentLiveOpsTimelineItem,
  AgentLiveOpsWaterfallSegment,
} from "./types";

export function buildAgentLiveOpsTimeline(
  events: readonly AgentLiveOpsEvent[],
): AgentLiveOpsTimeline {
  const ordered = sortAgentLiveOpsEvents(events);
  const firstTimestamp = Date.parse(ordered[0]?.timestamp ?? new Date(0).toISOString());

  const items: AgentLiveOpsTimelineItem[] = ordered.map((event) => ({
    id: event.event_id,
    run_id: event.run_id,
    event_id: event.event_id,
    trace_id: event.trace_id,
    span_id: event.span_id,
    parent_span_id: event.parent_span_id ?? null,
    agent_key: getAgentLiveOpsAgentKey(event),
    agent_label: event.agent_label || getAgentLiveOpsAgentKey(event),
    event_type: event.event_type,
    status: event.status,
    display_state: deriveAgentLiveOpsDisplayState(event),
    timestamp: event.timestamp,
    timestamp_ms: Date.parse(event.timestamp),
    duration_ms: typeof event.duration_ms === "number" ? event.duration_ms : null,
    safe_text: getAgentLiveOpsSafeText(event),
    artifact_ref: event.artifact_ref ?? null,
    reason_codes: event.reason_codes ?? [],
    redaction_status: event.redaction_status,
  }));

  const waterfall: AgentLiveOpsWaterfallSegment[] = items
    .filter((item) => typeof item.duration_ms === "number" && item.duration_ms > 0)
    .map((item) => ({
      id: `${item.event_id}-waterfall`,
      agent_key: item.agent_key,
      agent_label: item.agent_label,
      event_id: item.event_id,
      started_at: item.timestamp,
      offset_ms: Math.max(0, item.timestamp_ms - firstTimestamp),
      duration_ms: item.duration_ms ?? 0,
      status: item.status,
      display_state: item.display_state,
    }));

  return {
    run_id: ordered[0]?.run_id ?? "unknown_run",
    items,
    waterfall,
    run_state: deriveAgentLiveOpsRunState(ordered),
  };
}

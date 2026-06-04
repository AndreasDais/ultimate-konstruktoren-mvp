import type {
  AgentLiveOpsDisplayState,
  AgentLiveOpsEvent,
  AgentLiveOpsRunState,
  AgentLiveOpsStatus,
} from "./types";

export function getAgentLiveOpsAgentKey(event: AgentLiveOpsEvent): string {
  return event.agent_key || event.agent || "unknown_agent";
}

export function getAgentLiveOpsSafeText(event: AgentLiveOpsEvent): string {
  return (event.summary || event.message || "").trim();
}

export function isAgentLiveOpsActiveStatus(status: AgentLiveOpsStatus): boolean {
  return status === "queued" ||
    status === "running" ||
    status === "streaming" ||
    status === "waiting_for_tool" ||
    status === "waiting_for_handoff";
}

export function isAgentLiveOpsWarningEvent(event: AgentLiveOpsEvent): boolean {
  return event.status === "completed_with_warning" ||
    event.status === "waiting_for_human" ||
    event.event_type === "guardrail.warn" ||
    event.event_type === "eval.needs_human_review" ||
    event.event_type === "human.review_required" ||
    event.event_type === "release.risky" ||
    event.severity === "warn";
}

export function isAgentLiveOpsBlockedEvent(event: AgentLiveOpsEvent): boolean {
  return event.status === "blocked" ||
    event.event_type === "guardrail.block" ||
    event.event_type === "release.blocked" ||
    event.severity === "block";
}

export function isAgentLiveOpsFailureEvent(event: AgentLiveOpsEvent): boolean {
  return event.status === "failed" ||
    event.event_type === "run.failed" ||
    event.event_type === "agent.failed" ||
    event.event_type === "tool.failed" ||
    event.event_type === "report.failed" ||
    event.event_type === "eval.failed" ||
    event.severity === "error";
}

export function deriveAgentLiveOpsDisplayState(
  eventOrStatus: AgentLiveOpsEvent | AgentLiveOpsStatus,
): AgentLiveOpsDisplayState {
  if (typeof eventOrStatus !== "string") {
    if (eventOrStatus.event_type === "feature.evidence_created" ||
      eventOrStatus.event_type === "feature.hypothesis_candidate_created") {
      return "evidence";
    }
    if (isAgentLiveOpsFailureEvent(eventOrStatus)) return "failed";
    if (isAgentLiveOpsBlockedEvent(eventOrStatus)) return "blocked";
    if (isAgentLiveOpsWarningEvent(eventOrStatus)) {
      return eventOrStatus.status === "waiting_for_human" ? "waiting_for_human" : "warning";
    }
    return deriveAgentLiveOpsDisplayState(eventOrStatus.status);
  }

  if (eventOrStatus === "failed" || eventOrStatus === "cancelled") return "failed";
  if (eventOrStatus === "blocked") return "blocked";
  if (eventOrStatus === "completed_with_warning") return "warning";
  if (eventOrStatus === "waiting_for_human") return "waiting_for_human";
  if (eventOrStatus === "completed") return "completed";
  if (isAgentLiveOpsActiveStatus(eventOrStatus)) return "active";
  return "idle";
}

export function sortAgentLiveOpsEvents(events: readonly AgentLiveOpsEvent[]): AgentLiveOpsEvent[] {
  return [...events].sort((a, b) => {
    const timeDelta = Date.parse(a.timestamp) - Date.parse(b.timestamp);
    if (timeDelta !== 0) return timeDelta;
    return a.event_id.localeCompare(b.event_id);
  });
}

export function deriveAgentLiveOpsRunState(events: readonly AgentLiveOpsEvent[]): AgentLiveOpsRunState {
  const ordered = sortAgentLiveOpsEvents(events);
  const lastEvent = ordered.at(-1) ?? null;
  const runId = lastEvent?.run_id || ordered[0]?.run_id || "unknown_run";
  const warningCount = ordered.filter(isAgentLiveOpsWarningEvent).length;
  const blockedCount = ordered.filter(isAgentLiveOpsBlockedEvent).length;
  const errorCount = ordered.filter(isAgentLiveOpsFailureEvent).length;
  const runTerminal = [...ordered].reverse().find((event) => event.event_type.startsWith("run."));

  let status: AgentLiveOpsStatus = "idle";
  if (runTerminal?.event_type === "run.failed" || errorCount > 0) {
    status = "failed";
  } else if (runTerminal?.event_type === "run.cancelled") {
    status = "cancelled";
  } else if (blockedCount > 0) {
    status = "blocked";
  } else if (runTerminal?.event_type === "run.completed_with_warning" || warningCount > 0) {
    status = "completed_with_warning";
  } else if (runTerminal?.event_type === "run.completed") {
    status = "completed";
  } else if (ordered.some((event) => isAgentLiveOpsActiveStatus(event.status))) {
    status = "running";
  } else if (lastEvent) {
    status = lastEvent.status;
  }

  return {
    run_id: runId,
    status,
    display_state: deriveAgentLiveOpsDisplayState(status),
    warning_count: warningCount,
    blocked_count: blockedCount,
    error_count: errorCount,
    last_event_id: lastEvent?.event_id ?? null,
    last_updated_at: lastEvent?.timestamp ?? null,
    human_final: true,
    read_only: true,
    can_decide_release: false,
    can_decide_build_next: false,
    can_decide_roadmap: false,
  };
}

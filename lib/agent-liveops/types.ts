export const AGENT_LIVEOPS_SCHEMA_VERSION = "pilar.agent_event.v0" as const;

export const AGENT_LIVEOPS_EVENT_TYPES = [
  "run.created",
  "run.started",
  "run.completed",
  "run.completed_with_warning",
  "run.failed",
  "run.cancelled",
  "agent.queued",
  "agent.started",
  "agent.streaming",
  "agent.completed",
  "agent.completed_with_warning",
  "agent.failed",
  "agent.retrying",
  "agent.handoff",
  "agent.parallel_started",
  "agent.parallel_joined",
  "tool.started",
  "tool.completed",
  "tool.failed",
  "guardrail.started",
  "guardrail.pass",
  "guardrail.warn",
  "guardrail.block",
  "report.started",
  "report.web_ready",
  "report.pdf_ready",
  "report.docx_ready",
  "report.failed",
  "eval.started",
  "eval.passed",
  "eval.failed",
  "eval.needs_human_review",
  "human.review_required",
  "human.review_completed",
  "feature.evidence_created",
  "feature.hypothesis_candidate_created",
  "release.gate_started",
  "release.ready",
  "release.risky",
  "release.blocked",
] as const;

export type AgentLiveOpsEventType = (typeof AGENT_LIVEOPS_EVENT_TYPES)[number];

export const AGENT_LIVEOPS_STATUSES = [
  "idle",
  "queued",
  "running",
  "streaming",
  "waiting_for_tool",
  "waiting_for_handoff",
  "waiting_for_human",
  "completed",
  "completed_with_warning",
  "blocked",
  "failed",
  "cancelled",
] as const;

export type AgentLiveOpsStatus = (typeof AGENT_LIVEOPS_STATUSES)[number];

export const AGENT_LIVEOPS_REDACTION_STATUSES = [
  "safe_summary_only",
  "no_user_data",
] as const;

export type AgentLiveOpsRedactionStatus =
  (typeof AGENT_LIVEOPS_REDACTION_STATUSES)[number];

export type AgentLiveOpsSeverity = "info" | "warn" | "error" | "block";

export type AgentLiveOpsMetadataValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | AgentLiveOpsMetadata;

export type AgentLiveOpsMetadata = {
  [key: string]: AgentLiveOpsMetadataValue;
};

export type AgentLiveOpsEvent = {
  schema_version: typeof AGENT_LIVEOPS_SCHEMA_VERSION;
  run_id: string;
  event_id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  agent?: string;
  agent_key?: string;
  agent_label?: string;
  event_type: AgentLiveOpsEventType;
  status: AgentLiveOpsStatus;
  severity?: AgentLiveOpsSeverity;
  timestamp: string;
  duration_ms?: number | null;
  summary?: string;
  message?: string;
  artifact_ref?: string | null;
  reason_codes?: string[];
  metadata?: AgentLiveOpsMetadata;
  redaction_status: AgentLiveOpsRedactionStatus;
  raw_user_data?: never;
  full_user_prompt?: never;
  unredacted_file_text?: never;
  personal_data?: never;
};

export type AgentLiveOpsRunSummary = {
  run_id: string;
  standard_profile?: string;
  answer_language?: string;
  shell_language?: string;
  event_count: number;
  warning_count: number;
  blocked_count: number;
  artifact_statuses: Record<string, string>;
  redaction_status: AgentLiveOpsRedactionStatus;
  read_only: true;
  human_final: true;
  safety_notes?: string[];
};

export type AgentLiveOpsDisplayState =
  | "idle"
  | "active"
  | "completed"
  | "warning"
  | "blocked"
  | "failed"
  | "evidence"
  | "waiting_for_human";

export type AgentLiveOpsRunState = {
  run_id: string;
  status: AgentLiveOpsStatus;
  display_state: AgentLiveOpsDisplayState;
  warning_count: number;
  blocked_count: number;
  error_count: number;
  last_event_id: string | null;
  last_updated_at: string | null;
  human_final: true;
  read_only: true;
  can_decide_release: false;
  can_decide_build_next: false;
  can_decide_roadmap: false;
};

export type AgentLiveOpsGraphNode = {
  id: string;
  agent_key: string;
  label: string;
  status: AgentLiveOpsStatus;
  display_state: AgentLiveOpsDisplayState;
  event_count: number;
  warning_count: number;
  error_count: number;
  last_event_id: string;
  last_updated_at: string;
  duration_ms: number | null;
  artifact_refs: string[];
  reason_codes: string[];
  redaction_statuses: AgentLiveOpsRedactionStatus[];
  human_final: true;
  read_only: true;
};

export type AgentLiveOpsGraphEdge = {
  id: string;
  source: string;
  target: string;
  event_ids: string[];
  trace_id: string;
  status: AgentLiveOpsStatus;
  display_state: AgentLiveOpsDisplayState;
  timestamp: string;
  handoff_event_type: AgentLiveOpsEventType;
};

export type AgentLiveOpsGraph = {
  run_id: string;
  nodes: AgentLiveOpsGraphNode[];
  edges: AgentLiveOpsGraphEdge[];
  run_state: AgentLiveOpsRunState;
};

export type AgentLiveOpsTimelineItem = {
  id: string;
  run_id: string;
  event_id: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  agent_key: string;
  agent_label: string;
  event_type: AgentLiveOpsEventType;
  status: AgentLiveOpsStatus;
  display_state: AgentLiveOpsDisplayState;
  timestamp: string;
  timestamp_ms: number;
  duration_ms: number | null;
  safe_text: string;
  artifact_ref: string | null;
  reason_codes: string[];
  redaction_status: AgentLiveOpsRedactionStatus;
};

export type AgentLiveOpsWaterfallSegment = {
  id: string;
  agent_key: string;
  agent_label: string;
  event_id: string;
  started_at: string;
  offset_ms: number;
  duration_ms: number;
  status: AgentLiveOpsStatus;
  display_state: AgentLiveOpsDisplayState;
};

export type AgentLiveOpsTimeline = {
  run_id: string;
  items: AgentLiveOpsTimelineItem[];
  waterfall: AgentLiveOpsWaterfallSegment[];
  run_state: AgentLiveOpsRunState;
};

export type AgentLiveOpsParseResult =
  | { ok: true; events: AgentLiveOpsEvent[] }
  | { ok: false; errors: string[] };

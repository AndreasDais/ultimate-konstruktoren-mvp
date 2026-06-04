import { describe, expect, it } from "vitest";

import { buildAgentLiveOpsGraph } from "./build-graph";
import { buildAgentLiveOpsTimeline } from "./build-timeline";
import {
  parseAgentLiveOpsEventsJsonl,
  readAgentLiveOpsMockEvents,
  readAgentLiveOpsMockSummary,
} from "./mock-events";
import { deriveAgentLiveOpsRunState } from "./status";

describe("Agent LiveOps helpers", () => {
  it("loads sanitized mock events from the Sprint 36.1 fixture", () => {
    const events = readAgentLiveOpsMockEvents();
    const summary = readAgentLiveOpsMockSummary();

    expect(events).toHaveLength(summary.event_count);
    expect(summary.read_only).toBe(true);
    expect(summary.human_final).toBe(true);
    expect(events.every((event) => event.redaction_status === "safe_summary_only" || event.redaction_status === "no_user_data")).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/raw_user_data|full_user_prompt|unredacted_file_text|personal_data|chain-of-thought/i);
  });

  it("derives run status from events without deciding release or roadmap", () => {
    const events = readAgentLiveOpsMockEvents();
    const state = deriveAgentLiveOpsRunState(events);

    expect(state.run_id).toBe("run-liveops-demo-ec3-001");
    expect(state.status).toBe("completed_with_warning");
    expect(state.display_state).toBe("warning");
    expect(state.warning_count).toBe(6);
    expect(state.blocked_count).toBe(0);
    expect(state.human_final).toBe(true);
    expect(state.can_decide_release).toBe(false);
    expect(state.can_decide_build_next).toBe(false);
    expect(state.can_decide_roadmap).toBe(false);
  });

  it("builds graph nodes and event-backed edges for the PILAR pipeline", () => {
    const graph = buildAgentLiveOpsGraph(readAgentLiveOpsMockEvents());
    const nodeIds = graph.nodes.map((node) => node.id);

    expect(nodeIds).toEqual(expect.arrayContaining([
      "pipeline",
      "input_agent",
      "engineer_a",
      "engineer_b",
      "comparator",
      "guardrail_agent",
      "controller",
      "reporter",
      "report_qa",
      "feature_arena",
      "human_review",
    ]));
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.edges.every((edge) => edge.event_ids.length > 0)).toBe(true);
    expect(graph.nodes.find((node) => node.id === "guardrail_agent")?.display_state).toBe("warning");
    expect(graph.nodes.find((node) => node.id === "reporter")?.artifact_refs).toEqual([
      "artifact://run-liveops-demo-ec3-001/report/web",
      "artifact://run-liveops-demo-ec3-001/report/pdf",
      "artifact://run-liveops-demo-ec3-001/report/docx",
    ]);
  });

  it("builds sorted timeline and waterfall from sanitized event timestamps", () => {
    const timeline = buildAgentLiveOpsTimeline(readAgentLiveOpsMockEvents());

    expect(timeline.items).toHaveLength(20);
    expect(timeline.items[0]?.event_type).toBe("run.created");
    expect(timeline.items.at(-1)?.event_type).toBe("run.completed_with_warning");
    expect(timeline.waterfall.length).toBeGreaterThan(0);
    expect(timeline.waterfall.every((segment) => segment.offset_ms >= 0)).toBe(true);
    expect(timeline.items.every((item) => item.safe_text.length > 0)).toBe(true);
  });

  it("rejects parser input with forbidden raw-data fields and unsafe text", () => {
    const safeEvent = {
      schema_version: "pilar.agent_event.v0",
      run_id: "run-x",
      event_id: "evt-x",
      trace_id: "trace-x",
      span_id: "span-x",
      event_type: "agent.completed",
      timestamp: "2026-06-03T12:00:00.000Z",
      agent: "input_agent",
      status: "completed",
      summary: "Safe summary.",
      redaction_status: "safe_summary_only",
    };
    const result = parseAgentLiveOpsEventsJsonl([
      JSON.stringify({
        ...safeEvent,
        metadata: { nested: [{ raw_user_data: "forbidden" }] },
      }),
      JSON.stringify({
        ...safeEvent,
        event_id: "evt-y",
        span_id: "span-y",
        summary: "This contains hidden reasoning.",
      }),
    ].join("\n"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join("\n")).toMatch(/forbidden raw-data field/);
      expect(result.errors.join("\n")).toMatch(/unsafe chain-of-thought text/);
    }
  });
});

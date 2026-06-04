import { describe, expect, it } from "vitest";

import {
  parseAgentLiveOpsEvent,
  parseAgentLiveOpsLiveResponse,
} from "./live-api-response";

const validEvent = {
  schema_version: "pilar.agent_event.v0",
  run_id: "run-1",
  event_id: "evt-1",
  trace_id: "trace-1",
  span_id: "span-1",
  event_type: "agent.completed",
  status: "completed",
  timestamp: "2026-06-04T10:00:00.000Z",
  redaction_status: "safe_summary_only",
  agent_key: "controller",
  agent_label: "Controller",
  summary: "Controller recorded sanitized decision metadata.",
  metadata: { decision_status: "approved", risk_level: "low" },
};

function validResponse(events: unknown[] = [validEvent]) {
  return {
    run_id: "run-1",
    mode: "diagnostic",
    read_only: true,
    human_final: true,
    events,
  };
}

describe("parseAgentLiveOpsLiveResponse", () => {
  it("accepts a well-formed diagnostic envelope", () => {
    const result = parseAgentLiveOpsLiveResponse(validResponse());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.runId).toBe("run-1");
    expect(result.events).toHaveLength(1);
    expect(result.events[0].summary).toBe(
      "Controller recorded sanitized decision metadata.",
    );
  });

  it("accepts an empty events array (run with no recorded events)", () => {
    const result = parseAgentLiveOpsLiveResponse(validResponse([]));
    expect(result).toEqual({ ok: true, runId: "run-1", events: [] });
  });

  it("falls back to the first event run_id when envelope run_id is missing", () => {
    const result = parseAgentLiveOpsLiveResponse({
      read_only: true,
      events: [validEvent],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.runId).toBe("run-1");
  });

  it("rejects a non-object payload", () => {
    expect(parseAgentLiveOpsLiveResponse(null)).toEqual({
      ok: false,
      reason: "invalid_shape",
    });
    expect(parseAgentLiveOpsLiveResponse("nope")).toEqual({
      ok: false,
      reason: "invalid_shape",
    });
  });

  it("rejects an envelope without the read_only boundary", () => {
    const { read_only: _omit, ...withoutFlag } = validResponse();
    expect(parseAgentLiveOpsLiveResponse(withoutFlag).ok).toBe(false);
    expect(
      parseAgentLiveOpsLiveResponse({ ...validResponse(), read_only: false }).ok,
    ).toBe(false);
  });

  it("rejects when events is not an array", () => {
    expect(
      parseAgentLiveOpsLiveResponse({ read_only: true, events: {} }).ok,
    ).toBe(false);
  });

  it("fails closed when any single event is malformed", () => {
    const result = parseAgentLiveOpsLiveResponse(
      validResponse([validEvent, { ...validEvent, status: "not-a-status" }]),
    );
    expect(result).toEqual({ ok: false, reason: "invalid_shape" });
  });
});

describe("parseAgentLiveOpsEvent", () => {
  it("rejects an event carrying a forbidden key (defence in depth)", () => {
    expect(
      parseAgentLiveOpsEvent({ ...validEvent, raw_message: "secret prompt text" }),
    ).toBeNull();
    expect(
      parseAgentLiveOpsEvent({
        ...validEvent,
        metadata: { user_id: "11111111-2222-3333" },
      }),
    ).toBeNull();
  });

  it("rejects an event whose text leaks a forbidden pattern", () => {
    expect(
      parseAgentLiveOpsEvent({
        ...validEvent,
        summary: "leaked sk-abcdef0123456789 token",
      }),
    ).toBeNull();
    expect(
      parseAgentLiveOpsEvent({
        ...validEvent,
        message: "chain-of-thought: first I considered…",
      }),
    ).toBeNull();
  });

  it("rejects events missing required fields or with bad enums", () => {
    const { redaction_status: _drop, ...noRedaction } = validEvent;
    expect(parseAgentLiveOpsEvent(noRedaction)).toBeNull();
    expect(
      parseAgentLiveOpsEvent({ ...validEvent, event_type: "bogus.type" }),
    ).toBeNull();
    expect(
      parseAgentLiveOpsEvent({ ...validEvent, schema_version: "v9" }),
    ).toBeNull();
    expect(
      parseAgentLiveOpsEvent({ ...validEvent, timestamp: "not-a-date" }),
    ).toBeNull();
  });

  it("whitelists output: unknown non-forbidden fields are dropped", () => {
    const parsed = parseAgentLiveOpsEvent({
      ...validEvent,
      unexpected_field: "should-not-survive",
    });
    expect(parsed).not.toBeNull();
    expect(parsed as object).not.toHaveProperty("unexpected_field");
    // known safe fields are preserved
    expect(parsed?.agent_label).toBe("Controller");
    expect(parsed?.redaction_status).toBe("safe_summary_only");
  });
});

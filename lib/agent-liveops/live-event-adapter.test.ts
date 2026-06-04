import { describe, expect, it, vi } from "vitest";

// @ts-expect-error Vitest runtime supports virtual mocks for marker modules.
vi.mock("server-only", () => ({}), { virtual: true });

import {
  AGENT_LIVEOPS_SAFE_SELECTS,
  buildAgentLiveOpsEventsFromReader,
  buildAgentLiveOpsEventsFromRows,
  createSupabaseAgentLiveOpsReader,
  readAgentLiveOpsRowsFromReader,
  type AgentLiveOpsLiveEventReader,
  type AgentLiveOpsLiveRows,
} from "./live-event-adapter";
import { parseAgentLiveOpsEventsJsonl } from "./mock-events";

const RUN_ID = "run-liveops-real-001";
const REQUEST_ID = "req-liveops-real-001";

function sampleRows(): AgentLiveOpsLiveRows {
  return {
    run: {
      id: RUN_ID,
      request_id: REQUEST_ID,
      user_id: "user-should-not-leak",
      run_status: "completed",
      run_type: "standard",
      calculation_type: "steel_beam",
      started_at: "2026-06-04T08:00:00.000Z",
      completed_at: "2026-06-04T08:00:45.000Z",
      display_language: "en",
      eval_case_id: "eval-liveops-001",
    },
    inputReview: {
      id: "input-review-1",
      request_id: REQUEST_ID,
      input_status: "klar",
      calculation_type: "steel_beam",
      discipline: "structural",
      prompt_version: "input_agent_v0.1",
      confidence: "high",
      created_at: "2026-06-04T08:00:04.000Z",
    },
    agentOutputs: [
      {
        id: "agent-a-1",
        run_id: RUN_ID,
        agent_name: "agent_a",
        confidence: "high",
        prompt_version: "agent_a_v0.1",
        created_at: "2026-06-04T08:00:15.000Z",
      },
      {
        id: "agent-b-1",
        run_id: RUN_ID,
        agent_name: "agent_b",
        confidence: "low",
        prompt_version: "agent_b_v0.1",
        created_at: "2026-06-04T08:00:16.000Z",
      },
    ],
    comparison: {
      id: "comparison-1",
      run_id: RUN_ID,
      match_status: "mismatch",
      recommended_status: "review",
      prompt_version: "samanliknar_v0.1",
      created_at: "2026-06-04T08:00:24.000Z",
    },
    controllerDecision: {
      id: "controller-1",
      run_id: RUN_ID,
      decision_status: "rejected",
      risk_level: "high",
      manual_review_required: true,
      prompt_version: "kontrollor_v0.1",
      created_at: "2026-06-04T08:00:30.000Z",
      blocked_outputs: ["results_a", "calculation_steps_b"],
    },
    report: {
      id: "report-1",
      run_id: RUN_ID,
      document_id: "PILAR-LIVEOPS",
      prompt_version: "agent_e_v0.3",
      created_at: "2026-06-04T08:00:42.000Z",
      tillit_score: 72,
    },
    stepMetrics: [
      {
        id: "metric-a-1",
        run_id: RUN_ID,
        request_id: REQUEST_ID,
        step_name: "konstruktor_a",
        model: "claude-sonnet-4",
        prompt_version: "agent_a_v0.1",
        input_tokens: 1200,
        output_tokens: 450,
        cache_read_tokens: 0,
        cache_creation_tokens: 128,
        latency_ms: 8300,
        stop_reason: "end_turn",
        ok: true,
        created_at: "2026-06-04T08:00:13.000Z",
        status: "completed",
        completed_at: "2026-06-04T08:00:15.000Z",
        error_category: "none",
        retryable: false,
        raw_error_redacted: true,
      },
      {
        id: "metric-controller-1",
        run_id: RUN_ID,
        request_id: REQUEST_ID,
        step_name: "kontrollor",
        model: "claude-sonnet-4",
        prompt_version: "kontrollor_v0.1",
        input_tokens: 1800,
        output_tokens: 300,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
        latency_ms: 4100,
        stop_reason: "end_turn",
        ok: false,
        created_at: "2026-06-04T08:00:28.000Z",
        status: "blocked",
        completed_at: "2026-06-04T08:00:30.000Z",
        error_category: "blocked",
        retryable: false,
        raw_error_redacted: true,
      },
    ],
    stepMessages: [
      {
        id: "message-a-1",
        run_id: RUN_ID,
        request_id: REQUEST_ID,
        step_name: "konstruktor_a",
        model: "claude-sonnet-4",
        prompt_version: "agent_a_v0.1",
        temperature: 0.2,
        max_tokens: 4000,
        created_at: "2026-06-04T08:00:15.000Z",
      },
    ],
  };
}

function jsonl(events: unknown[]): string {
  return events.map((event) => JSON.stringify(event)).join("\n");
}

type QueryCall = {
  table: string;
  select?: string;
  eq: Array<[string, unknown]>;
  order?: [string, unknown];
};

type TableResult = {
  single?: unknown | null;
  many?: unknown[];
  error?: unknown;
};

function makeSupabaseReaderMock(results: Record<string, TableResult>) {
  const calls: QueryCall[] = [];

  return {
    calls,
    client: {
      from(table: string) {
        const call: QueryCall = { table, eq: [] };
        calls.push(call);
        const chain = {
          select(select: string) {
            call.select = select;
            return chain;
          },
          eq(column: string, value: unknown) {
            call.eq.push([column, value]);
            return chain;
          },
          order(column: string, options: unknown) {
            call.order = [column, options];
            return chain;
          },
          maybeSingle() {
            const result = results[table] ?? {};
            return Promise.resolve({
              data: result.single ?? null,
              error: result.error ?? null,
            });
          },
          then(
            resolve: (value: { data: unknown[] | null; error: unknown }) => unknown,
            reject: (reason?: unknown) => unknown,
          ) {
            const result = results[table] ?? {};
            return Promise.resolve({
              data: result.many ?? [],
              error: result.error ?? null,
            }).then(resolve, reject);
          },
        };
        return chain;
      },
    },
  };
}

function supabaseRowsFromSample(
  rows = sampleRows(),
): Record<string, TableResult> {
  return {
    calculation_runs: { single: rows.run },
    input_reviews: { single: rows.inputReview },
    agent_outputs: { many: rows.agentOutputs },
    comparisons: { single: rows.comparison },
    controller_decisions: { single: rows.controllerDecision },
    reports: { single: rows.report },
    step_metrics: { many: rows.stepMetrics },
    step_messages: { many: rows.stepMessages },
  };
}

describe("Agent LiveOps live event adapter contract", () => {
  it("locks exact safe select strings", () => {
    expect(AGENT_LIVEOPS_SAFE_SELECTS).toMatchInlineSnapshot(`
      {
        "agentOutputs": "id, run_id, agent_name, confidence, prompt_version, created_at",
        "comparison": "id, run_id, match_status, recommended_status, prompt_version, created_at",
        "controllerDecision": "id, run_id, decision_status, risk_level, manual_review_required, prompt_version, created_at, blocked_outputs",
        "inputReview": "id, request_id, input_status, calculation_type, discipline, prompt_version, confidence, created_at",
        "report": "id, run_id, document_id, prompt_version, created_at, tillit_score",
        "run": "id, request_id, user_id, run_status, run_type, calculation_type, started_at, completed_at, display_language, eval_case_id",
        "stepMessages": "id, run_id, request_id, step_name, model, prompt_version, temperature, max_tokens, created_at",
        "stepMetrics": "id, run_id, request_id, step_name, model, prompt_version, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, latency_ms, stop_reason, ok, created_at, status, completed_at, error_category, retryable, raw_error_redacted",
      }
    `);
  });

  it("keeps forbidden fields out of every select string", () => {
    const joinedSelects = Object.values(AGENT_LIVEOPS_SAFE_SELECTS).join("\n");

    for (const forbidden of [
      "raw_text",
      "input_payload",
      "output_text",
      "structured_output",
      "executive_summary",
      "technical_assessment",
      "conclusion",
      "raw_message",
      "raw_prompt",
      "system_prompt",
      "user_prompt",
      "provider_payload",
      "provider_envelope",
      "stack_trace",
      "uploaded_file_text",
      "chain_of_thought",
    ]) {
      expect(joinedSelects).not.toContain(forbidden);
    }
  });

  it("maps safe row shapes into valid sanitized AgentLiveOpsEvent records", () => {
    const events = buildAgentLiveOpsEventsFromRows(sampleRows());
    const parsed = parseAgentLiveOpsEventsJsonl(jsonl(events));

    expect(parsed.ok).toBe(true);
    expect(events.map((event) => event.event_type)).toEqual(
      expect.arrayContaining([
        "run.started",
        "agent.completed",
        "agent.completed_with_warning",
        "guardrail.block",
        "report.web_ready",
        "run.completed",
      ]),
    );
    expect(events.every((event) => event.redaction_status)).toBe(true);
    expect(JSON.stringify(events)).not.toContain("user-should-not-leak");
    expect(JSON.stringify(events)).not.toMatch(/raw_message|raw_text|structured_output|input_payload|output_text/i);
  });

  it("uses injected readers with exact safe selects and no direct DB or network calls", async () => {
    const rows = sampleRows();
    const reader: AgentLiveOpsLiveEventReader = {
      readRun: vi.fn().mockResolvedValue(rows.run),
      readInputReview: vi.fn().mockResolvedValue(rows.inputReview),
      readAgentOutputs: vi.fn().mockResolvedValue(rows.agentOutputs),
      readComparison: vi.fn().mockResolvedValue(rows.comparison),
      readControllerDecision: vi.fn().mockResolvedValue(rows.controllerDecision),
      readReport: vi.fn().mockResolvedValue(rows.report),
      readStepMetrics: vi.fn().mockResolvedValue(rows.stepMetrics),
      readStepMessages: vi.fn().mockResolvedValue(rows.stepMessages),
    };

    const events = await buildAgentLiveOpsEventsFromReader(reader, RUN_ID);

    expect(events.length).toBeGreaterThan(0);
    expect(reader.readRun).toHaveBeenCalledWith({
      runId: RUN_ID,
      select: AGENT_LIVEOPS_SAFE_SELECTS.run,
    });
    expect(reader.readInputReview).toHaveBeenCalledWith({
      requestId: REQUEST_ID,
      select: AGENT_LIVEOPS_SAFE_SELECTS.inputReview,
    });
    expect(reader.readStepMessages).toHaveBeenCalledWith({
      runId: RUN_ID,
      select: AGENT_LIVEOPS_SAFE_SELECTS.stepMessages,
    });
  });

  it("builds a Supabase reader using only exact safe selects", async () => {
    const service = makeSupabaseReaderMock(supabaseRowsFromSample());
    const reader = createSupabaseAgentLiveOpsReader(
      service.client as unknown as Parameters<typeof createSupabaseAgentLiveOpsReader>[0],
    );

    const rows = await readAgentLiveOpsRowsFromReader(reader, RUN_ID);

    expect(rows?.run?.id).toBe(RUN_ID);
    expect(service.calls.map((call) => [call.table, call.select])).toEqual(
      expect.arrayContaining([
        ["calculation_runs", AGENT_LIVEOPS_SAFE_SELECTS.run],
        ["input_reviews", AGENT_LIVEOPS_SAFE_SELECTS.inputReview],
        ["agent_outputs", AGENT_LIVEOPS_SAFE_SELECTS.agentOutputs],
        ["comparisons", AGENT_LIVEOPS_SAFE_SELECTS.comparison],
        ["controller_decisions", AGENT_LIVEOPS_SAFE_SELECTS.controllerDecision],
        ["reports", AGENT_LIVEOPS_SAFE_SELECTS.report],
        ["step_metrics", AGENT_LIVEOPS_SAFE_SELECTS.stepMetrics],
        ["step_messages", AGENT_LIVEOPS_SAFE_SELECTS.stepMessages],
      ]),
    );
    expect(service.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "step_metrics",
          order: ["created_at", { ascending: true }],
        }),
        expect.objectContaining({
          table: "step_messages",
          order: ["created_at", { ascending: true }],
        }),
      ]),
    );

    const selectedFields = service.calls.map((call) => call.select).join("\n");
    expect(selectedFields).not.toMatch(/raw_message|raw_text|structured_output|input_payload|output_text|executive_summary|technical_assessment|conclusion|provider_payload|stack_trace|chain_of_thought/i);
  });

  it("returns null for an unknown run without inventing downstream progress", async () => {
    const service = makeSupabaseReaderMock({
      ...supabaseRowsFromSample(),
      calculation_runs: { single: null },
    });
    const reader = createSupabaseAgentLiveOpsReader(
      service.client as unknown as Parameters<typeof createSupabaseAgentLiveOpsReader>[0],
    );

    await expect(readAgentLiveOpsRowsFromReader(reader, RUN_ID)).resolves.toBeNull();
    expect(service.calls.map((call) => call.table)).toEqual(["calculation_runs"]);
  });

  it("normalizes Supabase read failures without leaking raw error details", async () => {
    const service = makeSupabaseReaderMock({
      ...supabaseRowsFromSample(),
      step_metrics: {
        error: new Error(
          "SUPABASE_SERVICE_ROLE_KEY stack raw_message provider envelope",
        ),
      },
    });
    const reader = createSupabaseAgentLiveOpsReader(
      service.client as unknown as Parameters<typeof createSupabaseAgentLiveOpsReader>[0],
    );

    await expect(readAgentLiveOpsRowsFromReader(reader, RUN_ID)).rejects.toThrow(
      "agent_liveops_read_failed",
    );
    await expect(readAgentLiveOpsRowsFromReader(reader, RUN_ID)).rejects.not.toThrow(
      /SUPABASE_SERVICE_ROLE_KEY|stack|raw_message|provider envelope/i,
    );
  });

  it("rejects unsafe injected rows before building events", () => {
    const base = sampleRows();

    for (const unsafeRows of [
      { ...base, stepMessages: [{ ...(base.stepMessages?.[0] ?? {}), raw_message: {} }] },
      { ...base, inputReview: { ...(base.inputReview ?? {}), raw_text: "raw user text" } },
      { ...base, agentOutputs: [{ ...(base.agentOutputs?.[0] ?? {}), structured_output: {} }] },
      { ...base, stepMetrics: [{ ...(base.stepMetrics?.[0] ?? {}), provider_payload: {} }] },
      { ...base, stepMetrics: [{ ...(base.stepMetrics?.[0] ?? {}), stack_trace: "Error stack" }] },
      { ...base, report: { ...(base.report ?? {}), conclusion: "report prose" } },
      { ...base, inputReview: { ...(base.inputReview ?? {}), confidence: "SUPABASE_SERVICE_ROLE_KEY" } },
      { ...base, comparison: { ...(base.comparison ?? {}), recommended_status: "hidden reasoning" } },
    ] as AgentLiveOpsLiveRows[]) {
      expect(() => buildAgentLiveOpsEventsFromRows(unsafeRows)).toThrow(
        /rejected/i,
      );
    }
  });

  it("does not invent progress when source timestamps are missing", () => {
    const rows = sampleRows();
    const events = buildAgentLiveOpsEventsFromRows({
      run: {
        ...rows.run!,
        completed_at: null,
        run_status: "completed",
      },
      inputReview: { ...rows.inputReview!, created_at: null },
      agentOutputs: [{ ...rows.agentOutputs![0], created_at: null }],
      stepMetrics: [{ ...rows.stepMetrics![0], created_at: null, completed_at: null }],
    });
    const serialized = JSON.stringify(events);

    expect(serialized).not.toContain("evt-input-agent");
    expect(serialized).not.toContain("evt-agent-output");
    expect(serialized).not.toContain("evt-step-metric");
    expect(serialized).not.toContain("run.completed");
    expect(events.some((event) => event.event_type === "run.started")).toBe(true);
  });

  it("keeps guardrail blocks blocked and never maps them to pass or success", () => {
    const events = buildAgentLiveOpsEventsFromRows(sampleRows());
    const guardrailBlock = events.find((event) => event.event_type === "guardrail.block");

    expect(guardrailBlock).toBeDefined();
    expect(guardrailBlock?.status).toBe("blocked");
    expect(guardrailBlock?.severity).toBe("block");
    expect(JSON.stringify(guardrailBlock)).not.toMatch(/guardrail\.pass|success|passed/i);
  });

  it("keeps live events diagnostic-only with no release-proof or professional approval wording", () => {
    const events = buildAgentLiveOpsEventsFromRows(sampleRows());
    const serialized = JSON.stringify(events);

    expect(serialized).not.toMatch(/release[_ -]?proof|release\.ready|professionally approved|final professional approval|approved for construction|approved for use/i);
    expect(serialized).not.toMatch(/build_next|roadmap decision|can_decide_release|can_decide_roadmap/i);
    expect(events.filter((event) => event.event_type.startsWith("release."))).toEqual([]);
  });
});

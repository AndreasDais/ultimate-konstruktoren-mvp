import { beforeEach, describe, expect, it, vi } from "vitest";

// @ts-expect-error Vitest runtime supports virtual mocks for marker modules.
vi.mock("server-only", () => ({}), { virtual: true });

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createServerClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { AGENT_LIVEOPS_SAFE_SELECTS } from "@/lib/agent-liveops/live-event-adapter";
import { GET } from "./route";

const RUN_ID = "run-liveops-route-001";
const REQUEST_ID = "req-liveops-route-001";

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

function makeServiceSupabase(results: Record<string, TableResult>) {
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

function successfulTableResults(): Record<string, TableResult> {
  return {
    admins: { single: { user_id: "admin-user" } },
    calculation_runs: {
      single: {
        id: RUN_ID,
        request_id: REQUEST_ID,
        user_id: "must-not-leak",
        run_status: "completed",
        run_type: "standard",
        calculation_type: "steel_beam",
        started_at: "2026-06-04T09:00:00.000Z",
        completed_at: "2026-06-04T09:00:30.000Z",
        display_language: "en",
        eval_case_id: "eval-liveops-route",
      },
    },
    input_reviews: {
      single: {
        id: "input-review-route",
        request_id: REQUEST_ID,
        input_status: "klar",
        calculation_type: "steel_beam",
        discipline: "structural",
        prompt_version: "input_agent_v0.1",
        confidence: "high",
        created_at: "2026-06-04T09:00:03.000Z",
      },
    },
    agent_outputs: {
      many: [
        {
          id: "agent-a-route",
          run_id: RUN_ID,
          agent_name: "agent_a",
          confidence: "high",
          prompt_version: "agent_a_v0.1",
          created_at: "2026-06-04T09:00:12.000Z",
        },
      ],
    },
    comparisons: {
      single: {
        id: "comparison-route",
        run_id: RUN_ID,
        match_status: "match",
        recommended_status: "continue",
        prompt_version: "samanliknar_v0.1",
        created_at: "2026-06-04T09:00:18.000Z",
      },
    },
    controller_decisions: {
      single: {
        id: "controller-route",
        run_id: RUN_ID,
        decision_status: "approved_with_warnings",
        risk_level: "medium",
        manual_review_required: true,
        prompt_version: "kontrollor_v0.1",
        created_at: "2026-06-04T09:00:22.000Z",
        blocked_outputs: [],
      },
    },
    reports: {
      single: {
        id: "report-route",
        run_id: RUN_ID,
        document_id: "PILAR-LIVEOPS-ROUTE",
        prompt_version: "agent_e_v0.3",
        created_at: "2026-06-04T09:00:28.000Z",
        tillit_score: 74,
      },
    },
    step_metrics: {
      many: [
        {
          id: "metric-route",
          run_id: RUN_ID,
          request_id: REQUEST_ID,
          step_name: "konstruktor_a",
          model: "claude-sonnet-4",
          prompt_version: "agent_a_v0.1",
          input_tokens: 1000,
          output_tokens: 250,
          cache_read_tokens: 0,
          cache_creation_tokens: 0,
          latency_ms: 4100,
          stop_reason: "end_turn",
          ok: true,
          created_at: "2026-06-04T09:00:10.000Z",
          status: "completed",
          completed_at: "2026-06-04T09:00:12.000Z",
          error_category: "none",
          retryable: false,
          raw_error_redacted: true,
        },
      ],
    },
    step_messages: {
      many: [
        {
          id: "message-route",
          run_id: RUN_ID,
          request_id: REQUEST_ID,
          step_name: "konstruktor_a",
          model: "claude-sonnet-4",
          prompt_version: "agent_a_v0.1",
          temperature: 0.2,
          max_tokens: 4000,
          created_at: "2026-06-04T09:00:12.000Z",
        },
      ],
    },
  };
}

async function callRoute(runId = RUN_ID) {
  return GET(new Request(`http://localhost/api/admin/agent-liveops/runs/${runId}/events`), {
    params: Promise.resolve({ runId }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  mocks.cookies.mockResolvedValue({ getAll: () => [] });
  mocks.createServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-user" } },
      }),
    },
  });
});

describe("GET /api/admin/agent-liveops/runs/[runId]/events", () => {
  it("requires an authenticated admin before creating the service-role reader", async () => {
    mocks.createServerClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await callRoute();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns sanitized diagnostic events for a known run using exact safe selects", async () => {
    const service = makeServiceSupabase(successfulTableResults());
    mocks.createClient.mockReturnValue(service.client);

    const response = await callRoute();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.run_id).toBe(RUN_ID);
    expect(body.mode).toBe("diagnostic");
    expect(body.read_only).toBe(true);
    expect(body.human_final).toBe(true);
    expect(body.events.length).toBeGreaterThan(0);
    expect(
      body.events.every((event: { redaction_status?: string }) => event.redaction_status),
    ).toBe(true);
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
    expect(JSON.stringify(body)).not.toMatch(/release[_ -]?proof|professionally approved|final professional approval|approved for construction/i);

    expect(service.calls.map((call) => [call.table, call.select])).toEqual(
      expect.arrayContaining([
        ["admins", "user_id"],
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

    const selectedFields = service.calls.map((call) => call.select).join("\n");
    expect(selectedFields).not.toMatch(/raw_message|raw_text|structured_output|input_payload|output_text|executive_summary|technical_assessment|conclusion|provider_payload|stack_trace|chain_of_thought/i);
  });

  it("returns 404 for an unknown run", async () => {
    const service = makeServiceSupabase({
      ...successfulTableResults(),
      calculation_runs: { single: null },
    });
    mocks.createClient.mockReturnValue(service.client);

    const response = await callRoute("missing-run");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "run_not_found" });
  });

  it("does not leak raw read errors, stacks, or secrets in 500 responses", async () => {
    const service = makeServiceSupabase({
      ...successfulTableResults(),
      step_metrics: {
        error: new Error(
          "SUPABASE_SERVICE_ROLE_KEY stack raw_message provider envelope",
        ),
      },
    });
    mocks.createClient.mockReturnValue(service.client);

    const response = await callRoute();
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toContain("liveops_events_unavailable");
    expect(text).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|stack|raw_message|provider envelope/i);
  });
});

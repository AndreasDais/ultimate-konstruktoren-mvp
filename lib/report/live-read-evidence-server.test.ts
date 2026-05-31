import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  LIVE_READ_SAFE_SELECTS,
  buildLiveReadEvidenceFromServerRead,
} = await import("./live-read-evidence-server");

const RUN_ID = "7a71e6d0-b2a0-4c44-99c0-80c690263c0a";

function rows(overrides: Record<string, unknown> = {}) {
  const base = {
    run: {
      id: RUN_ID,
      request_id: "request-1",
      user_id: "user-1",
      run_status: "completed",
      run_type: "golden",
      calculation_type: "bjelke_lastverknad",
      started_at: "2026-05-31T08:00:00.000Z",
      completed_at: "2026-05-31T08:01:00.000Z",
      display_language: "en",
      eval_case_id: "case-live-read",
      engineering_context: {
        region: { countryCode: "NO" },
        standards: { family: "eurocode" },
      },
    },
    inputReview: {
      input_status: "klar",
      prompt_version: "input_agent_v0.1",
    },
    agentOutputs: [
      {
        agent_name: "agent_a",
        prompt_version: "agent_a_v0.1",
        confidence: "high",
        structured_output: {
          assumptions: ["qEd is a design load."],
          calculation_steps: [
            {
              title: "Moment",
              text: "MEd = qEd L^2 / 8.",
              latex_formula: "M_{Ed}=q_{Ed}L^2/8",
            },
          ],
          results: { MEd: "25.0 kNm" },
          limitations: [],
          warnings: [],
          confidence: "high",
        },
      },
      {
        agent_name: "agent_b",
        prompt_version: "agent_b_v0.1",
        confidence: "high",
        structured_output: {
          assumptions: [],
          calculation_steps: [],
          results: { MEd: "25.0 kNm" },
          limitations: [],
          warnings: [],
          confidence: "high",
        },
      },
    ],
    comparison: {
      match_status: "match",
      comparison_data: {},
    },
    controllerDecision: {
      decision_status: "approved",
      risk_level: "low",
      reason: "No critical deviations.",
      user_message: "Requires professional review before use.",
      blocked_outputs: [],
      allowed_outputs: ["results_a", "calculation_steps_a"],
      manual_review_required: true,
      controller_notes: "",
      prompt_version: "agent_d_v0.3",
    },
    report: {
      id: "report-1",
      run_id: RUN_ID,
      document_id: "PILAR-LIVE-READ",
      executive_summary: "Engineer A and Engineer B agree on MEd.",
      technical_assessment:
        "Preliminary AI-pipeline assessment for professional review.",
      conclusion: "Requires professional review before use.",
      prompt_version: "agent_e_v0.3",
      created_at: "2026-05-31T08:01:00.000Z",
      tillit_score: 82,
      tillit_breakdown: null,
    },
    stepMetrics: [
      {
        id: "metric-1",
        run_id: RUN_ID,
        request_id: null,
        step_name: "rapportor",
        model: "claude-sonnet-4-5",
        prompt_version: "agent_e_v0.3",
        stop_reason: "end_turn",
        ok: true,
        created_at: "2026-05-31T08:01:00.000Z",
        retryable: false,
      },
    ],
    stepMessages: [
      {
        id: "message-1",
        run_id: RUN_ID,
        request_id: null,
        step_name: "rapportor",
        model: "claude-sonnet-4-5",
        prompt_version: "agent_e_v0.3",
        temperature: null,
        max_tokens: 4000,
        created_at: "2026-05-31T08:01:00.000Z",
      },
    ],
  };
  return { ...base, ...overrides };
}

function readerFor(source = rows()) {
  const calls: Array<{ name: string; select: string }> = [];
  return {
    calls,
    reader: {
      async readRun({ select }: { select: string }) {
        calls.push({ name: "readRun", select });
        return source.run ?? null;
      },
      async readInputReview({ select }: { select: string }) {
        calls.push({ name: "readInputReview", select });
        return source.inputReview ?? null;
      },
      async readAgentOutputs({ select }: { select: string }) {
        calls.push({ name: "readAgentOutputs", select });
        return source.agentOutputs ?? [];
      },
      async readComparison({ select }: { select: string }) {
        calls.push({ name: "readComparison", select });
        return source.comparison ?? null;
      },
      async readControllerDecision({ select }: { select: string }) {
        calls.push({ name: "readControllerDecision", select });
        return source.controllerDecision ?? null;
      },
      async readReport({ select }: { select: string }) {
        calls.push({ name: "readReport", select });
        return source.report ?? null;
      },
      async readStepMetrics({ select }: { select: string }) {
        calls.push({ name: "readStepMetrics", select });
        return source.stepMetrics ?? [];
      },
      async readStepMessages({ select }: { select: string }) {
        calls.push({ name: "readStepMessages", select });
        return source.stepMessages ?? [];
      },
    },
  };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    runId: RUN_ID,
    expectedEvalCaseId: "case-live-read",
    policy: "release_proof",
    auth: { kind: "user", userId: "user-1" },
    generatedAt: "2026-05-31T08:02:00.000Z",
    ...overrides,
  } as Parameters<typeof buildLiveReadEvidenceFromServerRead>[0];
}

describe("buildLiveReadEvidenceFromServerRead", () => {
  it("stops when user ownership is not verified", async () => {
    const { reader } = readerFor(
      rows({ run: { ...rows().run, user_id: "user-2" } }),
    );

    const evidence = await buildLiveReadEvidenceFromServerRead(
      baseInput(),
      reader,
    );

    expect(evidence.stop_conditions).toContain("ownership_not_verified");
  });

  it("stops when the run is missing", async () => {
    const { reader } = readerFor(rows({ run: null }));

    const evidence = await buildLiveReadEvidenceFromServerRead(
      baseInput(),
      reader,
    );

    expect(evidence.stop_conditions).toContain("run_not_found");
  });

  it("stops when the expected eval case does not match", async () => {
    const { reader } = readerFor();

    const evidence = await buildLiveReadEvidenceFromServerRead(
      baseInput({ expectedEvalCaseId: "case-other" }),
      reader,
    );

    expect(evidence.stop_conditions).toContain("eval_case_mismatch");
  });

  it("stops when release proof is requested for a non-terminal run", async () => {
    const { reader } = readerFor(
      rows({ run: { ...rows().run, run_status: "running", completed_at: null } }),
    );

    const evidence = await buildLiveReadEvidenceFromServerRead(
      baseInput(),
      reader,
    );

    expect(evidence.stop_conditions).toContain(
      "non_terminal_run_for_release_proof",
    );
  });

  it("stops when a completed run is missing its report row", async () => {
    const { reader } = readerFor(rows({ report: null }));

    const evidence = await buildLiveReadEvidenceFromServerRead(
      baseInput(),
      reader,
    );

    expect(evidence.stop_conditions).toContain("report_row_missing");
  });

  it("uses only safe read selects and does not return raw prompt/provider fields", async () => {
    const { reader, calls } = readerFor();

    const evidence = await buildLiveReadEvidenceFromServerRead(
      baseInput(),
      reader,
    );
    const selected = calls.map((call) => call.select).join("\n");
    const payload = JSON.stringify(evidence);

    expect(selected).toContain(LIVE_READ_SAFE_SELECTS.stepMessages);
    expect(selected).not.toContain("raw_message");
    expect(selected).not.toContain("input_payload");
    expect(selected).not.toContain("raw_text");
    expect(selected).not.toContain("raw_prompt");
    expect(selected).not.toContain("system_prompt");
    expect(selected).not.toContain("user_prompt");
    expect(payload).not.toContain("raw_message");
    expect(payload).not.toContain("input_payload");
    expect(payload).not.toContain("SYSTEM_PROMPT");
  });

  it("maps controller blocked outputs into helper blocked fields", async () => {
    const { reader } = readerFor(
      rows({
        controllerDecision: {
          ...rows().controllerDecision,
          blocked_outputs: ["results_a", "calculation_steps_a"],
        },
      }),
    );

    const evidence = await buildLiveReadEvidenceFromServerRead(
      baseInput(),
      reader,
    );

    expect(evidence.report_evidence.blocked_fields).toEqual([
      "results_a",
      "calculation_steps_a",
    ]);
    expect(evidence.stop_conditions).not.toContain("blocked_fields_missing");
  });

  it("maps safe step metadata into helper trace rows", async () => {
    const { reader } = readerFor();

    const evidence = await buildLiveReadEvidenceFromServerRead(
      baseInput(),
      reader,
    );

    expect(evidence.trace_summary.steps[0]).toMatchObject({
      step_id: "metric-1",
      step_name: "rapportor",
      status: "completed",
      model: "claude-sonnet-4-5",
      prompt_version: "agent_e_v0.3",
      stop_reason: "end_turn",
      retryable: false,
      redaction_ok: true,
      provider_message_id: null,
    });
  });
});

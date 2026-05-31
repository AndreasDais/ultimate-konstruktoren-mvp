import { describe, expect, it } from "vitest";
import { REPORT_MODEL_VERSION, type ReportModel } from "./report-model";
import { buildLiveReadEvidence, type BuildLiveReadEvidenceInput } from "./live-read-evidence";

const RUN_ID = "7a71e6d0-b2a0-4c44-99c0-80c690263c0a";

function reportModel(overrides: Partial<ReportModel> = {}): ReportModel {
  return {
    meta: {
      schemaVersion: REPORT_MODEL_VERSION,
      documentId: "PILAR-LIVE-READ",
      runId: RUN_ID,
      createdAt: "2026-05-31T08:00:00.000Z",
      displayDate: "31 May 2026",
      status: "Preliminarily accepted",
      statusCode: "approved",
      version: "Reporter v0.3",
      locale: "nb",
      displayLanguage: "en",
      reportUrl: `https://pilar.example/rapport/${RUN_ID}`,
      audience: "engineer",
    },
    cover: {
      title: "Live read evidence",
      subtitle: "Canonical report evidence",
      shortSummary: "Preliminary calculation context.",
      qrLabel: "Scan for web version",
      qrDescription: "Opens the report.",
      qrUrl: `https://pilar.example/rapport/${RUN_ID}`,
    },
    keyResults: [
      {
        label: "MEd",
        value: "25.0",
        unit: "kNm",
        raw: "25.0 kNm",
        category: "dimensjonerande",
      },
    ],
    summary: {
      text: "Engineer A and Engineer B agree on MEd = 25.0 kNm.",
      request: "Check a simply supported beam.",
    },
    interpretation: {
      status: "Ready",
      statusCode: "klar",
      assumptions: ["qEd is treated as design load."],
    },
    calculation: {
      resultRows: [
        {
          label: "MEd",
          value: "25.0",
          unit: "kNm",
          raw: "25.0 kNm",
          category: "dimensjonerande",
        },
      ],
      steps: [
        {
          id: "step-1",
          number: 1,
          title: "Moment calculation",
          prose: "MEd = qEd L^2 / 8.",
          formulas: ["M_{Ed}=q_{Ed}L^2/8"],
          isControlStep: false,
        },
      ],
    },
    assessment: {
      professionalAssessment:
        "Preliminary AI-pipeline assessment for professional review.",
      limitations: [],
      warnings: [],
    },
    control: {
      decision: "Preliminarily accepted",
      decisionCode: "approved",
      controllerText: "Requires professional review before use.",
      comparisonStatus: "match",
      comparisonText: "The two engineer outputs agree.",
      comparisonRows: [],
      pipelineStatus: [],
    },
    trust: {
      score: 82,
      label: "High",
      tone: "high",
      breakdown: null,
    },
    conclusion: "Requires professional review before use.",
    disclaimer:
      "AI-generated engineering note. It does not replace review by a qualified professional. All calculations must be verified before use.",
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<BuildLiveReadEvidenceInput> = {},
): BuildLiveReadEvidenceInput {
  return {
    requestedRunId: RUN_ID,
    ownershipVerified: true,
    run: {
      run_id: RUN_ID,
      run_status: "completed",
      started_at: "2026-05-31T08:00:00.000Z",
      completed_at: "2026-05-31T08:01:00.000Z",
      created_at: "2026-05-31T08:00:00.000Z",
      display_language: "en",
      eval_case_id: "case-live-read",
      standard_context: "eurocode-norway",
      target_agents: ["agent-c", "agent-d", "agent-e"],
      manual_review_required: true,
    },
    reportModel: reportModel(),
    traceRows: [
      {
        step_id: "trace-1",
        step_name: "rapportor",
        status: "completed",
        started_at: "2026-05-31T08:00:30.000Z",
        completed_at: "2026-05-31T08:00:45.000Z",
        created_at: "2026-05-31T08:00:45.000Z",
        model: "claude-sonnet-4-5",
        prompt_version: "agent_e_v0.3",
        stop_reason: "end_turn",
        error_category: "none",
        provider_message_id: "msg_safe_123",
        retryable: false,
        raw_error_redacted: true,
        redaction_ok: true,
      },
    ],
    blockedFields: [],
    blockedOutputIndicated: false,
    fullWriterCoverage: true,
    generatedAt: "2026-05-31T08:02:00.000Z",
    ...overrides,
  };
}

describe("buildLiveReadEvidence", () => {
  it("returns ready live_read evidence for a completed run with report and safe trace", () => {
    const evidence = buildLiveReadEvidence(baseInput());

    expect(evidence.evidence_source).toBe("live_read");
    expect(evidence.live_read_enabled).toBe(true);
    expect(evidence.professional_approval).toBe(false);
    expect(evidence.release_proof_status).toBe("READY");
    expect(evidence.stop_conditions).toEqual([]);
    expect(evidence.run_summary.run_id).toBe(RUN_ID);
    expect(evidence.report_evidence.has_report).toBe(true);
    expect(evidence.report_evidence.report_text).toContain("MEd");
    expect(evidence.report_evidence.disclaimer_present).toBe(true);
    expect(evidence.trace_summary.terminal_step_count).toBe(1);
    expect(evidence.trace_summary.steps[0]?.raw_error_redacted).toBe(true);
  });

  it("stops when ownership is not verified", () => {
    const evidence = buildLiveReadEvidence(
      baseInput({ ownershipVerified: false }),
    );

    expect(evidence.stop_conditions).toContain("ownership_not_verified");
    expect(evidence.release_proof_status).toBe("FAIL");
  });

  it("preserves adapter stop conditions in the public contract", () => {
    const evidence = buildLiveReadEvidence(
      baseInput({
        adapterStopConditions: [
          "run_not_found",
          "eval_case_mismatch",
          "non_terminal_run_for_release_proof",
          "report_row_missing",
        ],
      }),
    );

    expect(evidence.stop_conditions).toEqual(
      expect.arrayContaining([
        "run_not_found",
        "eval_case_mismatch",
        "non_terminal_run_for_release_proof",
        "report_row_missing",
      ]),
    );
    expect(evidence.release_proof_status).toBe("FAIL");
  });

  it("stops when a claimed report has empty report text", () => {
    const emptyReport = reportModel({
      keyResults: [],
      summary: { text: "", request: "" },
      calculation: { resultRows: [], steps: [] },
      assessment: { professionalAssessment: "", limitations: [], warnings: [] },
      control: {
        decision: "",
        decisionCode: "",
        controllerText: "",
        comparisonStatus: "",
        comparisonText: "",
        comparisonRows: [],
        pipelineStatus: [],
      },
      conclusion: "",
      disclaimer: "",
    });

    const evidence = buildLiveReadEvidence(
      baseInput({ reportModel: emptyReport }),
    );

    expect(evidence.report_evidence.has_report).toBe(true);
    expect(evidence.report_evidence.report_text).toBe("");
    expect(evidence.stop_conditions).toContain("report_claimed_but_empty");
  });

  it("stops when blocked output is indicated but blocked fields are absent", () => {
    const evidence = buildLiveReadEvidence(
      baseInput({
        blockedOutputIndicated: true,
        blockedFields: null,
      }),
    );

    expect(evidence.stop_conditions).toContain("blocked_fields_missing");
  });

  it("stops when a completed run has no terminal trace", () => {
    const evidence = buildLiveReadEvidence(baseInput({ traceRows: [] }));

    expect(evidence.stop_conditions).toContain(
      "completed_run_missing_terminal_trace",
    );
  });

  it("stops when a failed or blocked step lacks bounded error category", () => {
    const evidence = buildLiveReadEvidence(
      baseInput({
        run: { ...baseInput().run!, run_status: "failed" },
        traceRows: [
          {
            step_id: "trace-fail",
            step_name: "kontrollor",
            status: "failed",
            completed_at: "2026-05-31T08:00:45.000Z",
            model: "claude-sonnet-4-5",
            prompt_version: "agent_d_v0.3",
          },
        ],
      }),
    );

    expect(evidence.stop_conditions).toContain(
      "failed_step_missing_error_category",
    );
  });

  it("stops when terminal trace metadata is not release-readiness complete", () => {
    const evidence = buildLiveReadEvidence(
      baseInput({
        traceRows: [
          {
            step_id: "trace-incomplete",
            step_name: "rapportor",
            status: "completed",
            completed_at: "2026-05-31T08:00:45.000Z",
            model: "claude-sonnet-4-5",
            prompt_version: "agent_e_v0.3",
            error_category: "none",
            retryable: false,
          },
        ],
      }),
    );

    expect(evidence.stop_conditions).toContain(
      "release_proof_trace_metadata_incomplete",
    );
    expect(evidence.release_proof_status).toBe("FAIL");
    expect(evidence.trace_summary.steps[0]?.raw_error_redacted).toBeNull();
  });

  it("stops release-proof readiness when full writer coverage is not verified", () => {
    const evidence = buildLiveReadEvidence(
      baseInput({
        fullWriterCoverage: false,
        run: {
          ...baseInput().run!,
          target_agents: ["samanliknar", "kontrollor"],
        },
        traceRows: [
          {
            step_id: "trace-c",
            step_name: "samanliknar",
            status: "completed",
            completed_at: "2026-05-31T08:00:45.000Z",
            model: "claude-sonnet-4-5",
            prompt_version: "agent_c_v0.3",
            error_category: "none",
            retryable: false,
            raw_error_redacted: true,
          },
          {
            step_id: "trace-d",
            step_name: "kontrollor",
            status: "completed",
            completed_at: "2026-05-31T08:00:55.000Z",
            model: "claude-sonnet-4-5",
            prompt_version: "agent_d_v0.3",
            error_category: "none",
            retryable: false,
            raw_error_redacted: true,
          },
        ],
      }),
    );

    expect(evidence.stop_conditions).toContain(
      "release_proof_writer_coverage_incomplete",
    );
    expect(evidence.release_proof_status).toBe("FAIL");
  });

  it("stops when trace rows contain raw prompt or provider payload fields", () => {
    const evidence = buildLiveReadEvidence(
      baseInput({
        run: { ...baseInput().run!, run_status: "failed" },
        traceRows: [
          {
            step_id: "trace-unsafe",
            step_name: "rapportor",
            status: "failed",
            completed_at: "2026-05-31T08:00:45.000Z",
            model: "claude-sonnet-4-5",
            prompt_version: "agent_e_v0.3",
            error_category: "model_output",
            raw_message: { content: [{ text: "raw provider envelope" }] },
            prompt: "SYSTEM_PROMPT: hidden prompt text",
          },
        ],
      }),
    );

    expect(evidence.stop_conditions).toContain("unsafe_trace_payload");
    expect(evidence.trace_summary.steps[0]?.redaction_ok).toBe(false);
  });

  it("always reports professional_approval as false", () => {
    expect(buildLiveReadEvidence(baseInput()).professional_approval).toBe(false);
  });

  it("does not return raw prompt, raw_message, or provider envelope fields", () => {
    const evidence = buildLiveReadEvidence(
      baseInput({
        traceRows: [
          {
            step_id: "trace-unsafe",
            step_name: "rapportor",
            status: "completed",
            completed_at: "2026-05-31T08:00:45.000Z",
            model: "claude-sonnet-4-5",
            prompt_version: "agent_e_v0.3",
            raw_message: { id: "msg_unsafe", content: [{ text: "secret" }] },
            provider_payload: { stack: "provider stack" },
            prompt: "raw prompt",
          },
        ],
      }),
    );
    const payload = JSON.stringify(evidence);

    expect(payload).not.toContain("raw_message");
    expect(payload).not.toContain("rawMessage");
    expect(payload).not.toContain("provider_payload");
    expect(payload).not.toContain("raw prompt");
    expect(payload).not.toContain("provider stack");
  });
});

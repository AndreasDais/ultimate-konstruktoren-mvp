import { describe, expect, it } from "vitest";
import { buildReportModel, type UpstreamReportData } from "./build-report-model";
import { validateReportModel } from "./validate-report-model";

const sample: UpstreamReportData = {
  report: {
    id: "54461fb9-68f2-40f1-8749-57e84dd115cf",
    document_id: "PILAR-54461FB9",
    executive_summary: "Beregningen gjelder en fritt opplagt bjelke. M_Ed = 25,0 kNm og V_Ed = 20,0 kN.",
    technical_assessment: "Resultatene er konsistente for enkel bjelkestatikk.",
    conclusion: "Resultatet må kontrolleres av fagperson før bruk.",
    prompt_version: "agent_e_v0.3",
    created_at: "2026-05-22T12:00:00.000Z",
    tillit_score: 100,
    tillit_breakdown: null,
  },
  run: { request: { raw_text: "Fritt opplagd stålbjelke, L = 5,0 m, q = 8,0 kN/m" } },
  inputReview: { input_status: "klar", prompt_version: "input_agent_v0.1" },
  agentA: {
    agent_name: "agent_a",
    prompt_version: "agent_a_v0.1",
    structured_output: {
      confidence: "high",
      assumptions: ["q = 8,0 kN/m er tolket som dimensjonerende last"],
      results: { M_Ed: "25,0 kNm", V_Ed: "20,0 kN", L: "5,0 m" },
      calculation_steps: [
        { title: "Beregning av moment", text: "M_Ed = qEd · L² / 8 = 25,0 kNm", latex_formula: "M_{Ed}=q_{Ed}L^2/8" },
        { title: "Kontroll via likevekt", text: "R = qEd·L/2 = 20,0 kN", latex_formula: null },
      ],
      limitations: ["Kapasitetskontroll er ikke utført"],
      warnings: ["q må bekreftes som dimensjonerende last"],
    },
  },
  agentB: {
    agent_name: "agent_b",
    prompt_version: "agent_b_v0.1",
    structured_output: {
      confidence: "high",
      results: { M_Ed: "25,0 kNm", V_Ed: "20,0 kN", L: "5,0 m" },
    },
  },
  comparison: { match_status: "match", comparison_data: {} },
  controllerDecision: {
    decision_status: "approved",
    risk_level: "low",
    reason: "OK",
    user_message: "Beregningen er godkjent for visning.",
    blocked_outputs: [],
  },
};

describe("buildReportModel", () => {
  it("byggjer ein validert rapportmodell frå agent-e respons", () => {
    const model = buildReportModel(sample, {
      locale: "nb",
      reportUrl: "https://pilar.example/rapport/54461fb9-68f2-40f1-8749-57e84dd115cf",
    });

    expect(model.meta.documentId).toBe("PILAR-54461FB9");
    expect(model.meta.schemaVersion).toBe("report_model_v0.1");
    expect(model.keyResults.map((row) => row.label)).toContain("M_Ed");
    expect(model.calculation.steps[1].isControlStep).toBe(true);
    expect(model.cover.qrUrl).toContain("https://pilar.example/rapport/");

    const validation = validateReportModel(model);
    expect(validation.ok).toBe(true);
  });
});

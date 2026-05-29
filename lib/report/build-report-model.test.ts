import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildReportModel, buildComparisonRowsFromResults, type UpstreamReportData } from "./build-report-model";
import { validateReportModel } from "./validate-report-model";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const LIVE_EVAL_INPUT_PROMPT_VERSION_GAP = {
  readSurface: "app/api/runs/[id]/route.ts",
  canonicalConsumer: "lib/report/build-report-model.ts",
  missingRuntimeField: "inputReview.prompt_version",
  reason: "live eval read mode needs the input-agent prompt version alongside downstream agent prompt versions",
} as const;

const REPORT_MODEL_BLOCKED_FIELD_AUDIT_FINDING = {
  reportField: "calculation.resultRows",
  sourceField: "agentA.structured_output.results",
  blockedOutput: "results_a",
  invariant: "blocked controller evidence must not render as ordinary report results",
} as const;

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
  inputReview: {
    input_status: "klar",
    prompt_version: "input_agent_v0.1",
    parsed_data: {
      report_title: "Fritt opplagd stålbjelke — moment og skjær",
      report_subtitle: "L = 5,0 m · qEd = 8,0 kN/m",
      calculation_type: "bjelke_lastverknad",
    },
  },
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
    expect(model.cover.title).toBe("Fritt opplagd stålbjelke - moment og skjær");
    expect(model.cover.subtitle).toContain("L = 5,0 m");
    expect(model.keyResults.map((row) => row.label)).toContain("MEd");
    expect(model.summary.text).toContain("MEd");
    expect(model.summary.text).not.toContain("_");
    expect(model.calculation.steps[0].prose).not.toContain("_");
    expect(model.calculation.steps[1].isControlStep).toBe(true);
    expect(model.cover.qrUrl).toContain("https://pilar.example/rapport/");

    const validation = validateReportModel(model);
    expect(validation.ok).toBe(true);
  });

  it("identifies inputReview prompt_version as missing mapped runtime evidence", () => {
    const runRead = readSource("app/api/runs/[id]/route.ts");
    const reportModel = readSource("lib/report/build-report-model.ts");
    const tolkingMapping = runRead.slice(
      runRead.indexOf("const tolking = inputReview"),
      runRead.indexOf("// agent_outputs", runRead.indexOf("const tolking = inputReview")),
    );
    const agentOutputQuery = runRead.slice(
      runRead.indexOf('.from("agent_outputs")'),
      runRead.indexOf('.eq("run_id", id)', runRead.indexOf('.from("agent_outputs")')),
    );

    expect(LIVE_EVAL_INPUT_PROMPT_VERSION_GAP).toEqual({
      readSurface: "app/api/runs/[id]/route.ts",
      canonicalConsumer: "lib/report/build-report-model.ts",
      missingRuntimeField: "inputReview.prompt_version",
      reason: "live eval read mode needs the input-agent prompt version alongside downstream agent prompt versions",
    });

    expect(reportModel).toContain("inputReview: {");
    expect(reportModel).toContain("prompt_version: string;");
    expect(agentOutputQuery).toContain("prompt_version");
    expect(tolkingMapping).toContain("inputReview.input_status");
    expect(tolkingMapping).not.toContain("prompt_version");
  });

  it("omits results_a from ReportModel result rows when controller blocks it", () => {
    const blockedResultsData: UpstreamReportData = {
      ...sample,
      agentA: {
        ...sample.agentA,
        structured_output: {
          ...sample.agentA.structured_output,
          results: { M_Ed: "99 kNm" },
        },
      },
      controllerDecision: {
        ...sample.controllerDecision!,
        decision_status: "uncertain",
        user_message: "Resultata fra Konstruktør A er blokkerte.",
        blocked_outputs: ["results_a"],
      },
    };

    const model = buildReportModel(blockedResultsData, {
      locale: "nb",
      reportUrl: "https://pilar.example/rapport/54461fb9-68f2-40f1-8749-57e84dd115cf",
    });

    expect(REPORT_MODEL_BLOCKED_FIELD_AUDIT_FINDING).toEqual({
      reportField: "calculation.resultRows",
      sourceField: "agentA.structured_output.results",
      blockedOutput: "results_a",
      invariant: "blocked controller evidence must not render as ordinary report results",
    });
    expect(model.control.decisionCode).toBe("uncertain");
    expect(model.control.controllerText).toContain("blokkerte");
    expect(blockedResultsData.controllerDecision?.blocked_outputs).toContain("results_a");
    expect(model.calculation.resultRows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "MEd", value: "99", unit: "kNm" }),
      ]),
    );
    expect(model.keyResults).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "MEd", value: "99", unit: "kNm" }),
      ]),
    );
  });
});

describe("buildComparisonRowsFromResults", () => {
  it("parar greek-symbol mot ASCII-namn (σ_Rd vs sigma_Rd) — ikkje to «-»-rader", () => {
    const rows = buildComparisonRowsFromResults(
      { "σ_Rd": "355 MPa" },
      { sigma_Rd: "355 N/mm²" },
      "nb",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].constructorA).not.toBe("-");
    expect(rows[0].constructorB).not.toBe("-");
    expect(rows[0].match).toBe(true);
  });

  it("match er eining-aware (623 cm³ == 623000 mm³)", () => {
    const rows = buildComparisonRowsFromResults(
      { W_pl: "623 cm³" },
      { W_pl: "623000 mm³" },
      "nb",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].match).toBe(true);
  });

  it("engelsk desimal blir ikkje mis-parsa (2.880 == 2.88 kip/ft)", () => {
    const rows = buildComparisonRowsFromResults(
      { w: "2.880 kip/ft" },
      { w: "2.88 kip/ft" },
      "en",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].match).toBe(true);
  });

  it("ekte avvik gir match=false (20 vs 25 kNm)", () => {
    const rows = buildComparisonRowsFromResults(
      { M_Ed: "20 kNm" },
      { M_Ed: "25 kNm" },
      "nb",
    );
    expect(rows[0].match).toBe(false);
  });

  it("kappar ikkje rader under ~40 — count må vere ærleg for «+N til»-indikatoren", () => {
    const a: Record<string, string> = {};
    const b: Record<string, string> = {};
    for (let i = 0; i < 15; i++) {
      a[`k_${i}`] = `${i} kN`;
      b[`k_${i}`] = `${i} kN`;
    }
    const rows = buildComparisonRowsFromResults(a, b, "nb");
    expect(rows).toHaveLength(15); // ikkje kappa til 12
  });

  it("nøkkel berre A rapporterte: B = «-», match=false, men raden er ikkje skjult", () => {
    const rows = buildComparisonRowsFromResults(
      { M_Ed: "25 kNm", g_k: "6 kN/m" },
      { M_Ed: "25 kNm" },
      "nb",
    );
    const gk = rows.find((r) => r.constructorB === "-");
    expect(gk).toBeTruthy();
    expect(gk?.constructorA).not.toBe("-");
    expect(gk?.match).toBe(false);
  });
});

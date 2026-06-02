import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildReportModel, buildComparisonRowsFromResults, type UpstreamReportData } from "./build-report-model";
import { validateReportModel } from "./validate-report-model";
import type { EngineeringContext } from "@/lib/engineering-context/types";

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

const englishAiscSample: UpstreamReportData = {
  ...sample,
  run: {
    display_language: "en",
    request: {
      raw_text:
        "AISC/ASCE diagnostic check for a simply supported W12x26 steel beam, L = 20 ft, D = 0.45 kip/ft, Lr = 0.80 kip/ft.",
    },
  },
  inputReview: {
    input_status: "klar",
    prompt_version: "input_agent_v0.1",
    parsed_data: {
      report_title: "Kapasitetskontroll av st\u00e5lbjelke W12x26",
      calculation_type: "stalkapasitet",
    },
  },
  report: {
    ...sample.report,
    executive_summary:
      "Konstrukt\u00f8r A og Konstrukt\u00f8r B er einige. w_u = 1,820 kip/ft og M_u = 91,0 kip\u22c5ft.",
    technical_assessment:
      "Samanliknar fann ingen kritiske avvik, men Cb er ikkje berekna.",
    conclusion:
      "Rapport\u00f8r minner om at dette er f\u00f8rebels og m\u00e5 kontrollerast av fagperson.",
  },
  agentA: {
    agent_name: "agent_a",
    prompt_version: "agent_a_v0.1",
    structured_output: {
      confidence: "medium",
      assumptions: ["D og Lr er henta fr\u00e5 verifisert input."],
      results: {
        wu: "1,820 kip/ft",
        Mu: "91,0 kip\u22c5ft",
        Vu: "18,2 kip",
      },
      calculation_steps: [
        {
          title: "Berekning av last og moment",
          text:
            "w_u = 1,2D + 1,6L = 1,820 kip/ft\n" +
            "M_u = 1,820 * 20^2 / 8 = 91,0 kip\u22c5ft",
          latex_formula: [
            "w_u = 1,2D+1,6L = 1,820 kip/ft",
            "w_u = 0,5400+1,2800 = 1,820 kip/ft",
            "M_u = 91,0 kip\u22c5ft",
          ],
        },
      ],
      limitations: ["Kapasitetskontroll er ikke utf\u00f8rt"],
      warnings: ["q m\u00e5 bekreftes som dimensjonerende last"],
    },
  },
  agentB: {
    agent_name: "agent_b",
    prompt_version: "agent_b_v0.1",
    structured_output: {
      confidence: "medium",
      results: {
        wu: "1,820 kip/ft",
        Mu: "91,0 kip\u00b7ft",
        Vu: "18,2 kip",
      },
    },
  },
  comparison: { match_status: "match", comparison_data: {} },
  controllerDecision: {
    decision_status: "approved_with_warnings",
    risk_level: "medium",
    reason: "aisc_diagnostic_only",
    user_message:
      "Kontroll\u00f8r har f\u00f8rebels godkjent visning, men Cb og kapasitet er ikkje berekna.",
    blocked_outputs: [],
  },
};

const eurocodeNorwayContext: EngineeringContext = {
  language: "nb",
  languagePolicy: {
    uiLocale: "nb",
    outputMode: "same_as_prompt",
    fallbackLanguage: "nb",
  },
  region: {
    countryCode: "NO",
    countryName: "Norway",
  },
  standards: {
    family: "eurocode_norway",
    label: "Eurocode Norway",
    supportLevel: "supported",
    confidence: "user_selected",
  },
  outputPreferences: {
    units: "metric",
    notationStyle: "eurocode",
  },
  safety: {
    professionalVerificationRequired: true,
    allowUnsupportedStandardClaims: false,
  },
};

const ec3CapacitySample: UpstreamReportData = {
  ...sample,
  run: {
    request: {
      raw_text:
        "Kapasitetskontroll EC3 for IPE 300 i S355, qEd = 18 kN/m og L = 6 m.",
    },
  },
  inputReview: {
    input_status: "klar",
    prompt_version: "input_agent_v0.1",
    parsed_data: {
      report_title: "Kapasitetskontroll av stalbjelke IPE 300",
      calculation_type: "stalkapasitet",
      profileName: "IPE 300",
      steel_grade: "S355",
      qEdKnPerM: 18,
      spanM: 6,
    },
  },
  agentA: {
    ...sample.agentA,
    structured_output: {
      ...sample.agentA.structured_output,
      results: { M_Ed: "81,0 kNm", V_Ed: "54,0 kN" },
      calculation_steps: [
        {
          title: "Beregning av moment og skjer",
          text: "M_Ed = qEd * L^2 / 8 = 81,0 kNm. V_Ed = qEd * L / 2 = 54,0 kN.",
          latex_formula: ["M_Ed = qEd * L^2 / 8", "V_Ed = qEd * L / 2"],
        },
      ],
      limitations: ["LTB er ikkje kontrollert"],
      warnings: ["Resultatet er forelopig og ma kontrolleres av fagperson"],
    },
  },
  agentB: {
    ...sample.agentB,
    structured_output: {
      ...sample.agentB.structured_output,
      results: { M_Ed: "81,0 kNm", V_Ed: "54,0 kN" },
    },
  },
  controllerDecision: {
    ...sample.controllerDecision!,
    decision_status: "approved_with_warnings",
    user_message:
      "Kontrollor har tillatt forelopig visning. Fagperson ma kontrollere resultatet.",
    blocked_outputs: [],
  },
};

function rowRawValues(model: ReturnType<typeof buildReportModel>): Record<string, string> {
  return Object.fromEntries(
    model.calculation.resultRows.map((row) => [row.label, row.raw]),
  );
}

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

  it("formats US customary English result rows and step math with dot decimals", () => {
    const model = buildReportModel(englishAiscSample, {
      locale: "nb",
      reportUrl: "https://pilar.example/report/aisc-diagnostic",
    });

    const visibleText = [
      model.summary.text,
      model.calculation.resultRows.map((row) => row.raw).join("\n"),
      model.control.comparisonRows.map((row) => `${row.constructorA}\n${row.constructorB}`).join("\n"),
      model.calculation.steps.map((step) => `${step.title}\n${step.prose}`).join("\n"),
      model.calculation.steps.flatMap((step) => step.formulas).join("\n"),
      model.assessment.limitations.join("\n"),
      model.assessment.warnings.join("\n"),
      model.conclusion,
    ].join("\n");

    expect(model.meta.displayLanguage).toBe("en");
    expect(model.cover.title).toBe("Steel beam - demand and LTB screening");
    expect(model.meta.status).toBe("Provisionally accepted with warnings");
    expect(visibleText).toContain("1.820 kip/ft");
    expect(visibleText).toContain("1.2D+1.6L");
    expect(visibleText).toContain("0.5400+1.2800");
    expect(visibleText).toContain("91.0 kip-ft");
    expect(visibleText).not.toMatch(/1,820|91,0|kip[·⋅]ft/);
  });

  it("keeps Norwegian calculation step formulas unchanged", () => {
    const model = buildReportModel(
      {
        ...sample,
        agentA: {
          ...sample.agentA,
          structured_output: {
            ...sample.agentA.structured_output,
            calculation_steps: [
              {
                title: "Beregning av last",
                text: "q = 1,2G + 1,5Q = 12,0 kN/m",
                latex_formula: ["q = 1,2G+1,5Q = 12,0 kN/m"],
              },
            ],
          },
        },
      },
      {
        locale: "nb",
        reportUrl: "https://pilar.example/rapport/nb-formula",
      },
    );

    expect(model.calculation.steps[0].formulas).toEqual([
      "q = 1,2G+1,5Q = 12,0 kN/m",
    ]);
  });

  it("keeps warnings, not-calculated items, and step text English in en reports", () => {
    const model = buildReportModel(englishAiscSample, {
      locale: "nn",
      reportUrl: "https://pilar.example/report/aisc-diagnostic",
    });

    const visibleText = [
      model.summary.text,
      model.assessment.professionalAssessment,
      model.assessment.limitations.join("\n"),
      model.assessment.warnings.join("\n"),
      model.calculation.steps.map((step) => `${step.title}\n${step.prose}`).join("\n"),
      model.control.controllerText,
      model.conclusion,
    ].join("\n");

    expect(visibleText).toContain("Capacity check is not performed");
    expect(visibleText).toContain("q must be confirmed as the governing load");
    expect(visibleText).toContain("Calculation");
    expect(visibleText).toContain("Controller");
    expect(visibleText).toContain("qualified professional");
    expect(visibleText).not.toMatch(
      /Kapasitetskontroll|Konstrukt\u00f8r|Samanliknar|Kontroll\u00f8r|Rapport\u00f8r|f\u00f8rebels|ikkje|ikke|m\u00e5/i,
    );
  });

  it("does not title Norwegian demand-only steel reports as capacity checks", () => {
    const model = buildReportModel(
      {
        ...sample,
        run: {
          request: {
            raw_text:
              "Fritt opplagd st\u00e5lbjelke IPE 240, L = 5,0 m, q = 8,0 kN/m. Finn moment og skj\u00e6r.",
          },
        },
        inputReview: {
          ...sample.inputReview!,
          parsed_data: {
            report_title: "Kapasitetskontroll av st\u00e5lbjelke IPE 240",
            calculation_type: "stalkapasitet",
          },
        },
        agentA: {
          ...sample.agentA,
          structured_output: {
            ...sample.agentA.structured_output,
            results: { M_Ed: "25,0 kNm", V_Ed: "20,0 kN" },
          },
        },
      },
      {
        locale: "nb",
        reportUrl: "https://pilar.example/rapport/demand-only",
      },
    );

    expect(model.cover.title).toBe("Fritt opplagd st\u00e5lbjelke - moment og skj\u00e6r");
    expect(model.cover.title).not.toContain("Kapasitetskontroll");
  });

  it("adds deterministic EC3 preliminary capacity rows when guarded extraction is computable", () => {
    const model = buildReportModel(ec3CapacitySample, {
      locale: "nb",
      reportUrl: "https://pilar.example/rapport/ec3-capacity",
      engineeringContext: eurocodeNorwayContext,
    });
    const rows = rowRawValues(model);
    const visibleStepText = model.calculation.steps
      .map((step) => `${step.title}\n${step.prose}\n${step.formulas.join("\n")}`)
      .join("\n");

    expect(rows.MEd).toBe("81,0 kNm");
    expect(rows.VEd).toBe("54,0 kN");
    expect(rows["Mpl,Rd"]).toBe("212,5 kNm");
    expect(rows["Vpl,Rd"]).toBe("501,3 kN");
    expect(rows["ηM"]).toBe("0,381");
    expect(rows["ηV"]).toBe("0,108");
    expect(model.calculation.resultRows.map((row) => row.label)).not.toContain("Mb,Rd");
    expect(model.calculation.resultRows.map((row) => row.label)).not.toContain("DCR");
    expect(visibleStepText).toContain("EC3-tverrsnittsscreening");
    expect(visibleStepText).toContain("fagperson");
    expect(visibleStepText).toContain("LTB-kapasitet");
    expect(visibleStepText).not.toMatch(/\bAISC\b|\bMb,Rd\b|\bDCR\b|\bgodkjent\b/i);
  });

  it("does not add EC3 capacity rows when profile, grade, qEd, or span guards fail", () => {
    const guardedCases: UpstreamReportData[] = [
      {
        ...ec3CapacitySample,
        run: { request: { raw_text: "S355, qEd = 18 kN/m, L = 6 m." } },
        inputReview: {
          ...ec3CapacitySample.inputReview!,
          parsed_data: { steel_grade: "S355", qEdKnPerM: 18, spanM: 6 },
        },
      },
      {
        ...ec3CapacitySample,
        run: { request: { raw_text: "IPE 300, S500, qEd = 18 kN/m, L = 6 m." } },
        inputReview: {
          ...ec3CapacitySample.inputReview!,
          parsed_data: { profileName: "IPE 300", steel_grade: "S500", qEdKnPerM: 18, spanM: 6 },
        },
      },
      {
        ...ec3CapacitySample,
        run: { request: { raw_text: "IPE 300, S355, q = 18 kN/m, L = 6 m." } },
        inputReview: {
          ...ec3CapacitySample.inputReview!,
          parsed_data: { profileName: "IPE 300", steel_grade: "S355", spanM: 6 },
        },
      },
      {
        ...ec3CapacitySample,
        run: { request: { raw_text: "IPE 300, S355, qEd = 18 kN/m." } },
        inputReview: {
          ...ec3CapacitySample.inputReview!,
          parsed_data: { profileName: "IPE 300", steel_grade: "S355", qEdKnPerM: 18 },
        },
      },
    ];

    for (const data of guardedCases) {
      const model = buildReportModel(data, {
        locale: "nb",
        reportUrl: "https://pilar.example/rapport/ec3-guarded",
        engineeringContext: eurocodeNorwayContext,
      });
      const labels = model.calculation.resultRows.map((row) => row.label);

      expect(labels).not.toEqual(expect.arrayContaining(["Mpl,Rd", "Vpl,Rd", "ηM", "ηV"]));
    }
  });

  it("keeps AISC steel reports demand-only without EC3 capacity rows", () => {
    const model = buildReportModel(englishAiscSample, {
      locale: "nb",
      reportUrl: "https://pilar.example/report/aisc-diagnostic",
    });
    const labels = model.calculation.resultRows.map((row) => row.label);

    expect(model.cover.title).toBe("Steel beam - demand and LTB screening");
    expect(labels).toEqual(expect.arrayContaining(["wu", "Mu", "Vu"]));
    expect(labels).not.toEqual(expect.arrayContaining(["Mpl,Rd", "Vpl,Rd", "ηM", "ηV", "DCR"]));
  });

  it("does not add deterministic EC3 capacity rows when controller blocks result outputs", () => {
    const model = buildReportModel(
      {
        ...ec3CapacitySample,
        controllerDecision: {
          ...ec3CapacitySample.controllerDecision!,
          decision_status: "uncertain",
          blocked_outputs: ["results_a"],
        },
      },
      {
        locale: "nb",
        reportUrl: "https://pilar.example/rapport/ec3-blocked-results",
        engineeringContext: eurocodeNorwayContext,
      },
    );

    expect(model.calculation.resultRows).toEqual([]);
    expect(model.keyResults).toEqual([]);
  });

  it("does not add deterministic EC3 capacity steps when controller blocks calculation steps", () => {
    const model = buildReportModel(
      {
        ...ec3CapacitySample,
        controllerDecision: {
          ...ec3CapacitySample.controllerDecision!,
          decision_status: "uncertain",
          blocked_outputs: ["calculation_steps_b"],
        },
      },
      {
        locale: "nb",
        reportUrl: "https://pilar.example/rapport/ec3-blocked-steps",
        engineeringContext: eurocodeNorwayContext,
      },
    );
    const stepText = model.calculation.steps
      .map((step) => `${step.title}\n${step.prose}`)
      .join("\n");

    expect(model.calculation.resultRows.map((row) => row.label)).toEqual(
      expect.arrayContaining(["Mpl,Rd", "Vpl,Rd", "ηM", "ηV"]),
    );
    expect(stepText).not.toContain("EC3-tverrsnittsscreening");
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

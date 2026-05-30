import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCalculationSheetModel } from "./calculation-sheet-model";
import { buildReportModel, type UpstreamReportData } from "./build-report-model";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("report model parity across report surfaces", () => {
  const blockedSample: UpstreamReportData = {
    report: {
      id: "7a71e6d0-b2a0-4c44-99c0-80c690263c0a",
      document_id: "PILAR-BLOCKED-EXPORT",
      executive_summary:
        "Controller withheld Engineer A results and calculation steps before report export.",
      technical_assessment:
        "Blocked values remain withheld from export-oriented report text.",
      conclusion:
        "Requires professional review before use.",
      prompt_version: "agent_e_v0.3",
      created_at: "2026-05-29T08:00:00.000Z",
      tillit_score: 42,
      tillit_breakdown: null,
    },
    run: {
      display_language: "en",
      request: { raw_text: "Check a simply supported beam." },
    },
    inputReview: {
      input_status: "klar",
      prompt_version: "input_agent_v0.1",
      parsed_data: {
        report_title: "Blocked export parity check",
        calculation_type: "bjelke_lastverknad",
      },
    },
    agentA: {
      agent_name: "agent_a",
      prompt_version: "agent_a_v0.1",
      structured_output: {
        confidence: "high",
        assumptions: ["qEd is treated as design load"],
        results: { M_Ed: "25.0 kNm", V_Ed: "20.0 kN" },
        calculation_steps: [
          {
            title: "Moment calculation",
            text: "M_Ed = qEd * L^2 / 8 = 25.0 kNm",
            latex_formula: "M_{Ed}=q_{Ed}L^2/8",
          },
        ],
      },
    },
    agentB: {
      agent_name: "agent_b",
      prompt_version: "agent_b_v0.1",
      structured_output: {
        confidence: "high",
        results: { M_Ed: "25.0 kNm", V_Ed: "20.0 kN" },
      },
    },
    comparison: { match_status: "match", comparison_data: {} },
    controllerDecision: {
      decision_status: "uncertain",
      risk_level: "medium",
      reason: "Blocked result fields require professional review.",
      user_message:
        "Controller withheld Engineer A results and calculation steps. Blocked values require professional review.",
      blocked_outputs: ["results_a", "results_b", "calculation_steps_a"],
    },
  };

  it("keeps the full web report anchored to buildReportModel", () => {
    const source = readSource("app/rapport/[run_id]/page.tsx");

    expect(source).toContain('import { buildReportModel } from "@/lib/report/build-report-model"');
    expect(source).toContain("const reportModel = buildReportModel(");
    expect(source).toContain("validateReportModel(reportModel)");
    expect(source).toContain("const reportTitle = reportModel.cover.title");
    expect(source).toContain("reportModel.summary.text");
    expect(source).toContain("reportModel.assessment.professionalAssessment");
    expect(source).toContain("reportModel.calculation.resultRows");
    expect(source).toContain("reportModel.conclusion");
  });

  it("keeps full Word export rendering the canonical ReportModel", () => {
    const source = readSource("app/api/rapport/[run_id]/word/route.ts");

    expect(source).toContain(
      'from "@/lib/report/build-report-model"',
    );
    expect(source).toContain("const model = buildReportModel(");
    expect(source).toContain("validateReportModel(model)");
    expect(source).toContain("renderReportModelDocx(model");
    expect(source).toContain("model.meta.documentId");
  });

  it("renders full web and Word prose from the same ReportModel text fields", () => {
    const fullWebReport = readSource("app/rapport/[run_id]/page.tsx");
    const wordRenderer = readSource("lib/report/render-docx.ts");
    const calculationPage = readSource("app/rapport/[run_id]/beregning/page.tsx");
    const calculationWord = readSource("app/api/rapport/[run_id]/calculation/word/route.ts");
    const calculationLatex = readSource("app/api/rapport/[run_id]/calculation/latex/route.ts");

    for (const field of [
      "summary.text",
      "assessment.professionalAssessment",
      "conclusion",
    ] as const) {
      expect(fullWebReport, `web report uses reportModel.${field}`).toContain(
        `reportModel.${field}`,
      );
      expect(wordRenderer, `Word renderer uses model.${field}`).toContain(
        `model.${field}`,
      );
    }

    for (const [name, source] of [
      ["calculation web", calculationPage],
      ["calculation Word", calculationWord],
      ["calculation LaTeX", calculationLatex],
    ] as const) {
      expect(source, `${name} builds canonical ReportModel`).toContain(
        "const reportModel = buildReportModel(",
      );
      expect(source, `${name} derives sheet from that ReportModel`).toContain(
        "buildCalculationSheetModel(reportModel)",
      );
    }
  });

  it("keeps the professional-review disclaimer in ReportModel before Word rendering", () => {
    const builder = readSource("lib/report/build-report-model.ts");
    const validator = readSource("lib/report/validate-report-model.ts");
    const renderer = readSource("lib/report/render-docx.ts");
    const wordRoute = readSource("app/api/rapport/[run_id]/word/route.ts");

    expect(builder).toContain("REPORT_DISCLAIMER");
    expect(builder).toContain("disclaimer: REPORT_DISCLAIMER[displayLanguage]");

    expect(validator).toContain("missing_professional_review_disclaimer");
    expect(validator).toContain("hasProfessionalReviewDisclaimer(model)");

    expect(wordRoute).toContain("const model = buildReportModel(");
    expect(wordRoute).toContain("const validation = validateReportModel(model)");
    expect(wordRoute).toContain("renderReportModelDocx(model, { validation })");

    expect(renderer).toContain("function disclaimerBox(model: ReportModel)");
    expect(renderer).toContain("model.disclaimer");
    expect(renderer).toContain("children.push(disclaimerBox(model))");
  });

  it("keeps professional-review language on generated report output paths", () => {
    const reportModel = readSource("lib/report/report-model.ts");
    const fullWebReport = readSource("app/rapport/[run_id]/page.tsx");
    const preliminaryStripe = readSource(
      "app/rapport/[run_id]/_components/ForebelStripe.tsx",
    );
    const calculationPage = readSource("app/rapport/[run_id]/beregning/page.tsx");
    const docxRenderer = readSource("lib/report/render-docx.ts");
    const calculationDocxRenderer = readSource(
      "lib/report/render-calculation-docx.ts",
    );
    const calculationLatexRenderer = readSource(
      "lib/report/render-calculation-latex.ts",
    );

    for (const [name, source] of [
      ["canonical report model", reportModel],
      ["full web report", fullWebReport],
      ["preliminary stripe", preliminaryStripe],
      ["calculation page", calculationPage],
      ["full Word renderer", docxRenderer],
      ["calculation Word renderer", calculationDocxRenderer],
      ["calculation LaTeX renderer", calculationLatexRenderer],
    ] as const) {
      expect(source, `${name} mentions professional review`).toMatch(
        /fagperson|qualified professional|professional review|responsible professional/i,
      );
      expect(source, `${name} requires review before use`).toMatch(
        /før bruk|before use|must be verified|må kontroller|must be checked/i,
      );
    }
  });

  it("keeps calculation web, Word, LaTeX and PDF surfaces behind ReportModel", () => {
    const page = readSource("app/rapport/[run_id]/beregning/page.tsx");
    const word = readSource("app/api/rapport/[run_id]/calculation/word/route.ts");
    const latex = readSource("app/api/rapport/[run_id]/calculation/latex/route.ts");
    const pdf = readSource("app/api/rapport/[run_id]/calculation/pdf/route.ts");

    for (const [name, source] of [
      ["calculation page", page],
      ["calculation Word export", word],
      ["calculation LaTeX export", latex],
    ] as const) {
      expect(source, `${name} builds ReportModel`).toContain(
        "buildReportModel(",
      );
      expect(source, `${name} validates ReportModel`).toContain(
        "validateReportModel(reportModel)",
      );
      expect(source, `${name} derives the sheet from ReportModel`).toContain(
        "buildCalculationSheetModel(reportModel)",
      );
    }

    expect(page).toContain("renderCalculationSheetLatex(calculationSheet)");
    expect(word).toContain("renderCalculationSheetDocx(sheet)");
    expect(latex).toContain("renderCalculationSheetLatex(sheet");
    expect(pdf).toContain('const url = `${origin}/rapport/${run_id}/beregning?print=1&locale=${locale}`;');
    expect(pdf).toContain('[data-calculation-sheet-ready="true"]');
  });

  it("keeps CalculationSheetModel derived only from canonical ReportModel", () => {
    const sheetBuilder = readSource("lib/report/calculation-sheet-model.ts");
    const calculationPage = readSource("app/rapport/[run_id]/beregning/page.tsx");
    const calculationWord = readSource("app/api/rapport/[run_id]/calculation/word/route.ts");
    const calculationLatex = readSource("app/api/rapport/[run_id]/calculation/latex/route.ts");
    const calculationPdf = readSource("app/api/rapport/[run_id]/calculation/pdf/route.ts");

    expect(sheetBuilder).toContain('import type { CalculationStep, ReportModel } from "./report-model";');
    expect(sheetBuilder).toContain("export function buildCalculationSheetModel(model: ReportModel): CalculationSheetModel");
    expect(sheetBuilder).not.toContain("UpstreamReportData");
    expect(sheetBuilder).not.toContain("structured_output");
    expect(sheetBuilder).not.toContain("agentA");
    expect(sheetBuilder).not.toContain("agentB");
    expect(sheetBuilder).not.toContain("controllerDecision");

    for (const [name, source] of [
      ["calculation web", calculationPage],
      ["calculation Word export", calculationWord],
      ["calculation LaTeX export", calculationLatex],
    ] as const) {
      expect(source, `${name} builds canonical ReportModel before the sheet`).toContain(
        "const reportModel = buildReportModel(",
      );
      expect(source, `${name} derives the sheet from canonical ReportModel`).toContain(
        "buildCalculationSheetModel(reportModel)",
      );
      expect(source, `${name} does not pass upstream data directly to sheet builder`).not.toContain(
        "buildCalculationSheetModel(data",
      );
      expect(source, `${name} does not pass upstream data directly to sheet builder`).not.toContain(
        "buildCalculationSheetModel(upstream",
      );
    }

    expect(calculationPdf).toContain("?print=1");
    expect(calculationPdf).toContain('[data-calculation-sheet-ready="true"]');
  });

  it("keeps blocked-field evidence from becoming ordinary export prose", () => {
    const pdfRoute = readSource("app/api/rapport/[run_id]/calculation/pdf/route.ts");
    const printPage = readSource("app/rapport/[run_id]/beregning/page.tsx");
    const reportModel = buildReportModel(blockedSample, {
      locale: "nb",
      reportUrl:
        "https://pilar.example/rapport/7a71e6d0-b2a0-4c44-99c0-80c690263c0a",
    });
    const sheet = buildCalculationSheetModel(reportModel);

    // Word renders ReportModel directly, while calculation Word/LaTeX/PDF
    // derive from CalculationSheetModel. Both export-oriented paths must
    // preserve the blocked/withheld signal without turning blocked values into
    // normal result prose.
    const fullReportExportText = [
      reportModel.keyResults.map((row) => `${row.label}: ${row.raw}`).join("\n"),
      reportModel.calculation.resultRows.map((row) => `${row.label}: ${row.raw}`).join("\n"),
      reportModel.summary.text,
      reportModel.assessment.professionalAssessment,
      reportModel.control.controllerText,
      reportModel.conclusion,
      reportModel.disclaimer,
    ].join("\n\n");
    const fullWordResultTableText = [
      reportModel.keyResults.map((row) => `${row.label}: ${row.raw}`).join("\n"),
      reportModel.calculation.resultRows.map((row) => `${row.label}: ${row.raw}`).join("\n"),
      reportModel.control.comparisonRows
        .map((row) => `${row.label}: ${row.constructorA} / ${row.constructorB}`)
        .join("\n"),
    ].join("\n\n");
    const calculationExportText = [
      sheet.given.map((row) => `${row.label}: ${row.value}`).join("\n"),
      sheet.steps.map((step) => `${step.title}\n${step.explanation}`).join("\n"),
      sheet.results.map((row) => `${row.label}: ${row.value}`).join("\n"),
      sheet.notes.join("\n"),
    ].join("\n\n");
    const pdfPrintText = [
      sheet.given.map((row) => `${row.label}: ${row.value}`).join("\n"),
      sheet.steps.map((step) => `${step.title}\n${step.explanation}`).join("\n"),
      sheet.results.map((row) => `${row.label}: ${row.value}`).join("\n"),
      sheet.notes.join("\n"),
    ].join("\n\n");

    expect(pdfRoute).toContain("?print=1");
    expect(pdfRoute).toContain('[data-calculation-sheet-ready="true"]');
    expect(printPage).toContain("const calculationSheet = buildCalculationSheetModel(reportModel)");
    expect(printPage).toContain('data-calculation-sheet-ready="true"');

    expect(fullReportExportText).toContain("withheld");
    expect(fullReportExportText).toContain("professional review");
    expect(fullReportExportText).not.toContain("approved for display");
    expect(reportModel.keyResults).toEqual([]);
    expect(reportModel.calculation.resultRows).toEqual([]);
    expect(reportModel.control.comparisonRows).toEqual([]);
    expect(fullWordResultTableText).not.toContain("25.0 kNm");
    expect(fullWordResultTableText).not.toContain("20.0 kN");
    expect(sheet.given).toEqual([]);
    expect(sheet.steps).toEqual([]);
    expect(sheet.results).toEqual([]);
    expect(calculationExportText).not.toContain("25.0 kNm");
    expect(calculationExportText).not.toContain("Moment calculation");
    expect(pdfPrintText).not.toContain("25.0 kNm");
    expect(pdfPrintText).not.toContain("20.0 kN");
    expect(pdfPrintText).not.toContain("Moment calculation");
    expect(pdfPrintText).not.toContain("approved for display");
  });
});

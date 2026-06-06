import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPublicPipelineReview,
  PIPELINE_REVIEW_SAFE_SELECTS,
  type BuildPublicPipelineReviewInput,
} from "./pipeline-review";
import {
  REPORT_DISCLAIMER,
  REPORT_MODEL_VERSION,
  type ReportModel,
} from "./report-model";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function reportModel(overrides: Partial<ReportModel> = {}): ReportModel {
  return {
    meta: {
      schemaVersion: REPORT_MODEL_VERSION,
      documentId: "PILAR-SHARED",
      runId: "run-public-review",
      createdAt: "2026-06-06T10:00:00.000Z",
      displayDate: "6. juni 2026",
      status: "Foreløpig godkjent med advarsler",
      statusCode: "approved_with_warnings",
      version: "Reporter v0.3",
      locale: "nb",
      displayLanguage: "nb",
      reportUrl: "https://pilar.example/rapport/run-public-review",
      audience: "engineer",
    },
    cover: {
      title: "Foreløpig kapasitetsscreening av stålbjelke IPE 300",
      subtitle: "qEd = 18 kN/m · L = 6 m",
      shortSummary: "Sanitized report summary.",
      qrLabel: "Skann for nettversjon",
      qrDescription: "Åpner rapporten med kontrollstatus og pipeline.",
      qrUrl: "https://pilar.example/rapport/run-public-review",
    },
    keyResults: [],
    summary: {
      text: "Sanitized report summary for the shared pipeline review.",
      request:
        "Tema: Stålbjelke\nProfil: IPE 300\nDimensjonerende last: 18 kN/m\nSpennvidde: 6 m",
    },
    interpretation: {
      status: "Klar",
      statusCode: "klar",
      assumptions: ["qEd er behandlet som dimensjonerende last."],
    },
    calculation: {
      resultRows: [
        {
          label: "MEd",
          value: "81,0",
          unit: "kNm",
          raw: "81,0 kNm",
          category: "dimensjonerande",
        },
        {
          label: "Mpl,Rd",
          value: "212,5",
          unit: "kNm",
          raw: "212,5 kNm",
          category: "kontroll",
        },
      ],
      steps: [
        {
          id: "step-1",
          number: 1,
          title: "Lastvirkning",
          prose: "MEd beregnes fra jevnt fordelt dimensjonerende last.",
          formulas: ["MEd = qEd L^2 / 8"],
          isControlStep: false,
        },
      ],
    },
    assessment: {
      professionalAssessment:
        "Dette er en foreløpig teknisk vurdering som krever fagpersonkontroll.",
      limitations: ["LTB er ikke beregnet."],
      warnings: ["SLS er ikke beregnet."],
    },
    control: {
      decision: "Foreløpig godkjent med advarsler",
      decisionCode: "approved_with_warnings",
      controllerText:
        "AI-pipelinen tillater visning med advarsler. Fagperson må kontrollere før bruk.",
      comparisonStatus: "match",
      comparisonText: "Konstruktørene er enige.",
      comparisonRows: [
        { label: "MEd", constructorA: "81,0 kNm", constructorB: "81,0 kNm", match: true },
      ],
      pipelineStatus: [
        { label: "Konstruktør A", value: "High", status: "ok" },
        { label: "Konstruktør B", value: "High", status: "ok" },
      ],
    },
    trust: {
      score: 78,
      label: "Høy",
      tone: "ok",
      breakdown: null,
    },
    conclusion: "Fagpersonkontroll er nødvendig før bruk.",
    disclaimer: REPORT_DISCLAIMER.nb,
    ...overrides,
  };
}

function input(overrides: Partial<BuildPublicPipelineReviewInput> = {}): BuildPublicPipelineReviewInput {
  return {
    run: {
      id: "run-public-review",
      status: "completed",
      calculationType: "stalkapasitet",
      startedAt: "2026-06-06T09:55:00.000Z",
      completedAt: "2026-06-06T10:00:00.000Z",
      displayLanguage: "nb",
    },
    reportModel: reportModel(),
    engineeringContext: {
      region: { countryName: "Norway" },
      standards: { label: "Eurocode Norway", supportLevel: "supported" },
      outputPreferences: { units: "metric" },
    },
    links: {
      report: "https://pilar.example/rapport/run-public-review",
      pdf: "https://pilar.example/api/rapport/run-public-review/pdf",
      word: "https://pilar.example/api/rapport/run-public-review/word",
      calculationSheet:
        "https://pilar.example/rapport/run-public-review/beregning?locale=nb",
    },
    agents: [
      {
        role: "engineer_a",
        label: "Engineer A",
        confidence: "high",
        summary: "Uses EC3 beam demand and preliminary cross-section screening.",
        warnings: ["LTB excluded."],
        limitations: ["No final compliance check."],
        present: true,
      },
      {
        role: "engineer_b",
        label: "Engineer B",
        confidence: "high",
        summary: "Independent check reaches the same demand values.",
        present: true,
      },
    ],
    controller: {
      riskLevel: "medium",
      manualReviewRequired: true,
      blockedFields: [],
    },
    ...overrides,
  };
}

describe("public pipeline review", () => {
  it("builds a useful sanitized public review without resume internals", () => {
    const review = buildPublicPipelineReview(input());

    expect(review.mode).toBe("public_pipeline_review");
    expect(review.resume_available).toBe(false);
    expect(review.professional_approval).toBe(false);
    expect(review.requires_professional_review).toBe(true);
    expect(review.problem.canonical_summary).toContain("Profil: IPE 300");
    expect(review.engineers).toHaveLength(2);
    expect(review.calculation.facts.map((row) => row.label)).toContain("MEd");
    expect(review.comparison.rows[0]).toMatchObject({ label: "MEd", match: true });

    const payload = JSON.stringify(review);
    expect(payload).not.toMatch(
      /raw_text|structured_output|input_review|inputReview|agentA|agentB|comparisonRaw|controllerDecisionRaw|user_id|request_id|input_payload|output_text|raw_message|provider_payload|stack|secret/i,
    );
  });

  it("withholds shared result facts and steps when controller blocked fields require it", () => {
    const review = buildPublicPipelineReview(
      input({
        controller: {
          riskLevel: "medium",
          manualReviewRequired: true,
          blockedFields: ["results_a", "results_b", "calculation_steps_a"],
        },
        agents: [
          {
            role: "engineer_a",
            label: "Engineer A",
            confidence: "high",
            summary: "Would otherwise mention 81,0 kNm.",
            withheld: true,
            present: true,
          },
          {
            role: "engineer_b",
            label: "Engineer B",
            confidence: "high",
            summary: "Would otherwise mention 81,0 kNm.",
            withheld: true,
            present: true,
          },
        ],
      }),
    );

    expect(review.calculation.facts).toEqual([]);
    expect(review.calculation.steps).toEqual([]);
    expect(review.engineers.every((engineer) => engineer.status === "withheld")).toBe(true);
    expect(JSON.stringify(review)).not.toContain("Would otherwise mention");
  });

  it("keeps public review selects away from raw prompt, provider, request, and debug fields", () => {
    const selected = Object.values(PIPELINE_REVIEW_SAFE_SELECTS).join("\n");

    expect(selected).not.toMatch(
      /raw_text|input_payload|output_text|raw_message|provider|stack|secret|user_id/i,
    );
    expect(PIPELINE_REVIEW_SAFE_SELECTS.agentOutputs).toContain("structured_output");
  });

  it("keeps the launch route separate from public resume and links the report page to review", () => {
    const runRoute = readSource("app/api/runs/[id]/route.ts");
    const reviewRoute = readSource("app/api/runs/[id]/pipeline-review/route.ts");
    const reviewHelper = readSource("lib/report/pipeline-review.ts");
    const reportPage = readSource("app/rapport/[run_id]/page.tsx");

    expect(runRoute).toContain("resume_requires_owner_or_share_token");
    expect(reviewHelper).toContain('mode: "public_pipeline_review"');
    expect(reviewRoute).toContain("buildPublicPipelineReview");
    expect(reportPage).toContain("const pipelineReviewUrl = `/rapport/${runId}/pipeline`");
    expect(reportPage).toContain("RP_LABELS.pipelineReview");
  });
});

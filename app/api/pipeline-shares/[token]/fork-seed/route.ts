import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyPipelineShareToken } from "@/lib/pipeline-share-token";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function safeError(status: number, error: string) {
  return jsonNoStore({ error }, status);
}

function text(value: unknown, max = 900): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstText(
  sources: Array<Record<string, unknown> | null>,
  keys: string[],
  max = 180,
): string {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = text(source[key], max);
      if (value) return value;
    }
  }
  return "";
}

function listText(value: unknown, maxItems = 5): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => text(item, 120)).filter(Boolean).slice(0, maxItems).join(", ");
}

function contextLine(engineeringContext: unknown): string {
  const record = asRecord(engineeringContext);
  const region = asRecord(record?.region);
  const standards = asRecord(record?.standards);
  const units = asRecord(record?.outputPreferences)?.units ?? null;
  return [
    text(region?.countryName ?? region?.countryCode, 80),
    text(standards?.label ?? standards?.family, 120),
    text(units, 40),
  ].filter(Boolean).join(" · ");
}

function problemSeedLines(inputReview: unknown, calculationType: string | null): string[] {
  const review = asRecord(inputReview);
  const parsed = asRecord(review?.parsed_data);
  const extracted =
    asRecord(review?.extracted_inputs) ??
    asRecord(parsed?.extracted_inputs) ??
    asRecord(parsed?.tolkte_verdiar);
  const sources = [parsed, extracted, review];
  const lines = [
    firstText(sources, ["report_title"], 220),
    firstText(sources, ["report_subtitle"], 220),
    calculationType ? `Calculation type: ${text(calculationType, 120)}` : "",
    firstText(sources, ["calculation_type"], 120)
      ? `Interpreted type: ${firstText(sources, ["calculation_type"], 120)}`
      : "",
    firstText(sources, ["profileName", "profile", "profil"], 120)
      ? `Profile: ${firstText(sources, ["profileName", "profile", "profil"], 120)}`
      : "",
    firstText(sources, ["steel_grade", "stalkvalitet", "stålkvalitet", "grade"], 80)
      ? `Steel grade: ${firstText(sources, ["steel_grade", "stalkvalitet", "stålkvalitet", "grade"], 80)}`
      : "",
    firstText(sources, ["qEdKnPerM", "qEd", "q_Ed", "qd", "q_d"], 80)
      ? `Design load: ${firstText(sources, ["qEdKnPerM", "qEd", "q_Ed", "qd", "q_d"], 80)}`
      : "",
    firstText(sources, ["spanM", "span", "L", "spennvidde"], 80)
      ? `Span: ${firstText(sources, ["spanM", "span", "L", "spennvidde"], 80)}`
      : "",
    listText(review?.can_calculate) ? `Can calculate: ${listText(review?.can_calculate)}` : "",
    listText(review?.assumptions) ? `Assumptions to verify: ${listText(review?.assumptions)}` : "",
  ];
  return Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean))).slice(0, 10);
}

function buildSeedText(input: {
  documentId: string | null;
  calculationType: string | null;
  contextSummary: string;
  inputReview: unknown;
}): string {
  const problemLines = problemSeedLines(input.inputReview, input.calculationType);
  const lines = [
    "Fork this PILAR pipeline review into a new calculation request.",
    "Edit and verify the problem statement before running. This text is built from sanitized structured fields and does not include the original raw prompt.",
    "",
    input.documentId ? `Source report: ${text(input.documentId, 120)}` : "",
    input.contextSummary ? `Engineering context: ${input.contextSummary}` : "",
    ...problemLines,
    "",
    "Rewrite the request below with verified input values and any corrections before starting a new calculation:",
  ];
  return lines.filter((line, index) => line !== "" || lines[index - 1] !== "").join("\n").trim();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const verified = verifyPipelineShareToken({ token });
  if (!verified.ok) {
    return safeError(verified.error === "share_secret_missing" ? 503 : 403, verified.error);
  }

  const supabase = getSupabase();
  const { data: run, error: runError } = await supabase
    .from("calculation_runs")
    .select("id, request_id, run_status, calculation_type, display_language, engineering_context")
    .eq("id", verified.payload.run_id)
    .maybeSingle();

  if (runError) {
    console.error("[api/pipeline-shares/fork-seed] run query failed");
    return safeError(500, "fork_seed_unavailable");
  }
  if (!run) return safeError(404, "run_not_found");
  if (run.run_status !== "completed") return safeError(409, "fork_seed_requires_completed_run");

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("document_id")
    .eq("run_id", verified.payload.run_id)
    .maybeSingle();

  if (reportError) {
    console.error("[api/pipeline-shares/fork-seed] report query failed");
    return safeError(500, "fork_seed_unavailable");
  }
  if (!report) return safeError(404, "fork_seed_not_available");

  const { data: inputReview, error: inputReviewError } = run.request_id
    ? await supabase
        .from("input_reviews")
        .select("parsed_data, calculation_type, extracted_inputs, can_calculate, assumptions")
        .eq("request_id", run.request_id)
        .maybeSingle()
    : { data: null, error: null };

  if (inputReviewError) {
    console.error("[api/pipeline-shares/fork-seed] input review query failed");
    return safeError(500, "fork_seed_unavailable");
  }

  const contextSummary = contextLine(run.engineering_context);
  const seedText = buildSeedText({
    documentId: report.document_id ?? null,
    calculationType: run.calculation_type ?? null,
    contextSummary,
    inputReview,
  });

  return jsonNoStore({
    mode: "pipeline_share_fork_seed",
    source_run_id: run.id,
    document_id: report.document_id,
    display_language: run.display_language === "nn" || run.display_language === "en" ? run.display_language : "nb",
    engineering_context: run.engineering_context ?? null,
    seed_text: seedText,
    professional_approval: false,
    requires_professional_review: true,
  });
}

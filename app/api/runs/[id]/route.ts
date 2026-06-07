import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { verifyPipelineShareToken } from "@/lib/pipeline-share-token";
import { PIPELINE_REVIEW_SAFE_SELECTS } from "@/lib/report/pipeline-review";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
const SHARED_REPORT_INPUT_REVIEW_SELECT =
  "input_status, calculation_type, extracted_inputs, can_calculate, cannot_calculate, assumptions, prompt_version";

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

async function currentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Read-only auth check for this route.
          },
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function inputReviewToTolking(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    status: row.input_status ?? "unknown",
    berekningstype: row.calculation_type ?? null,
    fagomraade: row.discipline ?? null,
    tolkte_verdiar: row.extracted_inputs ?? {},
    manglande_verdiar: row.missing_inputs ?? [],
    kan_reknast_no: row.can_calculate ?? [],
    kan_ikkje_reknast: row.cannot_calculate ?? [],
    antakingar: row.assumptions ?? [],
    tolkings_oppsummering: row.interpretation_summary ?? "",
    konfidens: row.confidence ?? null,
    prompt_version: row.prompt_version ?? null,
  };
}

function agentOutput(rows: Array<Record<string, unknown>> | null, agentName: string) {
  const row = (rows ?? []).find((item) => item.agent_name === agentName);
  const output = row?.structured_output;
  return output && typeof output === "object" ? output : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function scalarRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string | number | boolean] =>
      typeof entry[0] === "string" &&
      (typeof entry[1] === "string" || typeof entry[1] === "number" || typeof entry[1] === "boolean"),
    )
    .map(([key, item]) => [key, String(item)] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function safeCalculationSteps(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const steps = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      return {
        title: typeof row.title === "string" ? row.title : "",
        text: typeof row.text === "string" ? row.text : "",
        latex_formula:
          typeof row.latex_formula === "string" || row.latex_formula === null
            ? row.latex_formula
            : null,
      };
    })
    .filter((item): item is { title: string; text: string; latex_formula: string | null } =>
      Boolean(item && (item.title || item.text || item.latex_formula)),
    );
  return steps.length > 0 ? steps : undefined;
}

function safeLimitations(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      return {
        key: typeof row.key === "string" ? row.key : undefined,
        subject: typeof row.subject === "string" ? row.subject : undefined,
        reason: typeof row.reason === "string" ? row.reason : undefined,
      };
    })
    .filter(Boolean);
}

function safeSharedAgentOutput(
  rows: Array<Record<string, unknown>> | null,
  agentName: "agent_a" | "agent_b",
  blockedOutputs: Set<string>,
) {
  const row = (rows ?? []).find((item) => item.agent_name === agentName);
  const output =
    row?.structured_output && typeof row.structured_output === "object" && !Array.isArray(row.structured_output)
      ? (row.structured_output as Record<string, unknown>)
      : null;
  if (!output) return null;

  const suffix = agentName === "agent_a" ? "a" : "b";
  const structuredOutput: Record<string, unknown> = {};
  if (typeof output.short_conclusion === "string") {
    structuredOutput.short_conclusion = output.short_conclusion;
  }
  if (typeof output.confidence === "string") {
    structuredOutput.confidence = output.confidence;
  }
  const assumptions = stringArray(output.assumptions);
  if (assumptions.length > 0) structuredOutput.assumptions = assumptions;
  const warnings = stringArray(output.warnings);
  if (warnings.length > 0) structuredOutput.warnings = warnings;
  const limitations = safeLimitations(output.limitations);
  if (limitations.length > 0) structuredOutput.limitations = limitations;
  if (!blockedOutputs.has(`results_${suffix}`)) {
    const results = scalarRecord(output.results);
    if (results) structuredOutput.results = results;
  }
  if (!blockedOutputs.has(`calculation_steps_${suffix}`)) {
    const calculationSteps = safeCalculationSteps(output.calculation_steps);
    if (calculationSteps) structuredOutput.calculation_steps = calculationSteps;
  }

  return {
    agent_name: agentName,
    prompt_version: typeof row?.prompt_version === "string" ? row.prompt_version : null,
    structured_output: structuredOutput,
  };
}

function inputReviewForSharedReport(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    input_status: row.input_status ?? "unknown",
    parsed_data: row.extracted_inputs ?? null,
    calculation_type: row.calculation_type ?? null,
    extracted_inputs: row.extracted_inputs ?? {},
    can_calculate: row.can_calculate ?? [],
    cannot_calculate: row.cannot_calculate ?? [],
    assumptions: row.assumptions ?? [],
    prompt_version: row.prompt_version ?? null,
  };
}

function controllerForSharedReport(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    decision_status: row.decision_status ?? "unknown",
    risk_level: row.risk_level ?? null,
    reason: typeof row.reason === "string" ? row.reason : "",
    user_message: typeof row.user_message === "string" ? row.user_message : "",
    blocked_outputs: Array.isArray(row.blocked_outputs) ? row.blocked_outputs : [],
    allowed_outputs: [],
    manual_review_required: row.manual_review_required ?? true,
    prompt_version: row.prompt_version ?? null,
  };
}

async function sharedReportResponse(req: NextRequest, runId: string) {
  const shareToken = req.nextUrl.searchParams.get("share") ?? "";
  const verified = verifyPipelineShareToken({ token: shareToken });
  if (!verified.ok) {
    return jsonNoStore(
      { error: verified.error },
      verified.error === "share_secret_missing" ? 503 : 403,
    );
  }
  if (verified.payload.run_id !== runId) {
    return jsonNoStore({ error: "share_run_mismatch" }, 403);
  }

  const supabase = getSupabase();
  const { data: run, error: runError } = await supabase
    .from("calculation_runs")
    .select(PIPELINE_REVIEW_SAFE_SELECTS.run)
    .eq("id", runId)
    .maybeSingle();

  if (runError) {
    console.error("[api/runs/[id]] shared report run query failed");
    return jsonNoStore({ error: "shared_report_unavailable" }, 500);
  }
  if (!run) return jsonNoStore({ error: "run_not_found" }, 404);

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select(PIPELINE_REVIEW_SAFE_SELECTS.report)
    .eq("run_id", runId)
    .maybeSingle();

  if (reportError) {
    console.error("[api/runs/[id]] shared report query failed");
    return jsonNoStore({ error: "shared_report_unavailable" }, 500);
  }
  if (!report) return jsonNoStore({ error: "shared_report_not_available" }, 404);

  const [{ data: inputReview }, { data: agentOutputs }, { data: comparison }, { data: controllerDecision }] =
    await Promise.all([
      run.request_id
        ? supabase
            .from("input_reviews")
            .select(SHARED_REPORT_INPUT_REVIEW_SELECT)
            .eq("request_id", run.request_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("agent_outputs")
        .select(PIPELINE_REVIEW_SAFE_SELECTS.agentOutputs)
        .eq("run_id", runId),
      supabase
        .from("comparisons")
        .select(PIPELINE_REVIEW_SAFE_SELECTS.comparison)
        .eq("run_id", runId)
        .maybeSingle(),
      supabase
        .from("controller_decisions")
        .select(PIPELINE_REVIEW_SAFE_SELECTS.controllerDecision)
        .eq("run_id", runId)
        .maybeSingle(),
    ]);

  const blockedOutputs = new Set(
    Array.isArray(controllerDecision?.blocked_outputs) ? controllerDecision.blocked_outputs : [],
  );

  return jsonNoStore({
    mode: "shared_report",
    resume_available: false,
    run: {
      id: run.id,
      run_status: run.run_status,
      calculation_type: run.calculation_type,
      started_at: run.started_at,
      completed_at: run.completed_at,
      display_language: run.display_language,
      request: { raw_text: "" },
    },
    report,
    inputReview: inputReviewForSharedReport(inputReview as Record<string, unknown> | null),
    agentA: safeSharedAgentOutput(agentOutputs as Array<Record<string, unknown>> | null, "agent_a", blockedOutputs),
    agentB: safeSharedAgentOutput(agentOutputs as Array<Record<string, unknown>> | null, "agent_b", blockedOutputs),
    comparison: comparison
      ? { match_status: comparison.match_status ?? "unknown", comparison_data: {} }
      : null,
    controllerDecision: controllerForSharedReport(controllerDecision as Record<string, unknown> | null),
  });
}

async function ownerResumeResponse(runId: string) {
  const userId = await currentUserId();
  if (!userId) {
    return jsonNoStore(
      {
        error: "resume_requires_owner_or_share_token",
        message:
          "Resume requires the signed-in owner. Public share/fork uses a signed share token.",
      },
      403,
    );
  }

  const supabase = getSupabase();
  const { data: run, error: runError } = await supabase
    .from("calculation_runs")
    .select("id, request_id, run_status, calculation_type, started_at, completed_at, display_language, user_id")
    .eq("id", runId)
    .maybeSingle();

  if (runError) {
    console.error("[api/runs/[id]] owner resume run query failed");
    return jsonNoStore({ error: "resume_unavailable" }, 500);
  }
  if (!run) return jsonNoStore({ error: "run_not_found" }, 404);
  if (run.user_id !== userId) {
    return jsonNoStore(
      {
        error: "resume_requires_owner_or_share_token",
        message:
          "Resume requires the signed-in owner. Public share/fork uses a signed share token.",
      },
      403,
    );
  }

  const [
    { data: requestRow },
    { data: inputReview },
    { data: agentOutputs },
    { data: comparison },
    { data: controllerDecision },
    { data: report },
  ] = await Promise.all([
    supabase
      .from("requests")
      .select("id, raw_text")
      .eq("id", run.request_id)
      .maybeSingle(),
    supabase
      .from("input_reviews")
      .select("input_status, calculation_type, discipline, extracted_inputs, missing_inputs, can_calculate, cannot_calculate, assumptions, interpretation_summary, confidence, prompt_version")
      .eq("request_id", run.request_id)
      .maybeSingle(),
    supabase
      .from("agent_outputs")
      .select("agent_name, structured_output, prompt_version")
      .eq("run_id", runId),
    supabase
      .from("comparisons")
      .select("match_status, numeric_differences, method_differences, assumption_differences, internal_consistency_issues, recommended_status, summary, prompt_version")
      .eq("run_id", runId)
      .maybeSingle(),
    supabase
      .from("controller_decisions")
      .select("decision_status, risk_level, reason, user_message, blocked_outputs, allowed_outputs, manual_review_required, prompt_version")
      .eq("run_id", runId)
      .maybeSingle(),
    supabase
      .from("reports")
      .select("id, run_id, document_id, created_at, tillit_score")
      .eq("run_id", runId)
      .maybeSingle(),
  ]);

  return jsonNoStore({
    mode: "owner_resume",
    resume_available: true,
    run: {
      id: run.id,
      request_id: run.request_id,
      run_status: run.run_status,
      calculation_type: run.calculation_type,
      started_at: run.started_at,
      completed_at: run.completed_at,
      display_language: run.display_language,
    },
    request: requestRow ? { id: requestRow.id, raw_text: requestRow.raw_text } : null,
    tolking: inputReviewToTolking(inputReview as Record<string, unknown> | null),
    calculationA: agentOutput(agentOutputs as Array<Record<string, unknown>> | null, "agent_a"),
    calculationB: agentOutput(agentOutputs as Array<Record<string, unknown>> | null, "agent_b"),
    comparison: comparison ?? null,
    controllerDecision: controllerDecision ?? null,
    report: report ?? null,
  });
}

/**
 * GET /api/runs/[id]
 *
 * Launch-safe public read path. The default response is only a sanitized
 * report snapshot for public report viewing. Full workbench/Mission Control
 * resume data is intentionally blocked until owner/share-token semantics exist.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return jsonNoStore({ error: "Manglar run_id" }, 400);
  }

  if (req.nextUrl.searchParams.get("mode") === "resume") {
    return ownerResumeResponse(id);
  }

  if (req.nextUrl.searchParams.has("share")) {
    return sharedReportResponse(req, id);
  }

  const supabase = getSupabase();

  const { data: run, error: runError } = await supabase
    .from("calculation_runs")
    .select("id, run_status, calculation_type, started_at, completed_at, display_language")
    .eq("id", id)
    .maybeSingle();

  if (runError) {
    console.error("[api/runs/[id]] run query error:", runError);
    return jsonNoStore({ error: "Databasefeil ved henting av run" }, 500);
  }

  if (!run) {
    return jsonNoStore({ error: "Run ikkje funnen" }, 404);
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, run_id, document_id, executive_summary, technical_assessment, conclusion, prompt_version, created_at, tillit_score, tillit_breakdown")
    .eq("run_id", id)
    .maybeSingle();

  if (reportError) {
    console.error("[api/runs/[id]] report query error:", reportError);
    return jsonNoStore({ error: "Databasefeil ved henting av rapport" }, 500);
  }

  return jsonNoStore({
    mode: "public_report_snapshot",
    resume_available: false,
    run,
    report: report ?? null,
  });
}

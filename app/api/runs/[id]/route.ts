import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

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

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/runs/[id]
 *
 * Returnerer FULL run-data for resume av Mission Control / calculation_result.
 * Inkluderer request, input_review (tolking), agent_outputs (A+B), comparison,
 * controller_decision og report. Alt mappa til workbench-vendte shapes
 * (nynorsk for tolking, CalculationResult for agentar, etc.) slik at
 * frontend kan kalle setState() direkte utan ytterlegare transformasjonar.
 *
 * Public endpoint — same tilgangsnivå som /rapport/[id]. Run UUID-ar har
 * høg entropi, så enumeration er ikkje praktisk.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Manglar run_id" }, { status: 400 });
  }

  const supabase = getSupabase();

  // === STEG 1: Hent run ===
  const { data: run, error: runError } = await supabase
    .from("calculation_runs")
    .select("id, request_id, run_status, calculation_type, started_at, completed_at")
    .eq("id", id)
    .maybeSingle();

  if (runError) {
    console.error("[api/runs/[id]] run query error:", runError);
    return NextResponse.json(
      { error: "Databasefeil ved henting av run" },
      { status: 500 }
    );
  }

  if (!run) {
    return NextResponse.json({ error: "Run ikkje funnen" }, { status: 404 });
  }

  // === STEG 2: Hent alle relaterte tabellar parallelt ===
  const [
    { data: request },
    { data: inputReview },
    { data: agentOutputs },
    { data: comparison },
    { data: controllerDecision },
    { data: report },
  ] = await Promise.all([
    supabase
      .from("requests")
      .select("id, raw_text, user_mode, input_channel, created_at")
      .eq("id", run.request_id)
      .maybeSingle(),
    supabase
      .from("input_reviews")
      .select("*")
      .eq("request_id", run.request_id)
      .maybeSingle(),
    supabase
      .from("agent_outputs")
      .select("agent_name, structured_output, confidence, prompt_version")
      .eq("run_id", id),
    supabase
      .from("comparisons")
      .select("*")
      .eq("run_id", id)
      .maybeSingle(),
    supabase
      .from("controller_decisions")
      .select("*")
      .eq("run_id", id)
      .maybeSingle(),
    supabase
      .from("reports")
      .select("id, document_id, tillit_score, created_at")
      .eq("run_id", id)
      .maybeSingle(),
  ]);

  // === STEG 3: Map til workbench-vendte shapes ===

  // input_review → AgentResult (nynorsk). Speilar /api/input-agent insert-logikken.
  const tolking = inputReview
    ? {
        status: inputReview.input_status,
        berekningstype: inputReview.calculation_type ?? null,
        fagomraade: inputReview.discipline ?? null,
        tolkte_verdiar: inputReview.extracted_inputs ?? {},
        manglande_verdiar: inputReview.missing_inputs ?? [],
        kan_reknast_no: inputReview.can_calculate ?? [],
        kan_ikkje_reknast: inputReview.cannot_calculate ?? [],
        antakingar: inputReview.assumptions ?? [],
        tolkings_oppsummering: inputReview.interpretation_summary ?? "",
        konfidens: inputReview.confidence ?? 0,
      }
    : null;

  // agent_outputs → CalculationResult. structured_output JSONB inneheld
  // alle felta direkte (sjå AgentOutput-typen i rapport-page.tsx).
  function mapAgentOutput(agentName: string) {
    const output = agentOutputs?.find((o) => o.agent_name === agentName);
    if (!output?.structured_output) return null;
    const so = output.structured_output as Record<string, unknown>;
    return {
      short_conclusion: (so.short_conclusion as string) ?? "",
      assumptions: (so.assumptions as string[]) ?? [],
      calculation_steps: (so.calculation_steps as Array<{ title: string; text: string }>) ?? [],
      results: (so.results as Record<string, string>) ?? {},
      limitations: (so.limitations as string[]) ?? [],
      warnings: (so.warnings as string[]) ?? [],
      confidence: ((so.confidence as string) ?? output.confidence ?? "medium") as "high" | "medium" | "low",
    };
  }

  const calculationA = mapAgentOutput("agent_a");
  const calculationB = mapAgentOutput("agent_b");

  // comparisons → ComparisonResult
  const comparisonMapped = comparison
    ? {
        match_status: comparison.match_status,
        numeric_differences: comparison.numeric_differences ?? [],
        method_differences: comparison.method_differences ?? [],
        assumption_differences: comparison.assumption_differences ?? [],
        internal_consistency_issues: comparison.internal_consistency_issues ?? {
          agent_a: [],
          agent_b: [],
        },
        recommended_status: comparison.recommended_status,
        summary: comparison.summary,
      }
    : null;

  // controller_decisions → ControllerDecision
  const controllerDecisionMapped = controllerDecision
    ? {
        decision_status: controllerDecision.decision_status,
        risk_level: controllerDecision.risk_level,
        reason: controllerDecision.reason,
        user_message: controllerDecision.user_message,
        blocked_outputs: controllerDecision.blocked_outputs ?? [],
        allowed_outputs: controllerDecision.allowed_outputs ?? [],
        manual_review_required: controllerDecision.manual_review_required ?? false,
        controller_notes: controllerDecision.controller_notes ?? "",
      }
    : null;

  return NextResponse.json({
    run,
    request: request ?? null,
    tolking,
    calculationA,
    calculationB,
    comparison: comparisonMapped,
    controllerDecision: controllerDecisionMapped,
    report: report ?? null,
  });
}
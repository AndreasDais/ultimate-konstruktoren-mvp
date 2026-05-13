import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/requests/[id]
 *
 * Returnerer ein request + tilhøyrande input_review (tolking) + nyaste
 * calculation_run for kontekst. Brukt av:
 *   - /mine (resume workbench frå klikk på rad utan rapport)
 *   - /rapport/[id] (fork-knapp "Lag ny berekning frå denne")
 *   - Workbench (?from_request=X auto-prefill)
 *
 * Public endpoint — same tilgangsnivå som /rapport/[id]. Request UUID-ar
 * har høg entropi, så enumeration er ikkje praktisk. raw_text + tolking
 * er allereie eksponert via rapport, så ingen nye privacy-implikasjonar.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Manglar request_id" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Hent request
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("id, raw_text, user_mode, input_channel, created_at, user_id")
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    console.error("[api/requests/[id]] requests query error:", requestError);
    return NextResponse.json(
      { error: "Databasefeil ved henting av request" },
      { status: 500 }
    );
  }

  if (!request) {
    return NextResponse.json(
      { error: "Request ikkje funnen" },
      { status: 404 }
    );
  }

  // Hent eksisterande tolking (input_review) hvis han finst
  const { data: inputReview, error: reviewError } = await supabase
    .from("input_reviews")
    .select("*")
    .eq("request_id", id)
    .maybeSingle();

  if (reviewError) {
    console.error("[api/requests/[id]] input_reviews query error:", reviewError);
    // Ikkje fatal — kan halde fram utan tolking
  }

  // Hent nyaste calculation_run for kontekst (status, document_id viss ferdig)
  const { data: run } = await supabase
    .from("calculation_runs")
    .select("id, run_status, calculation_type, started_at, completed_at")
    .eq("request_id", id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Hent rapport hvis han finst (gir document_id)
  let report = null;
  if (run?.id) {
    const { data: reportData } = await supabase
      .from("reports")
      .select("id, document_id, tillit_score, created_at")
      .eq("run_id", run.id)
      .maybeSingle();
    report = reportData;
  }

  // Map DB-kolonnar (engelsk) til AgentResult-shape (nynorsk) som workbench
  // konsumerer. Speilar mapping-en i app/api/input-agent/route.ts.
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

  return NextResponse.json({
    request,
    input_review: inputReview ?? null,
    tolking, // Workbench-vendt shape (nynorsk), klar til setResult()
    run: run ?? null,
    report: report ?? null,
  });
}
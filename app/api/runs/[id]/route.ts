import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
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
    return jsonNoStore(
      {
        error: "resume_requires_owner_or_share_token",
        message:
          "Public resume is disabled until owner or share-token access is available.",
      },
      403,
    );
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

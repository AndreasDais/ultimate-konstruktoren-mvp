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

/**
 * GET /api/requests/[id]
 *
 * Public request resume/fork is disabled for launch. Request rows contain raw
 * user text and interpretation state, so they require owner/share-token
 * semantics before they can be exposed again.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return jsonNoStore({ error: "Manglar request_id" }, 400);
  }

  const userId = await currentUserId();
  if (!userId) {
    return jsonNoStore(
      {
        error: "request_resume_requires_owner_or_share_token",
        message:
          "Request resume requires the signed-in owner. Public share/fork uses a signed share token.",
      },
      403,
    );
  }

  const supabase = getSupabase();
  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("id, raw_text, created_at, user_id")
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    console.error("[api/requests/[id]] owner request query failed");
    return jsonNoStore({ error: "request_resume_unavailable" }, 500);
  }
  if (!requestRow) return jsonNoStore({ error: "request_not_found" }, 404);
  if (requestRow.user_id !== userId) {
    return jsonNoStore(
      {
        error: "request_resume_requires_owner_or_share_token",
        message:
          "Request resume requires the signed-in owner. Public share/fork uses a signed share token.",
      },
      403,
    );
  }

  const [{ data: inputReview }, { data: run }] = await Promise.all([
    supabase
      .from("input_reviews")
      .select("input_status, calculation_type, discipline, extracted_inputs, missing_inputs, can_calculate, cannot_calculate, assumptions, interpretation_summary, confidence, prompt_version")
      .eq("request_id", id)
      .maybeSingle(),
    supabase
      .from("calculation_runs")
      .select("id, request_id, run_status")
      .eq("request_id", id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return jsonNoStore({
    mode: "owner_request_resume",
    resume_available: true,
    request: { id: requestRow.id, raw_text: requestRow.raw_text },
    tolking: inputReviewToTolking(inputReview as Record<string, unknown> | null),
    run: run ?? null,
    report: null,
  });
}

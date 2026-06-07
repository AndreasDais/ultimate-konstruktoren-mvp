import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { createPipelineShareToken } from "@/lib/pipeline-share-token";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return jsonNoStore({ error: "missing_run_id" }, 400);

  const userId = await currentUserId();
  if (!userId) return jsonNoStore({ error: "owner_required" }, 401);

  const supabase = getSupabase();
  const { data: run, error: runError } = await supabase
    .from("calculation_runs")
    .select("id, user_id, run_status")
    .eq("id", id)
    .maybeSingle();

  if (runError) {
    console.error("[api/runs/share] run lookup failed");
    return jsonNoStore({ error: "share_unavailable" }, 500);
  }
  if (!run) return jsonNoStore({ error: "run_not_found" }, 404);
  if (run.user_id !== userId) return jsonNoStore({ error: "owner_required" }, 403);
  if (run.run_status !== "completed") {
    return jsonNoStore({ error: "share_requires_completed_run" }, 409);
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, document_id")
    .eq("run_id", id)
    .maybeSingle();

  if (reportError) {
    console.error("[api/runs/share] report lookup failed");
    return jsonNoStore({ error: "share_unavailable" }, 500);
  }
  if (!report) return jsonNoStore({ error: "share_requires_report" }, 409);

  const created = createPipelineShareToken({ runId: id });
  if (!created.ok) {
    return jsonNoStore({ error: created.error }, created.error === "share_secret_missing" ? 503 : 400);
  }

  const shareUrl = new URL(`/rapport/${id}`, request.nextUrl.origin);
  shareUrl.searchParams.set("share", created.token);

  return jsonNoStore({
    mode: "pipeline_share_created",
    run_id: id,
    document_id: report.document_id,
    share_url: shareUrl.toString(),
    token: created.token,
    expires_at: new Date(created.payload.exp * 1000).toISOString(),
  });
}

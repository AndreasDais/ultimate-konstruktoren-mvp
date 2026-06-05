import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PilotFeedbackPayload } from "@/lib/pilot/types";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase URL or service role key for pilot feedback API.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isValidRating(value: unknown): value is PilotFeedbackPayload["rating"] {
  return value === "useful" || value === "partly" || value === "not_useful";
}

function isValidTrust(value: unknown): value is PilotFeedbackPayload["trustLevel"] {
  return value === "trusted" || value === "partly_trusted" || value === "not_trusted" || value === "not_sure";
}

export async function POST(request: NextRequest) {
  let payload: PilotFeedbackPayload;

  const rateLimited = await checkRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    payload = (await request.json()) as PilotFeedbackPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isValidRating(payload.rating)) {
    return NextResponse.json({ ok: false, error: "Invalid rating." }, { status: 400 });
  }

  if (!isValidTrust(payload.trustLevel)) {
    return NextResponse.json({ ok: false, error: "Invalid trust level." }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("pilot_feedback")
      .insert({
        run_id: payload.runId || null,
        rating: payload.rating,
        trust_level: payload.trustLevel,
        use_case: payload.useCase || "other",
        comment: payload.comment?.trim() || null,
        wants_followup: Boolean(payload.wantsFollowup),
        report_url: payload.reportUrl || null,
        source: payload.source || "report",
        metadata: payload.metadata || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("[pilot/feedback] insert failed:", error);
      return NextResponse.json({ ok: false, error: "Could not save feedback." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (error) {
    console.error("[pilot/feedback] FAILED:", error);
    return NextResponse.json(
      { ok: false, error: "Could not save feedback." },
      { status: 500 },
    );
  }
}

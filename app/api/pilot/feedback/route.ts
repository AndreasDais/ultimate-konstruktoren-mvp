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

function isValidUseCase(value: unknown): value is PilotFeedbackPayload["useCase"] {
  return (
    value === "understand_task" ||
    value === "check_answer" ||
    value === "report_writing" ||
    value === "calculation_sheet" ||
    value === "latex_overleaf" ||
    value === "word_report" ||
    value === "international_support" ||
    value === "other"
  );
}

function isValidSource(value: unknown): value is NonNullable<PilotFeedbackPayload["source"]> {
  return (
    value === "report" ||
    value === "calculation_sheet" ||
    value === "pilot_page" ||
    value === "international_page" ||
    value === "admin"
  );
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const metadata: Record<string, unknown> = {};

  const allowedTextFields: Record<string, number> = {
    region: 120,
    standard: 160,
    requested_improvement: 1200,
    followup_email: 254,
    current_path: 500,
    ui_mode: 30,
    locale: 20,
    selected_region: 30,
    selected_standard: 80,
    support_level: 40,
    page: 80,
  };

  for (const [key, maxLength] of Object.entries(allowedTextFields)) {
    const text = boundedText(input[key], maxLength);
    if (text) metadata[key] = text;
  }

  return metadata;
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

  if (payload.useCase && !isValidUseCase(payload.useCase)) {
    return NextResponse.json({ ok: false, error: "Invalid use case." }, { status: 400 });
  }

  if (payload.source && !isValidSource(payload.source)) {
    return NextResponse.json({ ok: false, error: "Invalid source." }, { status: 400 });
  }

  const comment = boundedText(payload.comment, 2000);
  const reportUrl = boundedText(payload.reportUrl, 500);
  const metadata = sanitizeMetadata(payload.metadata);
  const isInternationalFeedback =
    payload.source === "international_page" || payload.useCase === "international_support";

  if (
    isInternationalFeedback &&
    !comment &&
    !metadata.region &&
    !metadata.standard &&
    !metadata.requested_improvement
  ) {
    return NextResponse.json(
      { ok: false, error: "Tell us what international support you need." },
      { status: 400 },
    );
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
        comment,
        wants_followup: Boolean(payload.wantsFollowup),
        report_url: reportUrl,
        source: payload.source || "report",
        metadata,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[pilot/feedback] insert failed", {
        code: typeof error === "object" && error && "code" in error ? String(error.code) : "unknown",
      });
      return NextResponse.json({ ok: false, error: "Could not save feedback." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (error) {
    console.error("[pilot/feedback] FAILED", {
      error_name: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json(
      { ok: false, error: "Could not save feedback." },
      { status: 500 },
    );
  }
}

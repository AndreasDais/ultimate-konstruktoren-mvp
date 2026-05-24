import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { mapDbImprovementAction } from "@/lib/intelligence/actions";

const VALID_STATUSES = new Set([
  "proposed",
  "approved",
  "rejected",
  "planned",
  "implemented",
  "verified",
  "deferred",
]);

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const status = typeof body.status === "string" ? body.status : undefined;

    if (!status || !VALID_STATUSES.has(status)) {
      return jsonError("Ugyldig status", 400);
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status,
      approved_by_user: ["approved", "planned", "implemented", "verified"].includes(status),
    };

    if (status === "implemented" || status === "verified") patch.implemented_at = now;
    if (typeof body.result_summary === "string") patch.result_summary = body.result_summary.trim();
    if (typeof body.user_feedback === "string") patch.user_feedback = body.user_feedback.trim();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("improvement_actions")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[intelligence/actions/PATCH]", error);
      return jsonError("Klarte ikkje oppdatere forbedringsforslag");
    }

    const hasFeedback =
      typeof body.feedback_type === "string" ||
      typeof body.user_rating === "number" ||
      typeof body.user_feedback === "string" ||
      typeof body.result_summary === "string" ||
      typeof body.should_repeat_pattern === "boolean";

    if (hasFeedback) {
      const { error: feedbackError } = await supabase.from("agent_learning_feedback").insert({
        action_id: id,
        feedback_type: typeof body.feedback_type === "string" ? body.feedback_type : "status_update",
        user_rating: typeof body.user_rating === "number" ? body.user_rating : null,
        user_comment: typeof body.user_feedback === "string" ? body.user_feedback.trim() : null,
        actual_outcome: typeof body.result_summary === "string" ? body.result_summary.trim() : null,
        should_repeat_pattern:
          typeof body.should_repeat_pattern === "boolean" ? body.should_repeat_pattern : null,
      });

      if (feedbackError) {
        console.warn("[intelligence/actions/PATCH] feedback insert failed:", feedbackError.message);
      }
    }

    return NextResponse.json({ action: mapDbImprovementAction(data as Record<string, unknown>) });
  } catch (err) {
    console.error("[intelligence/actions/PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Ukjend feil");
  }
}

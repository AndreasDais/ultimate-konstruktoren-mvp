import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { buildImplementationPlan } from "@/lib/intelligence/implementation-plan";
import { mapDbImprovementAction } from "@/lib/intelligence/actions";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabase();

    const { data: row, error } = await supabase
      .from("improvement_actions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !row) {
      console.error("[intelligence/actions/plan/POST] fetch failed:", error);
      return jsonError("Klarte ikkje hente forbedringsforslag", 404);
    }

    const action = mapDbImprovementAction(row as Record<string, unknown>);
    const plan = buildImplementationPlan(action);
    const metadata = {
      ...action.metadata,
      implementationPlan: plan,
      implementationPlanGeneratedAt: plan.generatedAt,
    };

    const { data: updated, error: updateError } = await supabase
      .from("improvement_actions")
      .update({ metadata })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      console.error("[intelligence/actions/plan/POST] update failed:", updateError);
      return jsonError("Klarte ikkje lagre implementeringsplan");
    }

    return NextResponse.json({
      action: mapDbImprovementAction(updated as Record<string, unknown>),
      plan,
    });
  } catch (err) {
    console.error("[intelligence/actions/plan/POST]", err);
    return jsonError(err instanceof Error ? err.message : "Ukjend feil");
  }
}

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateDailyIntelligenceReport } from "@/lib/intelligence/generate-report";
import { getImprovementActions } from "@/lib/intelligence/actions";
import { buildImplementationPlan } from "@/lib/intelligence/implementation-plan";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice("bearer ".length).trim();
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.INTELLIGENCE_CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const token = getBearerToken(request) ?? searchParams.get("secret");

  if (!secret) {
    // Development-friendly fallback. Production bør alltid sette INTELLIGENCE_CRON_SECRET.
    return process.env.NODE_ENV !== "production";
  }

  return token === secret;
}

async function runDailyIntelligence(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Manglar eller feil INTELLIGENCE_CRON_SECRET", 401);
  }

  const { searchParams } = new URL(request.url);
  const reportDate = searchParams.get("date") ?? undefined;
  const force = searchParams.get("force") === "1" || searchParams.get("force") === "true";
  const planApproved = searchParams.get("planApproved") === "1" || searchParams.get("planApproved") === "true";

  const supabase = getSupabase();
  const report = await generateDailyIntelligenceReport(supabase, {
    reportDate,
    force,
  });

  let plannedActions = 0;

  if (planApproved) {
    const actions = await getImprovementActions(supabase, {
      reportId: report.id,
      status: "all",
      limit: 50,
    });

    const candidates = actions.filter(
      (action) =>
        ["approved", "planned"].includes(action.status) &&
        !action.metadata?.implementationPlan &&
        action.riskLevel !== "high",
    );

    for (const action of candidates) {
      const plan = buildImplementationPlan(action);
      const metadata = {
        ...action.metadata,
        implementationPlan: plan,
        implementationPlanGeneratedAt: plan.generatedAt,
        generatedByCron: true,
      };

      const { error } = await supabase
        .from("improvement_actions")
        .update({ metadata })
        .eq("id", action.id);

      if (!error) plannedActions += 1;
      else console.warn("[intelligence/cron] plan update failed", action.id, error.message);
    }
  }

  return NextResponse.json({
    ok: true,
    report,
    plannedActions,
    mode: "observer_recommend_planner",
    autonomousExecutionAllowed: false,
  });
}

export async function GET(request: Request) {
  try {
    return await runDailyIntelligence(request);
  } catch (err) {
    console.error("[intelligence/cron/GET]", err);
    return jsonError(err instanceof Error ? err.message : "Klarte ikkje køyre intelligence cron");
  }
}

export async function POST(request: Request) {
  try {
    return await runDailyIntelligence(request);
  } catch (err) {
    console.error("[intelligence/cron/POST]", err);
    return jsonError(err instanceof Error ? err.message : "Klarte ikkje køyre intelligence cron");
  }
}

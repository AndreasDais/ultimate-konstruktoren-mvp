import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createCustomImprovementAction, getImprovementActions } from "@/lib/intelligence/actions";
import type {
  ImprovementActionStatus,
  IntelligenceFindingCategory,
  ImprovementEffort,
  ImprovementPriority,
  ImprovementRisk,
} from "@/lib/intelligence/types";

const VALID_STATUSES = new Set(["proposed", "approved", "rejected", "planned", "implemented", "verified", "deferred", "open", "all"]);
const VALID_CATEGORIES = new Set(["pipeline", "product", "cost", "marketing", "pricing", "timing", "risk"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high", "critical"]);
const VALID_EFFORTS = new Set(["small", "medium", "large"]);
const VALID_RISKS = new Set(["low", "medium", "high"]);

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId") ?? undefined;
    const rawStatus = searchParams.get("status") ?? "open";
    const status = VALID_STATUSES.has(rawStatus) ? rawStatus : "open";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

    const actions = await getImprovementActions(getSupabase(), {
      reportId,
      status: status as ImprovementActionStatus | "open" | "all",
      limit,
    });

    return NextResponse.json({ actions });
  } catch (err) {
    console.error("[intelligence/actions/GET]", err);
    return jsonError(err instanceof Error ? err.message : "Klarte ikkje hente forbedringsforslag");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = typeof body.category === "string" && VALID_CATEGORIES.has(body.category)
      ? (body.category as IntelligenceFindingCategory)
      : "product";
    const priority = typeof body.priority === "string" && VALID_PRIORITIES.has(body.priority)
      ? (body.priority as ImprovementPriority)
      : "medium";
    const effort = typeof body.effort === "string" && VALID_EFFORTS.has(body.effort)
      ? (body.effort as ImprovementEffort)
      : "medium";
    const riskLevel = typeof body.riskLevel === "string" && VALID_RISKS.has(body.riskLevel)
      ? (body.riskLevel as ImprovementRisk)
      : "low";

    if (!title || !description) {
      return jsonError("Tittel og beskriving er påkravd", 400);
    }

    const action = await createCustomImprovementAction(getSupabase(), {
      reportId: typeof body.reportId === "string" ? body.reportId : null,
      title,
      description,
      category,
      priority,
      effort,
      riskLevel,
      expectedImpact: typeof body.expectedImpact === "string" ? body.expectedImpact : "Manuelt lagt inn forbedringsforslag.",
    });

    return NextResponse.json({ action }, { status: 201 });
  } catch (err) {
    console.error("[intelligence/actions/POST]", err);
    return jsonError(err instanceof Error ? err.message : "Klarte ikkje lage forbedringsforslag");
  }
}

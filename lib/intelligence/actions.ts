import type { SupabaseClient } from "@supabase/supabase-js";
import {
  INTELLIGENCE_AGENT_VERSION,
  type AgentLearningFeedback,
  type ImprovementAction,
  type ImprovementActionStatus,
  type IntelligenceFindingCategory,
  type IntelligenceRecommendation,
  type LearningFeedbackSummary,
} from "./types";

type AnyRow = Record<string, unknown>;

const OPEN_STATUSES: ImprovementActionStatus[] = ["proposed", "approved", "planned", "deferred"];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function mapDbImprovementAction(row: AnyRow): ImprovementAction {
  return {
    id: String(row.id),
    reportId: row.report_id ? String(row.report_id) : null,
    title: asString(row.title),
    description: asString(row.description),
    category: asString(row.category, "product") as IntelligenceFindingCategory,
    priority: asString(row.priority, "medium") as ImprovementAction["priority"],
    expectedImpact: asString(row.expected_impact),
    effort: asString(row.effort, "medium") as ImprovementAction["effort"],
    riskLevel: asString(row.risk_level, "low") as ImprovementAction["riskLevel"],
    status: asString(row.status, "proposed") as ImprovementActionStatus,
    proposedByAgent: asBoolean(row.proposed_by_agent, true),
    approvedByUser: asBoolean(row.approved_by_user, false),
    implementedAt: row.implemented_at ? String(row.implemented_at) : null,
    resultSummary: row.result_summary ? String(row.result_summary) : null,
    userFeedback: row.user_feedback ? String(row.user_feedback) : null,
    metadata: asMetadata(row.metadata),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapDbLearningFeedback(row: AnyRow): AgentLearningFeedback {
  return {
    id: String(row.id),
    actionId: row.action_id ? String(row.action_id) : null,
    feedbackType: asString(row.feedback_type, "status_update"),
    userRating: typeof row.user_rating === "number" ? row.user_rating : null,
    userComment: row.user_comment ? String(row.user_comment) : null,
    actualOutcome: row.actual_outcome ? String(row.actual_outcome) : null,
    shouldRepeatPattern:
      typeof row.should_repeat_pattern === "boolean" ? row.should_repeat_pattern : null,
    createdAt: asString(row.created_at),
  };
}

export async function getImprovementActions(
  supabase: SupabaseClient,
  options: {
    reportId?: string;
    status?: ImprovementActionStatus | "open" | "all";
    limit?: number;
  } = {},
): Promise<ImprovementAction[]> {
  let query = supabase
    .from("improvement_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(options.limit ?? 50, 200));

  if (options.reportId) query = query.eq("report_id", options.reportId);
  if (options.status === "open") query = query.in("status", OPEN_STATUSES);
  else if (options.status && options.status !== "all") query = query.eq("status", options.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapDbImprovementAction(row as AnyRow));
}

export async function getOpenImprovementActionsForCarryover(
  supabase: SupabaseClient,
  limit = 5,
): Promise<IntelligenceRecommendation[]> {
  const actions = await getImprovementActions(supabase, { status: "open", limit });
  return actions.map((action) => ({
    title: action.title,
    description: `${action.description}\n\nStatus frå førre runde: ${action.status}. ${
      action.userFeedback ? `Siste feedback: ${action.userFeedback}` : "Ingen eksplisitt feedback endå."
    }`,
    category: action.category,
    priority: action.priority,
    expectedImpact: action.expectedImpact,
    effort: action.effort,
    riskLevel: action.riskLevel,
  }));
}

export async function getLearningFeedbackSummary(
  supabase: SupabaseClient,
  limit = 50,
): Promise<LearningFeedbackSummary> {
  const { data, error } = await supabase
    .from("agent_learning_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[intelligence/actions] Klarte ikkje hente læringsfeedback:", error.message);
    return {
      feedbackCount: 0,
      avgRating: null,
      repeatPatternCount: 0,
      doNotRepeatPatternCount: 0,
      recentPositiveSignals: [],
      recentNegativeSignals: [],
    };
  }

  const feedback = (data ?? []).map((row) => mapDbLearningFeedback(row as AnyRow));
  const ratings = feedback
    .map((item) => item.userRating)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const avgRating = ratings.length
    ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
    : null;

  return {
    feedbackCount: feedback.length,
    avgRating,
    repeatPatternCount: feedback.filter((item) => item.shouldRepeatPattern === true).length,
    doNotRepeatPatternCount: feedback.filter((item) => item.shouldRepeatPattern === false).length,
    recentPositiveSignals: feedback
      .filter((item) => item.shouldRepeatPattern === true || (item.userRating ?? 0) >= 4)
      .map((item) => item.userComment || item.actualOutcome)
      .filter((value): value is string => Boolean(value))
      .slice(0, 5),
    recentNegativeSignals: feedback
      .filter((item) => item.shouldRepeatPattern === false || (item.userRating ?? 5) <= 2)
      .map((item) => item.userComment || item.actualOutcome)
      .filter((value): value is string => Boolean(value))
      .slice(0, 5),
  };
}

export async function createCustomImprovementAction(
  supabase: SupabaseClient,
  input: IntelligenceRecommendation & { reportId?: string | null },
): Promise<ImprovementAction> {
  const { data, error } = await supabase
    .from("improvement_actions")
    .insert({
      report_id: input.reportId ?? null,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      expected_impact: input.expectedImpact,
      effort: input.effort,
      risk_level: input.riskLevel,
      status: "proposed",
      proposed_by_agent: false,
      approved_by_user: false,
      metadata: { source: "manual_admin", agent_version: INTELLIGENCE_AGENT_VERSION },
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Klarte ikkje lage forbedringsforslag");
  return mapDbImprovementAction(data as AnyRow);
}

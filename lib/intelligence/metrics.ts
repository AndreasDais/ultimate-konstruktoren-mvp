import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyMetric, IntelligenceSnapshot } from "./types";

type AnyRow = Record<string, unknown>;

type SelectResult = {
  rows: AnyRow[];
  error?: string;
};

function isoDateOnly(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getDayWindow(reportDate = isoDateOnly()): {
  reportDate: string;
  start: string;
  end: string;
} {
  const startDate = new Date(`${reportDate}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  return {
    reportDate,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

async function safeSelectBetween(
  supabase: SupabaseClient,
  table: string,
  select: string,
  dateColumn: string,
  start: string,
  end: string,
  limit = 1000,
): Promise<SelectResult> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .gte(dateColumn, start)
      .lt(dateColumn, end)
      .limit(limit);

    if (error) {
      return { rows: [], error: error.message };
    }

    const rows = Array.isArray(data) ? (data as unknown as AnyRow[]) : [];
    return { rows };
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : String(err) };
  }
}

async function safeProbeTable(
  supabase: SupabaseClient,
  table: string,
): Promise<boolean> {
  try {
    const { error } = await supabase.from(table).select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

function countBy(rows: AnyRow[], key: string, fallback = "ukjent"): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = row[key];
    const label = typeof value === "string" && value.length > 0 ? value : fallback;
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}

function countWhere(rows: AnyRow[], predicate: (row: AnyRow) => boolean): number {
  return rows.reduce((sum, row) => sum + (predicate(row) ? 1 : 0), 0);
}

function uniqueCount(rows: AnyRow[], key: string): number {
  const values = new Set<string>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "string" && value.length > 0) values.add(value);
  }
  return values.size;
}

function averageNumeric(rows: AnyRow[], key: string): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) return null;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

function metric(
  metrics: DailyMetric[],
  key: string,
  value: number,
  sourceTable: string,
  dimension?: Record<string, unknown>,
) {
  metrics.push({ key, value, sourceTable, dimension });
}

function distributionMetrics(
  metrics: DailyMetric[],
  prefix: string,
  sourceTable: string,
  distribution: Record<string, number>,
) {
  for (const [label, value] of Object.entries(distribution)) {
    metric(metrics, `${prefix}.${label}`, value, sourceTable, { label });
  }
}

export async function collectDailyIntelligenceSnapshot(
  supabase: SupabaseClient,
  reportDate?: string,
): Promise<IntelligenceSnapshot> {
  const { reportDate: date, start, end } = getDayWindow(reportDate);

  const [runs, reports, inputReviews, controllerDecisions, comparisons, errorReports] =
    await Promise.all([
      safeSelectBetween(
        supabase,
        "calculation_runs",
        "id, run_status, calculation_type, user_id, started_at, completed_at",
        "started_at",
        start,
        end,
      ),
      safeSelectBetween(
        supabase,
        "reports",
        "id, run_id, document_id, tillit_score, prompt_version, created_at",
        "created_at",
        start,
        end,
      ),
      safeSelectBetween(
        supabase,
        "input_reviews",
        "id, input_status, calculation_type, confidence, missing_inputs, cannot_calculate, created_at",
        "created_at",
        start,
        end,
      ),
      safeSelectBetween(
        supabase,
        "controller_decisions",
        "id, run_id, decision_status, risk_level, manual_review_required, created_at",
        "created_at",
        start,
        end,
      ),
      safeSelectBetween(
        supabase,
        "comparisons",
        "id, run_id, match_status, recommended_status, created_at",
        "created_at",
        start,
        end,
      ),
      safeSelectBetween(
        supabase,
        "error_reports",
        "id, error_type, severity_user, status, created_at",
        "created_at",
        start,
        end,
      ),
    ]);

  const runStatus = countBy(runs.rows, "run_status");
  const calculationTypes = countBy(
    [...runs.rows, ...inputReviews.rows],
    "calculation_type",
    "uklassifisert",
  );
  const inputStatus = countBy(inputReviews.rows, "input_status");
  const controllerStatus = countBy(controllerDecisions.rows, "decision_status");
  const comparisonStatus = countBy(comparisons.rows, "match_status");
  const errorTypes = countBy(errorReports.rows, "error_type");

  const metrics: DailyMetric[] = [];
  metric(metrics, "runs.total", runs.rows.length, "calculation_runs");
  metric(metrics, "runs.completed", runStatus.completed ?? 0, "calculation_runs");
  metric(metrics, "reports.generated", reports.rows.length, "reports");
  metric(metrics, "input_reviews.total", inputReviews.rows.length, "input_reviews");
  metric(
    metrics,
    "controller.uncertain_or_rejected",
    countWhere(controllerDecisions.rows, (row) =>
      ["uncertain", "rejected"].includes(String(row.decision_status ?? "")),
    ),
    "controller_decisions",
  );
  metric(
    metrics,
    "comparisons.with_deviation",
    countWhere(comparisons.rows, (row) =>
      ["minor_differences", "significant_differences", "critical_disagreement"].includes(
        String(row.match_status ?? ""),
      ),
    ),
    "comparisons",
  );
  metric(metrics, "error_reports.total", errorReports.rows.length, "error_reports");

  distributionMetrics(metrics, "runs.status", "calculation_runs", runStatus);
  distributionMetrics(metrics, "calculation_type", "calculation_runs/input_reviews", calculationTypes);
  distributionMetrics(metrics, "input.status", "input_reviews", inputStatus);
  distributionMetrics(metrics, "controller.status", "controller_decisions", controllerStatus);
  distributionMetrics(metrics, "comparison.status", "comparisons", comparisonStatus);
  distributionMetrics(metrics, "error.type", "error_reports", errorTypes);

  const avgTillitScore = averageNumeric(reports.rows, "tillit_score");
  if (avgTillitScore !== null) metric(metrics, "reports.avg_tillit_score", avgTillitScore, "reports");

  const lowTillitReports = countWhere(reports.rows, (row) => {
    const score = row.tillit_score;
    return typeof score === "number" && score < 70;
  });
  metric(metrics, "reports.low_tillit", lowTillitReports, "reports");

  const inputBlockedOrIncomplete = countWhere(inputReviews.rows, (row) => {
    const status = String(row.input_status ?? "").toLowerCase();
    return ["mangelfull", "avvist", "uklar", "delvis_klar", "relevant_ikkje_stotta"].includes(status);
  });

  const [hasCostEvents, hasMarketingEvents, hasPricingEvents, hasExportEvents] =
    await Promise.all([
      safeProbeTable(supabase, "cost_events"),
      safeProbeTable(supabase, "marketing_events"),
      safeProbeTable(supabase, "pricing_events"),
      safeProbeTable(supabase, "export_events"),
    ]);

  return {
    reportDate: date,
    windowStart: start,
    windowEnd: end,
    metrics,
    counts: {
      runsTotal: runs.rows.length,
      runsCompleted: runStatus.completed ?? 0,
      reportsGenerated: reports.rows.length,
      inputReviewsTotal: inputReviews.rows.length,
      inputBlockedOrIncomplete,
      controllerTotal: controllerDecisions.rows.length,
      controllerApproved:
        (controllerStatus.approved ?? 0) + (controllerStatus.approved_with_warnings ?? 0),
      controllerUncertainOrRejected: (controllerStatus.uncertain ?? 0) + (controllerStatus.rejected ?? 0),
      comparisonsTotal: comparisons.rows.length,
      comparisonsWithDeviation: countWhere(comparisons.rows, (row) =>
        ["minor_differences", "significant_differences", "critical_disagreement"].includes(
          String(row.match_status ?? ""),
        ),
      ),
      errorReportsTotal: errorReports.rows.length,
      activeUsersApprox: uniqueCount(runs.rows, "user_id"),
    },
    distributions: {
      runStatus,
      calculationTypes,
      inputStatus,
      controllerStatus,
      comparisonStatus,
      errorTypes,
    },
    quality: {
      avgTillitScore,
      lowTillitReports,
    },
    instrumentation: {
      hasCostEvents,
      hasMarketingEvents,
      hasPricingEvents,
      hasExportEvents,
    },
  };
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PilotFeedbackRow } from "@/lib/pilot/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CountResult = { count: number; error?: string };

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase URL or service role key for pilot metrics API.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type AdminSupabaseClient = ReturnType<typeof getAdminClient>;

async function safeCount(
  supabase: AdminSupabaseClient,
  table: string,
  since?: string,
  dateColumn = "created_at",
): Promise<CountResult> {
  try {
    let query = supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (since) {
      query = query.gte(dateColumn, since);
    }

    const { count, error } = await query;

    if (error) {
      const message = error.message ?? String(error);
      console.warn(`[pilot metrics] Count failed for ${table}:`, message);
      return { count: 0, error: `${table}: ${message}` };
    }

    return { count: count ?? 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[pilot metrics] Count crashed for ${table}:`, message);
    return { count: 0, error: `${table}: ${message}` };
  }
}

export async function GET() {
  try {
    const supabase = getAdminClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = today.toISOString();

    const [runsToday, reportsToday, errorsToday, feedbackToday, totalFeedback] =
      await Promise.all([
        // calculation_runs bruker started_at, ikkje created_at.
        safeCount(supabase, "calculation_runs", since, "started_at"),
        safeCount(supabase, "reports", since, "created_at"),
        safeCount(supabase, "error_reports", since, "created_at"),
        safeCount(supabase, "pilot_feedback", since, "created_at"),
        safeCount(supabase, "pilot_feedback"),
      ]);

    const { data: feedbackRows, error: feedbackError } = await supabase
      .from("pilot_feedback")
      .select("id, run_id, rating, trust_level, use_case, comment, source, report_url, created_at")
      .order("created_at", { ascending: false })
      .limit(12);

    const recentFeedback = Array.isArray(feedbackRows)
      ? (feedbackRows as unknown as PilotFeedbackRow[])
      : [];

    const errors = [
      runsToday.error,
      reportsToday.error,
      errorsToday.error,
      feedbackToday.error,
      totalFeedback.error,
    ].filter(Boolean) as string[];

    if (feedbackError) {
      errors.push(`pilot_feedback recent: ${feedbackError.message}`);
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      cards: [
        { key: "runs_today", label: "Pipeline-køyringar i dag", value: runsToday.count },
        { key: "reports_today", label: "Rapportar i dag", value: reportsToday.count },
        { key: "errors_today", label: "Feilrapportar i dag", value: errorsToday.count },
        { key: "feedback_today", label: "Pilotfeedback i dag", value: feedbackToday.count },
        { key: "feedback_total", label: "Pilotfeedback totalt", value: totalFeedback.count },
      ],
      recentFeedback,
      readiness: {
        buildGreen: null,
        supabaseMigration: !totalFeedback.error && !feedbackError,
        feedbackFlow: !feedbackToday.error && !feedbackError,
        adminDashboard: true,
      },
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

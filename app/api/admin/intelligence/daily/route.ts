import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateDailyIntelligenceReport, mapDbReport } from "@/lib/intelligence/generate-report";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function getDateParam(request: Request): string | undefined {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const date = getDateParam(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 7), 30);

    let query = supabase
      .from("daily_intelligence_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(limit);

    if (date) query = query.eq("report_date", date);

    const { data, error } = await query;
    if (error) {
      console.error("[intelligence/daily/GET]", error);
      return jsonError("Klarte ikkje hente intelligence-rapportar");
    }

    return NextResponse.json({
      reports: (data ?? []).map((row) => mapDbReport(row as Record<string, unknown>)),
    });
  } catch (err) {
    console.error("[intelligence/daily/GET]", err);
    return jsonError(err instanceof Error ? err.message : "Ukjend feil");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const reportDate = typeof body.reportDate === "string" ? body.reportDate : getDateParam(request);
    const force = body.force === true;

    const supabase = getSupabase();
    const report = await generateDailyIntelligenceReport(supabase, {
      reportDate,
      force,
    });

    return NextResponse.json({ report });
  } catch (err) {
    console.error("[intelligence/daily/POST]", err);
    return jsonError(err instanceof Error ? err.message : "Klarte ikkje lage intelligence-rapport");
  }
}

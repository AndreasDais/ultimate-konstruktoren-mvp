import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getImprovementActions } from "@/lib/intelligence/actions";
import { mapDbReport } from "@/lib/intelligence/generate-report";
import { renderDailyIntelligenceMarkdown } from "@/lib/intelligence/render-markdown";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const reportId = searchParams.get("reportId");
    const supabase = getSupabase();

    let query = supabase
      .from("daily_intelligence_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(1);

    if (reportId) query = query.eq("id", reportId);
    else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) query = query.eq("report_date", date);

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      console.error("[intelligence/daily/markdown/GET]", error);
      return jsonError("Fann ikkje intelligence-rapport", 404);
    }

    const report = mapDbReport(data as Record<string, unknown>);
    const actions = await getImprovementActions(supabase, {
      reportId: report.id,
      status: "all",
      limit: 200,
    });

    const markdown = renderDailyIntelligenceMarkdown(report, actions);
    const filename = safeFilename(`pilar-intelligence-${report.reportDate}.md`);

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[intelligence/daily/markdown/GET]", err);
    return jsonError(err instanceof Error ? err.message : "Klarte ikkje eksportere Markdown");
  }
}

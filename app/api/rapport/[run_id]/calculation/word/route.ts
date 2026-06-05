import { NextRequest, NextResponse } from "next/server";
import { Packer } from "docx";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/locale";
import { buildReportModel, type UpstreamReportData } from "@/lib/report/build-report-model";
import { buildCalculationSheetModel } from "@/lib/report/calculation-sheet-model";
import { renderCalculationSheetDocx } from "@/lib/report/render-calculation-docx";
import { validateReportModel } from "@/lib/report/validate-report-model";

function safeFilename(value: string): string {
  return (value || "pilar-beregning")
    .replace(/[^a-zA-Z0-9æøåÆØÅ._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ run_id: string }> },
) {
  let stage = "init";
  const locale = getLocaleFromCookies(await cookies());

  try {
    stage = "params";
    const { run_id } = await context.params;
    if (!run_id) {
      return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    }

    stage = "fetch_agent_e";
    const origin = request.nextUrl.origin;
    const cookieHeader = request.headers.get("cookie") ?? "";

    const agentERes = await fetch(`${origin}/api/agent-e`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ run_id, locale }),
    });

    if (!agentERes.ok) {
      return NextResponse.json(
        { error: "Kunne ikke hente rapport-data" },
        { status: agentERes.status },
      );
    }

    stage = "parse_agent_e";
    const upstream: UpstreamReportData = await agentERes.json();

    stage = "build_models";
    const reportUrl = `${origin}/rapport/${run_id}`;
    const reportModel = buildReportModel(upstream, {
      locale,
      reportUrl,
      audience: "student",
    });

    const validation = validateReportModel(reportModel);
    if (!validation.ok || validation.warnings.length > 0) {
      console.warn("Calculation Word export: report model validation", {
        run_id,
        ok: validation.ok,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    const sheet = buildCalculationSheetModel(reportModel);
    const doc = await renderCalculationSheetDocx(sheet);
    const buffer = await Packer.toBuffer(doc);
    const body = new Uint8Array(buffer);
    const filename = safeFilename(`${sheet.meta.documentId}-beregning`);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : typeof error;
    const messageLength = error instanceof Error ? error.message.length : String(error).length;
    console.error("Calculation Word export error:", {
      stage,
      error_name: errorName,
      message_length: messageLength,
    });
    return NextResponse.json({ error: "Ukjent feil" }, { status: 500 });
  }
}

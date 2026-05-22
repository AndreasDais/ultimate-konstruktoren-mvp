import { NextRequest, NextResponse } from "next/server";
import { Packer } from "docx";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/locale";
import {
  buildReportModel,
  type UpstreamReportData,
} from "@/lib/report/build-report-model";
import { validateReportModel } from "@/lib/report/validate-report-model";
import { renderReportModelDocx } from "@/lib/report/render-docx";

const ERROR_LABELS = {
  nb: {
    couldNotFetch: "Kunne ikke hente rapport-data",
    unknown: "Ukjent feil",
  },
  nn: {
    couldNotFetch: "Kunne ikkje hente rapport-data",
    unknown: "Ukjend feil",
  },
} as const;

function safeFilename(value: string): string {
  return (value || "pilar-rapport")
    .replace(/[^a-zA-Z0-9æøåÆØÅ._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ run_id: string }> },
) {
  const requestStart = Date.now();
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
      const errBody = await agentERes.json().catch(() => ({}));
      console.error("Word export: agent-e fetch failed", {
        run_id,
        status: agentERes.status,
        body: errBody,
        had_cookie: cookieHeader.length > 0,
      });
      return NextResponse.json(
        { error: errBody.error || ERROR_LABELS[locale].couldNotFetch, stage },
        { status: agentERes.status },
      );
    }

    stage = "parse_agent_e";
    const upstream: UpstreamReportData = await agentERes.json();

    stage = "build_report_model";
    const reportUrl = `${origin}/rapport/${run_id}`;
    const model = buildReportModel(upstream, {
      locale,
      reportUrl,
      audience: "engineer",
    });

    stage = "validate_report_model";
    const validation = validateReportModel(model);
    if (!validation.ok || validation.warnings.length > 0) {
      console.warn("Word export: report model validation", {
        run_id,
        ok: validation.ok,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    stage = "render_docx";
    const doc = await renderReportModelDocx(model, { validation });

    stage = "pack_docx";
    const buffer = await Packer.toBuffer(doc);

    stage = "respond";
    const body = new Uint8Array(buffer);
    const filename = safeFilename(model.meta.documentId || `PILAR-${run_id}`);

    console.log("Word export: success", {
      run_id,
      document_id: model.meta.documentId,
      elapsed_ms: Date.now() - requestStart,
      size_bytes: body.length,
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ERROR_LABELS[locale].unknown;
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Word export error:", { stage, message, stack });
    return NextResponse.json({ error: message, stage }, { status: 500 });
  }
}

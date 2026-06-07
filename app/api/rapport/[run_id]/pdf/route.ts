import { NextRequest, NextResponse } from "next/server";
import { launchPdfBrowser, type PdfBrowser } from "@/lib/report/pdf-browser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(value: string): string {
  return (value || "pilar-rapport")
    .replace(/[^a-zA-Z0-9æøåÆØÅ._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function reportPageUrl(request: NextRequest, runId: string): string {
  const url = new URL(`/rapport/${runId}`, request.nextUrl.origin);
  const shareToken = request.nextUrl.searchParams.get("share");
  if (shareToken) {
    url.searchParams.set("share", shareToken);
  }
  return url.toString();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ run_id: string }> },
) {
  const requestStart = Date.now();
  let stage = "init";
  let browser: PdfBrowser | null = null;

  try {
    stage = "params";
    const { run_id } = await context.params;
    if (!run_id) {
      return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    }

    stage = "launch_puppeteer";
    browser = await launchPdfBrowser();

    stage = "open_page";
    const page = await browser.newPage();
    const cookieHeader = request.headers.get("cookie") ?? "";
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ Cookie: cookieHeader });
    }
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });

    stage = "navigate_report";
    await page.goto(reportPageUrl(request, run_id), {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    stage = "wait_for_report";
    await page.waitForSelector('[data-report-ready="true"]', {
      timeout: 90_000,
    });

    stage = "prepare_print";
    await page.emulateMediaType("print");
    const documentId = await page.evaluate(() => {
      document.querySelectorAll("details").forEach((details) => {
        details.open = true;
      });
      document.documentElement.dataset.pilarExport = "pdf";
      return document
        .querySelector("[data-report-document-id]")
        ?.getAttribute("data-report-document-id") ?? "";
    });

    stage = "render_pdf";
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "16mm",
        right: "15mm",
        bottom: "18mm",
        left: "15mm",
      },
    });

    const filename = safeFilename(documentId || `PILAR-${run_id.slice(0, 8)}`);
    console.log("Report PDF export: success", {
      run_id,
      document_id: documentId || null,
      elapsed_ms: Date.now() - requestStart,
      size_bytes: pdf.length,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : typeof error;
    const messageLength = error instanceof Error ? error.message.length : String(error).length;
    console.error("Report PDF export error:", {
      stage,
      error_name: errorName,
      message_length: messageLength,
    });
    return NextResponse.json({ error: "Ukjent feil" }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

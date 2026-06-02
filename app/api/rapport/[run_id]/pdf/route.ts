import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PuppeteerModule = {
  default?: {
    launch: (options: Record<string, unknown>) => Promise<PuppeteerBrowser>;
  };
  launch?: (options: Record<string, unknown>) => Promise<PuppeteerBrowser>;
};

type PuppeteerBrowser = {
  newPage: () => Promise<PuppeteerPage>;
  close: () => Promise<void>;
};

type PuppeteerPage = {
  setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<void>;
  setViewport: (viewport: { width: number; height: number; deviceScaleFactor?: number }) => Promise<void>;
  goto: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
  waitForSelector: (selector: string, options?: Record<string, unknown>) => Promise<unknown>;
  emulateMediaType: (type: "screen" | "print") => Promise<void>;
  pdf: (options: Record<string, unknown>) => Promise<Buffer>;
};

function safeFilename(value: string): string {
  return (value || "pilar-rapport")
    .replace(/[^a-zA-Z0-9æøåÆØÅ._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

async function loadPuppeteer(): Promise<PuppeteerModule> {
  try {
    const moduleName = "puppeteer";
    return (await import(moduleName)) as PuppeteerModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PDF-motoren manglar. Installer puppeteer først: npm install puppeteer. Detalj: ${message}`,
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ run_id: string }> },
) {
  let stage = "init";
  let browser: PuppeteerBrowser | null = null;

  try {
    stage = "params";
    const { run_id } = await context.params;
    if (!run_id) {
      return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    }

    stage = "locale";
    const locale = getLocaleFromCookies(await cookies());
    const origin = request.nextUrl.origin;
    const cookieHeader = request.headers.get("cookie") ?? "";

    stage = "launch_puppeteer";
    const puppeteerModule = await loadPuppeteer();
    const launcher = puppeteerModule.default?.launch ?? puppeteerModule.launch;
    if (!launcher) {
      throw new Error("Kunne ikkje starte puppeteer: launch() manglar.");
    }

    browser = await launcher({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=medium",
      ],
    });

    stage = "open_page";
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ Cookie: cookieHeader });
    }

    const url = `${origin}/rapport/${run_id}?print=1&locale=${locale}`;
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 90_000,
    });

    stage = "wait_for_report";
    await page.waitForSelector('[data-report-ready="true"]', {
      timeout: 90_000,
    });

    stage = "render_pdf";
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "18mm",
        right: "16mm",
        bottom: "18mm",
        left: "16mm",
      },
    });

    const filename = safeFilename(`PILAR-${run_id.slice(0, 8)}-rapport`);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Report PDF export error:", { stage, message, stack });
    return NextResponse.json({ error: message, stage }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

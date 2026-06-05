import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/locale";
import {
  buildReportModel,
  type UpstreamReportData,
} from "@/lib/report/build-report-model";
import type { ReportModel } from "@/lib/report/report-model";
import { validateReportModel } from "@/lib/report/validate-report-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 48;
const LINE_HEIGHT = 15;
const TITLE_LINE_HEIGHT = 19;
const MAX_BODY_CHARS = 88;
const MAX_TITLE_CHARS = 58;

const PDF_LABELS = {
  nb: {
    document: "Dokument",
    status: "Status",
    date: "Dato",
    summary: "Sammendrag",
    keyResults: "Nøkkelresultater",
    results: "Resultater",
    steps: "Beregningssteg",
    assessment: "Faglig vurdering",
    warnings: "Varsler",
    limitations: "Begrensninger",
    control: "Kontroll",
    conclusion: "Konklusjon",
    disclaimer: "Forbehold",
  },
  nn: {
    document: "Dokument",
    status: "Status",
    date: "Dato",
    summary: "Samandrag",
    keyResults: "Nøkkelresultat",
    results: "Resultat",
    steps: "Berekningssteg",
    assessment: "Fagleg vurdering",
    warnings: "Varsel",
    limitations: "Avgrensingar",
    control: "Kontroll",
    conclusion: "Konklusjon",
    disclaimer: "Atterhald",
  },
  en: {
    document: "Document",
    status: "Status",
    date: "Date",
    summary: "Summary",
    keyResults: "Key results",
    results: "Results",
    steps: "Calculation steps",
    assessment: "Professional assessment",
    warnings: "Warnings",
    limitations: "Limitations",
    control: "Control",
    conclusion: "Conclusion",
    disclaimer: "Disclaimer",
  },
} as const;

function safeFilename(value: string): string {
  return (value || "pilar-rapport")
    .replace(/[^a-zA-Z0-9æøåÆØÅ._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function cleanPdfText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function wrapText(value: string, maxChars: number): string[] {
  const text = cleanPdfText(value);
  if (!text) {
    return [];
  }

  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
      } else if (`${line} ${word}`.length <= maxChars) {
        line = `${line} ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) {
      lines.push(line);
    }
    lines.push("");
  }

  while (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function pdfHexText(value: string): string {
  const bytes = [0xfe, 0xff];
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    bytes.push((code >> 8) & 0xff, code & 0xff);
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}>`;
}

type PdfLine = {
  text: string;
  size: number;
  bold?: boolean;
};

function addWrapped(lines: PdfLine[], text: string, options: { size?: number; bold?: boolean; title?: boolean } = {}) {
  const wrapped = wrapText(text, options.title ? MAX_TITLE_CHARS : MAX_BODY_CHARS);
  for (const line of wrapped) {
    lines.push({ text: line, size: options.size ?? 10, bold: options.bold });
  }
}

function addSection(lines: PdfLine[], title: string, body: string | string[]) {
  lines.push({ text: "", size: 10 });
  addWrapped(lines, title, { size: 12, bold: true });
  const paragraphs = Array.isArray(body) ? body : [body];
  for (const paragraph of paragraphs) {
    addWrapped(lines, paragraph, { size: 10 });
  }
}

function reportModelToPdfLines(model: ReportModel): PdfLine[] {
  const labels = PDF_LABELS[model.meta.displayLanguage ?? model.meta.locale] ?? PDF_LABELS.nb;
  const lines: PdfLine[] = [];
  addWrapped(lines, model.cover.title, { size: 16, bold: true, title: true });
  addWrapped(lines, model.cover.subtitle, { size: 10 });
  addWrapped(lines, `${labels.document}: ${model.meta.documentId}`, { size: 9 });
  addWrapped(lines, `${labels.status}: ${model.meta.status}`, { size: 9 });
  addWrapped(lines, `${labels.date}: ${model.meta.displayDate}`, { size: 9 });

  addSection(lines, labels.summary, model.summary.text);
  if (model.keyResults.length > 0) {
    addSection(
      lines,
      labels.keyResults,
      model.keyResults.map((row) => `${row.label}: ${row.raw}`),
    );
  }
  if (model.calculation.resultRows.length > 0) {
    addSection(
      lines,
      labels.results,
      model.calculation.resultRows.map((row) => `${row.label}: ${row.raw}`),
    );
  }
  if (model.calculation.steps.length > 0) {
    addSection(
      lines,
      labels.steps,
      model.calculation.steps.flatMap((step) => [
        `${step.number}. ${step.title}`,
        step.prose,
        ...step.formulas,
      ]),
    );
  }
  addSection(lines, labels.assessment, model.assessment.professionalAssessment);
  if (model.assessment.warnings.length > 0) {
    addSection(lines, labels.warnings, model.assessment.warnings);
  }
  if (model.assessment.limitations.length > 0) {
    addSection(lines, labels.limitations, model.assessment.limitations);
  }
  addSection(lines, labels.control, model.control.controllerText);
  addSection(lines, labels.conclusion, model.conclusion);
  addSection(lines, labels.disclaimer, model.disclaimer);
  return lines;
}

function renderPdfPage(lines: PdfLine[]): string {
  const commands: string[] = [];
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  for (const line of lines) {
    if (!line.text) {
      y -= LINE_HEIGHT / 2;
      continue;
    }
    const font = line.bold ? "F2" : "F1";
    const lineHeight = line.size >= 12 ? TITLE_LINE_HEIGHT : LINE_HEIGHT;
    commands.push(`BT /${font} ${line.size} Tf ${PAGE_MARGIN} ${y.toFixed(2)} Td ${pdfHexText(line.text)} Tj ET`);
    y -= lineHeight;
  }
  return commands.join("\n");
}

function chunkPdfLines(lines: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  for (const line of lines) {
    const lineHeight = !line.text ? LINE_HEIGHT / 2 : line.size >= 12 ? TITLE_LINE_HEIGHT : LINE_HEIGHT;
    if (current.length > 0 && y - lineHeight < PAGE_MARGIN) {
      pages.push(current);
      current = [];
      y = PAGE_HEIGHT - PAGE_MARGIN;
    }
    current.push(line);
    y -= lineHeight;
  }

  if (current.length > 0) {
    pages.push(current);
  }
  return pages;
}

function buildReportPdfBytes(model: ReportModel): Uint8Array {
  const pages = chunkPdfLines(reportModelToPdfLines(model));
  const pageObjectStart = 5;
  const contentObjectStart = pageObjectStart + pages.length;
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${pageObjectStart + index} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  pages.forEach((_, index) => {
    const contentObjectId = contentObjectStart + index;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
  });

  pages.forEach((pageLines) => {
    const stream = renderPdfPage(pageLines);
    objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
  });

  const offsets = [0];
  let body = "%PDF-1.4\n";
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    body += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(body, "utf8"));
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
      console.error("PDF export: agent-e fetch failed", {
        run_id,
        status: agentERes.status,
        had_cookie: cookieHeader.length > 0,
      });
      return NextResponse.json(
        { error: ERROR_LABELS[locale].couldNotFetch },
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
      console.warn("PDF export: report model validation", {
        run_id,
        ok: validation.ok,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    stage = "render_pdf";
    const pdf = buildReportPdfBytes(model);
    const filename = safeFilename(model.meta.documentId || `PILAR-${run_id}`);

    console.log("PDF export: success", {
      run_id,
      document_id: model.meta.documentId,
      elapsed_ms: Date.now() - requestStart,
      size_bytes: pdf.length,
    });

    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new NextResponse(body, {
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
    return NextResponse.json({ error: ERROR_LABELS[locale].unknown }, { status: 500 });
  }
}

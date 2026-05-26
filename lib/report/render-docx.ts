import { AlignmentType, BorderStyle, convertInchesToTwip, Document, ExternalHyperlink, Footer, Header, ImageRun, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, } from "docx";
import QRCode from "qrcode";
import { polishEnglishGeneratedText, sprint335PolishEnglishText } from "@/lib/international/display";
import type { Locale } from "@/lib/locale";
import type { PilarDisplayLanguage } from "@/lib/international/display";
import type {
  KeyResult,
  PipelineStatusRow,
  ReportModel,
  ReportValidationResult,
} from "./report-model";
import { normalizeCalculationSyntaxText } from "./normalize-report-model";

function sprint339FinalNorwegianResidueText(value: string): string {
  return String(value ?? "")
    .replace(/FORELØPIG GODKJENT/g, "PRELIMINARILY APPROVED")
    .replace(/MINDRE FORSKJELLER/g, "MINOR DIFFERENCES")
    .replace(/BEGGE KONSTRUKTØRER ER ENIGE/g, "BOTH ENGINEERS AGREE")
    .replace(/ØVRIG/g, "OTHER")
    .replace(/GOD/g, "GOOD")
    .replace(/Beregningen er godkjent for visning. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering./g, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/De kom frem til samme resultat./g, "They reached the same result.")
    .replace(/Engineer A and B er fullstendig enige om alle dimensjonerende verdier./g, "Engineer A and Engineer B fully agree on all design values.")
    .replace(/Engineer A og B har minor differences/g, "Engineer A and Engineer B have minor differences")
    .replace(/Engineer B reports HIGH confidence på sin uavhengige løsning./g, "Engineer B reports HIGH confidence in its independent solution.")
    .replace(/HIGH her betyr at B er trygg på egen metode — at A and B er enige er en separat sjekk (se verdikt over)./g, "HIGH means that Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check (see verdict above).")
    .replace(/Self-assessment — ikke en uavhengig verifikasjon./g, "Self-assessment — not an independent verification.")
    .replace(/Engineer A og Engineer B/g, "Engineer A and Engineer B")
    .replace(/Engineer A og B/g, "Engineer A and Engineer B")
    .replace(/A og B/g, "Engineer A and Engineer B")
    .replace(/er fullstendig enige/g, "fully agree")
    .replace(/dimensjonerende verdier/g, "design values")
    .replace(/på sin uavhengige løsning/g, "in its independent solution")
    .replace(/HIGH her betyr/g, "HIGH means")
    .replace(/egen metode/g, "its own method")
    .replace(/se verdikt over/g, "see verdict above")
    .replace(/same grunnleggjande metode/g, "the same basic method")
    .replace(/brukar/g, "use")
    .replace(/bruker/g, "use")
    .replace(/medan/g, "while")
    .replace(/berre/g, "only")
    .replace(/hovudformelen/g, "the main formula")
    .replace(/utrekningsrute/g, "calculation route")
    .replace(/ein alternativ/g, "an alternative")
    .replace(/som ein intern kryssjekk/g, "as an internal cross-check")
    .replace(/Dette er ei forskjell i presentasjonsform, ikkje i metode./g, "This is a presentation difference, not a methodological difference.")
    .replace(/lastfaktorane/g, "load factors")
    .replace(/som eigne resultatfelt/g, "as separate result fields")
    .replace(/tekstbeskrivinga/g, "the text description")
    .replace(/Innhaldet er likeverdig men strukturen er ulik./g, "The content is equivalent, but the structure differs.")
    .replace(/Begge konstruktørar/g, "Both engineers")
    .replace(/Begge konstruktører/g, "Both engineers")
    .replace(/konstruktørar/g, "engineers")
    .replace(/konstruktører/g, "engineers")
    .replace(/Konstruktør A/g, "Engineer A")
    .replace(/Konstruktør B/g, "Engineer B")
    .replace(/Konstruktør/g, "Engineer")
    .replace(/Cb-antaginga/g, "The Cb assumption")
    .replace(/antaginga/g, "assumption")
    .replace(/føresetnad/g, "assumption")
    .replace(/føresetnader/g, "assumptions")
    .replace(/sjølve/g, "itself")
    .replace(/Ingen forskjell/g, "No difference")
    .replace(/ingen forskjell/g, "no difference")
    .replace(/mellomledd/g, "intermediate value");
}


const FONT_SANS = "Aptos";
const FONT_SERIF = "Georgia";
const FONT_MONO = "Consolas";

const COLOR_INK = "171717";
const COLOR_MUTED = "666666";
const COLOR_FAINT = "A3A3A3";
const COLOR_BORDER = "D8D3C8";
const COLOR_PAPER = "FAF7EF";
const COLOR_DARK = "1F1D18";
const COLOR_GOLD = "B9821A";
const COLOR_WARN_BG = "FFF7E1";
const COLOR_WARN_BORDER = "D4A017";
const COLOR_BLUE_BG = "EEF4FF";
const COLOR_BLUE_BORDER = "4A73A8";
const COLOR_OK_BG = "F2F8F4";
const COLOR_OK_BORDER = "5D8A6B";

const TRANSPARENT_PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

type DocChild = Paragraph | Table;

type RenderDocxOptions = {
  validation?: ReportValidationResult;
};

const LABELS: Record<string, Record<PilarDisplayLanguage, string>> = {
  eyebrow: { nb: "BEREGNINGSNOTAT", nn: "BEREKNINGSNOTAT", en: "CALCULATION NOTE" },
  documentId: { nb: "Dokument-ID", nn: "Dokument-ID", en: "DOCUMENT ID" },
  date: { nb: "Dato", nn: "Dato", en: "DATE" },
  status: { nb: "Status", nn: "Status", en: "STATUS" },
  version: { nb: "Versjon", nn: "Versjon", en: "VERSION" },
  netPipeline: { nb: "Nettversjon + pipeline", nn: "Nettversjon + pipeline", en: "Web version + pipeline" },
  reportUrl: { nb: "Rapportlenke", nn: "Rapportlenkje", en: "Report link" },
  keyResults: { nb: "Nøkkelresultater", nn: "Nøkkelresultat", en: "Key results" },
  trustScore: { nb: "Tillit-skår", nn: "Tillit-skår", en: "TRUST SCORE" },
  pipelineStatus: { nb: "Pipeline-status", nn: "Pipeline-status", en: "PIPELINE STATUS" },
  importantNote: { nb: "Viktig merknad", nn: "Viktig merknad", en: "IMPORTANT NOTE" },
  summary: { nb: "Sammendrag", nn: "Samandrag", en: "Summary" },
  request: { nb: "Forespørsel", nn: "Førespurnad", en: "Request" },
  input: { nb: "Input og forutsetninger", nn: "Input og føresetnader", en: "Input and assumptions" },
  assumptions: { nb: "Forutsetninger", nn: "Føresetnader", en: "Assumptions" },
  results: { nb: "Resultat", nn: "Resultat", en: "Results" },
  calculation: { nb: "Stegvis beregning", nn: "Stegvis utrekning", en: "Step-by-step calculation" },
  assessment: { nb: "Faglig vurdering", nn: "Fagleg vurdering", en: "Engineering assessment" },
  limitations: { nb: "Hva er ikke beregnet", nn: "Kva er ikkje rekna", en: "What is not calculated" },
  warnings: { nb: "Advarsler", nn: "Åtvaringar", en: "Warnings" },
  control: { nb: "Kontroll", nn: "Kontroll", en: "Review" },
  constructorControl: { nb: "Konstruktørkontroll", nn: "Konstruktørkontroll", en: "Engineer comparison" },
  decision: { nb: "Kontrollørens avgjørelse", nn: "Kontrolløren si avgjerd", en: "Controller decision" },
  conclusion: { nb: "Konklusjon", nn: "Konklusjon", en: "Conclusion" },
  signature: { nb: "Kontroll og signatur", nn: "Kontroll og signatur", en: "Review and signature" },
  checkedBy: { nb: "Kontrollert av", nn: "Kontrollert av", en: "REVIEWED BY" },
  signed: { nb: "Signatur", nn: "Signatur", en: "SIGNATURE" },
  manualSignature: { nb: "Manuell signering", nn: "Manuell signering", en: "Manual signature" },
  generatedBy: { nb: "Generert av Pilar", nn: "Generert av Pilar", en: "Generated by Pilar" },
  notControlled: { nb: "Må kontrolleres av fagperson før bruk i prosjektering.", nn: "Må kontrollerast av fagperson før bruk i prosjektering.", en: "Must be checked by a qualified professional before use in design work." },
  validation: { nb: "Rapportmodell-varsel", nn: "Rapportmodell-varsel", en: "Report model warning" },
  size: { nb: "Størrelse", nn: "Storleik", en: "Quantity" },
  value: { nb: "Verdi", nn: "Verdi", en: "Value" },
  a: { nb: "Konstruktør A", nn: "Konstruktør A", en: "Engineer A" },
  b: { nb: "Konstruktør B", nn: "Konstruktør B", en: "Engineer B" },
  match: { nb: "Samsvar", nn: "Samsvar", en: "Match" },
};

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n").replace(/\uFFFE/g, "").trim();
}

function toRunLines(
  text: string,
  options: { font?: string; size?: number; color?: string; bold?: boolean; italics?: boolean } = {},
): TextRun[] {
  const lines = cleanText(text).split("\n");
  const runs: TextRun[] = [];
  lines.forEach((line, index) => {
    runs.push(new TextRun({
      text: line,
      break: index === 0 ? undefined : 1,
      font: options.font ?? FONT_SERIF,
      size: options.size ?? 21,
      color: options.color ?? COLOR_INK,
      bold: options.bold,
      italics: options.italics,
    }));
  });
  return runs.length > 0 ? runs : [new TextRun({ text: "", font: options.font ?? FONT_SERIF, size: options.size ?? 21 })];
}

function p(
  text: string,
  options: { after?: number; before?: number; size?: number; font?: string; color?: string; bold?: boolean; italics?: boolean; line?: number } = {},
): Paragraph {
  return new Paragraph({
    children: toRunLines(text, {
      font: options.font ?? FONT_SERIF,
      size: options.size ?? 21,
      color: options.color ?? COLOR_INK,
      bold: options.bold,
      italics: options.italics,
    }),
    spacing: { before: options.before ?? 0, after: options.after ?? 170, line: options.line ?? 300 },
  });
}

function spacer(after = 160): Paragraph {
  return new Paragraph({ children: [], spacing: { after } });
}

function labelRun(text: string, color = COLOR_MUTED): TextRun {
  return new TextRun({ text, font: FONT_MONO, size: 15, bold: true, color, allCaps: true });
}

function sectionHeading(no: string, title: string, pageBreakBefore = false): Paragraph {
  return new Paragraph({
    pageBreakBefore,
    children: [
      new TextRun({ text: no, font: FONT_MONO, size: 19, color: COLOR_MUTED }),
      new TextRun({ text: "     ", font: FONT_SANS, size: 20 }),
      new TextRun({ text: title, font: FONT_SANS, size: 27, bold: true, color: COLOR_INK }),
    ],
    spacing: { before: pageBreakBefore ? 0 : 420, after: 180 },
    border: { bottom: { color: COLOR_DARK, style: BorderStyle.SINGLE, size: 8, space: 8 } },
  });
}

function subHeading(title: string): Paragraph {
  return new Paragraph({
    children: [labelRun(title, COLOR_GOLD)],
    spacing: { before: 250, after: 115 },
  });
}

function cell(children: DocChild[], options: { fill?: string; width?: number; borders?: boolean; vAlign?: typeof AlignmentType.CENTER } = {}): TableCell {
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.fill ? { type: ShadingType.SOLID, color: options.fill, fill: options.fill } : undefined,
    borders: options.borders === false ? {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    } : undefined,
    margins: { top: 125, bottom: 125, left: 170, right: 170 },
    children,
  });
}

function calloutTable(children: DocChild[], opts: { fill: string; border: string; stripe: string }): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: opts.fill, fill: opts.fill },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: opts.border },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: opts.border },
              right: { style: BorderStyle.SINGLE, size: 4, color: opts.border },
              left: { style: BorderStyle.SINGLE, size: 18, color: opts.stripe },
            },
            margins: { top: 170, bottom: 170, left: 240, right: 240 },
            children,
          }),
        ],
      }),
    ],
  });
}

function metaTable(model: ReportModel): Table {
  const locale = model.meta.locale;
  const displayLanguage = model.meta.displayLanguage ?? locale;
  const rows: [string, string][] = [
    [LABELS.documentId[displayLanguage], model.meta.documentId],
    [LABELS.date[displayLanguage], model.meta.displayDate],
    [LABELS.status[displayLanguage], model.meta.status],
    [LABELS.version[displayLanguage], model.meta.version],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        cell([new Paragraph({ children: [labelRun(label)], spacing: { after: 0 } })], { width: 33, fill: "FFFFFF" }),
        cell([new Paragraph({ children: [new TextRun({ text: value || "-", font: FONT_SANS, size: 19, color: COLOR_INK })], spacing: { after: 0 } })], { width: 67, fill: "FFFFFF" }),
      ],
    })),
  });
}

async function qrSvgBuffer(value: string): Promise<Buffer> {
  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return Buffer.from(svg, "utf8");
}

function qrImage(value: string, svg: Buffer, size = 104): ImageRun {
  return new ImageRun({
    type: "svg",
    data: svg,
    fallback: { type: "png", data: TRANSPARENT_PNG_1X1 },
    transformation: { width: size, height: size },
    altText: {
      title: "QR-kode til Pilar-rapport",
      description: value,
      name: "Pilar rapport QR-kode",
    },
  });
}

function linkParagraph(label: string, url: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, font: FONT_MONO, size: 15, bold: true, color: COLOR_MUTED }),
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text: url, font: FONT_MONO, size: 15, color: "1F4E79", underline: {} })],
      }),
    ],
    spacing: { after: 0 },
  });
}

function shareCard(model: ReportModel, qrSvg: Buffer): Table {
  const locale = model.meta.locale;
  const displayLanguage = model.meta.displayLanguage ?? locale;
  const url = model.cover.qrUrl || model.meta.reportUrl;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "F7F4EC", fill: "F7F4EC" },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              left: { style: BorderStyle.SINGLE, size: 18, color: COLOR_DARK },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            margins: { top: 185, bottom: 185, left: 250, right: 210 },
            children: [
              new Paragraph({ children: [labelRun(LABELS.netPipeline[displayLanguage], COLOR_GOLD)], spacing: { after: 70 } }),
              new Paragraph({ children: [new TextRun({ text: model.cover.qrLabel, font: FONT_SANS, size: 25, bold: true, color: COLOR_INK })], spacing: { after: 80 } }),
              new Paragraph({ children: [new TextRun({ text: model.cover.qrDescription, font: FONT_SANS, size: 18, color: COLOR_INK })], spacing: { after: 115 } }),
              linkParagraph(LABELS.reportUrl[displayLanguage], url),
            ],
          }),
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "F7F4EC", fill: "F7F4EC" },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            margins: { top: 150, bottom: 150, left: 110, right: 180 },
            children: [
              new Paragraph({ children: [qrImage(url, qrSvg, 102)], alignment: AlignmentType.CENTER, spacing: { after: 55 } }),
              new Paragraph({ children: [labelRun(model.cover.qrLabel, COLOR_MUTED)], alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
            ],
          }),
        ],
      }),
    ],
  });
}

function keyResultLine(result: KeyResult): Paragraph {
  const displayValue = result.unit ? `${result.value} ${result.unit}` : result.value || result.raw;
  return new Paragraph({
    children: [
      new TextRun({ text: result.label, font: FONT_MONO, size: 18, color: COLOR_MUTED }),
      new TextRun({ text: "  ", font: FONT_SANS, size: 18 }),
      new TextRun({ text: displayValue || "-", font: FONT_SANS, size: 24, bold: true, color: COLOR_INK }),
    ],
    spacing: { after: 80 },
    border: { bottom: { color: "EEE8DC", style: BorderStyle.SINGLE, size: 3, space: 6 } },
  });
}

function keyResultsCard(model: ReportModel): Table | null {
  const locale = model.meta.locale;
  const displayLanguage = model.meta.displayLanguage ?? locale;
  const rows = model.keyResults.slice(0, 6);
  if (rows.length === 0) return null;
  return calloutTable([
    new Paragraph({ children: [labelRun(LABELS.keyResults[displayLanguage], COLOR_GOLD)], spacing: { after: 95 } }),
    ...rows.map(keyResultLine),
  ], { fill: "FFFFFF", border: COLOR_BORDER, stripe: COLOR_DARK });
}

function trustCard(model: ReportModel): Table | null {
  const locale = model.meta.locale;
  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? locale;

  if (model.trust.score === null) return null;
  const breakdown = model.trust.breakdown;
  const children: DocChild[] = [
    new Paragraph({ children: [labelRun(LABELS.trustScore[displayLanguage], COLOR_GOLD)], spacing: { after: 60 } }),
    new Paragraph({
      children: [
        new TextRun({ text: `${model.trust.score}`, font: FONT_SANS, size: 38, bold: true, color: COLOR_INK }),
        new TextRun({ text: "/100  ", font: FONT_SANS, size: 20, color: COLOR_INK }),
        new TextRun({ text: displayLanguage === "en" ? sprint335PolishEnglishText(sprint339FinalNorwegianResidueText(model.trust.label)).toUpperCase() : sprint339FinalNorwegianResidueText(model.trust.label).toUpperCase(), font: FONT_MONO, size: 16, bold: true, color: COLOR_MUTED }),
      ],
      spacing: { after: breakdown ? 95 : 0 },
    }),
  ];

  if (breakdown) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `A/B ${breakdown.ab_agreement}/35`, font: FONT_SANS, size: 17, color: COLOR_INK }),
        new TextRun({ text: "  ·  ", font: FONT_SANS, size: 17, color: COLOR_FAINT }),
        new TextRun({ text: `Controller ${breakdown.controller_verdict}/35`, font: FONT_SANS, size: 17, color: COLOR_INK }),
        new TextRun({ text: "  ·  ", font: FONT_SANS, size: 17, color: COLOR_FAINT }),
        new TextRun({ text: `Completeness ${String(breakdown.completeness).replace(".", ",")}/30`, font: FONT_SANS, size: 17, color: COLOR_INK }),
      ],
      spacing: { after: 0 },
    }));
  }

  return calloutTable(children, { fill: COLOR_OK_BG, border: "CFE5DA", stripe: COLOR_OK_BORDER });
}

function statusColor(status: PipelineStatusRow["status"]): string {
  if (status === "ok") return COLOR_OK_BORDER;
  if (status === "warning") return COLOR_WARN_BORDER;
  if (status === "danger") return "A33A3A";
  return COLOR_FAINT;
}

function pipelineStatusCard(model: ReportModel): Table | null {
  const locale = model.meta.locale;
  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? locale;
  if (model.control.pipelineStatus.length === 0) return null;
  return calloutTable([
    new Paragraph({ children: [labelRun(LABELS.pipelineStatus[displayLanguage], COLOR_GOLD)], spacing: { after: 85 } }),
    ...model.control.pipelineStatus.map((row) => new Paragraph({
      children: [
        new TextRun({ text: "● ", font: FONT_SANS, size: 16, color: statusColor(row.status) }),
        new TextRun({ text: `${displayLanguage === "en" ? sprint335PolishEnglishText(row.label) : row.label}: `, font: FONT_SANS, size: 18, color: COLOR_MUTED }),
        new TextRun({ text: displayLanguage === "en" ? sprint335PolishEnglishText(row.value || "-") : row.value || "-", font: FONT_SANS, size: 18, bold: true, color: COLOR_INK }),
      ],
      spacing: { after: 60 },
    })),
  ], { fill: "FFFFFF", border: COLOR_BORDER, stripe: COLOR_DARK });
}

function numberedItem(index: number, text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `.${String(index).padStart(2, "0")}  `, font: FONT_MONO, size: 18, color: COLOR_GOLD }),
      new TextRun({ text: cleanText(text), font: FONT_SERIF, size: 20, color: COLOR_INK }),
    ],
    spacing: { after: 90 },
    indent: { left: 180, hanging: 180 },
  });
}

function monoBox(text: string, opts: { fill?: string; stripe?: string; size?: number } = {}): Table {
  return calloutTable([
    new Paragraph({
      children: toRunLines(text, { font: FONT_MONO, size: opts.size ?? 17, color: COLOR_INK }),
      spacing: { after: 0, line: 255 },
    }),
  ], { fill: opts.fill ?? "F8F7F4", border: COLOR_BORDER, stripe: opts.stripe ?? COLOR_DARK });
}

function resultRowsTable(model: ReportModel): Table | null {
  const locale = model.meta.locale;
  const displayLanguage = model.meta.displayLanguage ?? locale;
  const rows = model.calculation.resultRows;
  if (rows.length === 0) return null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell([new Paragraph({ children: [labelRun(LABELS.size[displayLanguage], "FFFFFF")], spacing: { after: 0 } })], { width: 42, fill: COLOR_DARK }),
          cell([new Paragraph({ children: [labelRun(LABELS.value[displayLanguage], "FFFFFF")], spacing: { after: 0 } })], { width: 58, fill: COLOR_DARK }),
        ],
      }),
      ...rows.map((row) => new TableRow({
        children: [
          cell([new Paragraph({ children: [new TextRun({ text: row.label, font: FONT_MONO, size: 18, color: COLOR_MUTED })], spacing: { after: 0 } })], { width: 42, fill: "FFFFFF" }),
          cell([new Paragraph({ children: [new TextRun({ text: row.raw || [row.value, row.unit].filter(Boolean).join(" ") || "-", font: FONT_SANS, size: 20, bold: true, color: COLOR_INK })], spacing: { after: 0 } })], { width: 58, fill: "FFFFFF" }),
        ],
      })),
    ],
  });
}

function formulaToPlainText(value: string): string {
  let text = cleanText(value);
  if (!text) return "";

  // Robust, conservative conversion for the calculation snippets Pilar emits.
  // Important: handle LaTeX fractions BEFORE removing backslashes/braces.
  text = text
    .replace(/\\begin\{aligned\}/g, "")
    .replace(/\\end\{aligned\}/g, "")
    .replace(/\\\\/g, "\n")
    .replace(/&/g, "")
    .replace(/\{,\}/g, ",")
    .replace(/\\left|\\right/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/_\{([^{}]+)\}/g, "_$1")
    .replace(/\^\{2\}|\^2/g, "²")
    .replace(/\^\{3\}|\^3/g, "³")
    .replace(/\\quad/g, "  ")
    .replace(/\\rightarrow|\\to|\\Rightarrow/g, "→")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×");

  // Convert simple \frac{a}{b}. Repeat because a formula can contain several fractions.
  let previous: string;
  do {
    previous = text;
    text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)");
  } while (text !== previous);

  text = text
    .replace(/\\/g, "")
    .replace(/[{}]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalizeCalculationSyntaxText(text);
}

function formulaLooksDuplicatedInProse(prose: string, formula: string): boolean {
  const proseNorm = cleanText(prose).replace(/\s+/g, " ").toLowerCase();
  const formulaNorm = cleanText(formula).replace(/\s+/g, " ").toLowerCase();
  if (!formulaNorm) return true;
  if (proseNorm.includes(formulaNorm)) return true;

  // If the prose already contains several calculation lines, the formula block
  // is usually just the same math rendered as LaTeX. Word is primarily a
  // readable/redigerbart fagnotat, so avoid duplicate equation boxes here.
  const proseEquationCount = (prose.match(/=/g) ?? []).length;
  if (proseEquationCount >= 2) return true;
  const formulaLead = formulaNorm.split("=")[0]?.trim();
  return !!formulaLead && proseNorm.includes(formulaLead);
}

function calculationSteps(model: ReportModel): DocChild[] {
  const children: DocChild[] = [];
  for (const step of model.calculation.steps) {
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: `${step.isControlStep ? "KONTROLL" : `STEP ${String(step.number).padStart(2, "0")}`}  `,
          font: FONT_MONO,
          size: 16,
          bold: true,
          color: step.isControlStep ? COLOR_BLUE_BORDER : COLOR_GOLD,
        }),
        new TextRun({ text: step.title, font: FONT_SANS, size: 22, bold: true, color: COLOR_INK }),
      ],
      spacing: { before: 250, after: 105 },
      border: { bottom: { color: COLOR_BORDER, style: BorderStyle.SINGLE, size: 3, space: 4 } },
    }));

    if (step.prose) {
      children.push(monoBox(step.prose, { fill: "F8F7F4", stripe: step.isControlStep ? COLOR_BLUE_BORDER : COLOR_DARK, size: 17 }));
    }

    const readableFormula = step.formulas.map(formulaToPlainText).filter(Boolean).join("\n\n");
    if (readableFormula && !formulaLooksDuplicatedInProse(step.prose, readableFormula)) {
      children.push(spacer(80), monoBox(readableFormula, { fill: "FFFFFF", stripe: COLOR_GOLD, size: 17 }));
    }
  }
  return children;
}

function bulletCallout(title: string, items: string[], kind: "warning" | "info" = "info"): Table | null {
  if (items.length === 0) return null;
  const stripe = kind === "warning" ? COLOR_WARN_BORDER : COLOR_BLUE_BORDER;
  const fill = kind === "warning" ? COLOR_WARN_BG : COLOR_BLUE_BG;
  const border = kind === "warning" ? "F0D690" : "CADBFF";
  return calloutTable([
    new Paragraph({ children: [labelRun(title, stripe)], spacing: { after: 80 } }),
    ...items.map((item) => new Paragraph({
      children: [
        new TextRun({ text: "• ", font: FONT_SANS, size: 19, color: stripe }),
        new TextRun({ text: cleanText(item), font: FONT_SANS, size: 19, color: COLOR_INK }),
      ],
      spacing: { after: 80 },
    })),
  ], { fill, border, stripe });
}

function comparisonTable(model: ReportModel): Table | null {
  const locale = model.meta.locale;
  const displayLanguage = model.meta.displayLanguage ?? locale;
  // Word should be a readable control summary, not a raw dump of every
  // intermediate variable. The full trace belongs in the online pipeline.
  const rows = model.control.comparisonRows.slice(0, 8);
  if (rows.length === 0) return null;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell([new Paragraph({ children: [labelRun(LABELS.size[displayLanguage], "FFFFFF")], spacing: { after: 0 } })], { width: 25, fill: COLOR_DARK }),
          cell([new Paragraph({ children: [labelRun(LABELS.a[displayLanguage], "FFFFFF")], spacing: { after: 0 } })], { width: 30, fill: COLOR_DARK }),
          cell([new Paragraph({ children: [labelRun(LABELS.b[displayLanguage], "FFFFFF")], spacing: { after: 0 } })], { width: 30, fill: COLOR_DARK }),
          cell([new Paragraph({ children: [labelRun(LABELS.match[displayLanguage], "FFFFFF")], spacing: { after: 0 } })], { width: 15, fill: COLOR_DARK }),
        ],
      }),
      ...rows.map((row) => new TableRow({
        children: [
          cell([new Paragraph({ children: [new TextRun({ text: row.label, font: FONT_MONO, size: 16, color: COLOR_MUTED })], spacing: { after: 0 } })], { width: 25, fill: "FFFFFF" }),
          cell([new Paragraph({ children: [new TextRun({ text: row.constructorA, font: FONT_SANS, size: 17, color: COLOR_INK })], spacing: { after: 0 } })], { width: 30, fill: "FFFFFF" }),
          cell([new Paragraph({ children: [new TextRun({ text: row.constructorB, font: FONT_SANS, size: 17, color: COLOR_INK })], spacing: { after: 0 } })], { width: 30, fill: "FFFFFF" }),
          cell([new Paragraph({ children: [new TextRun({ text: row.match ? "✓" : "–", font: FONT_SANS, size: 18, bold: true, color: row.match ? COLOR_OK_BORDER : COLOR_MUTED })], alignment: AlignmentType.CENTER, spacing: { after: 0 } })], { width: 15, fill: "FFFFFF" }),
        ],
      })),
    ],
  });
}

function decisionBox(model: ReportModel): Table {
  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? model.meta.locale;
  return calloutTable([
    new Paragraph({
      children: [
        new TextRun({ text: "DECISION  ", font: FONT_MONO, size: 16, bold: true, color: COLOR_BLUE_BORDER }),
        new TextRun({ text: displayLanguage === "en" ? sprint335PolishEnglishText(model.control.decision).toUpperCase() : model.control.decision.toUpperCase(), font: FONT_SANS, size: 19, bold: true, color: COLOR_INK }),
      ],
      spacing: { after: 100 },
    }),
    p(displayLanguage === "en" ? sprint335PolishEnglishText(model.control.controllerText || LABELS.notControlled[displayLanguage]) : model.control.controllerText || LABELS.notControlled[model.meta.locale], { font: FONT_SANS, size: 19, after: 0, line: 280 }),
  ], { fill: COLOR_BLUE_BG, border: "CADBFF", stripe: COLOR_BLUE_BORDER });
}

function signatureTable(model: ReportModel): Table {
  const locale = model.meta.locale;
  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? locale;
  const rows: [string, string][] = [
    [LABELS.checkedBy[displayLanguage], "Name · title · company"],
    [LABELS.signed[displayLanguage], LABELS.manualSignature[displayLanguage]],
    [LABELS.date[displayLanguage], "MM/DD/YYYY"],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, hint]) => new TableRow({
      children: [
        cell([new Paragraph({ children: [labelRun(label)], spacing: { after: 0 } })], { width: 32, fill: "FFFFFF" }),
        cell([
          new Paragraph({ children: [new TextRun({ text: "______________________________", font: FONT_SANS, size: 18, color: COLOR_INK })], spacing: { after: 50 } }),
          new Paragraph({ children: [new TextRun({ text: hint, font: FONT_SANS, size: 16, color: COLOR_MUTED })], spacing: { after: 0 } }),
        ], { width: 68, fill: "FFFFFF" }),
      ],
    })),
  });
}

function disclaimerBox(model: ReportModel): Table {
  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? model.meta.locale;
  return calloutTable([
    new Paragraph({ children: [labelRun(LABELS.importantNote[displayLanguage], COLOR_GOLD)], spacing: { after: 90 } }),
    p(displayLanguage === "en" ? sprint335PolishEnglishText(model.disclaimer) : model.disclaimer, { font: FONT_SANS, size: 18, after: 0, line: 270 }),
  ], { fill: COLOR_WARN_BG, border: "F0D690", stripe: COLOR_WARN_BORDER });
}

function validationBox(model: ReportModel, validation?: ReportValidationResult): Table | null {
  if (!validation || validation.warnings.length === 0) return null;
  return bulletCallout(
    LABELS.validation[model.meta.locale],
    validation.warnings.slice(0, 5).map((warning) => warning.message),
    "warning",
  );
}

function header(model: ReportModel): Header {
  const locale = model.meta.locale;
  const displayLanguage = model.meta.displayLanguage ?? locale;
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "Pilar", font: FONT_SERIF, size: 17, bold: true, color: COLOR_INK }),
          new TextRun({ text: `   ${LABELS.eyebrow[displayLanguage]}   ·   `, font: FONT_MONO, size: 14, color: COLOR_MUTED }),
          new TextRun({ text: model.meta.documentId, font: FONT_MONO, size: 14, color: COLOR_INK }),
        ],
        border: { bottom: { color: COLOR_BORDER, style: BorderStyle.SINGLE, size: 4, space: 6 } },
      }),
    ],
  });
}

function footer(model: ReportModel): Footer {
  const locale = model.meta.locale;
  const displayLanguage = model.meta.displayLanguage ?? locale;
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `${LABELS.generatedBy[displayLanguage]} · ${model.meta.documentId} · ${model.meta.displayDate}`, font: FONT_SANS, size: 14, color: COLOR_MUTED }),
          new TextRun({ text: "     Page ", font: FONT_SANS, size: 14, color: COLOR_MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT_SANS, size: 14, color: COLOR_MUTED }),
        ],
        alignment: AlignmentType.CENTER,
        border: { top: { color: COLOR_BORDER, style: BorderStyle.SINGLE, size: 4, space: 6 } },
      }),
    ],
  });
}

export async function renderReportModelDocx(
  model: ReportModel,
  options: RenderDocxOptions = {},
): Promise<Document> {
  const locale = model.meta.locale;
  const displayLanguage = model.meta.displayLanguage ?? locale;
  const children: DocChild[] = [];
  const qrUrl = model.cover.qrUrl || model.meta.reportUrl;
  const qrSvg = await qrSvgBuffer(qrUrl || model.meta.documentId);

  children.push(
    new Paragraph({ children: [labelRun(LABELS.eyebrow[displayLanguage], COLOR_GOLD)], spacing: { after: 70 } }),
    new Paragraph({
      children: [new TextRun({ text: model.cover.title, font: FONT_SANS, size: 42, bold: true, color: COLOR_INK })],
      spacing: { after: 80 },
    }),
    p(model.cover.subtitle, { font: FONT_SANS, size: 19, color: COLOR_MUTED, after: 220, line: 260 }),
    metaTable(model),
    spacer(170),
    shareCard(model, qrSvg),
    spacer(165),
  );

  const keyResults = keyResultsCard(model);
  if (keyResults) children.push(keyResults, spacer(160));

  if (model.cover.shortSummary) {
    children.push(calloutTable([
      new Paragraph({ children: [labelRun(LABELS.summary[displayLanguage], COLOR_GOLD)], spacing: { after: 75 } }),
      p(model.cover.shortSummary, { font: FONT_SANS, size: 19, after: 0, line: 280 }),
    ], { fill: "FFFFFF", border: COLOR_BORDER, stripe: COLOR_GOLD }), spacer(150));
  }

  const trust = trustCard(model);
  if (trust) children.push(trust, spacer(150));

  const pipeline = pipelineStatusCard(model);
  if (pipeline) children.push(pipeline, spacer(150));

  children.push(disclaimerBox(model));

  const validation = validationBox(model, options.validation);
  if (validation) children.push(spacer(120), validation);

  children.push(sectionHeading("01", LABELS.summary[displayLanguage]), p(model.summary.text));
  if (model.summary.request) children.push(subHeading(LABELS.request[displayLanguage]), monoBox(model.summary.request, { size: 17 }));

  children.push(sectionHeading("02", LABELS.input[displayLanguage]));
  children.push(new Paragraph({
    children: [
      labelRun("STATUS", COLOR_MUTED),
      new TextRun({ text: "  ", font: FONT_SANS, size: 17 }),
      new TextRun({ text: model.interpretation.status || "-", font: FONT_SANS, size: 19, bold: true, color: COLOR_INK }),
    ],
    spacing: { after: 120 },
  }));
  if (model.interpretation.assumptions.length > 0) {
    children.push(subHeading(LABELS.assumptions[displayLanguage]));
    model.interpretation.assumptions.forEach((assumption, index) => children.push(numberedItem(index + 1, assumption)));
  }

  const resultTable = resultRowsTable(model);
  if (resultTable) children.push(subHeading(LABELS.results[displayLanguage]), resultTable);

  if (model.calculation.steps.length > 0) {
    children.push(sectionHeading("03", LABELS.calculation[displayLanguage]));
    children.push(...calculationSteps(model));
  }

  children.push(sectionHeading("04", LABELS.assessment[displayLanguage]), p(model.assessment.professionalAssessment));

  const limitations = bulletCallout(LABELS.limitations[displayLanguage], model.assessment.limitations, "info");
  if (limitations) children.push(limitations);

  const warnings = bulletCallout(LABELS.warnings[displayLanguage], model.assessment.warnings, "warning");
  if (warnings) children.push(warnings);

  children.push(sectionHeading("05", LABELS.control[displayLanguage]));
  if (model.control.comparisonText) children.push(p(displayLanguage === "en" ? sprint335PolishEnglishText(model.control.comparisonText) : model.control.comparisonText, { font: FONT_SANS, size: 19 }));

  const compare = comparisonTable(model);
  if (compare) {
    children.push(subHeading(LABELS.constructorControl[displayLanguage]), compare);
    if (model.control.comparisonRows.length > 8) {
      children.push(p(
        displayLanguage === "en"
          ? `The table shows the most important control points. Full variable and pipeline trace is available in the web version: ${model.meta.reportUrl}`
          : `Tabellen viser de viktigste kontrollpunktene. Full variabel-/pipeline-sporing finnes i nettversjonen: ${model.meta.reportUrl}`,
        { font: FONT_SANS, size: 17, color: COLOR_MUTED, after: 180 },
      ));
    }
  }

  children.push(subHeading(LABELS.decision[displayLanguage]), decisionBox(model));
  children.push(subHeading(LABELS.conclusion[displayLanguage]), p(model.conclusion));
  children.push(subHeading(LABELS.signature[displayLanguage]), signatureTable(model));

  return new Document({
    creator: "Pilar",
    title: `${model.cover.title} ${model.meta.documentId}`,
    description: model.cover.subtitle,
    sections: [
      {
        headers: { default: header(model) },
        footers: { default: footer(model) },
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.72),
              right: convertInchesToTwip(0.82),
              bottom: convertInchesToTwip(0.72),
              left: convertInchesToTwip(0.82),
            },
          },
        },
        children,
      },
    ],
  });
}

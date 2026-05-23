import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Locale } from "@/lib/locale";
import type {
  CalculationFormula,
  CalculationSheetModel,
} from "./calculation-sheet-model";

const FONT_SANS = "Aptos";
const FONT_SERIF = "Georgia";
const FONT_MONO = "Consolas";

const COLOR_INK = "171717";
const COLOR_MUTED = "606060";
const COLOR_FAINT = "A3A3A3";
const COLOR_BORDER = "D8D3C8";
const COLOR_PAPER = "FAF7EF";
const COLOR_DARK = "1F1D18";
const COLOR_GOLD = "B9821A";
const COLOR_BLUE_BG = "EEF4FF";
const COLOR_BLUE_BORDER = "4A73A8";

const LABELS: Record<string, Record<Locale, string>> = {
  eyebrow: { nb: "BEREGNINGSARK", nn: "BEREKNINGSARK" },
  documentId: { nb: "Dokument-ID", nn: "Dokument-ID" },
  date: { nb: "Dato", nn: "Dato" },
  status: { nb: "Status", nn: "Status" },
  fullReport: { nb: "Full rapport", nn: "Full rapport" },
  given: { nb: "Gitte data", nn: "Gjevne data" },
  assumptions: { nb: "Forutsetninger", nn: "Føresetnader" },
  calculation: { nb: "Stegvis beregning", nn: "Stegvis berekning" },
  results: { nb: "Resultater", nn: "Resultat" },
  notes: { nb: "Merknader", nn: "Merknader" },
  generated: {
    nb: "Generert av PILAR. Beregningen skal kontrolleres av ansvarlig fagperson før bruk.",
    nn: "Generert av PILAR. Berekninga skal kontrollerast av ansvarleg fagperson før bruk.",
  },
  step: { nb: "Steg", nn: "Steg" },
  control: { nb: "Kontroll", nn: "Kontroll" },
  size: { nb: "Størrelse", nn: "Storleik" },
  value: { nb: "Verdi", nn: "Verdi" },
};

type DocChild = Paragraph | Table;

type RunStyle = {
  font?: string;
  size?: number;
  color?: string;
  bold?: boolean;
  italics?: boolean;
};

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n").replace(/\uFFFE/g, "").trim();
}

function p(
  text: string | TextRun[],
  options: RunStyle & { before?: number; after?: number; line?: number; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {},
): Paragraph {
  const children = Array.isArray(text)
    ? text
    : toRunLines(text, {
        font: options.font,
        size: options.size,
        color: options.color,
        bold: options.bold,
        italics: options.italics,
      });

  return new Paragraph({
    children,
    alignment: options.alignment,
    spacing: {
      before: options.before ?? 0,
      after: options.after ?? 140,
      line: options.line ?? 300,
    },
  });
}

function toRunLines(text: string, options: RunStyle = {}): TextRun[] {
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
  return runs.length > 0
    ? runs
    : [new TextRun({ text: "", font: options.font ?? FONT_SERIF, size: options.size ?? 21 })];
}

function label(text: string): TextRun {
  return new TextRun({
    text: text.toUpperCase(),
    font: FONT_SANS,
    size: 15,
    color: COLOR_MUTED,
    bold: true,
    characterSpacing: 35,
  });
}

function heading(text: string, number?: string): Paragraph {
  return new Paragraph({
    children: [
      ...(number
        ? [
            new TextRun({ text: `${number}  `, font: FONT_SANS, size: 20, color: COLOR_GOLD, bold: true }),
          ]
        : []),
      new TextRun({ text, font: FONT_SANS, size: 26, color: COLOR_DARK, bold: true }),
    ],
    spacing: { before: 420, after: 160 },
    keepNext: true,
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_SANS, size: 20, color: COLOR_DARK, bold: true })],
    spacing: { before: 260, after: 110 },
    keepNext: true,
  });
}

function subtleRule(): Paragraph {
  return new Paragraph({
    border: {
      bottom: { color: COLOR_BORDER, style: BorderStyle.SINGLE, size: 6, space: 1 },
    },
    spacing: { before: 50, after: 220 },
  });
}

function cell(children: DocChild[], opts: { fill?: string; width?: number } = {}): TableCell {
  return new TableCell({
    children,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.fill ? { fill: opts.fill } : undefined,
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    borders: {
      top: { style: BorderStyle.SINGLE, color: COLOR_BORDER, size: 4 },
      bottom: { style: BorderStyle.SINGLE, color: COLOR_BORDER, size: 4 },
      left: { style: BorderStyle.SINGLE, color: COLOR_BORDER, size: 4 },
      right: { style: BorderStyle.SINGLE, color: COLOR_BORDER, size: 4 },
    },
  });
}

function metadataTable(sheet: CalculationSheetModel): Table {
  const L = LABELS;
  const locale = sheet.meta.locale;
  const rows = [
    [L.documentId[locale], sheet.meta.documentId],
    [L.date[locale], sheet.meta.date],
    [L.status[locale], sheet.meta.status],
    [L.fullReport[locale], sheet.meta.reportUrl],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([left, right]) => new TableRow({
      children: [
        cell([p(left, { font: FONT_SANS, size: 16, bold: true, color: COLOR_MUTED, after: 0 })], { fill: COLOR_PAPER, width: 28 }),
        cell([p(right, { font: FONT_SANS, size: 18, color: COLOR_INK, after: 0 })], { width: 72 }),
      ],
    })),
  });
}

function simpleValueTable(rows: Array<{ label: string; latex: string; value: string; unit: string | null }>, locale: Locale): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell([p(LABELS.size[locale], { font: FONT_SANS, size: 16, bold: true, color: COLOR_DARK, after: 0 })], { fill: COLOR_PAPER, width: 38 }),
          cell([p(LABELS.value[locale], { font: FONT_SANS, size: 16, bold: true, color: COLOR_DARK, after: 0 })], { fill: COLOR_PAPER, width: 62 }),
        ],
      }),
      ...rows.map((row) => new TableRow({
        children: [
          cell([p(row.label, { font: FONT_SANS, size: 21, bold: true, color: COLOR_DARK, after: 0 })], { width: 38 }),
          cell([p(valueRuns(row.value, row.unit), { after: 0 })], { width: 62 }),
        ],
      })),
    ],
  });
}

function valueRuns(value: string, unit: string | null): TextRun[] {
  return [
    new TextRun({ text: value, font: FONT_SANS, size: 21, color: COLOR_INK, bold: true }),
    ...(unit ? [new TextRun({ text: ` ${unit}`, font: FONT_SANS, size: 18, color: COLOR_MUTED })] : []),
  ];
}

function formulaPlainForWord(formula: CalculationFormula): string {
  return cleanText(formula.plain || formula.latex)
    .replace(/\\gamma/g, "γ")
    .replace(/\\psi/g, "ψ")
    .replace(/\\alpha/g, "α")
    .replace(/\\lambda/g, "λ")
    .replace(/\\phi/g, "φ")
    .replace(/\\chi/g, "χ")
    .replace(/\\eta/g, "η")
    .replace(/\\pi/g, "π")
    .replace(/\bGammaM1\b|\bgammaM1\b/g, "γM1")
    .replace(/\balpha_z\b|\balphaz\b/g, "αz")
    .replace(/\blambda_1\b|\blambda1\b/g, "λ1")
    .replace(/\bbarlambda_z\b|\blambdazbar\b|\blambdabarz\b/g, "λ̄z")
    .replace(/\bphi_z\b|\bphiz\b/g, "φz")
    .replace(/\bchi_z\b|\bchiz\b/g, "χz")
    .replace(/\bsqrt\(([^()]+)\)/g, "√($1)")
    .replace(/\bpi\b/g, "π")
    .replace(/\btimes\b/g, "×")
    .replace(/\bcdot\b/g, "·")
    .replace(/mm2/g, "mm²")
    .replace(/cm2/g, "cm²")
    .replace(/cm3/g, "cm³")
    .replace(/cm4/g, "cm⁴")
    .replace(/N\/mm2/g, "N/mm²")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/\^4/g, "⁴")
    .replace(/\s+$/gm, "")
    .trim();
}

function bulletList(items: string[]): Paragraph[] {
  return items.map((item) => new Paragraph({
    children: toRunLines(item, { font: FONT_SERIF, size: 20, color: COLOR_INK }),
    bullet: { level: 0 },
    spacing: { after: 90, line: 285 },
  }));
}

function tokenToGreek(token: string): string {
  return token
    .replace(/\\alpha/g, "α")
    .replace(/\\lambda/g, "λ")
    .replace(/\\phi/g, "φ")
    .replace(/\\chi/g, "χ")
    .replace(/\\bar\{λ\}/g, "λ̄")
    .replace(/\\bar\{\\lambda\}/g, "λ̄")
    .replace(/\\pi/g, "π")
    .replace(/\\gamma/g, "γ")
    .replace(/\\psi/g, "ψ")
    .replace(/\\eta/g, "η")
    .replace(/\\varepsilon/g, "ε")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\sqrt/g, "√")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\,/g, " ")
    .replace(/\\mathrm/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\max/g, "max")
    .replace(/\\,/g, " ");
}

function pushPlainMath(runs: TextRun[], text: string, style: RunStyle = {}) {
  if (!text) return;
  runs.push(new TextRun({
    text,
    font: style.font ?? FONT_MONO,
    size: style.size ?? 19,
    color: style.color ?? COLOR_INK,
    bold: style.bold,
    italics: style.italics,
  }));
}

function pushSubscript(runs: TextRun[], text: string, style: RunStyle = {}) {
  if (!text) return;
  runs.push(new TextRun({
    text,
    font: style.font ?? FONT_MONO,
    size: Math.max((style.size ?? 19) - 3, 14),
    color: style.color ?? COLOR_INK,
    subScript: true,
  }));
}

function pushSuperscript(runs: TextRun[], text: string, style: RunStyle = {}) {
  if (!text) return;
  runs.push(new TextRun({
    text,
    font: style.font ?? FONT_MONO,
    size: Math.max((style.size ?? 19) - 3, 14),
    color: style.color ?? COLOR_INK,
    superScript: true,
  }));
}

function normalizeMathInput(latex: string): string {
  return cleanText(latex)
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, "")
    .replace(/\\begin\{align\}|\\end\{align\}/g, "")
    .replace(/\\begin\{array\}[^]*?\}/g, "")
    .replace(/\\end\{array\}/g, "")
    .replace(/\\\\/g, "\n")
    .replace(/&/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mathRuns(latex: string, style: RunStyle = {}): TextRun[] {
  const input = tokenToGreek(normalizeMathInput(latex));
  const runs: TextRun[] = [];
  let index = 0;

  while (index < input.length) {
    const frac = input.slice(index).match(/^\\frac\{([^{}]+)\}\{([^{}]+)\}/);
    if (frac) {
      pushPlainMath(runs, "(", style);
      runs.push(...mathRuns(frac[1], style));
      pushPlainMath(runs, ") / (", style);
      runs.push(...mathRuns(frac[2], style));
      pushPlainMath(runs, ")", style);
      index += frac[0].length;
      continue;
    }

    const subBraced = input.slice(index).match(/^([A-Za-zΑ-Ωα-ω]+|[γψηε])_\{([^{}]+)\}/u);
    if (subBraced) {
      pushPlainMath(runs, subBraced[1], style);
      pushSubscript(runs, tokenToGreek(subBraced[2]).replace(/\\/g, ""), style);
      index += subBraced[0].length;
      continue;
    }

    const subSimple = input.slice(index).match(/^([A-Za-zΑ-Ωα-ω]+|[γψηε])_([A-Za-z0-9,]+)\b/u);
    if (subSimple) {
      pushPlainMath(runs, subSimple[1], style);
      pushSubscript(runs, subSimple[2], style);
      index += subSimple[0].length;
      continue;
    }

    const superBraced = input.slice(index).match(/^([A-Za-z0-9)]+)\^\{([^{}]+)\}/u);
    if (superBraced) {
      pushPlainMath(runs, superBraced[1], style);
      pushSuperscript(runs, superBraced[2], style);
      index += superBraced[0].length;
      continue;
    }

    const superSimple = input.slice(index).match(/^([A-Za-z0-9)]+)\^([0-9]+)/u);
    if (superSimple) {
      pushPlainMath(runs, superSimple[1], style);
      pushSuperscript(runs, superSimple[2], style);
      index += superSimple[0].length;
      continue;
    }

    const command = input.slice(index).match(/^\\[A-Za-z]+/);
    if (command) {
      pushPlainMath(runs, tokenToGreek(command[0]).replace(/\\/g, ""), style);
      index += command[0].length;
      continue;
    }

    const ch = input[index];
    if (ch === "{" || ch === "}") {
      index += 1;
      continue;
    }

    pushPlainMath(runs, ch, style);
    index += 1;
  }

  return runs.length > 0
    ? runs
    : [new TextRun({ text: "", font: style.font ?? FONT_MONO, size: style.size ?? 19 })];
}

function formulaBlock(formula: CalculationFormula): Table {
  const children: DocChild[] = [p(formulaPlainForWord(formula), { font: FONT_MONO, size: 18, color: COLOR_INK, after: 0, line: 285 })];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [cell(children, { fill: "FFFFFF" })],
    })],
  });
}

function stepBlock(sheet: CalculationSheetModel): DocChild[] {
  const children: DocChild[] = [];
  const locale = sheet.meta.locale;

  children.push(heading(LABELS.calculation[locale], "03"));

  sheet.steps.forEach((step) => {
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: step.isControlStep ? LABELS.control[locale].toUpperCase() : `${LABELS.step[locale].toUpperCase()} ${String(step.number).padStart(2, "0")}`,
          font: FONT_SANS,
          size: 15,
          color: COLOR_GOLD,
          bold: true,
          characterSpacing: 25,
        }),
        new TextRun({ text: "  ", font: FONT_SANS, size: 16 }),
        new TextRun({ text: step.title, font: FONT_SANS, size: 20, color: COLOR_DARK, bold: true }),
      ],
      spacing: { before: 260, after: 100 },
      keepNext: true,
    }));

    if (step.explanation) {
      children.push(p(step.explanation, { font: FONT_SERIF, size: 20, color: COLOR_INK, after: 120, line: 285 }));
    }

    for (const formula of step.formulas.slice(0, 8)) {
      children.push(formulaBlock(formula));
      children.push(p("", { after: 80 }));
    }
  });

  return children;
}

function footer(sheet: CalculationSheetModel): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `PILAR · ${sheet.meta.documentId}`, font: FONT_SANS, size: 16, color: COLOR_FAINT }),
          new TextRun({
            children: [" · Side ", PageNumber.CURRENT],
            font: FONT_SANS,
            size: 16,
            color: COLOR_FAINT,
          }),
        ],
        alignment: AlignmentType.RIGHT,
      }),
    ],
  });
}

export async function renderCalculationSheetDocx(sheet: CalculationSheetModel): Promise<Document> {
  const locale = sheet.meta.locale;
  const children: DocChild[] = [];

  children.push(p(LABELS.eyebrow[locale], { font: FONT_SANS, size: 16, color: COLOR_GOLD, bold: true, after: 70 }));
  children.push(p(sheet.meta.title || "Beregning", { font: FONT_SANS, size: 38, color: COLOR_DARK, bold: true, after: 90, line: 320 }));
  if (sheet.meta.subtitle) {
    children.push(p(sheet.meta.subtitle, { font: FONT_SERIF, size: 22, color: COLOR_MUTED, italics: true, after: 180 }));
  }
  children.push(metadataTable(sheet));
  children.push(p(LABELS.generated[locale], { font: FONT_SANS, size: 16, color: COLOR_MUTED, italics: true, before: 160, after: 230 }));
  children.push(subtleRule());

  if (sheet.given.length > 0) {
    children.push(heading(LABELS.given[locale], "01"));
    children.push(simpleValueTable(sheet.given, locale));
  }

  if (sheet.assumptions.length > 0) {
    children.push(heading(LABELS.assumptions[locale], "02"));
    children.push(...bulletList(sheet.assumptions));
  }

  children.push(...stepBlock(sheet));

  if (sheet.results.length > 0) {
    children.push(heading(LABELS.results[locale], "04"));
    children.push(simpleValueTable(sheet.results, locale));
  }

  if (sheet.notes.length > 0) {
    children.push(heading(LABELS.notes[locale], "05"));
    children.push(...bulletList(sheet.notes));
  }

  children.push(p(LABELS.generated[locale], { font: FONT_SANS, size: 16, color: COLOR_MUTED, italics: true, before: 260 }));

  return new Document({
    creator: "PILAR",
    title: sheet.meta.title,
    description: "PILAR beregningsark",
    styles: {
      default: {
        document: {
          run: { font: FONT_SERIF, size: 21, color: COLOR_INK },
          paragraph: { spacing: { line: 300, after: 120 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 850, right: 850, bottom: 780, left: 850 },
        },
      },
      footers: { default: footer(sheet) },
      children,
    }],
  });
}

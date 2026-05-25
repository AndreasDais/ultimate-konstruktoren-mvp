import { inferCalculationEnglishDisplay } from "@/lib/international/display";
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
import type { PilarDisplayLanguage } from "@/lib/international/display";
import type {
  CalculationFormula,
  CalculationSheetModel,
} from "./calculation-sheet-model";

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
const COLOR_MUTED = "606060";
const COLOR_FAINT = "A3A3A3";
const COLOR_BORDER = "D8D3C8";
const COLOR_PAPER = "FAF7EF";
const COLOR_DARK = "1F1D18";
const COLOR_GOLD = "B9821A";
const COLOR_BLUE_BG = "EEF4FF";
const COLOR_BLUE_BORDER = "4A73A8";

const LABELS: Record<string, Record<PilarDisplayLanguage, string>> = {
  eyebrow: { nb: "BEREGNINGSARK", nn: "BEREKNINGSARK", en: "CALCULATION SHEET" },
  documentId: { nb: "Dokument-ID", nn: "Dokument-ID", en: "Document ID" },
  date: { nb: "Dato", nn: "Dato", en: "Date" },
  status: { nb: "Status", nn: "Status", en: "Status" },
  fullReport: { nb: "Full rapport", nn: "Full rapport", en: "Full report" },
  given: { nb: "Gitte data", nn: "Gjevne data", en: "Given data" },
  assumptions: { nb: "Forutsetninger", nn: "Føresetnader", en: "Assumptions" },
  calculation: { nb: "Stegvis beregning", nn: "Stegvis berekning", en: "Step-by-step calculation" },
  results: { nb: "Resultater", nn: "Resultat", en: "Results" },
  notes: { nb: "Merknader", nn: "Merknader", en: "Notes" },
  generated: {
    nb: "Generert av PILAR. Beregningen skal kontrolleres av ansvarlig fagperson før bruk.",
    nn: "Generert av PILAR. Berekninga skal kontrollerast av ansvarleg fagperson før bruk.", en: "Generated by PILAR. The calculation must be checked by a qualified professional before use."
  },
  step: { nb: "Steg", nn: "Steg", en: "Step" },
  control: { nb: "Kontroll", nn: "Kontroll", en: "Check" },
  size: { nb: "Størrelse", nn: "Storleik", en: "Quantity" },
  value: { nb: "Verdi", nn: "Verdi", en: "Value" },
  page: { nb: "Side", nn: "Side", en: "Page" },
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
  const displayLanguage = sheet.meta.displayLanguage ?? locale;
  const rows = [
    [L.documentId[displayLanguage], sheet.meta.documentId],
    [L.date[displayLanguage], sheet.meta.date],
    [L.status[displayLanguage], sheet.meta.status],
    [L.fullReport[displayLanguage], sheet.meta.reportUrl],
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

function simpleValueTable(rows: Array<{ label: string; latex: string; value: string; unit: string | null }>, displayLanguage: PilarDisplayLanguage): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell([p(LABELS.size[displayLanguage], { font: FONT_SANS, size: 16, bold: true, color: COLOR_DARK, after: 0 })], { fill: COLOR_PAPER, width: 38 }),
          cell([p(LABELS.value[displayLanguage], { font: FONT_SANS, size: 16, bold: true, color: COLOR_DARK, after: 0 })], { fill: COLOR_PAPER, width: 62 }),
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
    // Kollaps whitespace, men BEHALD \n (linjeskift frå \\ over).
    // /\s+/ ville ete \n — bruk [^\S\n]+ som matchar all whitespace
    // UTANOM linjeskift.
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/** LaTeX -> Word TextRun[]. Eksportert for testing. */
export function mathRuns(latex: string, style: RunStyle = {}): TextRun[] {
  const input = tokenToGreek(normalizeMathInput(latex));
  const runs: TextRun[] = [];
  let index = 0;

  while (index < input.length) {
    // Linjeskift: normalizeMathInput gjer \\ om til \n. Kvar ny linje i
    // ei aligned-blokk skal bli ei eiga linje i Word-boksen.
    if (input[index] === "\n") {
      runs.push(new TextRun({
        text: "",
        break: 1,
        font: style.font ?? FONT_MONO,
        size: style.size ?? 19,
        color: style.color ?? COLOR_INK,
      }));
      index += 1;
      continue;
    }

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
  // mathRuns er den ekte LaTeX-parsaren: forstaar \frac, _{}-subscript,
  // ^{}-superscript, greske bokstavar OG fleirlinje aligned-blokker.
  // formulaPlainForWord var only tekst-strip og kollapsa aligned-blokker
  // til raa LaTeX-kjeldekode.
  const runs = mathRuns(formula.latex || formula.plain, {
    font: FONT_MONO,
    size: 18,
    color: COLOR_INK,
  });
  const children: DocChild[] = [p(runs, { after: 0, line: 285 })];
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
  const displayLanguage = sheet.meta.displayLanguage ?? locale;

  children.push(heading(LABELS.calculation[displayLanguage], "03"));

  sheet.steps.forEach((step) => {
    children.push(new Paragraph({
      children: [
        new TextRun({
          text: step.isControlStep ? LABELS.control[displayLanguage].toUpperCase() : `${(LABELS.step[displayLanguage] ?? "Step").toUpperCase()} ${String(step.number).padStart(2, "0")}`,
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
  const locale = sheet.meta.locale;
  const displayLanguage: PilarDisplayLanguage = sheet.meta.displayLanguage ?? locale;

  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `PILAR · ${sheet.meta.documentId}`, font: FONT_SANS, size: 16, color: COLOR_FAINT }),
          new TextRun({
            children: [` · ${LABELS.page[displayLanguage]} `, PageNumber.CURRENT],
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
  const displayLanguage: PilarDisplayLanguage = sheet.meta.displayLanguage ?? locale;
  const children: DocChild[] = [];

  children.push(p(LABELS.eyebrow[displayLanguage], { font: FONT_SANS, size: 16, color: COLOR_GOLD, bold: true, after: 70 }));
  children.push(p(sheet.meta.title || "Beregning", { font: FONT_SANS, size: 38, color: COLOR_DARK, bold: true, after: 90, line: 320 }));
  if (sheet.meta.subtitle) {
    children.push(p(sheet.meta.subtitle, { font: FONT_SERIF, size: 22, color: COLOR_MUTED, italics: true, after: 180 }));
  }
  children.push(metadataTable(sheet));
  children.push(p(LABELS.generated[displayLanguage], { font: FONT_SANS, size: 16, color: COLOR_MUTED, italics: true, before: 160, after: 230 }));
  children.push(subtleRule());

  if (sheet.given.length > 0) {
    children.push(heading(LABELS.given[displayLanguage], "01"));
    children.push(simpleValueTable(sheet.given, displayLanguage));
  }

  if (sheet.assumptions.length > 0) {
    children.push(heading(LABELS.assumptions[displayLanguage], "02"));
    children.push(...bulletList(sheet.assumptions));
  }

  children.push(...stepBlock(sheet));

  if (sheet.results.length > 0) {
    children.push(heading(LABELS.results[displayLanguage], "04"));
    children.push(simpleValueTable(sheet.results, displayLanguage));
  }

  if (sheet.notes.length > 0) {
    children.push(heading(LABELS.notes[displayLanguage], "05"));
    children.push(...bulletList(sheet.notes));
  }

  children.push(p(LABELS.generated[displayLanguage], { font: FONT_SANS, size: 16, color: COLOR_MUTED, italics: true, before: 260 }));

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

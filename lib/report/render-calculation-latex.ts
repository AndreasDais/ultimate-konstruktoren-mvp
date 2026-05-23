import type { CalculationSheetModel } from "./calculation-sheet-model";

export type CalculationLatexMode = "section" | "full-document";

export type RenderCalculationLatexOptions = {
  mode?: CalculationLatexMode;
};

function escapeLatexText(value: string): string {
  return String(value ?? "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .trim();
}

function unitLatex(unit: string | null): string {
  if (!unit) return "";
  const escaped = escapeLatexText(unit)
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/mm2/g, "mm^2")
    .replace(/cm3/g, "cm^3")
    .replace(/m2/g, "m^2");
  return `\\,\\mathrm{${escaped}}`;
}

function valueLine(symbolLatex: string, value: string, unit: string | null): string {
  return `\\[\n${symbolLatex} = ${escapeLatexText(value)}${unitLatex(unit)}\n\\]`;
}

function proseToLatexParagraph(value: string): string {
  const text = escapeLatexText(value);
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " "))
    .filter(Boolean)
    .join("\n\n");
}

function displayMath(latex: string): string {
  const trimmed = latex.trim();
  if (!trimmed) return "";
  return `\\[\n${trimmed}\n\\]`;
}

function fullDocumentStart(title: string): string[] {
  return [
    "\\documentclass[11pt,a4paper]{article}",
    "\\usepackage[utf8]{inputenc}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage[norsk]{babel}",
    "\\usepackage{amsmath,amssymb}",
    "\\usepackage{siunitx}",
    "\\usepackage{geometry}",
    "\\geometry{margin=25mm}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlength{\\parskip}{0.65em}",
    "",
    `\\title{${title}}`,
    "\\author{Generert av PILAR}",
    "\\date{}",
    "",
    "\\begin{document}",
    "\\maketitle",
    "",
  ];
}

export function renderCalculationSheetLatex(
  sheet: CalculationSheetModel,
  options: RenderCalculationLatexOptions = {},
): string {
  const L = sheet.meta.locale;
  const mode = options.mode ?? "section";
  const title = escapeLatexText(sheet.meta.title || "Beregning");
  const subtitle = escapeLatexText(sheet.meta.subtitle || "");
  const date = escapeLatexText(sheet.meta.date || "");
  const documentId = escapeLatexText(sheet.meta.documentId || "");

  const lines: string[] = [];
  lines.push("% Generert av PILAR");
  lines.push("% Denne fila kan limast direkte inn i Overleaf eller inkluderast med \\input{...}.");
  lines.push("% Hugs manuell kontroll av ansvarleg fagperson før bruk i prosjektering.");
  lines.push("");

  if (mode === "full-document") {
    lines.push(...fullDocumentStart(title));
  } else {
    lines.push(`\\section{${title}}`);
  }

  if (subtitle) lines.push(`\\textit{${subtitle}}\\par`);
  lines.push("\\smallskip");
  lines.push(`\\noindent\\textbf{Dokument-ID:} ${documentId}\\quad\\textbf{Dato:} ${date}`);
  lines.push("");

  if (sheet.given.length > 0) {
    lines.push(`\\subsection{${L === "nn" ? "Gjevne data" : "Gitte data"}}`);
    for (const item of sheet.given) {
      lines.push(valueLine(item.latex, item.value, item.unit));
    }
    lines.push("");
  }

  if (sheet.assumptions.length > 0) {
    lines.push(`\\subsection{${L === "nn" ? "Føresetnader" : "Forutsetninger"}}`);
    lines.push("\\begin{itemize}");
    for (const assumption of sheet.assumptions) {
      lines.push(`  \\item ${escapeLatexText(assumption)}`);
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  lines.push(`\\subsection{${L === "nn" ? "Stegvis berekning" : "Stegvis beregning"}}`);
  for (const step of sheet.steps) {
    lines.push(`\\subsubsection{${escapeLatexText(step.title)}}`);
    const explanation = proseToLatexParagraph(step.explanation);
    if (explanation) lines.push(explanation);
    for (const formula of step.formulas) {
      const math = displayMath(formula.latex);
      if (math) lines.push(math);
    }
    lines.push("");
  }

  if (sheet.results.length > 0) {
    lines.push(`\\subsection{${L === "nn" ? "Resultat" : "Resultater"}}`);
    for (const result of sheet.results) {
      lines.push(valueLine(result.latex, result.value, result.unit));
    }
    lines.push("");
  }

  if (sheet.notes.length > 0) {
    lines.push(`\\subsection{${L === "nn" ? "Merknader" : "Merknader"}}`);
    lines.push("\\begin{itemize}");
    for (const note of sheet.notes) {
      lines.push(`  \\item ${escapeLatexText(note)}`);
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  lines.push("\\smallskip");
  lines.push("\\noindent\\textit{Generert av PILAR. Beregningen skal kontrolleres av ansvarlig fagperson før bruk.}");
  lines.push("");

  if (mode === "full-document") {
    lines.push("\\end{document}");
    lines.push("");
  }

  return lines.join("\n");
}

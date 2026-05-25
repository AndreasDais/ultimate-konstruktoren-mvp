import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const touched = [];
const skipped = [];

function filePath(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const p = filePath(rel);
  if (!fs.existsSync(p)) {
    skipped.push(`${rel}: missing`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

function write(rel, before, after) {
  if (before === null) return;
  if (after !== before) {
    fs.writeFileSync(filePath(rel), after, "utf8");
    touched.push(rel);
  }
}

function ensureImport(source, importLine, anchor = /^import .*?;\n/m) {
  if (source.includes(importLine)) return source;
  const imports = [...source.matchAll(/^import .*?;\n/gm)];
  if (imports.length > 0) {
    const idx = imports[imports.length - 1].index + imports[imports.length - 1][0].length;
    return `${source.slice(0, idx)}${importLine}\n${source.slice(idx)}`;
  }
  const match = source.match(anchor);
  if (!match) return `${importLine}\n${source}`;
  const idx = match.index + match[0].length;
  return `${source.slice(0, idx)}${importLine}\n${source.slice(idx)}`;
}

function objectEndIndex(source, objectStart) {
  const open = source.indexOf("{", objectStart);
  if (open === -1) return -1;
  let depth = 0;
  let string = null;
  let escaped = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (string) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === string) string = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      string = ch;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return i;
  }
  return -1;
}

function ensureLabelEntry(source, key, enValue) {
  const re = new RegExp(`(${key}\\s*:\\s*\\{)([^}]*)(\\})`, "m");
  return source.replace(re, (whole, start, body, end) => {
    if (/\ben\s*:/.test(body)) return whole;
    const comma = body.trim().endsWith(",") ? "" : ",";
    return `${start}${body}${comma} en: ${JSON.stringify(enValue)}${end}`;
  });
}

function replaceOrAppendKnownMapEntry(source, key, value) {
  const token = `${key}:`;
  if (source.includes(token)) return source;
  return source.replace(/(const known[^=]*=\s*\{)/, `$1\n    ${key}: ${JSON.stringify(value)},`);
}

function patchDisplayHelpers() {
  const rel = "lib/international/display.ts";
  const before = read(rel);
  if (before === null) return;
  let s = before;

  if (!s.includes("export function polishEnglishGeneratedText")) {
    s += `\n\nexport function polishEnglishGeneratedText(value: string): string {\n  return value\n    .replace(/\\bKonstruktør A\\b/g, "Engineer A")\n    .replace(/\\bKonstruktør B\\b/g, "Engineer B")\n    .replace(/\\bKonstruktørane\\b/g, "the engineers")\n    .replace(/\\bKonstruktørene\\b/g, "the engineers")\n    .replace(/\\bKonstruktør\\b/g, "Engineer")\n    .replace(/\\bSammenligner\\b/g, "Comparator")\n    .replace(/\\bSamanliknar\\b/g, "Comparator")\n    .replace(/\\bKontrollørens\\b/g, "Controller's")\n    .replace(/\\bKontrolløren\\b/g, "the Controller")\n    .replace(/\\bKontrollør\\b/g, "Controller")\n    .replace(/\\bFagperson\\b/g, "Professional reviewer")\n    .replace(/\\bFaglig merknad\\b/g, "Engineering note")\n    .replace(/\\bAntakelser & advarsler\\b/g, "Assumptions & warnings")\n    .replace(/\\bSkjul merknader\\b/g, "Hide notes")\n    .replace(/\\bMetodiske forskjeller\\b/gi, "Method differences")\n    .replace(/\\bForskjeller i forutsetninger\\b/gi, "Assumption differences")\n    .replace(/\\bHvorfor:/g, "Why:")\n    .replace(/\\bForeløpig resultat med agentkontroll\\. Må kontrolleres av fagperson før bruk\\./g, "Preliminary result with agent review. Must be checked by a qualified professional before use.")\n    .replace(/\\bBeregningen er foreløpig godkjent med advarsler\\. Forbeholdene må avklares før prosjekteringsbruk\\./g, "The calculation is preliminarily approved with warnings. Conditions must be resolved before design use.")\n    .replace(/\\bBeregningen er foreløpig godkjent med advarsler\\./g, "The calculation is preliminarily approved with warnings.")\n    .replace(/\\bMå kontrolleres av fagperson før bruk i prosjektering\\./g, "Must be checked by a qualified professional before use in design work.")\n    .replace(/\\bSkal verifiseres av ansvarlig fagperson før bruk i prosjektering\\./g, "Must be verified by the engineer of record before use in design work.")\n    .replace(/\\bDet er små forskjeller mellom svarene, hovedsakelig avrunding\\./g, "There are minor differences between the answers, mainly rounding.")\n    .replace(/\\bTabellen viser de viktigste kontrollpunktene\\. Full variabel-\\/pipeline-sporing finnes i nettversjonen:/g, "The table shows the most important review points. Full variable/pipeline trace is available in the web version:")\n    .replace(/\\bSelvkontroll: Ingen inkonsistenser funnet\\b/g, "Self-check: no inconsistencies found")\n    .replace(/\\bNavn · stilling · foretak\\b/g, "Name · title · company")\n    .replace(/\\bDD\\.MM\\.ÅÅÅÅ\\b/g, "MM/DD/YYYY")\n    .replace(/\\bMIDDELS\\b/g, "MEDIUM")\n    .replace(/\\bFORELØPIG\\b/g, "PRELIMINARY")\n    .replace(/\\bSide\\b/g, "Page");\n}\n`;
  }

  if (s.includes("export function localizeGeneratedEngineeringText") && !s.includes("return polishEnglishGeneratedText(value);")) {
    s = s.replace(
      /if \(language !== "en"\) return value;\n\s*return value/m,
      'if (language !== "en") return value;\n  return polishEnglishGeneratedText(value)'
    );
  }

  const entries = [
    ["lspan", "Span, L"],
    ["ltbregime", "LTB regime"],
    ["ltbzone", "LTB zone"],
    ["lpapprox", "Approx. Lp"],
    ["lrapprox", "Approx. Lr"],
    ["phibmpupperbound", "φbMp upper bound"],
    ["phibmn", "φbMn"],
    ["phivvn", "φvVn"],
    ["demandcapacityratio", "Demand-to-capacity ratio"],
    ["dcr", "Demand-to-capacity ratio"],
    ["loadcombo", "Load combination"],
    ["loadcombination", "Load combination"],
    ["dchar", "Dead load, D"],
    ["lloadchar", "Live load, L"],
    ["lspanft", "Span, L"],
  ];
  for (const [key, value] of entries) {
    s = replaceOrAppendKnownMapEntry(s, key, value);
  }

  if (s.includes("export function localizeResultLabel")) {
    const fallbackNeedle = '.replace(/LTBscreening/i, "LTB screening")';
    if (s.includes(fallbackNeedle) && !s.includes('replace(/Lspan/i, "Span, L")')) {
      s = s.replace(
        fallbackNeedle,
        `${fallbackNeedle}\n    .replace(/Lspan/i, "Span, L")\n    .replace(/LTBregime/i, "LTB regime")\n    .replace(/LTBzone/i, "LTB zone")\n    .replace(/Lpapprox/i, "Approx. Lp")\n    .replace(/Lrapprox/i, "Approx. Lr")\n    .replace(/phibMpupperbound/i, "φbMp upper bound")`
      );
    }
  }

  if (!s.includes("export function inferCalculationEnglishDisplay")) {
    s += `\n\nexport function inferCalculationEnglishDisplay(text: string | null | undefined): boolean {\n  return inferEnglishEngineeringText(text);\n}\n`;
  }

  write(rel, before, s);
}

function patchCalculationSheetModel() {
  const rel = "lib/report/calculation-sheet-model.ts";
  const before = read(rel);
  if (before === null) return;
  let s = before;

  s = ensureImport(s, 'import type { PilarDisplayLanguage } from "@/lib/international/display";');
  s = ensureImport(s, 'import { localizeResultLabel, polishEnglishGeneratedText, inferCalculationEnglishDisplay } from "@/lib/international/display";');

  if (s.includes("export type CalculationSheetMeta") && !s.includes("displayLanguage?: PilarDisplayLanguage")) {
    s = s.replace(/(status:\s*string;\n)/, "$1  displayLanguage?: PilarDisplayLanguage;\n");
  }

  s = s.replace(
    /const displayLanguage\s*=\s*model\.meta\.displayLanguage \?\? model\.meta\.locale;/g,
    'const displayLanguage: PilarDisplayLanguage = (model.meta.displayLanguage ?? (inferCalculationEnglishDisplay([model.meta.title, model.assumptions.join(" "), model.warnings.join(" "), model.limitations.join(" ")].join("\\n")) ? "en" : model.meta.locale)) as PilarDisplayLanguage;'
  );
  if (!s.includes("const displayLanguage: PilarDisplayLanguage") && s.includes("export function buildCalculationSheetModel")) {
    s = s.replace(
      /export function buildCalculationSheetModel\(model: ReportModel\): CalculationSheetModel \{\n/,
      'export function buildCalculationSheetModel(model: ReportModel): CalculationSheetModel {\n  const displayLanguage: PilarDisplayLanguage = (model.meta.displayLanguage ?? (inferCalculationEnglishDisplay([model.meta.title, model.assumptions.join(" "), model.warnings.join(" "), model.limitations.join(" ")].join("\\n")) ? "en" : model.meta.locale)) as PilarDisplayLanguage;\n'
    );
  }

  if (!/displayLanguage\s*,/.test(s)) {
    s = s.replace(/(status:\s*model\.meta\.statusLabel,\n)/, "$1      displayLanguage,\n");
  }

  // Normalize displayCalculationLabel signature and body.
  s = s.replace(
    /function displayCalculationLabel\(label: string(?:,\s*displayLanguage:\s*PilarDisplayLanguage\s*=\s*"nb")?\): string \{[\s\S]*?\n\}/,
    'function displayCalculationLabel(label: string, displayLanguage: PilarDisplayLanguage = "nb"): string {\n  return localizeResultLabel(normalizeEngineeringDisplaySymbols(displayResultLabel(label)), displayLanguage);\n}'
  );

  // Ensure result/given functions take and use displayLanguage.
  s = s.replace(
    /function resultToCalculationResult\((row:\s*\{[\s\S]*?unit:\s*string \| null;\n\})(?:,\s*displayLanguage:\s*PilarDisplayLanguage)?\): CalculationSheetResult \{\n\s*const label = displayCalculationLabel\(row\.label(?:,\s*[^)]*)?\);/,
    'function resultToCalculationResult($1, displayLanguage: PilarDisplayLanguage): CalculationSheetResult {\n  const label = displayCalculationLabel(row.label, displayLanguage);'
  );
  s = s.replace(
    /function resultToGiven\((row:\s*\{[\s\S]*?unit:\s*string \| null;\n\})(?:,\s*displayLanguage:\s*PilarDisplayLanguage)?\): CalculationGiven \{\n\s*const label = displayCalculationLabel\(row\.label(?:,\s*[^)]*)?\);/,
    'function resultToGiven($1, displayLanguage: PilarDisplayLanguage): CalculationGiven {\n  const label = displayCalculationLabel(row.label, displayLanguage);'
  );

  s = s.replace(/\.map\(resultToGiven\)/g, ".map((row) => resultToGiven(row, displayLanguage))");
  s = s.replace(/\.map\(resultToCalculationResult\)/g, ".map((row) => resultToCalculationResult(row, displayLanguage))");
  s = s.replace(/model\.keyResults\.map\(resultToGiven\)/g, "model.keyResults.map((row) => resultToGiven(row, displayLanguage))");
  s = s.replace(/model\.keyResults\.map\(resultToCalculationResult\)/g, "model.keyResults.map((row) => resultToCalculationResult(row, displayLanguage))");

  if (!s.includes("function sheetText(")) {
    s = s.replace(
      /function valueWithUnit/m,
      'function sheetText(value: string, displayLanguage: PilarDisplayLanguage): string {\n  return displayLanguage === "en" ? polishEnglishGeneratedText(value) : value;\n}\n\nfunction valueWithUnit'
    );
  }
  s = s.replace(/assumptions:\s*model\.assumptions,/g, 'assumptions: model.assumptions.map((text) => sheetText(text, displayLanguage)),');
  s = s.replace(/notes:\s*\[\.\.\.model\.warnings, \.\.\.model\.limitations\],/g, 'notes: [...model.warnings, ...model.limitations].map((text) => sheetText(text, displayLanguage)),');

  write(rel, before, s);
}

function patchCalculationPage() {
  const rel = "app/rapport/[run_id]/beregning/page.tsx";
  const before = read(rel);
  if (before === null) return;
  let s = before;

  s = ensureImport(s, 'import type { PilarDisplayLanguage } from "@/lib/international/display";');
  s = ensureImport(s, 'import { inferCalculationEnglishDisplay } from "@/lib/international/display";');
  s = s.replace("const LABELS: Record<Locale, Record<string, string>> = {", "const LABELS: Record<PilarDisplayLanguage, Record<string, string>> = {");

  if (!s.includes('loadingError: "Error loading calculation sheet"')) {
    s = s.replace(
      /\n\s*nn:\s*\{\n\s*loadingError:/,
      `\n  en: {\n    loadingError: "Error loading calculation sheet",\n    back: "Back to full report",\n    downloadPdf: "Download PDF",\n    downloadLatex: "Download .tex",\n    downloadLatexFull: "Full LaTeX",\n    downloadWord: "Download Word",\n    copyLatex: "Copy LaTeX",\n    copied: "Copied",\n    titleFallback: "Calculation",\n    kicker: "PILAR · CALCULATION SHEET",\n    documentId: "Document ID",\n    date: "Date",\n    status: "Status",\n    given: "Given data",\n    assumptions: "Assumptions",\n    calculation: "Step-by-step calculation",\n    results: "Results",\n    notes: "Notes",\n    generatedNote: "Generated by PILAR. The calculation must be checked by a qualified professional before use.",\n    step: "Step",\n    control: "Check",\n  },\n  nn: {\n    loadingError:`
    );
  }

  if (!s.includes("function calculationSheetDisplayLanguage(")) {
    const helper = `\nfunction calculationSheetDisplayLanguage(sheet: ReturnType<typeof buildCalculationSheetModel> | null, locale: Locale): PilarDisplayLanguage {\n  if (!sheet) return locale;\n  const explicit = sheet.meta.displayLanguage;\n  if (explicit === "en" || explicit === "nb" || explicit === "nn") return explicit;\n  const signal = [\n    sheet.meta.title,\n    sheet.meta.subtitle,\n    ...sheet.assumptions,\n    ...sheet.notes,\n  ].join("\\n");\n  return inferCalculationEnglishDisplay(signal) ? "en" : locale;\n}\n`;
    const idx = s.indexOf("type Props");
    if (idx !== -1) s = `${s.slice(0, idx)}${helper}\n${s.slice(idx)}`;
    else s = `${s}\n${helper}`;
  }

  s = s.replace(/const displayLanguage\s*=\s*\([\s\S]*?\)\s*as keyof typeof LABELS;\n\s*const L = LABELS\[displayLanguage\];/m, 'const displayLanguage = calculationSheetDisplayLanguage(sheet, locale);\n  const L = LABELS[displayLanguage];');
  if (!s.includes("const displayLanguage = calculationSheetDisplayLanguage(sheet, locale);")) {
    s = s.replace(/const L = LABELS\[locale\];/g, 'const displayLanguage = calculationSheetDisplayLanguage(sheet, locale);\n  const L = LABELS[displayLanguage];');
  }

  write(rel, before, s);
}

function patchRenderCalculationDocx() {
  const rel = "lib/report/render-calculation-docx.ts";
  const before = read(rel);
  if (before === null) return;
  let s = before;

  s = ensureImport(s, 'import type { PilarDisplayLanguage } from "@/lib/international/display";');
  s = ensureImport(s, 'import { inferCalculationEnglishDisplay } from "@/lib/international/display";');
  s = s.replace("const LABELS: Record<string, Record<Locale, string>> = {", "const LABELS: Record<string, Record<PilarDisplayLanguage, string>> = {");

  const labels = {
    eyebrow: "CALCULATION SHEET",
    documentId: "Document ID",
    date: "Date",
    status: "Status",
    fullReport: "Full report",
    given: "Given data",
    assumptions: "Assumptions",
    calculation: "Step-by-step calculation",
    results: "Results",
    notes: "Notes",
    generated: "Generated by PILAR. The calculation must be checked by a qualified professional before use.",
    step: "Step",
    control: "Check",
    size: "Quantity",
    value: "Value",
    page: "Page",
  };
  for (const [key, value] of Object.entries(labels)) {
    if (s.includes(`${key}: {`)) s = ensureLabelEntry(s, key, value);
  }
  if (!s.includes("page: {") && s.includes("const LABELS")) {
    const start = s.indexOf("const LABELS");
    const end = objectEndIndex(s, start);
    if (end !== -1) s = `${s.slice(0, end)}  page: { nb: "Side", nn: "Side", en: "Page" },\n${s.slice(end)}`;
  }

  if (!s.includes("function calculationSheetDisplayLanguage(")) {
    const helper = `\nfunction calculationSheetDisplayLanguage(sheet: CalculationSheetModel): PilarDisplayLanguage {\n  const explicit = sheet.meta.displayLanguage;\n  if (explicit === "en" || explicit === "nb" || explicit === "nn") return explicit;\n  const signal = [sheet.meta.title, sheet.meta.subtitle, ...sheet.assumptions, ...sheet.notes].join("\\n");\n  return inferCalculationEnglishDisplay(signal) ? "en" : sheet.meta.locale;\n}\n`;
    s = s.replace(/type DocChild = Paragraph \| Table;\n/, `type DocChild = Paragraph | Table;\n${helper}\n`);
  }

  s = s.replace(/const locale = sheet\.meta\.locale;\n\s*const displayLanguage[^;]*;/, 'const locale = sheet.meta.locale;\n  const displayLanguage: PilarDisplayLanguage = calculationSheetDisplayLanguage(sheet);');
  if (!s.includes("const displayLanguage: PilarDisplayLanguage = calculationSheetDisplayLanguage(sheet);")) {
    s = s.replace(/const locale = sheet\.meta\.locale;\n/, 'const locale = sheet.meta.locale;\n  const displayLanguage: PilarDisplayLanguage = calculationSheetDisplayLanguage(sheet);\n');
  }

  // Make metadata and value tables receive displayLanguage.
  s = s.replace(/function metadataTable\(sheet: CalculationSheetModel\): Table \{\n\s*const L = LABELS;\n\s*const locale = sheet\.meta\.locale;/, 'function metadataTable(sheet: CalculationSheetModel, displayLanguage: PilarDisplayLanguage): Table {\n  const L = LABELS;\n  const locale = displayLanguage;');
  s = s.replace(/metadataTable\(sheet\)/g, "metadataTable(sheet, displayLanguage)");

  s = s.replace(/function simpleValueTable\(([^)]*rows:[\s\S]*?),\s*locale:\s*Locale\): Table \{/m, 'function simpleValueTable($1, displayLanguage: PilarDisplayLanguage): Table {');
  s = s.replace(/LABELS\.size\[locale\]/g, "LABELS.size[displayLanguage]");
  s = s.replace(/LABELS\.value\[locale\]/g, "LABELS.value[displayLanguage]");
  s = s.replace(/simpleValueTable\(sheet\.given, locale\)/g, "simpleValueTable(sheet.given, displayLanguage)");
  s = s.replace(/simpleValueTable\(sheet\.results, locale\)/g, "simpleValueTable(sheet.results, displayLanguage)");

  // Use a safe fallback for step labels to avoid UNDEFINED 01.
  s = s.replace(/LABELS\.step\[displayLanguage\]/g, '(LABELS.step[displayLanguage] ?? "Step")');
  s = s.replace(/LABELS\.step\[locale\]/g, '(LABELS.step[displayLanguage] ?? LABELS.step[locale] ?? "Step")');

  // Replace footer hardcoded Side if present.
  s = s.replace(/text:\s*"Side "/g, 'text: `${LABELS.page?.[displayLanguage] ?? "Page"} `');

  write(rel, before, s);
}

function patchRenderCalculationLatex() {
  const rel = "lib/report/render-calculation-latex.ts";
  const before = read(rel);
  if (before === null) return;
  let s = before;

  s = ensureImport(s, 'import type { PilarDisplayLanguage } from "@/lib/international/display";');
  s = ensureImport(s, 'import { inferCalculationEnglishDisplay } from "@/lib/international/display";');

  if (!s.includes("function calculationSheetDisplayLanguage(")) {
    const helper = `\nfunction calculationSheetDisplayLanguage(sheet: CalculationSheetModel): PilarDisplayLanguage {\n  const explicit = sheet.meta.displayLanguage;\n  if (explicit === "en" || explicit === "nb" || explicit === "nn") return explicit;\n  const signal = [sheet.meta.title, sheet.meta.subtitle, ...sheet.assumptions, ...sheet.notes].join("\\n");\n  return inferCalculationEnglishDisplay(signal) ? "en" : sheet.meta.locale;\n}\n\nfunction labelFor(language: PilarDisplayLanguage, key: "given" | "assumptions" | "calculation" | "results" | "notes" | "step"): string {\n  const en = { given: "Given data", assumptions: "Assumptions", calculation: "Step-by-step calculation", results: "Results", notes: "Notes", step: "Step" };\n  const nb = { given: "Gitte data", assumptions: "Forutsetninger", calculation: "Stegvis beregning", results: "Resultater", notes: "Merknader", step: "Steg" };\n  const nn = { given: "Gjevne data", assumptions: "Føresetnader", calculation: "Stegvis berekning", results: "Resultat", notes: "Merknader", step: "Steg" };\n  return language === "en" ? en[key] : language === "nn" ? nn[key] : nb[key];\n}\n`;
    const imports = [...s.matchAll(/^import .*?;\n/gm)];
    const insertAt = imports.length ? imports[imports.length - 1].index + imports[imports.length - 1][0].length : 0;
    s = `${s.slice(0, insertAt)}${helper}${s.slice(insertAt)}`;
  }

  s = s.replace(/const L = sheet\.meta\.locale;\n\s*const D[^;]*;/, 'const L = sheet.meta.locale;\n  const D: PilarDisplayLanguage = calculationSheetDisplayLanguage(sheet);');
  if (!s.includes("const D: PilarDisplayLanguage = calculationSheetDisplayLanguage(sheet);")) {
    s = s.replace(/const L = sheet\.meta\.locale;\n/, 'const L = sheet.meta.locale;\n  const D: PilarDisplayLanguage = calculationSheetDisplayLanguage(sheet);\n');
  }

  s = s.replace(/D === "en" \? "Given data" : L === "nn" \? "Gjevne data" : "Gitte data"/g, 'labelFor(D, "given")');
  s = s.replace(/D === "en" \? "Assumptions" : L === "nn" \? "Føresetnader" : "Forutsetninger"/g, 'labelFor(D, "assumptions")');
  s = s.replace(/D === "en" \? "Step-by-step calculation" : L === "nn" \? "Stegvis berekning" : "Stegvis beregning"/g, 'labelFor(D, "calculation")');
  s = s.replace(/D === "en" \? "Results" : L === "nn" \? "Resultat" : "Resultater"/g, 'labelFor(D, "results")');
  s = s.replace(/D === "en" \? "Notes" : "Merknader"/g, 'labelFor(D, "notes")');
  s = s.replace(/`\$\{D === "en" \? "Step" : "STEG"\} \$\{step\.number\}`/g, '`${labelFor(D, "step").toUpperCase()} ${step.number}`');
  s = s.replace(/\bSTEG\b/g, "STEP");

  write(rel, before, s);
}

function patchFullReportRender() {
  // Full PDF/Word remnants: make renderers polish controller/footer strings if imported helpers exist.
  const rels = ["lib/report/build-report-model.ts", "lib/report/render-docx.ts", "app/rapport/[run_id]/page.tsx", "app/components/result/CalculationResultView.tsx"];
  for (const rel of rels) {
    const before = read(rel);
    if (before === null) continue;
    let s = before;

    if (rel.endsWith("build-report-model.ts")) {
      s = ensureImport(s, 'import { polishEnglishGeneratedText } from "@/lib/international/display";');
      s = s.replace(/controllerText:\s*localizeGeneratedEngineeringText\(([^,]+),\s*displayLanguage\),/g, 'controllerText: displayLanguage === "en" ? polishEnglishGeneratedText(localizeGeneratedEngineeringText($1, displayLanguage)) : localizeGeneratedEngineeringText($1, displayLanguage),');
      s = s.replace(/conclusion:\s*localizeGeneratedEngineeringText\(([^,]+),\s*displayLanguage\),/g, 'conclusion: displayLanguage === "en" ? polishEnglishGeneratedText(localizeGeneratedEngineeringText($1, displayLanguage)) : localizeGeneratedEngineeringText($1, displayLanguage),');
    }

    if (rel.endsWith("render-docx.ts")) {
      s = s.replace(/TILLIT-SKÅR/g, "TRUST SCORE");
      s = s.replace(/MIDDELS/g, "MEDIUM");
      s = s.replace(/VIKTIG MERKNAD/g, "IMPORTANT NOTE");
      s = s.replace(/Kontrollør/g, "Controller");
      s = s.replace(/Høy/g, "High");
      s = s.replace(/Mindre avvik/g, "Minor differences");
      s = s.replace(/Med advarsel/g, "With warning");
      s = s.replace(/Delvis klar/g, "Partly ready");
    }

    if (rel.endsWith("page.tsx") || rel.endsWith("CalculationResultView.tsx")) {
      // Patch hardcoded Norwegian strings that appear in the international web result layer.
      const replacements = new Map([
        ["STEG 3 AV 3 · RESULTAT", "STEP 3 OF 3 · RESULT"],
        ["Beregningsnotat", "Calculation note"],
        ["Foreløpig resultat med agentkontroll. Må kontrolleres av fagperson før bruk.", "Preliminary result with agent review. Must be checked by a qualified professional before use."],
        ["FAGLIG MERKNAD", "ENGINEERING NOTE"],
        ["ANTAKELSER & ADVARSLER", "ASSUMPTIONS & WARNINGS"],
        ["Sammenligner", "Comparator"],
        ["Konstruktør", "Engineer"],
        ["Skjul merknader", "Hide notes"],
        ["METODISKE FORSKJELLER", "METHOD DIFFERENCES"],
        ["FORSKJELLER I FORUTSETNINGER", "ASSUMPTION DIFFERENCES"],
        ["Godkjent med advarsler", "Approved with warnings"],
        ["Selvkontroll: Ingen inkonsistenser funnet", "Self-check: no inconsistencies found"],
      ]);
      for (const [from, to] of replacements) s = s.split(from).join(to);
    }

    write(rel, before, s);
  }
}

patchDisplayHelpers();
patchCalculationSheetModel();
patchCalculationPage();
patchRenderCalculationDocx();
patchRenderCalculationLatex();
patchFullReportRender();

console.log("[Sprint 33.3] calculation sheet localization + undefined-step cleanup applied.");
if (touched.length) console.log("Touched:\n" + touched.map((x) => `- ${x}`).join("\n"));
if (skipped.length) console.log("Skipped/notes:\n" + skipped.map((x) => `- ${x}`).join("\n"));

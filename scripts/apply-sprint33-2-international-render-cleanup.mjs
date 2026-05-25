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
  const match = source.match(anchor);
  if (!match) return `${importLine}\n${source}`;
  const idx = match.index + match[0].length;
  return `${source.slice(0, idx)}${importLine}\n${source.slice(idx)}`;
}

function replaceOnce(source, needle, replacement, label) {
  if (!source.includes(needle)) {
    skipped.push(label ?? `needle not found: ${needle.slice(0, 80)}`);
    return source;
  }
  return source.replace(needle, replacement);
}

function addObjectEntryBeforeClose(source, objectName, entry, uniqueToken) {
  if (source.includes(uniqueToken)) return source;
  const start = source.indexOf(objectName);
  if (start === -1) return source;
  const open = source.indexOf("{", start);
  if (open === -1) return source;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) {
      return `${source.slice(0, i)}${entry}\n${source.slice(i)}`;
    }
  }
  return source;
}

function patchDisplayHelpers() {
  const rel = "lib/international/display.ts";
  let s = read(rel);
  if (s === null) return;

  if (!s.includes("function polishEnglishGeneratedText")) {
    s += `\n\nexport function polishEnglishGeneratedText(value: string): string {\n  return value\n    .replace(/\\bKonstruktør A\\b/g, "Engineer A")\n    .replace(/\\bKonstruktør B\\b/g, "Engineer B")\n    .replace(/\\bKonstruktørane\\b/g, "the engineers")\n    .replace(/\\bKonstruktørene\\b/g, "the engineers")\n    .replace(/\\bKonstruktør\\b/g, "Engineer")\n    .replace(/\\bSammenligner\\b/g, "Comparator")\n    .replace(/\\bSamanliknar\\b/g, "Comparator")\n    .replace(/\\bKontrollørens\\b/g, "Controller's")\n    .replace(/\\bKontrolløren\\b/g, "the Controller")\n    .replace(/\\bKontrollør\\b/g, "Controller")\n    .replace(/\\bFagperson\\b/g, "Professional reviewer")\n    .replace(/\\bFaglig merknad\\b/g, "Engineering note")\n    .replace(/\\bAntakelser & advarsler\\b/g, "Assumptions & warnings")\n    .replace(/\\bSkjul merknader\\b/g, "Hide notes")\n    .replace(/\\bHvorfor:/g, "Why:")\n    .replace(/\\bForeløpig resultat med agentkontroll\\. Må kontrolleres av fagperson før bruk\\./g, "Preliminary result with agent review. Must be checked by a qualified professional before use.")\n    .replace(/\\bBeregningen er foreløpig godkjent med advarsler\\. Forbeholdene må avklares før prosjekteringsbruk\\./g, "The calculation is preliminarily approved with warnings. Conditions must be resolved before design use.")\n    .replace(/\\bBeregningen er foreløpig godkjent med advarsler\\./g, "The calculation is preliminarily approved with warnings.")\n    .replace(/\\bMå kontrolleres av fagperson før bruk i prosjektering\\./g, "Must be checked by a qualified professional before use in design work.")\n    .replace(/\\bSkal verifiseres av ansvarlig fagperson før bruk i prosjektering\\./g, "Must be verified by the engineer of record before use in design work.")\n    .replace(/\\bDet er små forskjeller mellom svarene, hovedsakelig avrunding\\./g, "There are minor differences between the answers, mainly rounding.")\n    .replace(/\\bTabellen viser de viktigste kontrollpunktene\\. Full variabel-\\/pipeline-sporing finnes i nettversjonen:/g, "The table shows the most important review points. Full variable/pipeline trace is available in the web version:")\n    .replace(/\\bNavn · stilling · foretak\\b/g, "Name · title · company")\n    .replace(/\\bDD\\.MM\\.ÅÅÅÅ\\b/g, "MM/DD/YYYY")\n    .replace(/\\bSide\\b/g, "Page");\n}\n`;
  }

  // Strengthen existing localizeGeneratedEngineeringText if present.
  if (s.includes("export function localizeGeneratedEngineeringText") && !s.includes("polishEnglishGeneratedText(value);")) {
    s = s.replace(
      /if \(language !== "en"\) return value;\n\s*return value/m,
      'if (language !== "en") return value;\n  return polishEnglishGeneratedText(value)'
    );
  }

  // Add common raw result-key labels used by AISC/US runs.
  const labelEntries = [
    ['ltbzone', '"LTB zone"'],
    ['lpapprox', '"Approx. Lp"'],
    ['lrapprox', '"Approx. Lr"'],
    ['loadcombo', '"Load combination"'],
    ['loadcombination', '"Load combination"'],
    ['phibmn', '"φbMn"'],
    ['phivvn', '"φvVn"'],
    ['demandcapacityratio', '"Demand-to-capacity ratio"'],
    ['utilization', '"Utilization"'],
  ];
  if (s.includes("const known:") || s.includes("const known =")) {
    for (const [key, value] of labelEntries) {
      const token = `${key}:`;
      if (!s.includes(token)) {
        s = s.replace(/(const known[^=]*=\s*\{)/, `$1\n    ${key}: ${value},`);
      }
    }
  }

  // Add post replacements in localizeResultLabel fallback chain if they are not already there.
  if (s.includes("export function localizeResultLabel") && !s.includes('replace(/LTBzone/i, "LTB zone")')) {
    s = s.replace(
      /\.replace\(\/LTBscreening\/i, "LTB screening"\)/,
      '.replace(/LTBscreening/i, "LTB screening")\n    .replace(/LTBzone/i, "LTB zone")\n    .replace(/Lpapprox/i, "Approx. Lp")\n    .replace(/Lrapprox/i, "Approx. Lr")\n    .replace(/load_combo|loadcombo/i, "Load combination")'
    );
  }

  write(rel, read(rel), s);
}

function patchCalculationSheetModel() {
  const rel = "lib/report/calculation-sheet-model.ts";
  let s = read(rel);
  if (s === null) return;

  s = ensureImport(s, 'import type { PilarDisplayLanguage } from "@/lib/international/display";');
  s = ensureImport(s, 'import { localizeResultLabel, polishEnglishGeneratedText } from "@/lib/international/display";');

  if (!s.includes("displayLanguage?: PilarDisplayLanguage") && s.includes("export type CalculationSheetMeta")) {
    s = s.replace(/(status:\s*string;\n)/, '$1  displayLanguage?: PilarDisplayLanguage;\n');
  }

  if (!s.includes("const displayLanguage = model.meta.displayLanguage ?? model.meta.locale") && s.includes("export function buildCalculationSheetModel")) {
    s = s.replace(
      /export function buildCalculationSheetModel\(model: ReportModel\): CalculationSheetModel \{\n/,
      'export function buildCalculationSheetModel(model: ReportModel): CalculationSheetModel {\n  const displayLanguage = model.meta.displayLanguage ?? model.meta.locale;\n'
    );
  }

  if (!s.includes("displayLanguage,")) {
    s = s.replace(/(status:\s*model\.meta\.statusLabel,[\s\S]*?)(reportUrl:\s*model\.meta\.reportUrl,)/, `$1displayLanguage,\n      $2`);
  }

  // If result labels are still raw, localize them at the sheet-model layer.
  if (s.includes("function displayCalculationLabel") && !s.includes("localizeResultLabel(normalizeEngineeringDisplaySymbols")) {
    s = s.replace(
      /function displayCalculationLabel\(label: string\): string \{\n\s*return normalizeEngineeringDisplaySymbols\(displayResultLabel\(label\)\);\n\}/,
      'function displayCalculationLabel(label: string, displayLanguage: PilarDisplayLanguage = "nb"): string {\n  return localizeResultLabel(normalizeEngineeringDisplaySymbols(displayResultLabel(label)), displayLanguage);\n}'
    );
  }

  // Pass displayLanguage into result/given converters, preserving older code shape.
  s = s.replace(/const label = displayCalculationLabel\(row\.label\);/g, 'const label = displayCalculationLabel(row.label, displayLanguage);');

  // Polish text arrays in English without touching Norwegian mode.
  if (!s.includes("function sheetText")) {
    s = s.replace(
      /function valueWithUnit/m,
      'function sheetText(value: string, displayLanguage: PilarDisplayLanguage): string {\n  return displayLanguage === "en" ? polishEnglishGeneratedText(value) : value;\n}\n\nfunction valueWithUnit'
    );
  }
  s = s.replace(/assumptions:\s*model\.assumptions,/g, 'assumptions: model.assumptions.map((text) => sheetText(text, displayLanguage)),');
  s = s.replace(/notes:\s*\[\.\.\.model\.warnings, \.\.\.model\.limitations\]/g, 'notes: [...model.warnings, ...model.limitations].map((text) => sheetText(text, displayLanguage))');

  write(rel, read(rel), s);
}

function patchCalculationPage() {
  const rel = "app/rapport/[run_id]/beregning/page.tsx";
  let s = read(rel);
  if (s === null) return;

  s = ensureImport(s, 'import type { PilarDisplayLanguage } from "@/lib/international/display";');
  s = s.replace("const LABELS: Record<Locale, Record<string, string>> = {", "const LABELS: Record<PilarDisplayLanguage, Record<string, string>> = {");

  if (!s.includes('loadingError: "Error loading calculation sheet"')) {
    s = s.replace(
      /\n\s*nn:\s*\{\n\s*loadingError:/,
      `\n  en: {\n    loadingError: "Error loading calculation sheet",\n    back: "Back to full report",\n    downloadPdf: "Download PDF",\n    downloadLatex: "Download .tex",\n    downloadLatexFull: "Full LaTeX",\n    downloadWord: "Download Word",\n    copyLatex: "Copy LaTeX",\n    copied: "Copied",\n    titleFallback: "Calculation",\n    kicker: "PILAR · CALCULATION SHEET",\n    documentId: "Document ID",\n    date: "Date",\n    status: "Status",\n    given: "Given data",\n    assumptions: "Assumptions",\n    calculation: "Step-by-step calculation",\n    results: "Results",\n    notes: "Notes",\n    generatedNote: "Generated by PILAR. The calculation must be checked by a qualified professional before use.",\n    step: "Step",\n    control: "Check",\n  },\n  nn: {\n    loadingError:`
    );
  }

  // Remove early L derived from locale; calculate after sheet exists so displayLanguage can drive it.
  s = s.replace(/\n\s*const L = LABELS\[locale\];\n/, "\n");
  if (!s.includes("const displayLanguage = (sheet?.meta.displayLanguage ?? locale)")) {
    s = s.replace(
      /  async function copyLatex\(\) \{/,
      '  const displayLanguage = (sheet?.meta.displayLanguage ?? locale) as PilarDisplayLanguage;\n  const L = LABELS[displayLanguage] ?? LABELS[locale];\n\n  async function copyLatex() {'
    );
  }

  s = s.replace(
    'step.isControlStep ? "Kontroll" : `Steg ${String(step.number).padStart(2, "0")}`',
    'step.isControlStep ? L.control : `${L.step} ${String(step.number).padStart(2, "0")}`'
  );

  write(rel, read(rel), s);
}

function patchCalculationDocx() {
  const rel = "lib/report/render-calculation-docx.ts";
  let s = read(rel);
  if (s === null) return;

  s = ensureImport(s, 'import type { PilarDisplayLanguage } from "@/lib/international/display";');
  s = s.replace("const LABELS: Record<string, Record<Locale, string>> = {", "const LABELS: Record<string, Record<PilarDisplayLanguage, string>> = {");
  const labelAdds = {
    eyebrow: 'en: "CALCULATION SHEET"',
    documentId: 'en: "Document ID"',
    date: 'en: "Date"',
    status: 'en: "Status"',
    fullReport: 'en: "Full report"',
    given: 'en: "Given data"',
    assumptions: 'en: "Assumptions"',
    calculation: 'en: "Step-by-step calculation"',
    results: 'en: "Results"',
    notes: 'en: "Notes"',
    step: 'en: "Step"',
    control: 'en: "Check"',
    size: 'en: "Quantity"',
    value: 'en: "Value"',
  };
  for (const [key, en] of Object.entries(labelAdds)) {
    const re = new RegExp(`(${key}:\\s*\\{[^}]*?)(\\s*\\})`);
    if (!new RegExp(`${key}:\\s*\\{[^}]*?en:`).test(s)) {
      s = s.replace(re, `$1, ${en}$2`);
    }
  }
  if (s.includes('generated: {') && !/generated:\s*\{[\s\S]*?en:/.test(s)) {
    s = s.replace(
      /(generated:\s*\{[\s\S]*?nn:\s*"[^"]+",?\n\s*)(\})/,
      '$1    en: "Generated by PILAR. The calculation must be checked by a qualified professional before use.",\n  $2'
    );
  }
  if (!s.includes("const displayLanguage = sheet.meta.displayLanguage ?? locale")) {
    s = s.replace(/const locale = sheet\.meta\.locale;/, 'const locale = sheet.meta.locale;\n  const displayLanguage = sheet.meta.displayLanguage ?? locale;');
  }
  s = s.replace(/\[locale\]/g, "[displayLanguage]");
  s = s.replace(/simpleValueTable\((sheet\.(?:given|results)),\s*displayLanguage\)/g, 'simpleValueTable($1, displayLanguage)');
  s = s.replace(/function simpleValueTable\(([^)]*?),\s*displayLanguage: PilarDisplayLanguage\): Table/g, 'function simpleValueTable($1, displayLanguage: PilarDisplayLanguage): Table');
  s = s.replace(/function simpleValueTable\(([^)]*?),\s*locale: Locale\): Table/g, 'function simpleValueTable($1, displayLanguage: PilarDisplayLanguage): Table');

  write(rel, read(rel), s);
}

function patchCalculationLatex() {
  const rel = "lib/report/render-calculation-latex.ts";
  let s = read(rel);
  if (s === null) return;

  if (!s.includes("const D = sheet.meta.displayLanguage ?? L")) {
    s = s.replace('const L = sheet.meta.locale;', 'const L = sheet.meta.locale;\n  const D = sheet.meta.displayLanguage ?? L;');
  }
  s = s.replace(/L === "nn" \? "Gjevne data" : "Gitte data"/g, 'D === "en" ? "Given data" : L === "nn" ? "Gjevne data" : "Gitte data"');
  s = s.replace(/L === "nn" \? "Føresetnader" : "Forutsetninger"/g, 'D === "en" ? "Assumptions" : L === "nn" ? "Føresetnader" : "Forutsetninger"');
  s = s.replace(/L === "nn" \? "Stegvis berekning" : "Stegvis beregning"/g, 'D === "en" ? "Step-by-step calculation" : L === "nn" ? "Stegvis berekning" : "Stegvis beregning"');
  s = s.replace(/L === "nn" \? "Resultat" : "Resultater"/g, 'D === "en" ? "Results" : L === "nn" ? "Resultat" : "Resultater"');
  s = s.replace(/L === "nn" \? "Merknader" : "Merknader"/g, 'D === "en" ? "Notes" : "Merknader"');
  s = s.replace(/`Steg \$\{String\(step\.number\)\.padStart\(2, "0"\)\}`/g, 'D === "en" ? `Step ${String(step.number).padStart(2, "0")}` : `Steg ${String(step.number).padStart(2, "0")}`');
  s = s.replace(/"Kontroll"/g, 'D === "en" ? "Check" : "Kontroll"');
  s = s.replace(/Generert av PILAR\. Beregningen skal kontrolleres av ansvarlig fagperson før bruk\./g, 'Generated by PILAR. The calculation must be checked by a qualified professional before use.');

  write(rel, read(rel), s);
}

function patchReportModelAndDocx() {
  const rel = "lib/report/build-report-model.ts";
  let s = read(rel);
  if (s !== null) {
    // Ensure generated/controller/comparison text is polished when displayLanguage is English.
    s = ensureImport(s, 'import { polishEnglishGeneratedText } from "@/lib/international/display";');
    if (!s.includes("function reportText")) {
      s = s.replace(
        /export function buildReportModel/m,
        'function reportText(value: string, displayLanguage: "nb" | "nn" | "en"): string {\n  return displayLanguage === "en" ? polishEnglishGeneratedText(value) : value;\n}\n\nexport function buildReportModel'
      );
    }
    s = s.replace(/cleanReportText\((data\.report\.technical_assessment|data\.report\.conclusion|data\.controllerDecision\?\.user_message \?\? data\.controllerDecision\?\.reason \?\? "")\)/g, 'reportText(cleanReportText($1), displayLanguage)');
    s = s.replace(/\.map\(\(text\) => localizeGeneratedEngineeringText\(text, displayLanguage\)\)/g, '.map((text) => reportText(text, displayLanguage))');
    write(rel, read(rel), s);
  }

  const relDocx = "lib/report/render-docx.ts";
  let d = read(relDocx);
  if (d === null) return;
  d = ensureImport(d, 'import { polishEnglishGeneratedText } from "@/lib/international/display";');
  d = d.replace("const LABELS: Record<string, Record<Locale, string>> = {", "const LABELS: Record<string, Record<Locale | 'en', string>> = {");
  const docxLabelAdds = {
    trustScore: 'en: "TRUST SCORE"',
    importantNote: 'en: "IMPORTANT NOTE"',
    decision: 'en: "Controller decision"',
    checkedBy: 'en: "Reviewed by"',
    signed: 'en: "Signature"',
    manualSignature: 'en: "Manual signature"',
    notControlled: 'en: "Must be checked by a qualified professional before use in design work."',
  };
  for (const [key, en] of Object.entries(docxLabelAdds)) {
    const re = new RegExp(`(${key}:\\s*\\{[^}]*?)(\\s*\\})`);
    if (!new RegExp(`${key}:\\s*\\{[^}]*?en:`).test(d)) {
      d = d.replace(re, `$1, ${en}$2`);
    }
  }
  d = d.replace(/TILLIT-SKÅR/g, "TRUST SCORE");
  d = d.replace(/MIDDELS/g, "MEDIUM");
  d = d.replace(/HØY/g, "HIGH");
  d = d.replace(/Fullstendighet/g, "Completeness");
  d = d.replace(/Kontrollør-verdict/g, "Controller verdict");
  d = d.replace(/Konstruktør-enighet/g, "Engineer agreement");
  d = d.replace(/VIKTIG MERKNAD/g, "IMPORTANT NOTE");
  d = d.replace(/AVGJØRELSE/g, "DECISION");
  d = d.replace(/STEG/g, "STEP");
  d = d.replace(/Navn · stilling · foretak/g, "Name · title · company");
  d = d.replace(/DD\.MM\.ÅÅÅÅ/g, "MM/DD/YYYY");
  d = d.replace(/Side /g, "Page ");
  if (!d.includes("polishEnglishGeneratedText(cleanText")) {
    d = d.replace(/cleanText\((model\.controllerText|model\.conclusion|model\.professionalAssessment)\)/g, 'polishEnglishGeneratedText(cleanText($1))');
  }
  write(relDocx, read(relDocx), d);
}

function patchReportPageStrings() {
  const rel = "app/rapport/[run_id]/page.tsx";
  let s = read(rel);
  if (s === null) return;
  s = ensureImport(s, 'import { polishEnglishGeneratedText } from "@/lib/international/display";');
  if (!s.includes("const maybeEnglish")) {
    s = s.replace(
      /const RP_LABELS =/,
      'const maybeEnglish = (value: string) => reportDisplayLanguage === "en" ? polishEnglishGeneratedText(value) : value;\n\n  const RP_LABELS ='
    );
  }
  // Render common generated prose through maybeEnglish.
  s = s.replace(/\{data\.report\.technical_assessment\}/g, "{maybeEnglish(data.report.technical_assessment)}");
  s = s.replace(/\{data\.report\.conclusion\}/g, "{maybeEnglish(data.report.conclusion)}");
  s = s.replace(/\{controllerText\}/g, "{maybeEnglish(controllerText)}");
  s = s.replace(/\{issue\.description\}/g, "{maybeEnglish(issue.description)}");
  s = s.replace(/\{row\.reason\}/g, "{maybeEnglish(row.reason)}");
  write(rel, read(rel), s);
}

patchDisplayHelpers();
patchCalculationSheetModel();
patchCalculationPage();
patchCalculationDocx();
patchCalculationLatex();
patchReportModelAndDocx();
patchReportPageStrings();

console.log("[Sprint 33.2] International render cleanup applied.");
if (touched.length) console.log("Touched:\n" + [...new Set(touched)].map((x) => `- ${x}`).join("\n"));
if (skipped.length) console.log("Notes/skips:\n" + skipped.slice(0, 40).map((x) => `- ${x}`).join("\n"));

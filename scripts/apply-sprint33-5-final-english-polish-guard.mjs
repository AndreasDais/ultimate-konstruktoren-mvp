import fs from "node:fs";

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function patchFile(file, patcher) {
  if (!exists(file)) {
    console.log(`SKIP ${file} (not found)`);
    return;
  }
  const before = read(file);
  const after = patcher(before);
  if (after !== before) {
    write(file, after);
    console.log(`PATCHED ${file}`);
  } else {
    console.log(`OK ${file}`);
  }
}

function ensureNamedImport(text, modulePath, names) {
  const wanted = Array.isArray(names) ? names : [names];
  const re = new RegExp(`import\\s+\\{([\\s\\S]*?)\\}\\s+from ${JSON.stringify(modulePath)};`);
  const match = text.match(re);
  if (match) {
    const current = match[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const missing = wanted.filter((name) => !current.includes(name));
    if (missing.length === 0) return text;
    const next = [...current, ...missing].join(", ");
    return text.replace(match[0], `import { ${next} } from ${JSON.stringify(modulePath)};`);
  }

  const importMatches = [...text.matchAll(/^import .*?;\n/gm)];
  const importLine = `import { ${wanted.join(", ")} } from ${JSON.stringify(modulePath)};\n`;
  if (importMatches.length === 0) return `${importLine}${text}`;
  const insertAt = importMatches[importMatches.length - 1].index + importMatches[importMatches.length - 1][0].length;
  return `${text.slice(0, insertAt)}${importLine}${text.slice(insertAt)}`;
}

function ensureTypeImport(text, modulePath, names) {
  const wanted = Array.isArray(names) ? names : [names];
  const re = new RegExp(`import\\s+type\\s+\\{([\\s\\S]*?)\\}\\s+from ${JSON.stringify(modulePath)};`);
  const match = text.match(re);
  if (match) {
    const current = match[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const missing = wanted.filter((name) => !current.includes(name));
    if (missing.length === 0) return text;
    const next = [...current, ...missing].join(", ");
    return text.replace(match[0], `import type { ${next} } from ${JSON.stringify(modulePath)};`);
  }

  const importMatches = [...text.matchAll(/^import .*?;\n/gm)];
  const importLine = `import type { ${wanted.join(", ")} } from ${JSON.stringify(modulePath)};\n`;
  if (importMatches.length === 0) return `${importLine}${text}`;
  const insertAt = importMatches[importMatches.length - 1].index + importMatches[importMatches.length - 1][0].length;
  return `${text.slice(0, insertAt)}${importLine}${text.slice(insertAt)}`;
}

function addOrReplaceLabel(text, key, enValue) {
  const objectRe = new RegExp(`(${key}:\\s*\\{)([\\s\\S]*?)(\\},)`, "m");
  return text.replace(objectRe, (match, open, body, close) => {
    if (/\ben\s*:/.test(body)) {
      return `${open}${body.replace(/en\s*:\s*"[^"]*"/, `en: ${JSON.stringify(enValue)}`)}${close}`;
    }
    const trimmed = body.trimEnd();
    const comma = trimmed.trim().endsWith(",") ? "" : ",";
    return `${open}${trimmed}${comma} en: ${JSON.stringify(enValue)} ${close}`;
  });
}

function patchInternationalDisplay(text) {
  const helper = `
export function sprint335PolishEnglishText(value: string): string {
  return String(value ?? "")
    .replace(/\\bBEREGNINGSNOTAT\\b/g, "CALCULATION NOTE")
    .replace(/\\bBEREKNINGSNOTAT\\b/g, "CALCULATION NOTE")
    .replace(/\\bBEREGNINGSARK\\b/g, "CALCULATION SHEET")
    .replace(/\\bBEREKNINGSARK\\b/g, "CALCULATION SHEET")
    .replace(/\\bDOKUMENT-ID\\b/g, "DOCUMENT ID")
    .replace(/\\bRapportør\\b/g, "Reporter")
    .replace(/\\bTILLIT-SKÅR\\b/g, "TRUST SCORE")
    .replace(/\\bVIKTIG MERKNAD\\b/g, "IMPORTANT NOTE")
    .replace(/\\bMIDDELS\\b/g, "MEDIUM")
    .replace(/\\bMiddels\\b/g, "Medium")
    .replace(/\\bHØY\\b/g, "HIGH")
    .replace(/\\bHøy\\b/g, "High")
    .replace(/\\bHøg\\b/g, "High")
    .replace(/\\bLAV\\b/g, "LOW")
    .replace(/\\bLav\\b/g, "Low")
    .replace(/\\bDelvis klar\\b/g, "Partly ready")
    .replace(/\\bMindre avvik\\b/g, "Minor differences")
    .replace(/\\bMed advarsel\\b/g, "With warnings")
    .replace(/\\bGodkjent med advarsler\\b/g, "Approved with warnings")
    .replace(/\\bFORELØPIG\\b/g, "PRELIMINARY")
    .replace(/\\bForeløpig\\b/g, "Preliminary")
    .replace(/Beregningen er foreløpig godkjent med advarsler\\. Forbeholdene må avklares før prosjekteringsbruk\\./gi, "The calculation is preliminarily approved with warnings. The reservations must be resolved before use in design work.")
    .replace(/Beregningen er foreløpig godkjent med advarsler\\. Skal verifiseres av ansvarlig fagperson før bruk i prosjektering\\./gi, "The calculation is preliminarily approved with warnings and must be verified by a qualified professional before use in design work.")
    .replace(/Det er små forskjeller mellom svarene, hovedsakelig avrunding\\./gi, "There are minor differences between the answers, mainly rounding.")
    .replace(/Tabellen viser de viktigste kontrollpunktene\\. Full variabel-\/pipeline-sporing finnes i nettversjonen:/gi, "The table shows the most important control points. Full variable and pipeline trace is available in the web version:")
    .replace(/Må kontrolleres av fagperson før bruk i prosjektering\\./gi, "Must be checked by a qualified professional before use in design work.")
    .replace(/må kontrolleres av fagperson før bruk i prosjektering/gi, "must be checked by a qualified professional before use in design work")
    .replace(/\\bKonstruktør A\\b/g, "Engineer A")
    .replace(/\\bKonstruktør B\\b/g, "Engineer B")
    .replace(/\\bKonstruktøren\\b/g, "the engineer")
    .replace(/\\bKonstruktør\\b/g, "Engineer")
    .replace(/\\bSammenligner\\b/g, "Comparator")
    .replace(/\\bSamanliknar\\b/g, "Comparator")
    .replace(/\\bKontrollør\\b/g, "Controller")
    .replace(/\\bFaglig merknad\\b/gi, "Engineering note")
    .replace(/\\bANTAKELSER & ADVARSLER\\b/g, "ASSUMPTIONS & WARNINGS")
    .replace(/\\bMETODISKE FORSKJELLER\\b/g, "METHODOLOGICAL DIFFERENCES")
    .replace(/\\bFORSKJELLER I FORUTSETNINGER\\b/g, "ASSUMPTION DIFFERENCES")
    .replace(/\\bSkjul merknader\\b/g, "Hide notes")
    .replace(/\\bSkjul vurderingen\\b/g, "Hide assessment")
    .replace(/\\bSelvkontroll: Ingen inkonsistenser funnet\\b/g, "Self-check: no inconsistencies found")
    .replace(/\\bØVRIG\\b/g, "OTHER")
    .replace(/\\bNavn · stilling · foretak\\b/g, "Name · title · company")
    .replace(/\\bDD\\.MM\\.ÅÅÅÅ\\b/g, "MM/DD/YYYY")
    .replace(/\\bFullstendighet\\b/g, "Completeness")
    .replace(/\\bHøg\\b/g, "High")
    .replace(/\\bLåg\\b/g, "Low")
    .replace(/\\båtvar\\w*\\b/gi, "warn")
    .replace(/\\bprosjektering\\b/gi, "design work")
    .replace(/\\bfagperson\\b/gi, "qualified professional");
}

export function sprint335EnglishResultLabel(label: string): string | null {
  const key = String(label ?? "").toLowerCase().replace(/[\\s_.-]+/g, "").replace(/,/g, "");
  const known: Record<string, string> = {
    d: "Dead load, D",
    deadloadd: "Dead load, D",
    l: "Live load, L",
    liveloadl: "Live load, L",
    lptypical: "Typical Lp",
    lrtypical: "Typical Lr",
    lpapprox: "Approx. Lp",
    lrapprox: "Approx. Lr",
    lspan: "Span, L",
    span: "Span, L",
    spanl: "Span, L",
    ltbflag: "LTB flag",
    ltbzone: "LTB zone",
    ltbregime: "LTB regime",
    ltbscreening: "LTB screening",
    phibmpupperbound: "φbMp upper bound",
    phibmn: "φbMn",
    phivvn: "φvVn",
    loadfactord: "Dead load factor",
    gamma_d: "Dead load factor",
    gammad: "Dead load factor",
    γd: "Dead load factor",
    loadfactorl: "Live load factor",
    gamma_l: "Live load factor",
    gammal: "Live load factor",
    γl: "Live load factor",
    deadloadfactor: "Dead load factor",
    liveloadfactor: "Live load factor",
    cbassumed: "Assumed Cb",
    cbactual: "Actual Cb",
    loadcombination: "Load combination",
    loadchar: "Characteristic load",
    factorl: "Live load factor",
    factord: "Dead load factor",
    vu: "Vu",
    mu: "Mu",
    wu: "wu",
  };
  return known[key] ?? null;
}

export const SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT = [
  "AISC/ASCE DATA GUARD",
  "- Do not provide concrete AISC Manual table values such as Zx, Sx, J, Cw, rts, ho, Lp, Lr, phi_b*Mp, phi_b*Mn, or phi_v*Vn unless they are explicitly provided by the user or retrieved from an approved verified data source in the application.",
  "- If section properties are missing, state that they are required and keep the result as a demand calculation / qualitative screening only.",
  "- Do not cite table values from memory. Do not say a value is tabulated unless the value is part of verified input/context.",
  "- You may state qualitative risk, e.g. LTB may be critical when Lb is large, but do not compute final AISC capacity from unverified properties.",
].join("\\n");
`;

  if (!text.includes("function sprint335PolishEnglishText(")) {
    const firstExport = text.indexOf("export function");
    text = firstExport === -1 ? `${text}\n${helper}` : `${text.slice(0, firstExport)}${helper}\n${text.slice(firstExport)}`;
  }

  if (text.includes("export function localizeGeneratedEngineeringText") && !text.includes("sprint335PolishEnglishText(value);")) {
    text = text.replace(
      /(export function localizeGeneratedEngineeringText[\s\S]*?\{\n\s*if \(language !== "en"\) return value;\n)/,
      `$1  value = sprint335PolishEnglishText(value);\n`
    );
  }

  if (text.includes("export function polishEnglishGeneratedText") && !text.includes("return sprint335PolishEnglishText(value);")) {
    text = text.replace(
      /export function polishEnglishGeneratedText\(value: string\): string \{[\s\S]*?\n\}/,
      'export function polishEnglishGeneratedText(value: string): string {\n  return sprint335PolishEnglishText(value);\n}'
    );
  }

  if (text.includes("export function localizeResultLabel") && !text.includes("sprint335EnglishResultLabel(label)")) {
    text = text.replace(
      /(export function localizeResultLabel[\s\S]*?\{\n\s*if \(language !== "en"\) return label;\n)/,
      `$1  const sprint335Override = sprint335EnglishResultLabel(label);\n  if (sprint335Override) return sprint335Override;\n`
    );
  }

  return text;
}

function patchEngineeringContextAgent(text) {
  if (text.includes("SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT")) return text;
  text = ensureNamedImport(text, "@/lib/international/display", ["SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT"]);

  // Common pattern in this project: return [contextBlock, roleLanguageBlock, instructions, basePrompt].filter(Boolean).join("\n")
  text = text.replace(
    /(return \[[\s\S]*?buildEngineeringContextPromptBlock\(context\),\n)/,
    `$1    SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT,\n`
  );

  // Fallback if the exact return-array pattern is different.
  if (!text.includes("SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT,")) {
    text = text.replace(
      /buildEngineeringContextPromptBlock\(context\)/g,
      'buildEngineeringContextPromptBlock(context) + "\\n" + SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT'
    );
  }

  return text;
}

function patchAgentRoute(text) {
  if (text.includes("AISC/ASCE DATA GUARD")) return text;
  const guard = `\n\nAISC/ASCE DATA GUARD:\n- Do not provide concrete AISC Manual table values such as Zx, Sx, J, Cw, rts, ho, Lp, Lr, phi_b*Mp, phi_b*Mn, or phi_v*Vn unless they are explicitly provided by the user or retrieved from an approved verified data source in the application.\n- If section properties are missing, state exactly which data is required and keep the result as demand calculation / qualitative screening only.\n- Do not cite AISC table values from memory.\n`;

  // Add guard to prominent template literals without trying to understand every route file.
  text = text.replace(/(SYSTEM PROMPT[\s\S]*?`)/, (match) => match.includes("AISC/ASCE DATA GUARD") ? match : match.replace(/`$/, `${guard}\``));

  // If no obvious prompt header exists, append to any instruction string containing AISC or Eurocode.
  if (!text.includes("AISC/ASCE DATA GUARD")) {
    text = text.replace(/(You are[\s\S]{0,5000}?)(`)/, `$1${guard}$2`);
  }

  return text;
}

function patchBuildReportModel(text) {
  text = ensureNamedImport(text, "@/lib/international/display", ["sprint335PolishEnglishText"]);

  if (!text.includes("const polishForDisplay = (value: string) =>")) {
    text = text.replace(
      /(const displayLanguage[\s\S]*?;\n)/,
      `$1  const polishForDisplay = (value: string) => displayLanguage === "en" ? sprint335PolishEnglishText(value) : value;\n`
    );
  }

  text = text.replace(/label: tillit\.label,/g, 'label: displayLanguage === "en" ? sprint335PolishEnglishText(tillit.label) : tillit.label,');
  text = text.replace(/tone: tillit\.labelKey,/g, 'tone: displayLanguage === "en" ? sprint335PolishEnglishText(tillit.labelKey) : tillit.labelKey,');
  text = text.replace(/text: summary,/g, 'text: polishForDisplay(summary),');
  text = text.replace(/comparisonText,/g, 'comparisonText: polishForDisplay(comparisonText),');
  text = text.replace(/professionalAssessment: ([^\n]+),/g, (m, expr) => m.includes("polishForDisplay") ? m : `professionalAssessment: polishForDisplay(${expr}),`);
  text = text.replace(/conclusion: localizeGeneratedEngineeringText\(/g, 'conclusion: polishForDisplay(localizeGeneratedEngineeringText(');
  text = text.replace(/(reportText\(cleanReportText\(data\.report\.conclusion\), displayLanguage\),\n\s*displayLanguage,\n\s*\),)/g, `$1`);
  text = text.replace(/conclusion: polishForDisplay\(localizeGeneratedEngineeringText\(([^]*?displayLanguage,\n\s*\),)/m, (match) => {
    return match.endsWith("),") ? match : `${match}),`;
  });

  return text;
}

function patchReportDocx(text) {
  text = ensureNamedImport(text, "@/lib/international/display", ["sprint335PolishEnglishText"]);
  text = ensureTypeImport(text, "@/lib/international/display", ["PilarDisplayLanguage"]);

  text = text.replace(/const LABELS: Record<string, Record<Locale, string>> = \{/, "const LABELS: Record<string, Record<PilarDisplayLanguage, string>> = {");
  const labelEns = {
    eyebrow: "CALCULATION NOTE",
    documentId: "DOCUMENT ID",
    date: "DATE",
    status: "STATUS",
    version: "VERSION",
    trustScore: "TRUST SCORE",
    importantNote: "IMPORTANT NOTE",
    pipelineStatus: "PIPELINE STATUS",
    checkedBy: "REVIEWED BY",
    signed: "SIGNATURE",
    manualSignature: "Manual signature",
    generatedBy: "Generated by Pilar",
    notControlled: "Must be checked by a qualified professional before use in design work.",
    validation: "Report model warning",
  };
  for (const [key, value] of Object.entries(labelEns)) text = addOrReplaceLabel(text, key, value);

  // Trust-score card: use display language and polish label/tone text.
  text = text.replace(/function scoreCard\(model: ReportModel\): Table \{\n/, (m) => {
    if (text.slice(text.indexOf(m), text.indexOf(m) + 400).includes("displayLanguage")) return m;
    return `${m}  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? model.meta.locale;\n`;
  });
  text = text.replace(/LABELS\.trustScore\[model\.meta\.locale\]/g, "LABELS.trustScore[displayLanguage]");
  text = text.replace(/text: `\$\{score\}\/100  \$\{model\.trust\.label\}`/g, 'text: `${score}/100  ${displayLanguage === "en" ? sprint335PolishEnglishText(model.trust.label) : model.trust.label}`');
  text = text.replace(/Fullstendighet \$\{String\(breakdown\.completeness\)\.replace\("\."\, "\,"\)\}\/30/g, '${displayLanguage === "en" ? "Completeness" : "Fullstendighet"} ${String(breakdown.completeness).replace(".", ",")}/30');

  // Pipeline status card.
  text = text.replace(/function pipelineStatusCard\(model: ReportModel\): Table \| null \{\n\s*const locale = model\.meta\.locale;\n/, 'function pipelineStatusCard(model: ReportModel): Table | null {\n  const locale = model.meta.locale;\n  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? locale;\n');
  text = text.replace(/LABELS\.pipelineStatus\[locale\]/g, "LABELS.pipelineStatus[displayLanguage]");
  text = text.replace(/text: `\$\{row\.label\}: `/g, 'text: `${displayLanguage === "en" ? sprint335PolishEnglishText(row.label) : row.label}: `');
  text = text.replace(/text: row\.value \|\| "-"/g, 'text: displayLanguage === "en" ? sprint335PolishEnglishText(row.value || "-") : row.value || "-"');

  // Decision and signature blocks.
  text = text.replace(/function decisionBox\(model: ReportModel\): Table \{\n/, (m) => {
    if (text.slice(text.indexOf(m), text.indexOf(m) + 400).includes("displayLanguage")) return m;
    return `${m}  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? model.meta.locale;\n`;
  });
  text = text.replace(/text: "AVGJØRELSE  "/g, 'text: displayLanguage === "en" ? "DECISION  " : "AVGJØRELSE  "');
  text = text.replace(/text: model\.control\.decision\.toUpperCase\(\)/g, 'text: displayLanguage === "en" ? sprint335PolishEnglishText(model.control.decision).toUpperCase() : model.control.decision.toUpperCase()');
  text = text.replace(/p\(model\.control\.controllerText \|\| LABELS\.notControlled\[model\.meta\.locale\]/g, 'p(displayLanguage === "en" ? sprint335PolishEnglishText(model.control.controllerText || LABELS.notControlled[displayLanguage]) : model.control.controllerText || LABELS.notControlled[model.meta.locale]');

  text = text.replace(/function signatureTable\(model: ReportModel\): Table \{\n\s*const locale = model\.meta\.locale;\n/, 'function signatureTable(model: ReportModel): Table {\n  const locale = model.meta.locale;\n  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? locale;\n');
  text = text.replace(/\[LABELS\.checkedBy\[locale\], "Navn · stilling · foretak"\]/g, '[LABELS.checkedBy[displayLanguage], displayLanguage === "en" ? "Name · title · company" : "Navn · stilling · foretak"]');
  text = text.replace(/\[LABELS\.signed\[locale\], LABELS\.manualSignature\[locale\]\]/g, '[LABELS.signed[displayLanguage], LABELS.manualSignature[displayLanguage]]');
  text = text.replace(/\[LABELS\.date\[locale\], "DD\.MM\.ÅÅÅÅ"\]/g, '[LABELS.date[displayLanguage], displayLanguage === "en" ? "MM/DD/YYYY" : "DD.MM.ÅÅÅÅ"]');

  text = text.replace(/function disclaimerBox\(model: ReportModel\): Table \{\n\s*return calloutTable/g, 'function disclaimerBox(model: ReportModel): Table {\n  const displayLanguage: PilarDisplayLanguage = model.meta.displayLanguage ?? model.meta.locale;\n  return calloutTable');
  text = text.replace(/LABELS\.importantNote\[model\.meta\.locale\]/g, "LABELS.importantNote[displayLanguage]");
  text = text.replace(/p\(model\.disclaimer,/g, 'p(displayLanguage === "en" ? sprint335PolishEnglishText(model.disclaimer) : model.disclaimer,');

  return text;
}

function patchReportPage(text) {
  text = ensureNamedImport(text, "@/lib/international/display", ["sprint335PolishEnglishText"]);

  if (!text.includes("const polishReportText = (value: string) =>")) {
    text = text.replace(
      /(const reportDisplayLanguage[\s\S]*?;\n)/,
      `$1  const polishReportText = (value: string) => reportDisplayLanguage === "en" ? sprint335PolishEnglishText(value) : value;\n`
    );
  }

  // Improve visible hard-coded strings in the international report page without changing data contracts.
  text = text.replace(/BEREGNINGSNOTAT/g, "CALCULATION NOTE");
  text = text.replace(/DOKUMENT-ID/g, "DOCUMENT ID");
  text = text.replace(/Rapportør/g, "Reporter");
  text = text.replace(/MIDDELS/g, "MEDIUM");
  text = text.replace(/FORELØPIG/g, "PRELIMINARY");
  text = text.replace(/Må kontrolleres av fagperson før bruk i prosjektering\./g, "Must be checked by a qualified professional before use in design work.");
  text = text.replace(/Beregningen er foreløpig godkjent med advarsler\. Forbeholdene må avklares før prosjekteringsbruk\./g, "The calculation is preliminarily approved with warnings. The reservations must be resolved before use in design work.");
  text = text.replace(/Beregningen er foreløpig godkjent med advarsler\. Skal verifiseres av ansvarlig fagperson før bruk i prosjektering\./g, "The calculation is preliminarily approved with warnings and must be verified by a qualified professional before use in design work.");

  return text;
}

function patchResultView(text) {
  text = ensureNamedImport(text, "@/lib/international/display", ["polishEnglishGeneratedText", "localizeResultLabel"]);

  // UI labels that were still hard-coded in the report/result view.
  text = text.replace(/STEG 3 AV 3 · RESULTAT/g, "STEP 3 OF 3 · RESULT");
  text = text.replace(/Beregningsnotat/g, "Calculation note");
  text = text.replace(/Foreløpig resultat med agentkontroll\. Må kontrolleres av fagperson før bruk\./g, "Preliminary result with agent control. Must be checked by a qualified professional before use.");
  text = text.replace(/FAGLIG MERKNAD/g, "ENGINEERING NOTE");
  text = text.replace(/ANTAKELSER & ADVARSLER/g, "ASSUMPTIONS & WARNINGS");
  text = text.replace(/METODISKE FORSKJELLER/g, "METHODOLOGICAL DIFFERENCES");
  text = text.replace(/FORSKJELLER I FORUTSETNINGER/g, "ASSUMPTION DIFFERENCES");
  text = text.replace(/Skjul merknader/g, "Hide notes");
  text = text.replace(/Konstruktør A/g, "Engineer A");
  text = text.replace(/Konstruktør B/g, "Engineer B");
  text = text.replace(/Konstruktør/g, "Engineer");
  text = text.replace(/Sammenligner/g, "Comparator");

  // Common result table headers.
  text = text.replace(/"Konstruktør A"/g, '"Engineer A"');
  text = text.replace(/"Konstruktør B"/g, '"Engineer B"');

  // Polish likely-cause text if the file already renders it directly.
  text = text.replace(/\{diff\.likely_cause\}/g, '{polishEnglishGeneratedText(diff.likely_cause)}');
  text = text.replace(/\{issue\.issue\}/g, '{polishEnglishGeneratedText(issue.issue)}');

  return text;
}

function patchForebelStripe(text) {
  text = text.replace(/FORELØPIG/g, "PRELIMINARY");
  text = text.replace(/Må kontrolleres av fagperson før bruk i prosjektering\./g, "Must be checked by a qualified professional before use in design work.");
  return text;
}

patchFile("lib/international/display.ts", patchInternationalDisplay);
patchFile("lib/engineering-context/agent.ts", patchEngineeringContextAgent);
for (const route of [
  "app/api/agent-a/route.ts",
  "app/api/agent-b/route.ts",
  "app/api/agent-c/route.ts",
  "app/api/agent-d/route.ts",
  "app/api/agent-e/route.ts",
]) {
  patchFile(route, patchAgentRoute);
}
patchFile("lib/report/build-report-model.ts", patchBuildReportModel);
patchFile("lib/report/render-docx.ts", patchReportDocx);
patchFile("app/rapport/[run_id]/page.tsx", patchReportPage);
patchFile("app/components/result/CalculationResultView.tsx", patchResultView);
patchFile("app/rapport/[run_id]/_components/ForebelStripe.tsx", patchForebelStripe);

console.log("Sprint 33.5 final English polish + AISC guard applied. Run: npx tsc --noEmit --pretty false");

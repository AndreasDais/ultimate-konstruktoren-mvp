import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, "utf8");
}

function patchFile(rel, transform) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.log(`SKIP ${rel}`);
    return;
  }
  const before = fs.readFileSync(full, "utf8");
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(full, after, "utf8");
    console.log(`PATCHED ${rel}`);
  } else {
    console.log(`OK ${rel}`);
  }
}

function walk(dir, acc = []) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return acc;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", ".vercel", "coverage", "dist", "build"].includes(entry.name)) continue;
    const rel = path.join(dir, entry.name).replaceAll("\\\\", "/");
    if (entry.isDirectory()) walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}

function replaceResidues(s) {
  return s
    // Core labels / statuses
    .replaceAll("FORELØPIG GODKJENT", "PRELIMINARILY APPROVED")
    .replaceAll("FORELØPIG", "PRELIMINARY")
    .replaceAll("MINDRE FORSKJELLER", "MINOR DIFFERENCES")
    .replaceAll("BEGGE KONSTRUKTØRER ER ENIGE", "BOTH ENGINEERS AGREE")
    .replaceAll("BEGGE KONSTRUKTØRAR ER EINIGE", "BOTH ENGINEERS AGREE")
    .replaceAll("ØVRIG", "OTHER")
    .replaceAll("GOD", "GOOD")
    // Fixed report/controller fallbacks
    .replaceAll(
      "Beregningen er godkjent for visning. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering.",
      "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work."
    )
    .replaceAll(
      "Beregningen er foreløpig godkjent for visning. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering.",
      "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work."
    )
    .replaceAll("De kom frem til samme resultat.", "They reached the same result.")
    .replaceAll("De kom fram til same resultat.", "They reached the same result.")
    // Mixed English/Norwegian generated strings seen in Sprint 33.8
    .replaceAll("Engineer A and B er fullstendig enige om alle dimensjonerende verdier.", "Engineer A and Engineer B fully agree on all design values.")
    .replaceAll("Engineer A og B har minor differences — No critical deviations.", "Engineer A and Engineer B have minor differences — no critical deviations.")
    .replaceAll("Engineer B reports HIGH confidence på sin uavhengige løsning.", "Engineer B reports HIGH confidence in its independent solution.")
    .replaceAll("HIGH her betyr at B er trygg på egen metode — at A and B er enige er en separat sjekk (se verdikt over).", "HIGH means that Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check (see verdict above).")
    .replaceAll("Self-assessment — ikke en uavhengig verifikasjon.", "Self-assessment — not an independent verification.")
    // Common Norwegian/Nynorsk fragments inside comparator prose
    .replaceAll("Engineer A og Engineer B", "Engineer A and Engineer B")
    .replaceAll("Engineer A og B", "Engineer A and Engineer B")
    .replaceAll("A og B", "Engineer A and Engineer B")
    .replaceAll("A and B er enige", "Engineer A and Engineer B agree")
    .replaceAll("A and B er einige", "Engineer A and Engineer B agree")
    .replaceAll("er fullstendig enige", "fully agree")
    .replaceAll("er fullstendig einige", "fully agree")
    .replaceAll("dimensjonerende verdier", "design values")
    .replaceAll("dimensjonerande verdiar", "design values")
    .replaceAll("på sin uavhengige løsning", "in its independent solution")
    .replaceAll("på si uavhengige løysing", "in its independent solution")
    .replaceAll("HIGH her betyr", "HIGH means")
    .replaceAll("egen metode", "its own method")
    .replaceAll("eigen metode", "its own method")
    .replaceAll("se verdikt over", "see verdict above")
    .replaceAll("samme grunnleggjende metode", "the same basic method")
    .replaceAll("same grunnleggjande metode", "the same basic method")
    .replaceAll("bruker", "use")
    .replaceAll("brukar", "use")
    .replaceAll("medan", "while")
    .replaceAll("mens", "while")
    .replaceAll("berre", "only")
    .replaceAll("bare", "only")
    .replaceAll("hovudformelen", "the main formula")
    .replaceAll("hovedformelen", "the main formula")
    .replaceAll("utrekningsrute", "calculation route")
    .replaceAll("utregningsrute", "calculation route")
    .replaceAll("ein alternativ", "an alternative")
    .replaceAll("en alternativ", "an alternative")
    .replaceAll("som ein intern kryssjekk", "as an internal cross-check")
    .replaceAll("som en intern kryssjekk", "as an internal cross-check")
    .replaceAll("Dette er ei forskjell i presentasjonsform, ikkje i metode.", "This is a presentation difference, not a methodological difference.")
    .replaceAll("Dette er en forskjell i presentasjonsform, ikke i metode.", "This is a presentation difference, not a methodological difference.")
    .replaceAll("lastfaktorane", "load factors")
    .replaceAll("lastfaktorene", "load factors")
    .replaceAll("som eigne resultatfelt", "as separate result fields")
    .replaceAll("som egne resultatfelt", "as separate result fields")
    .replaceAll("tekstbeskrivinga", "the text description")
    .replaceAll("tekstbeskrivelsen", "the text description")
    .replaceAll("Innhaldet er likeverdig men strukturen er ulik.", "The content is equivalent, but the structure differs.")
    .replaceAll("Innholdet er likeverdig men strukturen er ulik.", "The content is equivalent, but the structure differs.")
    .replaceAll("Begge konstruktørar", "Both engineers")
    .replaceAll("Begge konstruktører", "Both engineers")
    .replaceAll("konstruktørar", "engineers")
    .replaceAll("konstruktører", "engineers")
    .replaceAll("Konstruktør A", "Engineer A")
    .replaceAll("Konstruktør B", "Engineer B")
    .replaceAll("Konstruktør", "Engineer")
    .replaceAll("Samanliknar", "Comparator")
    .replaceAll("Sammenligner", "Comparator")
    .replaceAll("Kontrollør", "Controller")
    .replaceAll("Cb-antaginga", "The Cb assumption")
    .replaceAll("Cb-antakelsen", "The Cb assumption")
    .replaceAll("antaginga", "assumption")
    .replaceAll("antakelsen", "assumption")
    .replaceAll("føresetnad", "assumption")
    .replaceAll("forutsetning", "assumption")
    .replaceAll("føresetnader", "assumptions")
    .replaceAll("forutsetninger", "assumptions")
    .replaceAll("sjølve", "itself")
    .replaceAll("selve", "itself")
    .replaceAll("Ingen forskjell", "No difference")
    .replaceAll("ingen forskjell", "no difference")
    .replaceAll("mellomledd", "intermediate value")
    .replaceAll("jamnlasta enkeltfelt", "uniformly loaded simple span")
    .replaceAll("jevnt lastet enkeltfelt", "uniformly loaded simple span")
    .replaceAll("eigenvekta", "self-weight")
    .replaceAll("egenvekten", "self-weight")
    .replaceAll("tyngdepunktet", "centroid")
    .replaceAll("skjærsenter", "shear center")
    .replaceAll("flaggar", "flags")
    .replaceAll("flagger", "flags")
    .replaceAll("noko meir eksplisitt", "somewhat more explicitly")
    .replaceAll("noe mer eksplisitt", "somewhat more explicitly");
}

const localFinalHelper = `
function sprint339FinalNorwegianResidueText(value: string): string {
  return String(value ?? "")
    .replace(/FORELØPIG GODKJENT/g, "PRELIMINARILY APPROVED")
    .replace(/MINDRE FORSKJELLER/g, "MINOR DIFFERENCES")
    .replace(/BEGGE KONSTRUKTØRER ER ENIGE/g, "BOTH ENGINEERS AGREE")
    .replace(/ØVRIG/g, "OTHER")
    .replace(/\bGOD\b/g, "GOOD")
    .replace(/Beregningen er godkjent for visning\. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering\./g, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/De kom frem til samme resultat\./g, "They reached the same result.")
    .replace(/Engineer A and B er fullstendig enige om alle dimensjonerende verdier\./g, "Engineer A and Engineer B fully agree on all design values.")
    .replace(/Engineer A og B har minor differences/g, "Engineer A and Engineer B have minor differences")
    .replace(/Engineer B reports HIGH confidence på sin uavhengige løsning\./g, "Engineer B reports HIGH confidence in its independent solution.")
    .replace(/HIGH her betyr at B er trygg på egen metode — at A and B er enige er en separat sjekk \(se verdikt over\)\./g, "HIGH means that Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check (see verdict above).")
    .replace(/Self-assessment — ikke en uavhengig verifikasjon\./g, "Self-assessment — not an independent verification.")
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
    .replace(/Dette er ei forskjell i presentasjonsform, ikkje i metode\./g, "This is a presentation difference, not a methodological difference.")
    .replace(/lastfaktorane/g, "load factors")
    .replace(/som eigne resultatfelt/g, "as separate result fields")
    .replace(/tekstbeskrivinga/g, "the text description")
    .replace(/Innhaldet er likeverdig men strukturen er ulik\./g, "The content is equivalent, but the structure differs.")
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
`;

function insertAfterImports(source, helper, markerName) {
  if (source.includes(`function ${markerName}(`)) return source;
  const lines = source.split("\n");
  let insertAt = 0;
  let inImport = false;
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (t.startsWith("import ")) inImport = true;
    if (inImport && t.endsWith(";")) {
      insertAt = i + 1;
      inImport = false;
    }
  }
  lines.splice(insertAt, 0, helper);
  return lines.join("\n");
}

// 1) Direct source cleanup in current UI/report files.
const textExt = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".md"]);
for (const dir of ["app", "lib", "components", "docs"]) {
  for (const rel of walk(dir)) {
    if (!textExt.has(path.extname(rel))) continue;
    patchFile(rel, replaceResidues);
  }
}

// 2) Central export for future reuse.
patchFile("lib/international/display.ts", (s) => {
  s = replaceResidues(s);
  if (!s.includes("export function sprint339FinalNorwegianResidueText")) {
    s += `

export function sprint339FinalNorwegianResidueText(value: string): string {
  return ${localFinalHelper.match(/return String\(value \?\? ""\)[\s\S]*?;\n}/)?.[0] ?? 'String(value ?? "");'}
}
`;
  }
  return s;
});

// 3) Result view: apply final polish after existing uiText/sprint337 pipeline.
patchFile("app/components/result/CalculationResultView.tsx", (s) => {
  s = replaceResidues(s);
  s = insertAfterImports(s, localFinalHelper, "sprint339FinalNorwegianResidueText");

  s = s.replace(
    "isEnglishResult ? sprint337ResultUiText(String(value ?? \"\")) : String(value ?? \"\")",
    "isEnglishResult ? sprint339FinalNorwegianResidueText(sprint337ResultUiText(String(value ?? \"\"))) : String(value ?? \"\")"
  );
  s = s.replace(
    "isEnglishResult ? sprint338ResultUiText(String(value ?? \"\")) : String(value ?? \"\")",
    "isEnglishResult ? sprint339FinalNorwegianResidueText(sprint338ResultUiText(String(value ?? \"\"))) : String(value ?? \"\")"
  );
  s = s.replace(
    "isEnglishResult ? sprint339FinalNorwegianResidueText(sprint339FinalNorwegianResidueText(sprint337ResultUiText(String(value ?? \"\")))) : String(value ?? \"\")",
    "isEnglishResult ? sprint339FinalNorwegianResidueText(sprint337ResultUiText(String(value ?? \"\"))) : String(value ?? \"\")"
  );

  // Wrap common dynamic blocks if present.
  for (const token of [
    "comparison.methodology_notes",
    "comparison.assumption_notes",
    "controllerDecision.user_message",
    "controllerDecision.reason",
  ]) {
    const wrapped = `sprint339FinalNorwegianResidueText(${token})`;
    if (s.includes(token) && !s.includes(wrapped)) {
      s = s.replaceAll(token, wrapped);
    }
  }

  return s;
});

// 4) Full report page: polish dynamic model/controller/trust text before rendering.
patchFile("app/rapport/[run_id]/page.tsx", (s) => {
  s = replaceResidues(s);
  s = insertAfterImports(s, localFinalHelper, "sprint339FinalNorwegianResidueText");

  const replacements = [
    ["model.trust.label", "sprint339FinalNorwegianResidueText(model.trust.label)"],
    ["model.control.controllerText", "sprint339FinalNorwegianResidueText(model.control.controllerText)"],
    ["model.control.comparisonText", "sprint339FinalNorwegianResidueText(model.control.comparisonText)"],
  ];
  for (const [from, to] of replacements) {
    if (s.includes(from) && !s.includes(to)) s = s.replaceAll(from, to);
  }
  return s;
});

// 5) Report model: final polish at model construction level.
patchFile("lib/report/build-report-model.ts", (s) => {
  s = replaceResidues(s);
  s = insertAfterImports(s, localFinalHelper, "sprint339FinalNorwegianResidueText");

  s = s.replace(
    /function polishForDisplay\(text: string, displayLanguage: string = "nb"\): string \{[\s\S]*?\n\}/,
    `function polishForDisplay(text: string, displayLanguage: string = "nb"): string {\n  const base = displayLanguage === "en" ? sprint335PolishEnglishText(text) : text;\n  return displayLanguage === "en" ? sprint339FinalNorwegianResidueText(base) : base;\n}`
  );

  s = s.replace(
    "label: displayLanguage === \"en\" ? sprint335PolishEnglishText(tillit.label) : tillit.label",
    "label: displayLanguage === \"en\" ? sprint339FinalNorwegianResidueText(sprint335PolishEnglishText(tillit.label)) : tillit.label"
  );
  s = s.replace(
    "tone: displayLanguage === \"en\" ? sprint335PolishEnglishText(tillit.labelKey) : tillit.labelKey",
    "tone: displayLanguage === \"en\" ? sprint339FinalNorwegianResidueText(sprint335PolishEnglishText(tillit.labelKey)) : tillit.labelKey"
  );
  return s;
});

// 6) DOCX renderers: trust label and review text residues.
for (const rel of ["lib/report/render-docx.ts", "lib/report/render-calculation-docx.ts"]) {
  patchFile(rel, (s) => {
    s = replaceResidues(s);
    s = insertAfterImports(s, localFinalHelper, "sprint339FinalNorwegianResidueText");
    if (s.includes("model.trust.label") && !s.includes("sprint339FinalNorwegianResidueText(model.trust.label)")) {
      s = s.replaceAll("model.trust.label", "sprint339FinalNorwegianResidueText(model.trust.label)");
    }
    return s;
  });
}

// 7) API/controller fallback strings for new runs.
for (const rel of ["app/api/agent-c/route.ts", "app/api/agent-d/route.ts", "app/api/agent-e/route.ts", "lib/engineering-context/agent.ts"]) {
  patchFile(rel, replaceResidues);
}

console.log("Sprint 33.9 final Norwegian residue cleanup applied. Run: npx tsc --noEmit --pretty false");

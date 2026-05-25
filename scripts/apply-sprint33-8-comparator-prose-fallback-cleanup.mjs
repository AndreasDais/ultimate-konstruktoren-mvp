import fs from "node:fs";
import path from "node:path";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function exists(file) {
  return fs.existsSync(file);
}

function patchFile(file, patcher) {
  if (!exists(file)) {
    console.log(`SKIP ${file}`);
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

function insertAfterImports(source, block) {
  if (source.includes(block.trim().split("\n")[0])) return source;
  const lines = source.split("\n");
  let insertAt = 0;
  let inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("import ")) inImport = true;
    if (inImport && trimmed.endsWith(";")) {
      insertAt = i + 1;
      inImport = false;
    }
  }
  lines.splice(insertAt, 0, block);
  return lines.join("\n");
}

const resultPolishHelper = String.raw`
function sprint338ResultUiText(value: string): string {
  return String(value ?? "")
    .replace(/\bSTEG 3 AV 3\s*·\s*RESULTAT\b/g, "STEP 3 OF 3 · RESULT")
    .replace(/\bBeregningsnotat\b/g, "Calculation note")
    .replace(/\bBerekningsnotat\b/g, "Calculation note")
    .replace(/Fortsetter fra tidligere beregning\. Endringer oppretter en ny beregning — originalen forblir uendret\./g, "Continuing from a previous calculation. Changes create a new calculation — the original remains unchanged.")
    .replace(/Foreløpig resultat med agentkontroll\. Må kontrolleres av fagperson før bruk\./g, "Preliminary result with agent control. Must be checked by a qualified professional before use.")
    .replace(/Beregningen er godkjent for visning\. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering\./g, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/Beregningen er foreløpig godkjent\. Resultatet skal kontrolleres av ansvarlig fagperson før bruk\./g, "The calculation is preliminarily approved. The result must be checked by a qualified professional before use.")
    .replace(/\bFORELØPIG GODKJENT\b/g, "PRELIMINARILY APPROVED")
    .replace(/\bFORELØPIG\b/g, "PRELIMINARY")
    .replace(/\bMINDRE FORSKJELLER\b/g, "MINOR DIFFERENCES")
    .replace(/\bGOD\b/g, "GOOD")
    .replace(/\bEnige\b/g, "Agreement")
    .replace(/\bGodkjent\b/g, "Approved")
    .replace(/\bKonstruktør A\b/g, "Engineer A")
    .replace(/\bKonstruktør B\b/g, "Engineer B")
    .replace(/\bKonstruktørar\b/g, "Engineers")
    .replace(/\bKonstruktør\b/g, "Engineer")
    .replace(/\bkonstruktørar\b/g, "engineers")
    .replace(/\bkonstruktør\b/g, "engineer")
    .replace(/\bSammenligner\b/g, "Comparator")
    .replace(/\bSamanliknar\b/g, "Comparator")
    .replace(/\bFAGLIG MERKNAD\b/g, "ENGINEERING NOTE")
    .replace(/\bFaglig merknad\b/g, "Engineering note")
    .replace(/\bANTAKELSER & ADVARSLER\b/g, "ASSUMPTIONS & WARNINGS")
    .replace(/\bMETODISKE FORSKJELLER\b/g, "METHODOLOGICAL DIFFERENCES")
    .replace(/\bFORSKJELLER I FORUTSETNINGER\b/g, "ASSUMPTION DIFFERENCES")
    .replace(/\bSkjul merknader\b/g, "Hide notes")
    .replace(/\bSkjul vurderingen\b/g, "Hide assessment")
    .replace(/\bSelvkontroll\b/g, "Self-check")
    .replace(/\bEgenvurdering\b/g, "Self-assessment")
    .replace(/\bikke en uavhengig verifikasjon\b/gi, "not an independent verification")
    .replace(/\bog B\b/g, "and B")
    .replace(/\bog Engineer B\b/g, "and Engineer B")
    .replace(/\bEngineer A og Engineer B\b/g, "Engineer A and Engineer B")
    .replace(/\bEngineer A og B\b/g, "Engineer A and B")
    .replace(/\bhar minor differences\b/g, "have minor differences")
    .replace(/\bNo critical deviations\b/g, "no critical deviations")
    .replace(/\brapporterer HIGH-konfidens\b/g, "reports HIGH confidence")
    .replace(/\brapporterer\b/g, "reports")
    .replace(/\bkonfidens\b/g, "confidence")
    .replace(/\bmetoden er etablert, alle nødvendige input er gitt, og resultatet er konsistent gjennom utregningen\b/g, "the method is established, all required input is available, and the result is consistent throughout the calculation")
    .replace(/\bløste oppgaven uten å se Engineer A sitt svar\b/g, "solved the task without seeing Engineer A's answer")
    .replace(/\bløste oppgaven uten å se A sitt svar\b/g, "solved the task without seeing Engineer A's answer")
    .replace(/\bB løste oppgaven uten å se A sitt svar\./g, "Engineer B solved the task without seeing Engineer A's answer.")
    .replace(/\bHIGH her betyr at B er trygg på egen metode — at A og B er enige er en separat sjekk \(se verdikt over\)\./g, "HIGH means Engineer B is confident in their own method; agreement between Engineer A and Engineer B is a separate check.")
    .replace(/\bbruker same grunnleggjande metode\b/g, "use the same basic method")
    .replace(/\bsame grunnleggjande metode\b/g, "same basic method")
    .replace(/\bLRFD-kombinasjon\b/g, "LRFD combination")
    .replace(/\benkelfeltbjelke\b/g, "simply supported beam")
    .replace(/\bIngen metodisk forskjell er identifisert\b/g, "No methodological difference is identified")
    .replace(/\bpresenterer ein alternativ utrekningsrute\b/g, "presents an alternative calculation route")
    .replace(/\bsom ein intern kryssjekk\b/g, "as an internal cross-check")
    .replace(/\bmedan\b/g, "while")
    .replace(/\bberre\b/g, "only")
    .replace(/\bhovudformelen\b/g, "main formula")
    .replace(/\bDette er ei forskjell i presentasjonsform, ikkje i metode\b/g, "This is a difference in presentation, not in method")
    .replace(/\brapporterer eksplisitt\b/g, "reports explicitly")
    .replace(/\blastfaktorane\b/g, "load factors")
    .replace(/\beigne resultatfelt\b/g, "separate result fields")
    .replace(/\binkluderer desse berre som ein del av tekstbeskrivinga\b/g, "includes these only as part of the text description")
    .replace(/\bInnhaldet er likeverdig men strukturen er ulik\b/g, "The content is equivalent, but the structure differs")
    .replace(/\bsignalisere?r dermed tydeleg at kapasitetskontroll manglar\b/g, "thereby clearly indicating that the capacity check is missing")
    .replace(/\bomtaler dette berre\b/g, "describes this only")
    .replace(/\bBegge løysingane er i samsvar med AISC data guard-policyen\b/g, "Both solutions comply with the AISC data guard policy")
    .replace(/\bCb-antaginga er identisk\b/g, "The Cb assumption is identical")
    .replace(/\bkonservativt\b/g, "conservative")
    .replace(/\bsom eit eige results-felt\b/g, "as a separate results field")
    .replace(/\bbeskriv det i assumptions og calculation_steps\b/g, "describes it in assumptions and calculation_steps")
    .replace(/\bBegge konstruktørar nemner\b/g, "Both engineers mention")
    .replace(/\bBegge engineers nemner\b/g, "Both engineers mention")
    .replace(/\bBegge engineers\b/g, "Both engineers")
    .replace(/\bjamnlasta enkeltfelt\b/g, "uniformly loaded simple span")
    .replace(/\bføresetnad\b/g, "assumption")
    .replace(/\btolkaren sin instruksjon\b/g, "the interpreter's instruction")
    .replace(/\bIngen forskjell i sjølve antaginga\b/g, "No difference in the assumption itself")
    .replace(/\bBegge konstruktørar legg til grunn\b/g, "Both engineers assume")
    .replace(/\beigenvekta\b/g, "self-weight")
    .replace(/\binkludert\b/g, "included")
    .replace(/\bIngen forskjell\b/g, "No difference")
    .replace(/\blast er påført i tyngdepunktet\b/g, "the load is applied at the centroid")
    .replace(/\bskjærsenter\b/g, "shear center")
    .replace(/\bflaggar\b/g, "flags")
    .replace(/\btopplastscenarioet\b/g, "the top-flange load scenario")
    .replace(/\bnoko meir eksplisitt\b/g, "somewhat more explicitly")
    .replace(/\bassumptions-lista\b/g, "the assumptions list")
    .replace(/\bAntakelser\b/g, "Assumptions")
    .replace(/\bantaginga\b/g, "assumption")
    .replace(/\bantaging\b/g, "assumption")
    .replace(/\bforskjell\b/g, "difference")
    .replace(/\bforskjeller\b/g, "differences")
    .replace(/\butrekning\b/g, "calculation")
    .replace(/\bprosjektering\b/g, "design work")
    .replace(/\bfagperson\b/g, "qualified professional");
}
`;

patchFile("app/components/result/CalculationResultView.tsx", (s) => {
  s = insertAfterImports(s, resultPolishHelper);
  s = s.replace(/isEnglishResult \? uiText\(String\(value \?\? ""\)\) : String\(value \?\? ""\)/g, 'isEnglishResult ? sprint338ResultUiText(String(value ?? "")) : String(value ?? "")');
  s = s.replace(/isEnglishResult \? sprint337ResultUiText\(String\(value \?\? ""\)\) : String\(value \?\? ""\)/g, 'isEnglishResult ? sprint338ResultUiText(String(value ?? "")) : String(value ?? "")');
  s = s.replace(/isEnglishResult \? sprint335PolishEnglishText\(String\(value \?\? ""\)\) : String\(value \?\? ""\)/g, 'isEnglishResult ? sprint338ResultUiText(String(value ?? "")) : String(value ?? "")');

  // If the uiText helper already exists, force it to use Sprint 33.8 polish.
  s = s.replace(
    /const uiText = \(value: string \| null \| undefined\): string =>\s*\n\s*isEnglishResult \? [^\n]+ : String\(value \?\? ""\);/,
    'const uiText = (value: string | null | undefined): string =>\n    isEnglishResult ? sprint338ResultUiText(String(value ?? "")) : String(value ?? "");'
  );

  // Make direct hardcoded literals less likely to leak in international result mode.
  const literalReplacements = new Map([
    ["STEG 3 AV 3 · RESULTAT", "STEP 3 OF 3 · RESULT"],
    ["Beregningsnotat", "Calculation note"],
    ["Foreløpig resultat med agentkontroll. Må kontrolleres av fagperson før bruk.", "Preliminary result with agent control. Must be checked by a qualified professional before use."],
    ["FORELØPIG GODKJENT", "PRELIMINARILY APPROVED"],
    ["MINDRE FORSKJELLER", "MINOR DIFFERENCES"],
  ]);
  for (const [from, to] of literalReplacements) {
    s = s.split(from).join(to);
  }

  return s;
});

patchFile("lib/international/display.ts", (s) => {
  if (!s.includes("export function sprint338PolishEnglishText")) {
    s += String.raw`

export function sprint338PolishEnglishText(value: string): string {
  return sprint335PolishEnglishText(String(value ?? ""))
    .replace(/Fortsetter fra tidligere beregning\. Endringer oppretter en ny beregning — originalen forblir uendret\./g, "Continuing from a previous calculation. Changes create a new calculation — the original remains unchanged.")
    .replace(/Beregningen er godkjent for visning\. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering\./g, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/\bFORELØPIG GODKJENT\b/g, "PRELIMINARILY APPROVED")
    .replace(/\bMINDRE FORSKJELLER\b/g, "MINOR DIFFERENCES")
    .replace(/\bGOD\b/g, "GOOD")
    .replace(/\bEngineer A og Engineer B\b/g, "Engineer A and Engineer B")
    .replace(/\bEngineer A og B\b/g, "Engineer A and B")
    .replace(/\bKonstruktør A\b/g, "Engineer A")
    .replace(/\bKonstruktør B\b/g, "Engineer B")
    .replace(/\bkonstruktørar\b/g, "engineers")
    .replace(/\bKonstruktør\b/g, "Engineer")
    .replace(/\bSammenligner\b/g, "Comparator")
    .replace(/\brapporterer\b/g, "reports")
    .replace(/\bmedan\b/g, "while")
    .replace(/\bberre\b/g, "only")
    .replace(/\bBegge konstruktørar\b/g, "Both engineers")
    .replace(/\bCb-antaginga\b/g, "The Cb assumption")
    .replace(/\bprosjektering\b/g, "design work")
    .replace(/\bfagperson\b/g, "qualified professional");
}
`;
  }

  // Add a very strict AISC wording if the guard export is present.
  if (s.includes("SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT") && !s.includes("Do not provide numerical typical ranges or qualitative numeric thresholds")) {
    s = s.replace(
      /("- Do not provide numerical typical ranges for AISC Manual-derived values such as Lp\/Lr\/Cb unless the values are verified input or retrieved from an approved application data source\.",)/,
      '$1\n  "- Do not provide numerical typical ranges or qualitative numeric thresholds for AISC-derived properties. Say only that LTB may be critical when unbraced length is large and no verified properties are available.",'
    );
  }

  return s;
});

patchFile("app/components/MissionControl.tsx", (s) => {
  return s
    .replace(/Ferdig\s*[-–—]\s*Leverer resultat til Sammenligner/g, "Done — sending result to Comparator")
    .replace(/Ferdig\s*[-–—]\s*leverer resultat til Sammenligner/g, "Done — sending result to Comparator")
    .replace(/Sammenligner/g, "Comparator")
    .replace(/Konstruktør A/g, "Engineer A")
    .replace(/Konstruktør B/g, "Engineer B");
});

patchFile("app/page.tsx", (s) => {
  return s
    .replace(/Ferdig\s*[-–—]\s*Leverer resultat til Sammenligner/g, "Done — sending result to Comparator")
    .replace(/Ferdig\s*[-–—]\s*leverer resultat til Sammenligner/g, "Done — sending result to Comparator");
});

patchFile("app/api/agent-c/route.ts", (s) => {
  const guard = String.raw`

SPRINT 33.8 INTERNATIONAL COMPARATOR LANGUAGE RULE:
If the engineering context is international, United States, AISC, ASCE, ACI, imperial, or the user asks in English, all Comparator output MUST be English.
Use only these role names: Engineer A, Engineer B, Comparator, Controller.
Never write Norwegian or Nynorsk comparator prose such as Konstruktør, Samanliknar, Kontrollør, føresetnad, antaking, utrekning, forskjell, medan, berre, begge konstruktørar, or norsk/nynorsk sentence structure.
If comparing methods, write complete English sentences.
Do not provide numerical typical AISC Manual ranges such as Lp/Lr/Cb unless values are verified input or retrieved from an approved data source.
`;

  if (s.includes("SPRINT 33.8 INTERNATIONAL COMPARATOR LANGUAGE RULE")) return s;

  // Append to the first large system/user prompt string if possible; otherwise add as a constant near the top.
  if (s.includes("const systemPrompt") && s.includes("engineeringContext")) {
    s = s.replace(/(const systemPrompt\s*=\s*`[\s\S]*?)(`;)/, `$1${guard}$2`);
  } else {
    const constant = `\nconst SPRINT338_INTERNATIONAL_COMPARATOR_LANGUAGE_RULE = ${JSON.stringify(guard)};\n`;
    s = insertAfterImports(s, constant);
  }

  // Clean explicit Norwegian role headings in the comparator input if present.
  return s
    .replace(/KONSTRUKTØR A SITT SVAR/g, "ENGINEER A RESPONSE")
    .replace(/KONSTRUKTØR B SITT SVAR/g, "ENGINEER B RESPONSE")
    .replace(/Konstruktør A/g, "Engineer A")
    .replace(/Konstruktør B/g, "Engineer B")
    .replace(/Samanliknar/g, "Comparator")
    .replace(/Sammenligner/g, "Comparator");
});

patchFile("lib/engineering-context/agent.ts", (s) => {
  if (!s.includes("SPRINT 33.8 INTERNATIONAL LANGUAGE HARD STOP")) {
    const guard = String.raw`

SPRINT 33.8 INTERNATIONAL LANGUAGE HARD STOP:
When engineering context is international/US/AISC/ASCE/ACI or the requested language is English, all generated prose must be English.
Use Engineer A, Engineer B, Comparator and Controller. Do not use Konstruktør, Samanliknar, Kontrollør or Norwegian/Nynorsk explanatory prose.
For AISC/ASCE support, do not provide numerical typical ranges or qualitative numeric thresholds for Manual-derived properties unless verified by approved data source.
`;
    // Add this into the exported context prompt if a join block is present, else append as exported constant.
    if (s.includes("SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT")) {
      s = s.replace(/SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT/g, `SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT + ${JSON.stringify(guard)} + `);
      s = s.replace(/\+\s+;/g, ";");
    } else {
      s += `\nexport const SPRINT338_INTERNATIONAL_LANGUAGE_HARD_STOP = ${JSON.stringify(guard)};\n`;
    }
  }
  return s;
});

console.log("Sprint 33.8 comparator prose + fallback cleanup applied. Run: npx tsc --noEmit --pretty false");

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const routePath = join(process.cwd(), "app", "api", "input-agent", "route.ts");
let source = readFileSync(routePath, "utf8");
let changed = false;

function replaceOnce(pattern, replacement, label) {
  if (source.includes(replacement)) return;
  const next = source.replace(pattern, replacement);
  if (next === source) {
    console.warn(`[Sprint 33.1] Could not apply ${label}. Check input-agent manually.`);
    return;
  }
  source = next;
  changed = true;
}

function addImport() {
  const importLine = 'import { parseJsonWithFallback } from "@/lib/json/extract-json";\n';
  if (source.includes(importLine.trim())) return;

  if (source.includes('import { recordStepMetric } from "@/lib/step-metrics";\n')) {
    source = source.replace(
      'import { recordStepMetric } from "@/lib/step-metrics";\n',
      'import { recordStepMetric } from "@/lib/step-metrics";\n' + importLine,
    );
  } else {
    source = importLine + source;
  }
  changed = true;
}

function hardenPrompt() {
  if (source.includes("JSON-KONTRAKT — HARD KRAV")) return;

  const hardeningBlock = `
JSON-KONTRAKT — HARD KRAV:
Du må returnere eitt gyldig JSON-objekt og berre JSON.

Ikkje skriv markdown.
Ikkje bruk \`\`\`json fences.
Ikkje skriv forklaring før eller etter JSON.
Ikkje bruk kommentarar.
Ikkje bruk trailing comma.
Ikkje omset JSON-nøklane.
Ikkje legg til nye toppnivå-nøklar utanfor skjemaet.
Alle strengverdiar må vere gyldige JSON-strengar med korrekt escaping av hermeteikn og linjeskift.
Synlege tekstverdiar kan følgje brukaren sitt språk, men schema-nøklane skal alltid vere dei same.
Dersom internasjonal engineering context er vald, skal schema vere uendra; lokaliser berre tekstverdiar.
`;

  const next = source.replace(/OUTPUT-FORMAT:\r?\n/, hardeningBlock + "\nOUTPUT-FORMAT:\n");
  if (next === source) {
    console.warn("[Sprint 33.1] Could not apply Tolkar JSON contract prompt. Check input-agent manually.");
    return;
  }
  source = next;
  changed = true;
}

function hardenModelSettings() {
  if (source.includes("max_tokens: 2048,")) {
    source = source.replace("max_tokens: 2048,", "max_tokens: 3072,");
    changed = true;
  }
  if (source.includes("temperature: 0.3,")) {
    source = source.replace("temperature: 0.3,", "temperature: 0.1,");
    changed = true;
  }
}

function replaceParserBlock() {
  if (source.includes("parseJsonWithFallback(responseText)")) return;

  const oldBlock = `  const cleaned = responseText.replace(/^\`\`\`json\\s*|\\s*\`\`\`$/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      status: 500,
      error: "Klarte ikkje parse svaret som JSON",
      raw: responseText,
    };
  }
`;

  const newBlock = `  const parsedResult = parseJsonWithFallback(responseText);

  if (!parsedResult.ok) {
    console.error("[input-agent] Tolkar returned invalid JSON", {
      error: parsedResult.error,
      preview: parsedResult.preview,
    });

    return {
      ok: false,
      status: 502,
      error: "Tolkar returnerte ugyldig JSON. Prøv igjen, eller rapporter bug dersom feilen gjentar seg.",
      raw: responseText,
    };
  }

  const parsed = parsedResult.value as Record<string, unknown>;

`;

  if (source.includes(oldBlock)) {
    source = source.replace(oldBlock, newBlock);
    changed = true;
    return;
  }

  const parserRegex = /\s*const cleaned = responseText\.replace\(\/\^```json\\s\*\|\\s\*```\$\/g, ""\)\.trim\(\);\s*let parsed;\s*try \{\s*parsed = JSON\.parse\(cleaned\);\s*\} catch \{\s*return \{\s*ok: false,\s*status: 500,\s*error: "Klarte ikkje parse svaret som JSON",\s*raw: responseText,\s*\};\s*\}\s*/;
  if (parserRegex.test(source)) {
    source = source.replace(parserRegex, "\n" + newBlock);
    changed = true;
    return;
  }

  console.warn("[Sprint 33.1] Could not find old JSON parser block. Replace parser manually.");
}

addImport();
hardenPrompt();
hardenModelSettings();
replaceParserBlock();

if (changed) {
  writeFileSync(routePath, source, "utf8");
  console.log("[Sprint 33.1] input-agent JSON hardening applied.");
} else {
  console.log("[Sprint 33.1] No changes needed; input-agent already appears patched.");
}

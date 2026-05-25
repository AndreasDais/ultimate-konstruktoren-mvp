import fs from "node:fs";
import path from "node:path";

const sprint = "sprint-33.10i-fix3b";
const file = "app/components/result/CalculationResultView.tsx";
const backupRoot = path.join(".patch-backup", sprint);

let failed = false;

function backupFile(filePath) {
  const target = path.join(backupRoot, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(filePath, target);
}

function fail(message) {
  console.error(`FAILED ${file}: ${message}`);
  failed = true;
}

if (!fs.existsSync(file)) {
  fail("file not found");
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");
let next = source;

/**
 * Add a render-scoped chip text polish helper.
 * Scope:
 * - result-view only
 * - chip.text / chip.body only
 * - does not touch fullrapport, PDF, Word, calculation sheet or prompts
 */
if (!next.includes("const chipUiText = (value: string | null | undefined): string =>")) {
  const uiTextBlockRegex =
    /(  const uiText = \(value: string \| null \| undefined\): string =>\r?\n[\s\S]*?      : polishNorwegianRoleText\(String\(value \?\? ""\), displayLanguage\);\r?\n)/;

  if (!uiTextBlockRegex.test(next)) {
    fail("uiText helper block not found");
  } else {
    next = next.replace(
      uiTextBlockRegex,
      `$1
  const chipUiText = (value: string | null | undefined): string => {
    const text = uiText(sanitizeAiscGuardedOutputText(String(value ?? "")));

    if (displayLanguage === "en") return text;

    return text
      .replace(/\\bEngineer A\\b/g, "Konstruktør A")
      .replace(/\\bEngineer B\\b/g, "Konstruktør B")
      .replace(/\\bBoth engineers\\b/g, locale === "nn" ? "Begge konstruktørar" : "Begge konstruktører")
      .replace(/\\bHIGH\\b/g, locale === "nn" ? "HØG" : "HØY")
      .replace(/\\bMEDIUM\\b/g, "MIDDELS")
      .replace(/\\bLOW\\b/g, "LAV");
  };

`
    );
    console.log(`PATCHED ${file}: added chipUiText helper`);
  }
} else {
  console.log(`OK ${file}: chipUiText helper already exists`);
}

const replacements = [
  {
    label: "chip.text render",
    search: "text: uiText(sanitizeAiscGuardedOutputText(chip.text)),",
    replacement: "text: chipUiText(chip.text),",
  },
  {
    label: "chip.body render",
    search: "body: chip.body ? uiText(chip.body) : chip.body,",
    replacement: "body: chip.body ? chipUiText(chip.body) : chip.body,",
  },
];

for (const r of replacements) {
  if (next.includes(r.search)) {
    next = next.replace(r.search, r.replacement);
    console.log(`PATCHED ${file}: ${r.label}`);
  } else if (next.includes(r.replacement)) {
    console.log(`OK ${file}: ${r.label} already patched`);
  } else {
    fail(`${r.label} block not found`);
  }
}

if (failed) {
  console.error(`FAILED ${sprint}`);
  process.exit(1);
}

if (next === source) {
  console.log(`OK ${sprint}: no changes needed`);
} else {
  backupFile(file);
  fs.writeFileSync(file, next, "utf8");
  console.log(`PATCHED ${sprint}: wrote ${file}`);
}

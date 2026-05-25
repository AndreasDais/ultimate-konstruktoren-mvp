import fs from "node:fs";
import path from "node:path";

const sprint = "sprint-33.10i-fix3-tsc";
const backupRoot = path.join(".patch-backup", sprint);

let failed = false;
const backedUp = new Set();

function backup(file) {
  if (backedUp.has(file)) return;
  const target = path.join(backupRoot, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
  backedUp.add(file);
}

function patchFile(file, patcher) {
  if (!fs.existsSync(file)) {
    console.error(`FAILED ${file}: file not found`);
    failed = true;
    return;
  }

  const source = fs.readFileSync(file, "utf8");
  const next = patcher(source);

  if (next === null) {
    console.error(`FAILED ${file}: critical block not found`);
    failed = true;
    return;
  }

  if (next === source) {
    console.log(`OK ${file}: already patched`);
    return;
  }

  backup(file);
  fs.writeFileSync(file, next, "utf8");
  console.log(`PATCHED ${file}`);
}

/**
 * Fix 1:
 * confidenceLabel was referenced in chip render but not declared in scope.
 * Insert it immediately before calculationA confidence chips.
 */
patchFile("lib/result/kontrollor-chips.ts", (source) => {
  if (source.includes("const confidenceLabel = (c: \"high\" | \"medium\" | \"low\"): string =>")) {
    return source;
  }

  const anchor = /(\n\s*)if \(calculationA\?\.confidence\) \{/;
  const match = source.match(anchor);
  if (!match) return null;

  const indent = match[1];

  const helper =
`${indent}const confidenceLabel = (c: "high" | "medium" | "low"): string => {
${indent}  if (c === "high") return locale === "nn" ? "HØG" : "HØY";
${indent}  if (c === "medium") return "MIDDELS";
${indent}  return "LAV";
${indent}};

${indent.trimEnd()}`;

  return source.replace(anchor, `${helper}if (calculationA?.confidence) {`);
});

/**
 * Fix 2:
 * TypeScript narrows the final else branch to never after high/medium/low checks.
 * String(...) avoids calling toUpperCase directly on never.
 */
patchFile("app/components/result/CalculationResultView.tsx", (source) => {
  if (!source.includes("calculationB.confidence.toUpperCase()")) {
    return source;
  }

  return source.replace(
    "calculationB.confidence.toUpperCase()",
    "String(calculationB.confidence).toUpperCase()"
  );
});

if (failed) {
  console.error("FAILED sprint-33.10i-fix3-tsc");
  process.exit(1);
}

console.log("OK sprint-33.10i-fix3-tsc");

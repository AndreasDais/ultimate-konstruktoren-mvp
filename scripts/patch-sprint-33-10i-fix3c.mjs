import fs from "node:fs";
import path from "node:path";

const sprint = "sprint-33.10i-fix3c";
const file = "app/components/result/CalculationResultView.tsx";
const backupRoot = path.join(".patch-backup", sprint);

function backupFile(filePath) {
  const target = path.join(backupRoot, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(filePath, target);
}

if (!fs.existsSync(file)) {
  console.error(`FAILED ${file}: file not found`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

if (!source.includes("const chipUiText = (value: string | null | undefined): string =>")) {
  console.error(`FAILED ${file}: chipUiText helper not found`);
  process.exit(1);
}

const alreadyPatchedRegex =
  /const chips = rawChips\.map\(\(chip\) => \(\{\s*\.\.\.chip,\s*text: chipUiText\(chip\.text\),\s*body: chip\.body \? chipUiText\(chip\.body\) : chip\.body,\s*\}\)\);/m;

if (alreadyPatchedRegex.test(source)) {
  console.log(`OK ${file}: chip polish already applies to all result languages`);
  console.log(`OK ${sprint}`);
  process.exit(0);
}

const gatingRegex =
  /const chips = isEnglishResult\s*\?\s*rawChips\.map\(\(chip\) => \(\{\s*\.\.\.chip,\s*text: chipUiText\(chip\.text\),\s*body: chip\.body \? chipUiText\(chip\.body\) : chip\.body,\s*\}\)\)\s*:\s*rawChips;/m;

if (!gatingRegex.test(source)) {
  console.error(`FAILED ${file}: scoped isEnglishResult chip gating block not found`);
  console.error("Run this and paste output:");
  console.error("sed -n '508,535p' app/components/result/CalculationResultView.tsx");
  process.exit(1);
}

const replacement = `const chips = rawChips.map((chip) => ({
                  ...chip,
                  text: chipUiText(chip.text),
                  body: chip.body ? chipUiText(chip.body) : chip.body,
                }));`;

backupFile(file);
fs.writeFileSync(file, source.replace(gatingRegex, replacement), "utf8");

console.log(`PATCHED ${file}: apply chipUiText to all result languages`);
console.log(`OK ${sprint}`);

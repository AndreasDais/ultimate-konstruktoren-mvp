import fs from "node:fs";
import path from "node:path";

const sprint = "sprint-33.10i-fix3";
const backupRoot = path.join(".patch-backup", sprint);

const files = {
  calc: "app/components/result/CalculationResultView.tsx",
  chips: "lib/result/kontrollor-chips.ts",
  labels: "lib/result/labels.ts",
  tiles: "lib/result/tile-heuristics.ts",
};

let failed = false;
const backedUp = new Set();

function fail(message) {
  console.error(`FAILED ${message}`);
  failed = true;
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`${file}: file not found`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function backup(file) {
  if (backedUp.has(file)) return;
  const target = path.join(backupRoot, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
  backedUp.add(file);
}

function write(file, source, next, label) {
  if (next === source) {
    console.log(`OK ${file}: ${label}`);
    return;
  }
  backup(file);
  fs.writeFileSync(file, next, "utf8");
  console.log(`PATCHED ${file}: ${label}`);
}

function replaceExact(file, search, replacement, label, { critical = true, multiple = false } = {}) {
  const source = read(file);
  if (!source) return;

  const count = source.split(search).length - 1;

  if (count === 0) {
    if (source.includes(replacement)) {
      console.log(`OK ${file}: ${label} already patched`);
      return;
    }
    if (critical) {
      fail(`${file}: ${label} block not found`);
    } else {
      console.log(`SKIPPED ${file}: ${label} block not found`);
    }
    return;
  }

  if (!multiple && count > 1) {
    fail(`${file}: ${label} matched ${count} times, expected 1`);
    return;
  }

  const next = multiple ? source.split(search).join(replacement) : source.replace(search, replacement);
  write(file, source, next, `${label} (${count})`);
}

function replaceRegex(file, regex, replacement, label, { critical = true } = {}) {
  const source = read(file);
  if (!source) return;

  if (!regex.test(source)) {
    if (source.includes(replacement)) {
      console.log(`OK ${file}: ${label} already patched`);
      return;
    }
    if (critical) {
      fail(`${file}: ${label} regex block not found`);
    } else {
      console.log(`SKIPPED ${file}: ${label} regex block not found`);
    }
    return;
  }

  const next = source.replace(regex, replacement);
  write(file, source, next, label);
}

function insertAfterRegex(file, anchorRegex, insert, label, { critical = true, alreadyRegex = null } = {}) {
  const source = read(file);
  if (!source) return;

  if (alreadyRegex?.test(source)) {
    console.log(`OK ${file}: ${label} already patched`);
    return;
  }

  if (!anchorRegex.test(source)) {
    if (critical) {
      fail(`${file}: ${label} anchor not found`);
    } else {
      console.log(`SKIPPED ${file}: ${label} anchor not found`);
    }
    return;
  }

  const next = source.replace(anchorRegex, `$1${insert}`);
  write(file, source, next, label);
}

/**
 * 1) Confidence-chip text: A · HIGH/B · HIGH -> A · HØG/HØY and B · HØG/HØY.
 *    Also allow localized chip labels in the CalculationResultView confidence-chip classifier if it used old enum text.
 */
replaceExact(
  files.calc,
  "/^[AB] · (HIGH|MEDIUM|LOW)$/.test(chip.text)",
  "/^[AB] · (HIGH|MEDIUM|LOW|HØG|HØY|MIDDELS|LAV)$/.test(chip.text)",
  "allow localized confidence chip labels",
  { critical: false }
);

replaceExact(
  files.calc,
  'form "A · HIGH" / "B · HIGH".',
  'form "A · HØG/HØY" / "B · HØG/HØY".',
  "update confidence-chip comment",
  { critical: false }
);

replaceExact(
  files.chips,
`  const confidenceTone = (c: "high" | "medium" | "low"): "info" | "warn" | "neutral" => {
    if (c === "high") return "info";
    if (c === "medium") return "warn";
    return "neutral";
  };

`,
`  const confidenceTone = (c: "high" | "medium" | "low"): "info" | "warn" | "neutral" => {
    if (c === "high") return "info";
    if (c === "medium") return "warn";
    return "neutral";
  };

  const confidenceLabel = (c: "high" | "medium" | "low"): string => {
    if (c === "high") return locale === "nn" ? "HØG" : "HØY";
    if (c === "medium") return "MIDDELS";
    return "LAV";
  };

`,
  "add localized confidenceLabel helper"
);

replaceExact(
  files.chips,
  'text: `A · ${calculationA.confidence.toUpperCase()}`,',
  'text: `A · ${confidenceLabel(calculationA.confidence)}`,',
  "localize A confidence chip"
);

replaceExact(
  files.chips,
  'text: `B · ${calculationB.confidence.toUpperCase()}`,',
  'text: `B · ${confidenceLabel(calculationB.confidence)}`,',
  "localize B confidence chip"
);

/**
 * 2) Add missing WB_LABELS keys used by ResultView. This is justified by audit:
 *    CalculationResultView asks for WB_LABELS.konstruktorA/B and falls back to Engineer A/B.
 */
insertAfterRegex(
  files.labels,
  /(\n\s*konstruktorKonfidens:\s*\{ nb: "[^"\n]+", nn: "[^"\n]+" \},\r?\n)/,
  `  konstruktorA: { nb: "Konstruktør A", nn: "Konstruktør A" },
  konstruktorB: { nb: "Konstruktør B", nn: "Konstruktør B" },
`,
  "add konstruktorA/B labels",
  {
    critical: false,
    alreadyRegex: /\n\s*konstruktorA:\s*\{[^}]+Konstruktør A[^}]+\}/,
  }
);

/**
 * 3) Remove visible Engineer A/B fallbacks in result-view table/header blocks.
 */
replaceExact(
  files.calc,
  '[WB_LABELS.tabellFelt[locale], WB_LABELS.konstruktorA?.[locale] ?? "Engineer A", WB_LABELS.konstruktorB?.[locale] ?? "Engineer B", WB_LABELS.tabellSkilnad[locale], WB_LABELS.tabellAlvor[locale]].map((h) => (',
  '[WB_LABELS.tabellFelt[locale], WB_LABELS.konstruktorA?.[locale] ?? "Konstruktør A", WB_LABELS.konstruktorB?.[locale] ?? "Konstruktør B", WB_LABELS.tabellSkilnad[locale], WB_LABELS.tabellAlvor[locale]].map((h) => (',
  "localize comparator table Engineer fallbacks"
);

replaceExact(
  files.calc,
  '{WB_LABELS.konstruktorA?.[locale] ?? "Engineer A"}',
  '{WB_LABELS.konstruktorA?.[locale] ?? "Konstruktør A"}',
  "localize Engineer A fallback",
  { multiple: true }
);

replaceExact(
  files.calc,
  '{WB_LABELS.konstruktorB?.[locale] ?? "Engineer B"}',
  '{WB_LABELS.konstruktorB?.[locale] ?? "Konstruktør B"}',
  "localize Engineer B fallback",
  { multiple: true }
);

/**
 * 4) Localize generated issue/user-message role residue and HIGH/LOW enums at render.
 *    This is intentionally render-scoped, not a broad source replace.
 */
replaceExact(
  files.calc,
  '{uiText(issue.issue)}{" "}',
  `{uiText(issue.issue)
                                            .replace(/\\bEngineer A\\b/g, "Konstruktør A")
                                            .replace(/\\bEngineer B\\b/g, "Konstruktør B")
                                            .replace(/\\bBoth engineers\\b/g, locale === "nn" ? "Begge konstruktørar" : "Begge konstruktører")
                                            .replace(/\\bHIGH\\b/g, locale === "nn" ? "HØG" : "HØY")
                                            .replace(/\\bMEDIUM\\b/g, "MIDDELS")
                                            .replace(/\\bLOW\\b/g, "LAV")}{" "}`,
  "localize generated issue text",
  { multiple: true }
);

replaceExact(
  files.calc,
  '{uiText(sprint339FinalNorwegianResidueText(controllerDecision.user_message))',
  `{uiText(sprint339FinalNorwegianResidueText(controllerDecision.user_message))
                                .replace(/\\bEngineer A\\b/g, "Konstruktør A")
                                .replace(/\\bEngineer B\\b/g, "Konstruktør B")
                                .replace(/\\bBoth engineers\\b/g, locale === "nn" ? "Begge konstruktørar" : "Begge konstruktører")
                                .replace(/\\bHIGH\\b/g, locale === "nn" ? "HØG" : "HØY")
                                .replace(/\\bMEDIUM\\b/g, "MIDDELS")
                                .replace(/\\bLOW\\b/g, "LAV")`,
  "localize expanded controller prose"
);

/**
 * 5) Localize visible severity enum labels: LOW -> LAV, HIGH -> HØG/HØY.
 */
replaceExact(
  files.calc,
  '<Badge status={SEVERITY_TONES[issue.severity]}>{issue.severity}</Badge>',
  `<Badge status={SEVERITY_TONES[issue.severity]}>
                                            {issue.severity === "high"
                                              ? locale === "nn"
                                                ? "HØG"
                                                : "HØY"
                                              : issue.severity === "medium"
                                                ? "MIDDELS"
                                                : issue.severity === "low"
                                                  ? "LAV"
                                                  : issue.severity === "critical"
                                                    ? "KRITISK"
                                                    : issue.severity}
                                          </Badge>`,
  "localize issue severity badges",
  { multiple: true }
);

replaceExact(
  files.calc,
  '<Badge status={SEVERITY_TONES[diff.severity]}>{diff.severity}</Badge>',
  `<Badge status={SEVERITY_TONES[diff.severity]}>
                                          {diff.severity === "high"
                                            ? locale === "nn"
                                              ? "HØG"
                                              : "HØY"
                                            : diff.severity === "medium"
                                              ? "MIDDELS"
                                              : diff.severity === "low"
                                                ? "LAV"
                                                : diff.severity === "critical"
                                                  ? "KRITISK"
                                                  : diff.severity}
                                        </Badge>`,
  "localize diff severity badge"
);

/**
 * 6) Localize standalone B confidence in the independent-control heading.
 */
replaceExact(
  files.calc,
  '{calculationB.confidence.toUpperCase()}',
  `{calculationB.confidence === "high"
                                ? locale === "nn"
                                  ? "HØG"
                                  : "HØY"
                                : calculationB.confidence === "medium"
                                  ? "MIDDELS"
                                  : calculationB.confidence === "low"
                                    ? "LAV"
                                    : calculationB.confidence.toUpperCase()}`,
  "localize B independent confidence"
);

/**
 * 7) q_Ed tile label: DESIGN-LAST -> DIMENSJONERENDE/DIMENSJONERANDE LAST.
 */
replaceRegex(
  files.tiles,
  /^  q_Ed: \{ nb: "DESIGN-LAST · q_Ed", nn: "DESIGN-LAST · q_Ed" \},$/m,
  '  q_Ed: { nb: "DIMENSJONERENDE LAST · q_Ed", nn: "DIMENSJONERANDE LAST · q_Ed" },',
  "localize q_Ed tile label"
);

if (failed) {
  console.error(`FAILED ${sprint}: one or more critical blocks were not patched`);
  process.exit(1);
}

console.log(`OK ${sprint}: patch completed`);

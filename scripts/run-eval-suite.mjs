import fs from "node:fs";
import path from "node:path";

const DEFAULT_INPUT = "qa/evals/pilar-core-evals.jsonl";
const DEFAULT_OUTPUT = "qa/evals/reports/latest-eval-readiness.md";

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    strict: false,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--strict") {
      args.strict = true;
      continue;
    }

    if (token === "--input" || token === "-i") {
      const value = argv[i + 1];
      if (!value) throw new Error(`${token} requires a value`);
      args.input = value;
      i += 1;
      continue;
    }

    if (token.startsWith("--input=")) {
      args.input = token.slice("--input=".length);
      continue;
    }

    if (token === "--output" || token === "-o") {
      const value = argv[i + 1];
      if (!value) throw new Error(`${token} requires a value`);
      args.output = value;
      i += 1;
      continue;
    }

    if (token.startsWith("--output=")) {
      args.output = token.slice("--output=".length);
      continue;
    }

    if (token === "--tmp") {
      args.output = "/tmp/pilar-eval-suite-report.md";
      continue;
    }

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    positional.push(token);
  }

  if (positional[0]) args.input = positional[0];
  if (positional[1]) args.output = positional[1];

  return args;
}

function printHelp() {
  console.log(`PILAR eval suite readiness runner\n\nUsage:\n  node scripts/run-eval-suite.mjs\n  node scripts/run-eval-suite.mjs --input qa/evals/pilar-core-evals.jsonl\n  node scripts/run-eval-suite.mjs --output qa/evals/reports/latest-eval-readiness.md\n  node scripts/run-eval-suite.mjs --tmp\n  node scripts/run-eval-suite.mjs --strict\n\nDefault input:\n  ${DEFAULT_INPUT}\n\nDefault output:\n  ${DEFAULT_OUTPUT}`);
}

function readJsonl(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return source
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((entry) => entry.line.length > 0 && !entry.line.startsWith("#"))
    .map((entry) => {
      try {
        return { value: JSON.parse(entry.line), lineNumber: entry.lineNumber };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${filePath}:${entry.lineNumber}: invalid JSON: ${message}`);
      }
    });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countBy(map, key) {
  const normalized = String(key || "unknown");
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function countExpected(expected) {
  return {
    mustInclude: asArray(expected.must_include).length,
    mustNotInclude: asArray(expected.must_not_include).length,
    unitExpectations: asArray(expected.unit_expectations).length,
    warningsIfMissing: asArray(expected.required_warnings_if_missing).length + asArray(expected.required_warning_if_missing).length,
    numericExpectations: asArray(expected.numeric_expectations).length,
    safetyChecks: asArray(expected.safety_checks).length,
  };
}

function summarize(cases) {
  const summary = {
    priorities: new Map(),
    domains: new Map(),
    standards: new Map(),
    languages: new Map(),
    graders: new Map(),
    tags: new Map(),
    manualReviewRequired: 0,
    deterministic: {
      mustInclude: 0,
      mustNotInclude: 0,
      unitExpectations: 0,
      warningsIfMissing: 0,
      numericExpectations: 0,
      safetyChecks: 0,
    },
  };

  for (const item of cases) {
    const c = item.value;
    const expected = c.expected ?? {};
    const counts = countExpected(expected);

    countBy(summary.priorities, c.priority ?? "unknown");
    countBy(summary.domains, c.domain ?? "unknown");
    countBy(summary.standards, c.standard_context ?? c.standardContext ?? "unknown");
    countBy(summary.languages, c.display_language ?? c.language ?? "unknown");
    countBy(summary.graders, c.grader?.type ?? "unknown");

    for (const tag of asArray(c.tags)) countBy(summary.tags, tag);

    if (c.manual_review_required === true) summary.manualReviewRequired += 1;

    for (const key of Object.keys(summary.deterministic)) {
      summary.deterministic[key] += counts[key];
    }
  }

  return summary;
}

function validateReadiness(cases) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const allowedPriorities = new Set(["P0", "P1", "P2"]);
  const allowedLanguages = new Set(["nb", "nn", "en", "fr", "de"]);

  for (const item of cases) {
    const c = item.value;
    const prefix = `line ${item.lineNumber}`;

    if (!c.case_id || typeof c.case_id !== "string") {
      errors.push(`${prefix}: missing string case_id`);
    } else if (ids.has(c.case_id)) {
      errors.push(`${prefix}: duplicate case_id ${c.case_id}`);
    } else {
      ids.add(c.case_id);
    }

    if (!c.input_text && !c.input) errors.push(`${prefix}: missing input_text/input`);
    if (!c.expected || typeof c.expected !== "object" || Array.isArray(c.expected)) {
      errors.push(`${prefix}: missing expected object`);
    }

    if (!c.domain || typeof c.domain !== "string") warnings.push(`${prefix}: missing domain`);
    if (!c.standard_context && !c.standardContext) warnings.push(`${prefix}: missing standard_context`);
    if (!c.priority || !allowedPriorities.has(c.priority)) warnings.push(`${prefix}: priority should be P0, P1 or P2`);

    const displayLanguage = c.display_language ?? c.language;
    if (!displayLanguage) {
      warnings.push(`${prefix}: missing display_language/language`);
    } else if (!allowedLanguages.has(displayLanguage)) {
      warnings.push(`${prefix}: unusual display language ${displayLanguage}`);
    }

    if (!c.grader || typeof c.grader !== "object" || Array.isArray(c.grader)) {
      warnings.push(`${prefix}: missing grader object`);
    }

    if (typeof c.manual_review_required !== "boolean") {
      warnings.push(`${prefix}: manual_review_required should be boolean`);
    }

    const expected = c.expected ?? {};
    const checks = countExpected(expected);
    const deterministicCheckCount = Object.values(checks).reduce((sum, count) => sum + count, 0);
    if (deterministicCheckCount === 0) {
      warnings.push(`${prefix}: expected object has no deterministic checks`);
    }
  }

  return { errors, warnings };
}

function mapToMarkdown(map) {
  if (map.size === 0) return "- none";
  return [...map.entries()]
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([key, count]) => `- ${key}: ${count}`)
    .join("\n");
}

function tableEscape(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCaseTable(cases) {
  const rows = cases.map((item) => {
    const c = item.value;
    const expected = c.expected ?? {};
    const checks = countExpected(expected);
    const checkCount = Object.values(checks).reduce((sum, count) => sum + count, 0);
    const language = c.display_language ?? c.language ?? "unknown";
    const standard = c.standard_context ?? c.standardContext ?? "unknown";
    return `| ${tableEscape(c.case_id ?? `(line ${item.lineNumber})`)} | ${tableEscape(c.priority ?? "unknown")} | ${tableEscape(c.domain ?? "unknown")} | ${tableEscape(standard)} | ${tableEscape(language)} | ${checkCount} | ${c.manual_review_required === true ? "yes" : "no"} |`;
  });

  return [
    "| Case | Priority | Domain | Standard | Language | Checks | Manual review |",
    "|---|---|---|---|---:|---:|---|",
    ...rows,
  ].join("\n");
}

function buildReport({ inputPath, outputPath, cases, summary, errors, warnings, strict }) {
  const status = errors.length === 0 && (!strict || warnings.length === 0) ? "READY" : "ACTION NEEDED";

  return `# PILAR Eval Suite Readiness Report\n\n` +
    `**Status:** ${status}\n` +
    `**Input:** \`${inputPath}\`\n` +
    `**Output:** \`${outputPath}\`\n` +
    `**Cases:** ${cases.length}\n` +
    `**Errors:** ${errors.length}\n` +
    `**Warnings:** ${warnings.length}\n` +
    `**Strict mode:** ${strict ? "on" : "off"}\n\n` +
    `## Summary\n\n` +
    `This is a local readiness artifact for the PILAR Eval Agent track. It does not call production AI agents. It checks whether the eval-case corpus is structured enough for later automated grading and regression workflows.\n\n` +
    `## Priorities\n\n${mapToMarkdown(summary.priorities)}\n\n` +
    `## Domains\n\n${mapToMarkdown(summary.domains)}\n\n` +
    `## Standards\n\n${mapToMarkdown(summary.standards)}\n\n` +
    `## Display languages\n\n${mapToMarkdown(summary.languages)}\n\n` +
    `## Graders\n\n${mapToMarkdown(summary.graders)}\n\n` +
    `## Deterministic check inventory\n\n` +
    `- must_include entries: ${summary.deterministic.mustInclude}\n` +
    `- must_not_include entries: ${summary.deterministic.mustNotInclude}\n` +
    `- unit_expectations entries: ${summary.deterministic.unitExpectations}\n` +
    `- required_warnings_if_missing entries: ${summary.deterministic.warningsIfMissing}\n` +
    `- numeric_expectations entries: ${summary.deterministic.numericExpectations}\n` +
    `- safety_checks entries: ${summary.deterministic.safetyChecks}\n` +
    `- manual review required: ${summary.manualReviewRequired}\n\n` +
    `## Cases\n\n${buildCaseTable(cases)}\n\n` +
    `## Tags\n\n${mapToMarkdown(summary.tags)}\n\n` +
    `## Errors\n\n${errors.length ? errors.map((e) => `- ${e}`).join("\n") : "- none"}\n\n` +
    `## Warnings\n\n${warnings.length ? warnings.map((w) => `- ${w}`).join("\n") : "- none"}\n\n` +
    `## Next use\n\n` +
    `- Use this report as a checkpoint before adding an LLM grader or production-run integration.\n` +
    `- Keep this runner deterministic and local until the eval corpus is stable.\n` +
    `- Do not treat this readiness report as proof that the live PILAR pipeline passes the evals; it only validates the eval corpus and report workflow.\n`;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`FAILED eval suite report: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  const inputPath = args.input;
  const outputPath = args.output;

  if (!fs.existsSync(inputPath)) {
    console.error(`FAILED eval suite report: missing ${inputPath}`);
    process.exit(1);
  }

  const cases = readJsonl(inputPath);
  const summary = summarize(cases);
  const { errors, warnings } = validateReadiness(cases);
  const report = buildReport({ inputPath, outputPath, cases, summary, errors, warnings, strict: args.strict });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report, "utf8");

  const failed = errors.length > 0 || (args.strict && warnings.length > 0);
  const status = failed ? "FAILED" : "OK";

  console.log(`${status} eval suite report: ${cases.length} cases, ${errors.length} errors, ${warnings.length} warnings`);
  console.log(`Wrote ${outputPath}`);

  if (failed) process.exit(1);
}

main();

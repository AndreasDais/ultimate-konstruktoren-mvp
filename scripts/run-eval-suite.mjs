import fs from "node:fs";
import path from "node:path";

const DEFAULT_INPUT = "qa/evals/pilar-core-evals.jsonl";
const DEFAULT_OUTPUT = "/tmp/pilar-eval-suite-report.md";

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

function summarize(cases) {
  const summary = {
    domains: new Map(),
    standards: new Map(),
    languages: new Map(),
    manualReviewRequired: 0,
    mustInclude: 0,
    mustNotInclude: 0,
    unitExpectations: 0,
  };

  for (const item of cases) {
    const c = item.value;
    const domain = c.domain ?? "unknown";
    const standard = c.standard_context ?? c.standardContext ?? "unknown";
    const language = c.display_language ?? c.language ?? "unknown";
    const expected = c.expected ?? {};

    summary.domains.set(domain, (summary.domains.get(domain) ?? 0) + 1);
    summary.standards.set(standard, (summary.standards.get(standard) ?? 0) + 1);
    summary.languages.set(language, (summary.languages.get(language) ?? 0) + 1);

    if (c.manual_review_required === true) summary.manualReviewRequired += 1;
    summary.mustInclude += asArray(expected.must_include).length;
    summary.mustNotInclude += asArray(expected.must_not_include).length;
    summary.unitExpectations += asArray(expected.unit_expectations).length;
  }

  return summary;
}

function mapToMarkdown(map) {
  if (map.size === 0) return "- none";
  return [...map.entries()]
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([key, count]) => `- ${key}: ${count}`)
    .join("\n");
}

function validateReadiness(cases) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

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

    if (!c.input && !c.input_text) errors.push(`${prefix}: missing input/input_text`);
    if (!c.expected || typeof c.expected !== "object") errors.push(`${prefix}: missing expected object`);
    if (!c.grader || typeof c.grader !== "object") warnings.push(`${prefix}: missing grader object`);

    const expected = c.expected ?? {};
    const hasRule =
      asArray(expected.must_include).length > 0 ||
      asArray(expected.must_not_include).length > 0 ||
      asArray(expected.unit_expectations).length > 0 ||
      asArray(expected.required_warning_if_missing).length > 0;

    if (!hasRule) warnings.push(`${prefix}: expected object has no deterministic checks`);
  }

  return { errors, warnings };
}

function buildReport({ inputPath, cases, summary, errors, warnings }) {
  const now = new Date().toISOString();
  const caseLines = cases
    .map((item) => {
      const c = item.value;
      const language = c.display_language ?? c.language ?? "unknown";
      const standard = c.standard_context ?? c.standardContext ?? "unknown";
      return `| ${c.case_id ?? `(line ${item.lineNumber})`} | ${c.domain ?? "unknown"} | ${standard} | ${language} | ${c.manual_review_required === true ? "yes" : "no"} |`;
    })
    .join("\n");

  return `# PILAR Eval Suite Readiness Report\n\n` +
    `**Generated:** ${now}\n` +
    `**Input:** \`${inputPath}\`\n` +
    `**Cases:** ${cases.length}\n` +
    `**Errors:** ${errors.length}\n` +
    `**Warnings:** ${warnings.length}\n\n` +
    `## Domains\n\n${mapToMarkdown(summary.domains)}\n\n` +
    `## Standards\n\n${mapToMarkdown(summary.standards)}\n\n` +
    `## Display languages\n\n${mapToMarkdown(summary.languages)}\n\n` +
    `## Deterministic checks\n\n` +
    `- must_include entries: ${summary.mustInclude}\n` +
    `- must_not_include entries: ${summary.mustNotInclude}\n` +
    `- unit_expectations entries: ${summary.unitExpectations}\n` +
    `- manual review required: ${summary.manualReviewRequired}\n\n` +
    `## Cases\n\n` +
    `| Case | Domain | Standard | Language | Manual review |\n` +
    `|---|---|---|---|---|\n` +
    `${caseLines}\n\n` +
    `## Errors\n\n${errors.length ? errors.map((e) => `- ${e}`).join("\n") : "- none"}\n\n` +
    `## Warnings\n\n${warnings.length ? warnings.map((w) => `- ${w}`).join("\n") : "- none"}\n`;
}

function main() {
  const inputPath = process.argv[2] ?? DEFAULT_INPUT;
  const outputPath = process.argv[3] ?? DEFAULT_OUTPUT;

  if (!fs.existsSync(inputPath)) {
    console.error(`FAILED eval suite readiness: missing ${inputPath}`);
    process.exit(1);
  }

  const cases = readJsonl(inputPath);
  const summary = summarize(cases);
  const { errors, warnings } = validateReadiness(cases);
  const report = buildReport({ inputPath, cases, summary, errors, warnings });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report, "utf8");

  const status = errors.length === 0 ? "OK" : "FAILED";
  console.log(`${status} eval suite readiness: ${cases.length} cases, ${errors.length} errors, ${warnings.length} warnings`);
  console.log(`Wrote ${outputPath}`);

  if (errors.length > 0) process.exit(1);
}

main();

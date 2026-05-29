#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const strict = args.has("--strict");

const CASES_PATH = path.join("qa", "evals", "pilar-core-evals.jsonl");
const TAXONOMY_PATH = path.join("qa", "evals", "taxonomy", "eval-case-taxonomy.json");
const REPORT_PATH = path.join("qa", "evals", "reports", "latest-eval-coverage.md");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function countInto(map, value) {
  const key = String(value || "missing");
  map.set(key, (map.get(key) || 0) + 1);
}

function markdownTable(map, label) {
  const entries = [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  if (entries.length === 0) return `No ${label} data found.\n`;
  return [
    `| ${label} | Count |`,
    "|---|---:|",
    ...entries.map(([key, count]) => `| ${key} | ${count} |`),
    "",
  ].join("\n");
}

function parseJsonl(filePath) {
  const raw = readText(filePath);
  const lines = raw.split(/\r?\n/);
  const cases = [];
  const errors = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      cases.push({ ...parsed, __line: index + 1 });
    } catch (error) {
      errors.push(`Line ${index + 1}: invalid JSON (${error.message})`);
    }
  });

  return { cases, errors };
}

function getLanguage(evalCase) {
  return evalCase.display_language || evalCase.displayLanguage || evalCase.language || "missing";
}

function getGeneratedProseLocale(evalCase) {
  const expected = evalCase.expected || {};
  return (
    evalCase.generated_prose_locale ||
    evalCase.report_locale ||
    evalCase.report_prose_locale ||
    expected.generated_prose_locale ||
    expected.report_locale ||
    "same_as_display_shell"
  );
}

function getStandard(evalCase) {
  return evalCase.standard_context || evalCase.standardContext || evalCase.standard || "missing";
}

function getStandardFamily(evalCase) {
  const standard = String(getStandard(evalCase)).toLowerCase();
  if (standard === "missing" || standard === "unknown") return "unknown";
  if (standard === "any") return "any";
  if (standard.includes("eurocode")) return "eurocode";
  if (standard.includes("aisc") || standard.includes("asce") || standard.includes("aci")) {
    return "aisc_asce_aci";
  }
  return "other";
}

function getDomain(evalCase) {
  return evalCase.domain || "missing";
}

function getTargetAgents(evalCase) {
  const value = evalCase.target_agents;
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.length > 0) : [];
}

function expectedList(evalCase, key) {
  const expected = evalCase.expected || {};
  const value = expected[key];
  return Array.isArray(value) ? value : [];
}

function numericExpectations(evalCase) {
  const expected = evalCase.expected || {};
  return Array.isArray(expected.numeric_expectations) ? expected.numeric_expectations : [];
}

function expressionSymbols(expression) {
  return [...new Set(String(expression || "").match(/[A-Za-z][A-Za-z0-9_]*/g) || [])];
}

function validateCases(cases, taxonomy) {
  const warnings = [];
  const errors = [];
  const seen = new Set();
  const domainSet = new Set(taxonomy.domains || []);
  const standardSet = new Set(taxonomy.standard_profiles || taxonomy.standard_contexts || taxonomy.standards || []);
  const languageSet = new Set(taxonomy.display_languages || taxonomy.languages || []);
  const targetAgentSet = new Set(taxonomy.target_agents || []);

  for (const evalCase of cases) {
    const prefix = evalCase.case_id || `line ${evalCase.__line}`;

    if (!evalCase.case_id) {
      errors.push(`Line ${evalCase.__line}: missing case_id`);
    } else if (seen.has(evalCase.case_id)) {
      errors.push(`${prefix}: duplicate case_id`);
    } else {
      seen.add(evalCase.case_id);
    }

    const domain = getDomain(evalCase);
    const language = getLanguage(evalCase);
    const standard = getStandard(evalCase);
    const targetAgents = getTargetAgents(evalCase);

    if (domain === "missing") warnings.push(`${prefix}: missing domain`);
    if (standard === "missing") warnings.push(`${prefix}: missing standard_context/standard`);
    if (language === "missing") warnings.push(`${prefix}: missing display_language/language`);
    if (targetAgents.length === 0) warnings.push(`${prefix}: missing target_agents`);

    if (domain !== "missing" && domainSet.size > 0 && !domainSet.has(domain)) {
      warnings.push(`${prefix}: domain '${domain}' is not listed in taxonomy`);
    }

    if (standard !== "missing" && standardSet.size > 0 && !standardSet.has(standard)) {
      warnings.push(`${prefix}: standard_context '${standard}' is not listed in taxonomy`);
    }

    if (language !== "missing" && languageSet.size > 0 && !languageSet.has(language)) {
      warnings.push(`${prefix}: display language '${language}' is not listed in taxonomy`);
    }

    if (targetAgentSet.size > 0) {
      for (const agent of targetAgents) {
        if (!targetAgentSet.has(agent)) {
          warnings.push(`${prefix}: target_agent '${agent}' is not listed in taxonomy`);
        }
      }
    }

    if (!evalCase.input && !evalCase.input_text && !evalCase.prompt) {
      warnings.push(`${prefix}: missing input/input_text/prompt`);
    }

    if (!evalCase.expected || typeof evalCase.expected !== "object") {
      warnings.push(`${prefix}: missing expected object`);
      continue;
    }

    const hasInclude = expectedList(evalCase, "must_include").length > 0;
    const hasNotInclude = expectedList(evalCase, "must_not_include").length > 0;
    const hasUnits = expectedList(evalCase, "unit_expectations").length > 0;
    const hasWarnings = expectedList(evalCase, "required_warning_if_missing").length > 0;

    if (!hasInclude && !hasNotInclude && !hasUnits && !hasWarnings) {
      warnings.push(`${prefix}: expected object has no recognizable rule lists`);
    }
  }

  return { errors, warnings };
}

function buildReport({ cases, taxonomy, errors, warnings }) {
  const byDomain = new Map();
  const byStandard = new Map();
  const byStandardFamily = new Map();
  const byLanguage = new Map();
  const byGeneratedProseLocale = new Map();
  const byManualReview = new Map();
  const byTargetAgent = new Map();
  const byUnitExpectation = new Map();
  const byNumericExpectationUnit = new Map();
  const byNumericExpressionSymbol = new Map();

  // Seed the agent map with the full taxonomy so zero-coverage agents are
  // visible as gaps, not hidden.
  for (const agent of taxonomy.target_agents || []) {
    byTargetAgent.set(agent, 0);
  }

  for (const evalCase of cases) {
    countInto(byDomain, getDomain(evalCase));
    countInto(byStandard, getStandard(evalCase));
    countInto(byStandardFamily, getStandardFamily(evalCase));
    countInto(byLanguage, getLanguage(evalCase));
    countInto(byGeneratedProseLocale, getGeneratedProseLocale(evalCase));
    countInto(byManualReview, String(Boolean(evalCase.manual_review_required)));

    const agents = getTargetAgents(evalCase);
    if (agents.length === 0) {
      countInto(byTargetAgent, "missing");
    } else {
      // A case can test multiple agents — count it once per agent so the
      // table answers "how many cases exercise this agent" rather than
      // "how many cases are exclusive to this agent".
      for (const agent of agents) {
        countInto(byTargetAgent, agent);
      }
    }

    for (const unit of expectedList(evalCase, "unit_expectations")) {
      countInto(byUnitExpectation, unit);
    }

    for (const expectation of numericExpectations(evalCase)) {
      countInto(byNumericExpectationUnit, expectation.unit || "missing");
      for (const symbol of expressionSymbols(expectation.expression)) {
        countInto(byNumericExpressionSymbol, symbol);
      }
    }
  }

  const requiredDimensions = taxonomy.required_eval_dimensions || [];
  const generatedAt = new Date().toISOString();

  return `# PILAR Eval Coverage Report\n\n` +
    `**Generated:** ${generatedAt}\n` +
    `**Cases:** ${cases.length}\n` +
    `**Errors:** ${errors.length}\n` +
    `**Warnings:** ${warnings.length}\n\n` +
    `## Status\n\n` +
    `${errors.length === 0 ? "PASS" : "FAIL"}${warnings.length > 0 ? " with warnings" : ""}\n\n` +
    `## Coverage by target agent\n\nA case is counted once per target agent, so cross-agent cases (e.g. ["konstruktor_a","kontrollor"]) add to both. Agents seeded from taxonomy show as zero when no case targets them — that is a real coverage gap, not a missing field.\n\n${markdownTable(byTargetAgent, "Target agent")}\n` +
    `## Coverage by domain\n\n${markdownTable(byDomain, "Domain")}\n` +
    `## Coverage by standard context\n\n${markdownTable(byStandard, "Standard context")}\n` +
    `## Coverage by standard family\n\nThis clusters raw standard_context metadata into broad planning buckets such as Eurocode, AISC/ASCE/ACI, unknown, any, and other. It is coverage metadata only, not proof of standard compliance.\n\n${markdownTable(byStandardFamily, "Standard family")}\n` +
    `## Coverage by display language\n\nThis is the UI/report shell language requested by the eval case. It should not be treated as proof that generated engineering prose was rewritten after report generation.\n\n${markdownTable(byLanguage, "Display language")}\n` +
    `## Generated prose locale expectation\n\nThis summarizes explicit generated/report prose locale expectations separately from display shell language. Cases without a separate field are counted as \`same_as_display_shell\`.\n\n${markdownTable(byGeneratedProseLocale, "Generated prose locale")}\n` +
    `## Unit and symbol expectations\n\nThese tables summarize explicit unit checks and symbolic numeric-expression anchors. They are coverage metadata only; numeric expression grading is still handled separately from text artifact checks.\n\n` +
    `### Unit expectations\n\n${markdownTable(byUnitExpectation, "Unit expectation")}\n` +
    `### Numeric expectation units\n\n${markdownTable(byNumericExpectationUnit, "Numeric expectation unit")}\n` +
    `### Numeric expression symbols\n\n${markdownTable(byNumericExpressionSymbol, "Numeric expression symbol")}\n` +
    `## Manual review requirement\n\n${markdownTable(byManualReview, "Manual review required")}\n` +
    `## Required eval dimensions from taxonomy\n\n` +
    (requiredDimensions.length > 0 ? requiredDimensions.map((item) => `- ${item}`).join("\n") : "No required dimensions listed.") +
    `\n\n` +
    `## Errors\n\n` +
    (errors.length > 0 ? errors.map((item) => `- ${item}`).join("\n") : "No errors.") +
    `\n\n` +
    `## Warnings\n\n` +
    (warnings.length > 0 ? warnings.map((item) => `- ${item}`).join("\n") : "No warnings.") +
    `\n\n` +
    `## Next expansion targets\n\n` +
    `- Add more cases per domain once runtime traces are available.\n` +
    `- Split rule-based checks from future model-graded checks.\n` +
    `- Add expected result-shape checks for report, PDF and Word artifacts.\n` +
    `- Keep generated reports separate from production app code.\n`;
}

function main() {
  if (!fs.existsSync(CASES_PATH)) {
    console.error(`FAILED missing ${CASES_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.error(`FAILED missing ${TAXONOMY_PATH}`);
    process.exit(1);
  }

  const taxonomy = readJson(TAXONOMY_PATH);
  const parsed = parseJsonl(CASES_PATH);
  const validation = validateCases(parsed.cases, taxonomy);
  const errors = [...parsed.errors, ...validation.errors];
  const warnings = validation.warnings;
  const report = buildReport({ cases: parsed.cases, taxonomy, errors, warnings });

  if (!checkOnly) {
    ensureDir(REPORT_PATH);
    fs.writeFileSync(REPORT_PATH, report, "utf8");
  }

  const status = errors.length === 0 && (!strict || warnings.length === 0) ? "OK" : "FAILED";
  console.log(`${status} eval coverage: ${parsed.cases.length} cases, ${errors.length} errors, ${warnings.length} warnings`);
  if (!checkOnly) {
    console.log(`Wrote ${REPORT_PATH}`);
  } else {
    console.log("CHECK mode: no report file written");
  }

  if (errors.length > 0 || (strict && warnings.length > 0)) {
    process.exit(1);
  }
}

main();

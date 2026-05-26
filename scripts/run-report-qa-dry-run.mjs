#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const CHECK_ONLY = args.includes("--check");
const WRITE = args.includes("--write") || args.includes("--update");
const STRICT = args.includes("--strict");

const DEFAULT_INPUT = "sources/report-qa/dry-run/sample-report.md";
const DEFAULT_OUTPUT = "sources/report-qa/reports/latest-report-qa-dry-run.md";
const REGISTRY_PATH = "sources/report-qa/report-qa-checks.json";

function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
}

const inputPath = argValue("--input", DEFAULT_INPUT);
const outputPath = argValue("--out", DEFAULT_OUTPUT);

function readText(path) {
  const absolute = resolve(ROOT, path);
  if (!existsSync(absolute)) {
    throw new Error(`Missing file: ${path}`);
  }
  return readFileSync(absolute, "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function normalizeChecks(registry) {
  const raw = Array.isArray(registry)
    ? registry
    : Array.isArray(registry.checks)
      ? registry.checks
      : Array.isArray(registry.report_qa_checks)
        ? registry.report_qa_checks
        : [];

  return raw
    .map((check, index) => ({
      id: String(check.id || check.check_id || check.key || `check_${index + 1}`),
      title: String(check.title || check.name || check.id || check.check_id || `Check ${index + 1}`),
      severity: String(check.severity || check.default_severity || "warn").toLowerCase()
    }))
    .filter((check) => check.id.length > 0);
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function evaluateKnownCheck(check, text) {
  const id = check.id;

  const definitions = {
    answers_user_request: {
      pass: [/requested checks/i, /answers? the user/i, /maximum (factored )?moment/i, /maximum (factored )?shear/i],
      message: "Report should visibly answer the user's requested checks."
    },
    assumptions_explicit: {
      pass: [/assumptions?/i, /given data/i, /input data/i],
      message: "Report should state assumptions or given data explicitly."
    },
    formulas_units_symbols_consistent: {
      pass: [/(kN|kNm|kip|ft|m\b|mm\b|ksi)/i, /M\s*=|V\s*=|q\s*=|w\s*=/i, /units?/i],
      message: "Report should show units, formulas, or symbol consistency."
    },
    conclusion_strength_appropriate: {
      fail: [/final code compliance is verified/i, /approved for construction/i, /fully compliant/i],
      pass: [/preliminary/i, /requires? verification/i, /licensed structural engineer/i],
      message: "Conclusion should not overstate approval or compliance."
    },
    standard_context_consistent: {
      fail: [/Eurocode/i.test(text) && /AISC|ASCE/i.test(text) ? /./ : /__never__/],
      pass: [/Eurocode|NS-EN|AISC|ASCE|ACI|standard context/i],
      message: "Report should keep one standard context, or clearly explain mixed context."
    },
    language_shell_consistent: {
      fail: [/Konstruktør|Kontrollør|Samanliknar|Sammenligner|FØREBELS|FORELØPIG|HØG|LAV|GOD/],
      pass: [/Engineer A|Engineer B|Comparator|Controller|Calculation note|Report QA/i],
      message: "Shell and role labels should match the selected language/profile."
    },
    values_traceable: {
      pass: [/traceable/i, /source/i, /given/i, /from input/i, /table/i],
      message: "Key values should be traceable to input, assumptions, or cited data."
    },
    warnings_visible: {
      pass: [/warnings?/i, /limitations?/i, /risk/i, /not supported/i],
      message: "Warnings and limitations should be visible."
    },
    pdf_word_web_parity: {
      warn: [/PDF|Word|DOCX|web report|parity/i],
      message: "PDF/Word/Web parity is noted, but full artifact comparison is out of scope for dry-run."
    },
    disclaimer_present: {
      pass: [/preliminary/i, /licensed structural engineer/i, /not final/i, /review/i],
      message: "Report should include a preliminary-use or professional-review disclaimer."
    },
    missing_data_acknowledged: {
      pass: [/missing/i, /not provided/i, /not available/i, /requires? verification/i],
      message: "Missing data should be acknowledged rather than hidden."
    },
    no_hallucinated_standard_values: {
      fail: [/Zx\s*=|Sx\s*=|Lp\s*=|Lr\s*=|J\s*=|Cw\s*=|rts\s*=/i],
      pass: [/do not invent/i, /verified section properties/i, /not available/i, /requires? verified/i],
      message: "Dry-run should flag invented standard/table values."
    },
    controller_decision_visible: {
      pass: [/controller decision/i, /controller/i, /decision/i],
      message: "Controller decision should be visible."
    },
    calculation_sheet_available_when_expected: {
      warn: [/calculation sheet/i, /calculation-only/i],
      message: "Calculation sheet availability is mentioned; dry-run cannot verify UI artifacts."
    }
  };

  const rule = definitions[id];
  if (!rule) {
    return {
      id,
      title: check.title,
      severity: check.severity,
      status: "SKIP",
      message: "No dry-run heuristic is defined for this registry check yet."
    };
  }

  if (rule.fail && includesAny(text, rule.fail)) {
    return {
      id,
      title: check.title,
      severity: check.severity === "critical" ? "block" : check.severity,
      status: "FAIL",
      message: rule.message
    };
  }

  if (rule.pass && includesAny(text, rule.pass)) {
    return {
      id,
      title: check.title,
      severity: check.severity,
      status: "PASS",
      message: rule.message
    };
  }

  if (rule.warn && includesAny(text, rule.warn)) {
    return {
      id,
      title: check.title,
      severity: "warn",
      status: "WARN",
      message: rule.message
    };
  }

  return {
    id,
    title: check.title,
    severity: check.severity,
    status: "WARN",
    message: rule.message
  };
}

function escapeCell(value) {
  return String(value || "-").replace(/\|/g, "\\|");
}

function statusIcon(status) {
  if (status === "PASS") return "PASS";
  if (status === "FAIL") return "FAIL";
  if (status === "SKIP") return "SKIP";
  return "WARN";
}

const registry = readJson(REGISTRY_PATH);
const checks = normalizeChecks(registry);
if (checks.length === 0) {
  console.error(`FAILED ${REGISTRY_PATH}: no checks found`);
  process.exit(1);
}

const input = readText(inputPath);
const results = checks.map((check) => evaluateKnownCheck(check, input));
const fails = results.filter((result) => result.status === "FAIL");
const warns = results.filter((result) => result.status === "WARN");
const skips = results.filter((result) => result.status === "SKIP");
const passes = results.filter((result) => result.status === "PASS");
const dryRunStatus = fails.length > 0
  ? "REPORT_QA_DRY_RUN_FAIL"
  : warns.length > 0 || skips.length > 0
    ? "REPORT_QA_DRY_RUN_WARN"
    : "REPORT_QA_DRY_RUN_PASS";

const now = new Date().toISOString();
const lines = [];
lines.push("# PILAR Report QA Dry-Run Report");
lines.push("");
lines.push(`**Generated:** ${now}`);
lines.push(`**Mode:** ${CHECK_ONLY ? "check-only" : WRITE ? "write" : "dry-run"}`);
lines.push(`**Input:** \`${inputPath}\``);
lines.push(`**Registry:** \`${REGISTRY_PATH}\``);
lines.push(`**Status:** ${dryRunStatus}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Checks loaded: ${checks.length}`);
lines.push(`- Pass: ${passes.length}`);
lines.push(`- Warn: ${warns.length}`);
lines.push(`- Fail: ${fails.length}`);
lines.push(`- Skipped/no heuristic yet: ${skips.length}`);
lines.push("");
lines.push("## Check results");
lines.push("");
lines.push("| Check | Severity | Status | Dry-run note |");
lines.push("|---|---:|---:|---|");
for (const result of results) {
  lines.push(`| ${escapeCell(result.title)} | ${escapeCell(result.severity)} | ${statusIcon(result.status)} | ${escapeCell(result.message)} |`);
}
lines.push("");
lines.push("## Safety boundary");
lines.push("");
lines.push("This dry-run reads local text fixtures or a supplied input file only. It does not call app routes, mutate user-facing output, write Supabase data, execute agents, or change reports unless explicit write mode is used for this dry-run report artifact.");
lines.push("");
lines.push("## Commands");
lines.push("");
lines.push("```bash");
lines.push("node scripts/run-report-qa-dry-run.mjs --check");
lines.push("node scripts/run-report-qa-dry-run.mjs --input path/to/report.md --check");
lines.push("node scripts/run-report-qa-dry-run.mjs --write");
lines.push("```");
lines.push("");

const content = `${lines.join("\n")}\n`;

if (WRITE && !CHECK_ONLY) {
  const absoluteOutput = resolve(ROOT, outputPath);
  mkdirSync(dirname(absoluteOutput), { recursive: true });
  writeFileSync(absoluteOutput, content, "utf8");
  console.log(`OK wrote ${relative(ROOT, absoluteOutput)}`);
}

console.log(`Status: ${dryRunStatus}`);
console.log(`Checks loaded: ${checks.length}`);
console.log(`Pass: ${passes.length}`);
console.log(`Warn: ${warns.length}`);
console.log(`Fail: ${fails.length}`);
console.log(`Skipped: ${skips.length}`);

if (STRICT && fails.length > 0) {
  process.exit(1);
}

#!/usr/bin/env node
import fs from "node:fs";

const DEFAULT_CASES = "qa/evals/pilar-core-evals.jsonl";

function parseArgs(argv) {
  const args = {
    casesPath: DEFAULT_CASES,
    caseId: "",
    artifactPath: "",
    text: "",
    json: false,
    listCases: false,
    priority: "",
    domain: "",
    targetAgent: "",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--json") {
      args.json = true;
      continue;
    }

    if (token === "--list-cases") {
      args.listCases = true;
      continue;
    }

    if (token === "--priority") {
      args.priority = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--priority=")) {
      args.priority = token.slice("--priority=".length);
      continue;
    }

    if (token === "--domain") {
      args.domain = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--domain=")) {
      args.domain = token.slice("--domain=".length);
      continue;
    }

    if (token === "--target-agent") {
      args.targetAgent = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--target-agent=")) {
      args.targetAgent = token.slice("--target-agent=".length);
      continue;
    }

    if (token === "--cases") {
      args.casesPath = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--cases=")) {
      args.casesPath = token.slice("--cases=".length);
      continue;
    }

    if (token === "--case-id") {
      args.caseId = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--case-id=")) {
      args.caseId = token.slice("--case-id=".length);
      continue;
    }

    if (token === "--artifact") {
      args.artifactPath = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--artifact=")) {
      args.artifactPath = token.slice("--artifact=".length);
      continue;
    }

    if (token === "--text") {
      args.text = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--text=")) {
      args.text = token.slice("--text=".length);
      continue;
    }

    throw new Error(`unknown argument '${token}'`);
  }

  return args;
}

function requireValue(argv, index, token) {
  const value = argv[index + 1];
  if (!value) throw new Error(`${token} requires a value`);
  return value;
}

function printHelp() {
  console.log(`PILAR eval artifact grader

Usage:
  node scripts/grade-eval-artifact.mjs --case-id <id> --artifact <file>
  cat artifact.txt | node scripts/grade-eval-artifact.mjs --case-id <id> --artifact -
  node scripts/grade-eval-artifact.mjs --case-id <id> --text "<artifact text>"
  node scripts/grade-eval-artifact.mjs --case-id <id> --artifact <file> --json
  node scripts/grade-eval-artifact.mjs --list-cases
  node scripts/grade-eval-artifact.mjs --list-cases --json
  node scripts/grade-eval-artifact.mjs --list-cases --priority P0 --target-agent pipeline

Scope:
  Offline deterministic text checks only. No LLM calls, no DB reads, no writes.
`);
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((entry) => entry.line.length > 0)
    .map((entry) => {
      try {
        return JSON.parse(entry.line);
      } catch (error) {
        throw new Error(`${filePath}:${entry.lineNumber}: invalid JSON (${error.message})`);
      }
    });
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.length > 0) : [];
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("nb-NO");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAsciiToken(value) {
  return /^[A-Za-z0-9_]+$/.test(value);
}

function hasMixedCase(value) {
  return /[A-Z]/.test(value) && /[a-z]/.test(value);
}

function textContainsTerm(artifact, term) {
  if (isAsciiToken(term)) {
    const flags = hasMixedCase(term) ? "" : "i";
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(term)}($|[^A-Za-z0-9_])`, flags);
    return pattern.test(artifact);
  }

  return normalize(artifact).includes(normalize(term));
}

function checkRequired(label, terms, artifact) {
  return terms.map((term) => {
    const passed = textContainsTerm(artifact, term);
    return { label, term, passed };
  });
}

function checkForbidden(terms, artifact) {
  return terms.map((term) => {
    const passed = !textContainsTerm(artifact, term);
    return { label: "must_not_include", term, passed };
  });
}

function gradeArtifact(evalCase, artifactText) {
  const expected = evalCase.expected ?? {};
  const checks = [
    ...checkRequired("must_include", asArray(expected.must_include), artifactText),
    ...checkForbidden(asArray(expected.must_not_include), artifactText),
    ...checkRequired("unit_expectations", asArray(expected.unit_expectations), artifactText),
    ...checkRequired(
      "required_warnings_if_missing",
      [
        ...asArray(expected.required_warnings_if_missing),
        ...asArray(expected.required_warning_if_missing),
      ],
      artifactText,
    ),
  ];

  const skipped = [];
  if (Array.isArray(expected.numeric_expectations) && expected.numeric_expectations.length > 0) {
    skipped.push({
      label: "numeric_expectations",
      count: expected.numeric_expectations.length,
      reason: "numeric expression evaluation is not implemented in the text artifact grader",
    });
  }
  if (Array.isArray(expected.safety_checks) && expected.safety_checks.length > 0) {
    skipped.push({
      label: "safety_checks",
      count: expected.safety_checks.length,
      reason: "safety checks are descriptive and need case-specific graders",
    });
  }

  const failed = checks.filter((check) => !check.passed);
  return {
    case_id: evalCase.case_id,
    status: failed.length === 0 ? "PASS" : "FAIL",
    checked: checks.length,
    failed: failed.length,
    skipped,
    checks,
  };
}

function formatCaseList(cases) {
  return cases.map((evalCase) => {
    const title = String(evalCase.title ?? "").replace(/\s+/g, " ").trim();
    const priority = evalCase.priority ?? "unknown";
    const domain = evalCase.domain ?? "unknown";
    return `${evalCase.case_id}\t${priority}\t${domain}\t${title}`;
  }).join("\n");
}

function matchesFilter(actual, expected) {
  return !expected || normalize(actual) === normalize(expected);
}

function filterCases(cases, args) {
  return cases.filter((evalCase) => {
    const targetAgents = Array.isArray(evalCase.target_agents) ? evalCase.target_agents : [];
    return (
      matchesFilter(evalCase.priority ?? "unknown", args.priority) &&
      matchesFilter(evalCase.domain ?? "unknown", args.domain) &&
      (!args.targetAgent || targetAgents.some((agent) => matchesFilter(agent, args.targetAgent)))
    );
  });
}

function summarizeCases(cases) {
  return cases.map((evalCase) => ({
    case_id: evalCase.case_id,
    title: evalCase.title ?? "",
    priority: evalCase.priority ?? "unknown",
    domain: evalCase.domain ?? "unknown",
    standard_context: evalCase.standard_context ?? "unknown",
    display_language: evalCase.display_language ?? "unknown",
    target_agents: Array.isArray(evalCase.target_agents) ? evalCase.target_agents : [],
    tags: Array.isArray(evalCase.tags) ? evalCase.tags : [],
  }));
}

function formatTextResult(result) {
  const lines = [
    `${result.status} ${result.case_id}: ${result.checked - result.failed}/${result.checked} deterministic text checks passed`,
  ];

  for (const check of result.checks) {
    lines.push(`${check.passed ? "OK" : "FAIL"} ${check.label}: ${check.term}`);
  }

  for (const item of result.skipped) {
    lines.push(`SKIP ${item.label}: ${item.count} (${item.reason})`);
  }

  return lines.join("\n");
}

function readArtifactText(args) {
  if (args.text) return args.text;
  if (args.artifactPath === "-") return fs.readFileSync(0, "utf8");
  return fs.readFileSync(args.artifactPath, "utf8");
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`FAILED eval artifact grader: ${error.message}`);
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  const cases = readJsonl(args.casesPath);

  if (args.listCases) {
    const listedCases = filterCases(cases, args);
    console.log(args.json ? JSON.stringify(summarizeCases(listedCases), null, 2) : formatCaseList(listedCases));
    return;
  }

  if (!args.caseId) {
    console.error("FAILED eval artifact grader: --case-id is required");
    process.exit(1);
  }

  if (!args.text && !args.artifactPath) {
    console.error("FAILED eval artifact grader: provide --artifact or --text");
    process.exit(1);
  }

  const evalCase = cases.find((candidate) => candidate.case_id === args.caseId);
  if (!evalCase) {
    console.error(`FAILED eval artifact grader: unknown case_id '${args.caseId}'`);
    process.exit(1);
  }

  const artifactText = readArtifactText(args);
  const result = gradeArtifact(evalCase, artifactText);

  console.log(args.json ? JSON.stringify(result, null, 2) : formatTextResult(result));
  if (result.status !== "PASS") process.exit(1);
}

main();

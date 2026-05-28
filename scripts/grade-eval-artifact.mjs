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
  node scripts/grade-eval-artifact.mjs --case-id <id> --text "<artifact text>"
  node scripts/grade-eval-artifact.mjs --case-id <id> --artifact <file> --json

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

function checkRequired(label, terms, artifact) {
  return terms.map((term) => {
    const passed = normalize(artifact).includes(normalize(term));
    return { label, term, passed };
  });
}

function checkForbidden(terms, artifact) {
  return terms.map((term) => {
    const passed = !normalize(artifact).includes(normalize(term));
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

  if (!args.caseId) {
    console.error("FAILED eval artifact grader: --case-id is required");
    process.exit(1);
  }

  if (!args.text && !args.artifactPath) {
    console.error("FAILED eval artifact grader: provide --artifact or --text");
    process.exit(1);
  }

  const cases = readJsonl(args.casesPath);
  const evalCase = cases.find((candidate) => candidate.case_id === args.caseId);
  if (!evalCase) {
    console.error(`FAILED eval artifact grader: unknown case_id '${args.caseId}'`);
    process.exit(1);
  }

  const artifactText = args.text || fs.readFileSync(args.artifactPath, "utf8");
  const result = gradeArtifact(evalCase, artifactText);

  console.log(args.json ? JSON.stringify(result, null, 2) : formatTextResult(result));
  if (result.status !== "PASS") process.exit(1);
}

main();

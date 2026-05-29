#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CASES = "qa/evals/pilar-core-evals.jsonl";

function parseArgs(argv) {
  const args = {
    casesPath: DEFAULT_CASES,
    caseId: "",
    artifactPath: "",
    bundlePath: "",
    text: "",
    json: false,
    listCases: false,
    count: false,
    idsOnly: false,
    requireMatch: false,
    priority: "",
    domain: "",
    standardContext: "",
    displayLanguage: "",
    targetAgent: "",
    tag: "",
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

    if (token === "--count") {
      args.count = true;
      continue;
    }

    if (token === "--ids-only") {
      args.idsOnly = true;
      continue;
    }

    if (token === "--require-match") {
      args.requireMatch = true;
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

    if (token === "--standard-context") {
      args.standardContext = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--standard-context=")) {
      args.standardContext = token.slice("--standard-context=".length);
      continue;
    }

    if (token === "--display-language") {
      args.displayLanguage = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--display-language=")) {
      args.displayLanguage = token.slice("--display-language=".length);
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

    if (token === "--tag") {
      args.tag = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--tag=")) {
      args.tag = token.slice("--tag=".length);
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

    if (token === "--bundle") {
      args.bundlePath = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token.startsWith("--bundle=")) {
      args.bundlePath = token.slice("--bundle=".length);
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
  node scripts/grade-eval-artifact.mjs --bundle <live-eval-bundle-dir>
  node scripts/grade-eval-artifact.mjs --list-cases
  node scripts/grade-eval-artifact.mjs --list-cases --json
  node scripts/grade-eval-artifact.mjs --list-cases --priority P0 --target-agent pipeline
  node scripts/grade-eval-artifact.mjs --list-cases --standard-context aisc_asce_aci_experimental
  node scripts/grade-eval-artifact.mjs --list-cases --display-language en
  node scripts/grade-eval-artifact.mjs --list-cases --tag guardrail
  node scripts/grade-eval-artifact.mjs --list-cases --count --tag i18n
  node scripts/grade-eval-artifact.mjs --list-cases --ids-only --display-language en
  node scripts/grade-eval-artifact.mjs --list-cases --require-match --tag guardrail

Scope:
  Offline deterministic text checks only. No LLM calls, no DB reads, no writes.
`);
}

function readJsonl(filePath) {
  return stripBom(fs.readFileSync(filePath, "utf8"))
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

function stripBom(value) {
  return String(value).replace(/^\uFEFF/, "");
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

function severityForCheck(label) {
  if (label === "must_not_include") return "critical";
  if (label === "must_include") return "major";
  if (label === "unit_expectations") return "major";
  if (label === "required_warnings_if_missing") return "warning";
  return "warning";
}

function addSeverity(check) {
  return {
    ...check,
    severity: check.passed ? "none" : severityForCheck(check.label),
  };
}

function summarizeSeverity(failedChecks) {
  return failedChecks.reduce(
    (summary, check) => {
      summary[check.severity] = (summary[check.severity] ?? 0) + 1;
      return summary;
    },
    { critical: 0, major: 0, warning: 0 },
  );
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
  ].map(addSeverity);

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
    artifact_boundary: "offline_text_artifact_only",
    checked: checks.length,
    failed: failed.length,
    severity_summary: summarizeSeverity(failed),
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
    const tags = Array.isArray(evalCase.tags) ? evalCase.tags : [];
    return (
      matchesFilter(evalCase.priority ?? "unknown", args.priority) &&
      matchesFilter(evalCase.domain ?? "unknown", args.domain) &&
      matchesFilter(evalCase.standard_context ?? "unknown", args.standardContext) &&
      matchesFilter(evalCase.display_language ?? "unknown", args.displayLanguage) &&
      (!args.targetAgent || targetAgents.some((agent) => matchesFilter(agent, args.targetAgent))) &&
      (!args.tag || tags.some((tag) => matchesFilter(tag, args.tag)))
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

function formatCaseIds(cases) {
  return cases.map((evalCase) => evalCase.case_id).join("\n");
}

function formatTextResult(result) {
  const lines = [
    `${result.status} ${result.case_id}: ${result.checked - result.failed}/${result.checked} deterministic text checks passed`,
    `SOURCE ${result.artifact_source}: ${result.artifact_path}`,
    `BOUNDARY ${result.artifact_boundary}: no UI scraping, no app routes, no DB reads`,
  ];

  for (const check of result.checks) {
    const severity = check.passed ? "" : ` [${check.severity}]`;
    lines.push(`${check.passed ? "OK" : "FAIL"}${severity} ${check.label}: ${check.term}`);
  }

  for (const item of result.skipped) {
    lines.push(`SKIP ${item.label}: ${item.count} (${item.reason})`);
  }

  return lines.join("\n");
}

function readArtifactText(args) {
  if (args.text) return args.text;
  if (args.artifactPath === "-") return fs.readFileSync(0, "utf8");
  if (args.bundlePath) return fs.readFileSync(path.join(args.bundlePath, "report-text.txt"), "utf8");
  return fs.readFileSync(args.artifactPath, "utf8");
}

function resolveArtifactSource(args) {
  if (args.text) {
    return {
      artifact_source: "inline_text",
      artifact_path: "inline --text",
    };
  }
  if (args.artifactPath === "-") {
    return {
      artifact_source: "stdin_text_artifact",
      artifact_path: "stdin",
    };
  }
  if (args.bundlePath) {
    return {
      artifact_source: "bundle_report_text",
      artifact_path: path.join(args.bundlePath, "report-text.txt"),
    };
  }
  return {
    artifact_source: "text_artifact_file",
    artifact_path: args.artifactPath,
  };
}

function readBundleManifest(bundlePath) {
  const manifestPath = path.join(bundlePath, "manifest.json");
  try {
    return JSON.parse(stripBom(fs.readFileSync(manifestPath, "utf8")));
  } catch (error) {
    throw new Error(`${manifestPath}: unable to read live eval bundle manifest (${error.message})`);
  }
}

function resolveCaseId(args) {
  if (args.caseId) return args.caseId;
  if (!args.bundlePath) return "";

  const manifest = readBundleManifest(args.bundlePath);
  if (typeof manifest.case_id !== "string" || manifest.case_id.length === 0) {
    throw new Error(`${path.join(args.bundlePath, "manifest.json")}: missing case_id`);
  }
  return manifest.case_id;
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
    if (args.requireMatch && listedCases.length === 0) {
      console.error("FAILED eval artifact grader: no eval cases matched the requested filters");
      process.exit(1);
    }
    if (args.count) {
      console.log(args.json ? JSON.stringify({ count: listedCases.length }, null, 2) : String(listedCases.length));
      return;
    }
    if (args.idsOnly) {
      console.log(args.json ? JSON.stringify(listedCases.map((evalCase) => evalCase.case_id), null, 2) : formatCaseIds(listedCases));
      return;
    }
    console.log(args.json ? JSON.stringify(summarizeCases(listedCases), null, 2) : formatCaseList(listedCases));
    return;
  }

  let caseId;
  try {
    caseId = resolveCaseId(args);
  } catch (error) {
    console.error(`FAILED eval artifact grader: ${error.message}`);
    process.exit(1);
  }

  if (!caseId) {
    console.error("FAILED eval artifact grader: --case-id is required unless --bundle provides manifest.json case_id");
    process.exit(1);
  }

  if (!args.text && !args.artifactPath && !args.bundlePath) {
    console.error("FAILED eval artifact grader: provide --artifact, --text, or --bundle");
    process.exit(1);
  }

  const evalCase = cases.find((candidate) => candidate.case_id === caseId);
  if (!evalCase) {
    console.error(`FAILED eval artifact grader: unknown case_id '${caseId}'`);
    process.exit(1);
  }

  const artifactText = readArtifactText(args);
  const result = gradeArtifact(evalCase, artifactText);
  Object.assign(result, resolveArtifactSource(args));

  console.log(args.json ? JSON.stringify(result, null, 2) : formatTextResult(result));
  if (result.status !== "PASS") process.exit(1);
}

main();

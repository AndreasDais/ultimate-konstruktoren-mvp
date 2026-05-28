#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const filePath = process.argv[2] ?? "qa/evals/pilar-core-evals.jsonl";
const absolutePath = path.resolve(filePath);

function fail(message) {
  console.error(`FAILED ${filePath}: ${message}`);
  process.exitCode = 1;
}

function asArray(value) {
  return Array.isArray(value) ? value : null;
}

if (!fs.existsSync(absolutePath)) {
  fail("file not found");
  process.exit();
}

const text = fs.readFileSync(absolutePath, "utf8");
const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
const seen = new Set();
const requiredTopLevel = [
  "case_id",
  "version",
  "title",
  "priority",
  "domain",
  "standard_context",
  "display_language",
  "target_agents",
  "input_text",
  "expected",
  "grader",
  "manual_review_required",
  "tags",
];
const requiredExpected = [
  "must_include",
  "must_not_include",
  "unit_expectations",
  "required_warnings_if_missing",
  "safety_checks",
];

const priorities = new Set(["P0", "P1", "P2"]);
const displayLanguages = new Set(["nb", "nn", "en", "fr", "de"]);
const tagPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
let parsedCount = 0;

for (const [index, line] of lines.entries()) {
  const lineNumber = index + 1;
  let item;

  try {
    item = JSON.parse(line);
  } catch (error) {
    fail(`line ${lineNumber}: invalid JSON: ${error.message}`);
    continue;
  }

  parsedCount += 1;

  for (const field of requiredTopLevel) {
    if (!(field in item)) {
      fail(`line ${lineNumber}: missing top-level field '${field}'`);
    }
  }

  if (typeof item.case_id !== "string" || item.case_id.trim() === "") {
    fail(`line ${lineNumber}: case_id must be a non-empty string`);
  } else if (seen.has(item.case_id)) {
    fail(`line ${lineNumber}: duplicate case_id '${item.case_id}'`);
  } else {
    seen.add(item.case_id);
  }

  if (!priorities.has(item.priority)) {
    fail(`line ${lineNumber}: priority must be P0, P1 or P2`);
  }

  if (!displayLanguages.has(item.display_language)) {
    fail(`line ${lineNumber}: unsupported display_language '${item.display_language}'`);
  }

  if (typeof item.input_text !== "string" || item.input_text.trim().length < 20) {
    fail(`line ${lineNumber}: input_text is too short`);
  }

  if (typeof item.manual_review_required !== "boolean") {
    fail(`line ${lineNumber}: manual_review_required must be boolean`);
  }

  const tags = asArray(item.tags);
  if (!tags) {
    fail(`line ${lineNumber}: tags must be an array`);
  } else {
    const seenTags = new Set();
    for (const tag of tags) {
      if (typeof tag !== "string" || tag.trim() === "") {
        fail(`line ${lineNumber}: tags entries must be non-empty strings`);
        break;
      }

      if (!tagPattern.test(tag)) {
        fail(`line ${lineNumber}: tag '${tag}' must be lowercase kebab/dotted format`);
      }

      if (/^p[0-2]$/.test(tag)) {
        fail(`line ${lineNumber}: tag '${tag}' duplicates the top-level priority field`);
      }

      if (seenTags.has(tag)) {
        fail(`line ${lineNumber}: duplicate tag '${tag}'`);
      }
      seenTags.add(tag);
    }
  }

  const targetAgents = asArray(item.target_agents);
  if (!targetAgents || targetAgents.length === 0) {
    fail(`line ${lineNumber}: target_agents must be a non-empty array (see RUNTIME_CONTRACT_AUDIT.md for valid agents)`);
  } else {
    for (const agent of targetAgents) {
      if (typeof agent !== "string" || agent.trim() === "") {
        fail(`line ${lineNumber}: target_agents entries must be non-empty strings`);
        break;
      }
    }
  }

  if (!item.expected || typeof item.expected !== "object" || Array.isArray(item.expected)) {
    fail(`line ${lineNumber}: expected must be an object`);
    continue;
  }

  for (const field of requiredExpected) {
    if (!asArray(item.expected[field])) {
      fail(`line ${lineNumber}: expected.${field} must be an array`);
    }
  }

  if ("numeric_expectations" in item.expected && !asArray(item.expected.numeric_expectations)) {
    fail(`line ${lineNumber}: expected.numeric_expectations must be an array when present`);
  }

  if (!item.grader || typeof item.grader !== "object" || Array.isArray(item.grader)) {
    fail(`line ${lineNumber}: grader must be an object`);
  } else if (typeof item.grader.type !== "string" || item.grader.type.trim() === "") {
    fail(`line ${lineNumber}: grader.type must be a non-empty string`);
  }
}

if (process.exitCode) {
  console.error(`FAILED ${filePath}: ${parsedCount} parsed lines, ${seen.size} unique case IDs`);
  process.exit();
}

console.log(`OK ${filePath}: ${parsedCount} eval cases validated`);

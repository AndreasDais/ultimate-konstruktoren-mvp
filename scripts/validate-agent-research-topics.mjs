#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "sources", "agent-research", "topics", "topic-registry.json");

function fail(message) {
  console.error(`FAILED ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(root, filePath)}: could not parse JSON: ${error.message}`);
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

const allowedPriorities = new Set(["P0", "P1", "P2", "NO_BUILD"]);
const allowedRisks = new Set(["low", "medium", "high"]);
const allowedStatuses = new Set(["proposed", "active", "memo_generated", "accepted", "deferred", "rejected"]);

if (!fs.existsSync(registryPath)) {
  fail(`${path.relative(root, registryPath)} not found`);
  process.exit();
}

const registry = readJson(registryPath);
if (!registry) process.exit();

let errors = 0;
let warnings = 0;

function check(condition, message) {
  if (!condition) {
    console.error(`ERROR ${message}`);
    errors += 1;
  }
}

function warn(condition, message) {
  if (!condition) {
    console.warn(`WARN ${message}`);
    warnings += 1;
  }
}

check(isNonEmptyString(registry.version), "registry.version must be a non-empty string");
check(isNonEmptyString(registry.owner), "registry.owner must be a non-empty string");
check(isNonEmptyString(registry.purpose), "registry.purpose must be a non-empty string");
check(Array.isArray(registry.topics), "registry.topics must be an array");

const seen = new Set();
const topics = Array.isArray(registry.topics) ? registry.topics : [];

for (const topic of topics) {
  const id = topic?.id;
  check(isNonEmptyString(id), "topic.id must be a non-empty string");
  if (!isNonEmptyString(id)) continue;

  check(!seen.has(id), `duplicate topic id: ${id}`);
  seen.add(id);

  check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id), `${id}: id must be kebab-case`);
  check(isNonEmptyString(topic.title), `${id}: title must be a non-empty string`);
  check(allowedStatuses.has(topic.status), `${id}: status must be one of ${Array.from(allowedStatuses).join(", ")}`);
  check(allowedPriorities.has(topic.priority), `${id}: priority must be P0, P1, P2 or NO_BUILD`);
  check(allowedRisks.has(topic.risk), `${id}: risk must be low, medium or high`);
  check(isNonEmptyString(topic.problem_mapping), `${id}: problem_mapping must be non-empty`);
  check(isStringArray(topic.expected_outputs), `${id}: expected_outputs must be a non-empty string array`);
  check(topic.expected_outputs?.length > 0, `${id}: expected_outputs must contain at least one item`);
  check(isNonEmptyString(topic.allowed_next_step), `${id}: allowed_next_step must be non-empty`);
  check(isStringArray(topic.blocked_actions), `${id}: blocked_actions must be a string array`);
  check(topic.blocked_actions?.length > 0, `${id}: blocked_actions must contain at least one item`);

  const topicFile = path.join(root, topic.topic_file || "");
  const memoFile = path.join(root, topic.memo_file || "");

  check(isNonEmptyString(topic.topic_file), `${id}: topic_file must be non-empty`);
  check(isNonEmptyString(topic.memo_file), `${id}: memo_file must be non-empty`);
  warn(fs.existsSync(topicFile), `${id}: topic file not found yet: ${topic.topic_file}`);
  warn(fs.existsSync(path.dirname(memoFile)), `${id}: memo directory not found: ${path.dirname(topic.memo_file || "")}`);
}

if (errors > 0) {
  console.error(`FAILED ${path.relative(root, registryPath)}: ${topics.length} topics checked, ${errors} errors, ${warnings} warnings`);
  process.exitCode = 1;
} else {
  console.log(`OK ${path.relative(root, registryPath)}: ${topics.length} research topics validated, ${warnings} warnings`);
}

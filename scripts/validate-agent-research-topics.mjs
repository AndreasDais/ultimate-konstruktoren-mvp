#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = "sources/agent-research/topics/topic-registry.json";
const TOPIC_DIR = "sources/agent-research/topics";
const MEMO_DIR = "sources/agent-research/memos";

const IGNORED_TOPIC_DOCS = new Set([
  "README.md",
  "RESEARCH_TOPIC_REGISTRY.md",
  "RESEARCH_TOPIC_IMPLEMENTATION_CHECKLIST.md",
  "REGISTRY_TO_MEMO_COVERAGE.md",
]);

const IGNORED_MEMO_DOCS = new Set([
  "README.md",
  "MEMO_QUALITY_CHECKS.md",
]);

function fail(message) {
  console.error(`FAILED ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  const absolute = path.join(ROOT, filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`missing file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function pathExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function listMarkdownFiles(relativeDir, ignoredNames) {
  const absolute = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absolute)) return [];
  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".md"))
    .filter((name) => !ignoredNames.has(name))
    .map((name) => path.posix.join(relativeDir, name));
}

function extractTopics(registry) {
  if (Array.isArray(registry)) return registry;
  if (Array.isArray(registry.topics)) return registry.topics;
  if (Array.isArray(registry.items)) return registry.items;
  if (Array.isArray(registry.research_topics)) return registry.research_topics;
  throw new Error("topic-registry.json must be an array or contain topics/items/research_topics array");
}

function topicId(topic, index) {
  return String(topic.id ?? topic.topic_id ?? topic.slug ?? topic.key ?? `topic-${index + 1}`).trim();
}

function topicFileFor(topic, id) {
  const explicit = topic.topic_file ?? topic.topicFile ?? topic.file ?? topic.path ?? topic.topic_path;
  if (explicit) return String(explicit).replaceAll("\\\\", "/");
  return path.posix.join(TOPIC_DIR, `${id}.md`);
}

function memoFileFor(topic, id) {
  const explicit = topic.memo_file ?? topic.memoFile ?? topic.memo_path ?? topic.memoPath;
  if (explicit) return String(explicit).replaceAll("\\\\", "/");
  return path.posix.join(MEMO_DIR, `agent-opportunity-${id}.md`);
}

function validateTopicFile(relativePath, id, warnings) {
  if (!pathExists(relativePath)) return;
  const text = readText(relativePath);
  if (!/^#\s+/m.test(text)) {
    warnings.push(`${relativePath}: missing markdown H1 title`);
  }
  if (!text.toLowerCase().includes(id.toLowerCase())) {
    warnings.push(`${relativePath}: does not mention topic id '${id}'`);
  }
}

function validateMemoFile(relativePath, id, warnings) {
  if (!pathExists(relativePath)) return;
  const text = readText(relativePath);
  const lower = text.toLowerCase();
  const requiredSignals = ["priority", "recommendation", "mvp", "risk", "source"];
  for (const signal of requiredSignals) {
    if (!lower.includes(signal)) warnings.push(`${relativePath}: missing memo signal '${signal}'`);
  }
  if (!lower.includes(id.toLowerCase())) {
    warnings.push(`${relativePath}: does not mention topic id '${id}'`);
  }
}

function main() {
  const errors = [];
  const warnings = [];
  let registry;

  try {
    registry = readJson(REGISTRY_PATH);
  } catch (error) {
    fail(`${REGISTRY_PATH}: ${error.message}`);
    return;
  }

  let topics;
  try {
    topics = extractTopics(registry);
  } catch (error) {
    fail(`${REGISTRY_PATH}: ${error.message}`);
    return;
  }

  const seenIds = new Set();
  const expectedTopicFiles = new Map();
  const expectedMemoFiles = new Map();

  topics.forEach((topic, index) => {
    const id = topicId(topic, index);
    if (!id || id.startsWith("topic-")) {
      errors.push(`registry item ${index + 1}: missing stable topic id`);
      return;
    }
    if (seenIds.has(id)) {
      errors.push(`duplicate topic id: ${id}`);
    }
    seenIds.add(id);

    const topicFile = topicFileFor(topic, id);
    const memoFile = memoFileFor(topic, id);
    expectedTopicFiles.set(topicFile, id);
    expectedMemoFiles.set(memoFile, id);

    if (!topic.title && !topic.name) warnings.push(`${id}: missing human-readable title/name`);
    if (!topic.priority && !topic.phase) warnings.push(`${id}: missing priority/phase metadata`);

    if (!pathExists(topicFile)) {
      errors.push(`${id}: missing topic file ${topicFile}`);
    } else {
      validateTopicFile(topicFile, id, warnings);
    }

    if (!pathExists(memoFile)) {
      errors.push(`${id}: missing memo file ${memoFile}`);
    } else {
      validateMemoFile(memoFile, id, warnings);
    }
  });

  const actualTopicFiles = listMarkdownFiles(TOPIC_DIR, IGNORED_TOPIC_DOCS);
  const actualMemoFiles = listMarkdownFiles(MEMO_DIR, IGNORED_MEMO_DOCS);

  for (const filePath of actualTopicFiles) {
    if (!expectedTopicFiles.has(filePath)) warnings.push(`orphan topic file not referenced by registry: ${filePath}`);
  }
  for (const filePath of actualMemoFiles) {
    if (!expectedMemoFiles.has(filePath)) warnings.push(`orphan memo file not referenced by registry: ${filePath}`);
  }

  for (const error of errors) console.error(`ERROR ${error}`);
  for (const warning of warnings) console.warn(`WARN ${warning}`);

  if (errors.length > 0) {
    console.error(
      `FAILED registry-to-memo coverage: ${topics.length} topics, ${actualTopicFiles.length} topic files, ${actualMemoFiles.length} memo files, ${errors.length} errors, ${warnings.length} warnings`,
    );
    process.exit(1);
  }

  console.log(
    `OK registry-to-memo coverage: ${topics.length} topics, ${actualTopicFiles.length} topic files, ${actualMemoFiles.length} memo files, 0 errors, ${warnings.length} warnings`,
  );
}

main();

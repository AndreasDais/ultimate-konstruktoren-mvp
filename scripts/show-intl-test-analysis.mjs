#!/usr/bin/env node
/**
 * Show + clipboard-copy the 10-test post-run analysis queries.
 *
 * Reads sources/observability/queries/intl-test-analysis.sql, prints it, and
 * (unless --no-clip) copies it to the Windows clipboard.
 *
 * Same pattern as scripts/show-pipeline-funnel.mjs — no DB connection from
 * Node, just surfaces the queries for Supabase SQL Editor.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const QUERIES_PATH = path.join(
  "sources",
  "observability",
  "queries",
  "intl-test-analysis.sql",
);
const NO_CLIP = process.argv.includes("--no-clip");
const HELP = process.argv.includes("--help") || process.argv.includes("-h");

function usage() {
  return `Usage:
  node scripts/show-intl-test-analysis.mjs [--no-clip]

Prints the contents of ${QUERIES_PATH} and (by default) copies it to the
Windows clipboard so you can paste straight into Supabase SQL Editor.

Companion to sources/observability/queries/intl-test-plan-10.md.

Options:
  --no-clip    Print only; do not touch the clipboard.
  --help, -h   Show this help.
`;
}

function copyToClipboard(content) {
  const result = spawnSync("clip", {
    input: content,
    shell: true,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      message:
        result.error?.message ||
        result.stderr?.trim() ||
        `clip exited with status ${result.status}`,
    };
  }
  return { ok: true, message: "copied" };
}

if (HELP) {
  console.log(usage());
  process.exit(0);
}

if (!fs.existsSync(QUERIES_PATH)) {
  console.error(`FAILED missing queries file: ${QUERIES_PATH}`);
  process.exit(1);
}

const content = fs.readFileSync(QUERIES_PATH, "utf8");
console.log(content);

if (NO_CLIP) {
  console.log("\n# Clipboard: skipped (--no-clip).");
} else {
  const clipResult = copyToClipboard(content);
  if (clipResult.ok) {
    console.log("\n# Clipboard: copied. Paste into Supabase SQL Editor.");
  } else {
    console.log(`\n# Clipboard: skipped (${clipResult.message}).`);
  }
}

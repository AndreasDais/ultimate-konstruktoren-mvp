#!/usr/bin/env node
/**
 * Show + clipboard-copy the PILAR pipeline funnel queries.
 *
 * Reads sources/observability/queries/pipeline-funnel.sql, prints it, and
 * (unless --no-clip) copies it to the Windows clipboard via the same `clip`
 * pattern as scripts/write-pilar-context-packet.mjs.
 *
 * Paste into Supabase SQL Editor and run any of the 5 queries independently.
 *
 * This script does NOT connect to Supabase — it just surfaces the queries.
 * Removing the DB-from-Node failure modes (env vars, network, RLS) keeps the
 * helper trivially safe and trivially debuggable. If you want an automated
 * Node-side runner later, build it on top of this file, not instead of it.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const QUERIES_PATH = path.join("sources", "observability", "queries", "pipeline-funnel.sql");
const NO_CLIP = process.argv.includes("--no-clip");
const HELP = process.argv.includes("--help") || process.argv.includes("-h");

function usage() {
  return `Usage:
  node scripts/show-pipeline-funnel.mjs [--no-clip]

Prints the contents of ${QUERIES_PATH} and (by default) copies it to the
Windows clipboard so you can paste straight into Supabase SQL Editor.

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

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_OUT = "/tmp/pilar-context.md";

const PRESETS = {
  "patch-workflow": [
    "sources/patch-planner/PILAR_SPRINT_PATCH_WORKFLOW.md:1-260",
    "sources/patch-planner/PATCH_PLANNER_RULE_REGISTRY.md:1-240",
    "sources/agent-research/status/README.md:136-152",
    "scripts/write-agent-ecosystem-health-snapshot.mjs:76-94",
  ],
  "patch-planner": [
    "sources/patch-planner/PATCH_PLANNER_RULE_REGISTRY.md:1-260",
    "sources/patch-planner/patch-planner-rules.json:1-260",
    "scripts/validate-patch-planner-rules.mjs:1-340",
    "scripts/write-agent-ecosystem-health-snapshot.mjs:76-94",
  ],
  "agent-health": [
    "scripts/write-agent-ecosystem-health-snapshot.mjs:1-180",
    "sources/agent-research/status/README.md:1-180",
  ],
};

function usage() {
  const presetNames = Object.keys(PRESETS).join(", ");
  return `Usage:
  node scripts/write-pilar-context-packet.mjs [options] <file[:start-end] ...>
  node scripts/write-pilar-context-packet.mjs --preset <name> [--preset <name>]

Options:
  --out <path>       Output file path. Default: ${DEFAULT_OUT}
  --preset <name>   Add a predefined context target set. Presets: ${presetNames}
  --no-clip         Write the context packet but do not copy it to the clipboard.
  --title <text>    Add a title line to the context packet.
  --help            Show this help.

Target examples:
  sources/patch-planner/PILAR_SPRINT_PATCH_WORKFLOW.md
  scripts/write-agent-ecosystem-health-snapshot.mjs:76-94

Notes:
  This is a context-clip helper only. It does not run git status and does not modify repo files.
`;
}

function parseArgs(argv) {
  const options = {
    out: DEFAULT_OUT,
    clip: true,
    title: "PILAR context packet",
    targets: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--out") {
      const value = argv[++i];
      if (!value) throw new Error("Missing value after --out.");
      options.out = value;
      continue;
    }
    if (arg === "--preset") {
      const name = argv[++i];
      if (!name) throw new Error("Missing value after --preset.");
      const preset = PRESETS[name];
      if (!preset) {
        throw new Error(`Unknown preset '${name}'. Available presets: ${Object.keys(PRESETS).join(", ")}.`);
      }
      options.targets.push(...preset);
      continue;
    }
    if (arg === "--no-clip") {
      options.clip = false;
      continue;
    }
    if (arg === "--title") {
      const value = argv[++i];
      if (!value) throw new Error("Missing value after --title.");
      options.title = value;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown option '${arg}'.`);
    }
    options.targets.push(arg);
  }

  if (options.targets.length === 0) {
    throw new Error("No context targets provided. Use --help for examples.");
  }

  return options;
}

function parseTarget(target) {
  const match = target.match(/^(.*?):(\d+)(?:-(\d+))?$/);
  if (!match) {
    return { file: target, start: null, end: null };
  }
  const start = Number.parseInt(match[2], 10);
  const end = match[3] ? Number.parseInt(match[3], 10) : start;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new Error(`Invalid line range in target '${target}'.`);
  }
  return { file: match[1], start, end };
}

function readTarget(target) {
  const parsed = parseTarget(target);
  if (!parsed.file || parsed.file.includes("\0")) {
    throw new Error(`Invalid file path in target '${target}'.`);
  }
  if (!fs.existsSync(parsed.file)) {
    throw new Error(`Target file does not exist: ${parsed.file}`);
  }
  const stat = fs.statSync(parsed.file);
  if (!stat.isFile()) {
    throw new Error(`Target is not a file: ${parsed.file}`);
  }

  const raw = fs.readFileSync(parsed.file, "utf8").replace(/\r\n/g, "\n");
  if (parsed.start === null) {
    return { heading: parsed.file, body: raw };
  }

  const lines = raw.split("\n");
  const selected = lines.slice(parsed.start - 1, parsed.end).join("\n");
  return {
    heading: `${parsed.file}:${parsed.start}-${parsed.end}`,
    body: selected,
  };
}

function buildPacket(options) {
  const now = new Date().toISOString();
  const chunks = [
    `# ${options.title}`,
    "",
    `GeneratedAt: ${now}`,
    "Mode: context-clip",
    "Note: This packet is for patch planning context only. It is not sprint status.",
    "",
  ];

  for (const target of options.targets) {
    const { heading, body } = readTarget(target);
    chunks.push(`===== ${heading} =====`);
    chunks.push(body.trimEnd());
    chunks.push("");
  }

  return `${chunks.join("\n").trimEnd()}\n`;
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
      message: result.error?.message || result.stderr?.trim() || `clip exited with status ${result.status}`,
    };
  }

  return { ok: true, message: "copied" };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const packet = buildPacket(options);
  const outDir = path.dirname(options.out);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(options.out, packet, "utf8");

  let clipMessage = "skipped (--no-clip)";
  if (options.clip) {
    const clipResult = copyToClipboard(packet);
    clipMessage = clipResult.ok ? "copied" : `failed (${clipResult.message})`;
  }

  console.log(`OK context packet written: ${options.out}`);
  console.log(`Bytes: ${Buffer.byteLength(packet, "utf8")}`);
  console.log(`Clipboard: ${clipMessage}`);
  console.log("Status: context-only; git status was not captured or modified");
} catch (error) {
  console.error(`FAILED write-pilar-context-packet: ${error.message}`);
  process.exit(1);
}

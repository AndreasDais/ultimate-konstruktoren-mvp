import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["test"]],
  ["npm", ["run", "lint"]],
  ["npx", ["tsc", "--noEmit", "--pretty", "false"]],
];

let failed = false;

for (const [cmd, args] of steps) {
  console.log(`\n=== ${cmd} ${args.join(" ")} ===`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`\nFAILED: ${cmd} ${args.join(" ")} exited with ${result.status}`);
    break;
  }
}

process.exit(failed ? 1 : 0);

import { defineConfig } from "vitest/config";
import path from "path";

// Eigen config for vitest — rører ikkje next.config.ts.
// Alias "@" speglar tsconfig sin "paths": { "@/*": ["./*"] }.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
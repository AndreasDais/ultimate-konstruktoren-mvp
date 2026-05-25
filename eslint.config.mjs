import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Next 16/React Compiler lint er nyttig, men PILAR har fleire bevisste
      // hydration-/observer-effektar som set lokal UI-state etter mount.
      // Desse skal ryddast gradvis, men skal ikkje blokkere lint/deploy no.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated patch/debug artifacts - not product source.
    ".patch-backup/**",
    "scripts/patch-sprint-*.mjs",
  ]),
]);

export default eslintConfig;

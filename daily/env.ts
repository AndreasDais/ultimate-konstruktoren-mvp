/**
 * Delt .env-lastar for tsx-skript (Fase 1 steg 6b).
 *
 * tsx-skript lastar ikkje .env automatisk (det gjer Next.js). Denne
 * minimale parsaren les baade .env og .env.local i Next.js si presedens-
 * rekkjefoelgje: .env.local vinn ved konflikt. Next-prosjekt held typisk
 * hemmelege variablar (Supabase-noeklar) i .env.local.
 *
 * Delt mellom test-agenten og den daglege agenten so env-lastinga er
 * éin stad — same bug kan ikkje oppstaa to stader.
 */
import { readFileSync } from "node:fs";

function loadEnvFile(path: string): void {
  try {
    const txt = readFileSync(path, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      // Set ikkje noeklar som alt finst — fyrste lesar vinn.
      if (!m || process.env[m[1]] !== undefined) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  } catch {
    // Fila er valfri — variablane kan vere sette i miljoeet alt.
  }
}

/**
 * Lastar miljoevariablar fraa .env.local og .env. .env.local lesast
 * foerst so verdiane der vinn (loadEnvFile set ikkje noeklar som alt
 * finst). Trygt aa kalle fleire gonger.
 */
export function loadEnv(): void {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

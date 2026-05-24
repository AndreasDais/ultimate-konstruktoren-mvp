/**
 * Dagleg sjølvforbetrings-agent — runnar (QA-spec kap. 9, Fase 1 steg 6b).
 *
 * Les eitt doegn med live-RunRecords + shadow_checks, kallar signal-
 * aggregatoren (daily/aggregate), og skriv ein DailyReport til
 * daily/reports/<dato>.json.
 *
 * Køyr:  npm run daily:report
 *        npm run daily:report -- --date 2026-05-23
 *        npm run daily:report -- --baseline daily/reports/2026-05-22.json
 *
 * Krev: Supabase med runrecord-VIEW + shadow_checks (steg 1c + 5 SQL
 * køyrd), og .env(.local) med Supabase-nøklar. Sjå daily/README.md.
 *
 * HARD GRENSE (QA-spec 9.1): rapporten ber signal, ikkje korrektheit.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadEnv } from "@/daily/env";
import { fetchLiveRunRecords, fetchShadowChecks } from "@/daily/fetch";
import { byggDailyReport } from "@/daily/aggregate";
import type { DailyReport, Baseline } from "@/daily/types";

// --- argument ---------------------------------------------------------

function parseArguments() {
  const { values } = parseArgs({
    options: {
      date: { type: "string" },
      baseline: { type: "string" },
    },
    allowPositionals: false,
  });
  // Standard: i går (eit fullført døgn). --date overstyrer.
  let dato: Date;
  if (values.date) {
    dato = new Date(`${values.date}T00:00:00.000Z`);
    if (Number.isNaN(dato.getTime())) {
      console.error(`Ugyldig --date "${values.date}". Bruk YYYY-MM-DD.`);
      process.exit(2);
    }
  } else {
    dato = new Date();
    dato.setUTCDate(dato.getUTCDate() - 1);
    dato.setUTCHours(0, 0, 0, 0);
  }
  return { dato, baselinePath: values.baseline ?? null };
}

/** Les signal_summary frå ein tidlegare DailyReport som baseline. */
function lesBaseline(path: string | null): Baseline {
  if (!path) return null;
  try {
    const rapport = JSON.parse(readFileSync(path, "utf8")) as DailyReport;
    return rapport.signal_summary ?? null;
  } catch (err) {
    const melding = err instanceof Error ? err.message : String(err);
    console.warn(
      `Klarte ikkje lese baseline frå ${path} (${melding}) — ` +
        `køyrer utan baseline.`,
    );
    return null;
  }
}

// --- hovudløp ---------------------------------------------------------

async function main(): Promise<void> {
  loadEnv();
  const { dato, baselinePath } = parseArguments();

  // Døgn-vindauget [dato, dato + 1 dag).
  const fraa = new Date(dato);
  const til = new Date(dato);
  til.setUTCDate(til.getUTCDate() + 1);
  const datoStr = fraa.toISOString().slice(0, 10);

  console.log(`\nDagleg agent — signal for ${datoStr}\n`);

  const runs = await fetchLiveRunRecords(fraa, til);
  const shadowChecks = await fetchShadowChecks(fraa, til);
  const baseline = lesBaseline(baselinePath);

  const report = byggDailyReport(datoStr, runs, shadowChecks, baseline);

  // --- skriv rapport --------------------------------------------------
  mkdirSync("daily/reports", { recursive: true });
  const filnamn = `daily/reports/${datoStr}.json`;
  writeFileSync(filnamn, JSON.stringify(report, null, 2), "utf8");

  // --- samandrag ------------------------------------------------------
  console.log(`  Køyringar (live):     ${report.n_runs}`);
  const vf = report.signal_summary.verdikt_fordeling;
  console.log(
    `  Verdikt-fordeling:    ${
      Object.entries(vf)
        .map(([k, n]) => `${k}=${n}`)
        .join(", ") || "(ingen)"
    }`,
  );
  console.log(
    `  Samanliknar-usemje:   ${(
      report.signal_summary.samanliknar_usemje_rate * 100
    ).toFixed(1)} %`,
  );
  console.log(
    `  Shadow-check-treff:   ${(
      report.signal_summary.shadow_check_treff_rate * 100
    ).toFixed(1)} %`,
  );

  if (report.anomaliar.length > 0) {
    console.log(`\n  ⚠ ANOMALIAR (${report.anomaliar.length}):`);
    for (const a of report.anomaliar) {
      console.log(
        `    [${a.alvor}] ${a.signal}: ${a.i_dag} mot baseline ${a.baseline}`,
      );
    }
  }

  if (report.mistenkte_farleg_feil.length > 0) {
    console.log(
      `\n  ⚠ MISTENKTE FARLEGE FEIL (${report.mistenkte_farleg_feil.length}):`,
    );
    for (const m of report.mistenkte_farleg_feil) {
      console.log(
        `    run ${m.run_id} — ${m.shadow_check_id}: ` +
          `konstruktør ${m.agent} gav ${m.got}, sjekken rekna ${m.expected}`,
      );
    }
  }

  console.log(`\n  Rapport: ${filnamn}\n`);
  // Den daglege agenten er overvaking, ikkje ein gate — alltid exit 0.
  process.exit(0);
}

main().catch((err) => {
  console.error("Dagleg agent kræsja:", err);
  process.exit(2);
});

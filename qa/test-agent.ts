/**
 * Test-agent — orkestrator, Modus A (QA-spec 8.1 + 8.4, Fase 1 steg 4b).
 *
 * Køyrer golden-settet gjennom den levande pipelinen, kode-graderar kvar
 * køyring (qa/grade), aggregerer til ein TestReport, og fungerer som
 * CI-gate: exitkode != 0 om Port 1 eller Port 2 fell.
 *
 * Køyr:  npm run test:golden
 *        npm run test:golden -- --case A1 --runs 3 --base http://localhost:3000
 *
 * Krev: køyrande Pilar-server, ANTHROPIC_API_KEY (server-side), og
 * Supabase med runrecord-VIEW-en (steg 1b + 1c SQL køyrd). Sjå qa/README.md.
 *
 * Køyrast via tsx (npm-scriptet) — derfor .ts, ikkje .mjs: då gjenbrukar
 * vi graderaren og typane direkte, og tsc type-sjekkar fila.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { GOLDEN_CASES, type GoldenCase } from "@/golden/golden-set";
import { FINDINGS } from "@/funn/funn-register";
import { runGoldenCase, type Locale } from "@/qa/run-pipeline";
import { fetchRunRecord } from "@/qa/fetch-runrecord";
import { gradeRun, aggregateCase, vurderPortar } from "@/qa/grade";
import type {
  CaseRunVerdict,
  CaseAggregate,
  TestReport,
  FunnObservasjon,
} from "@/qa/types";

// --- .env-lasting -----------------------------------------------------
// tsx-skript lastar ikkje .env automatisk (det gjer Next.js). Minimal
// parser — ingen dotenv-avhengig. Set ikkje variablar som alt finst.
//
// Les baade .env og .env.local, i Next.js si presedens-rekkjefoelgje:
// .env foerst, deretter .env.local (som overstyrer). Next-prosjekt held
// typisk hemmelege variablar i .env.local.

function loadEnvFile(path: string): void {
  try {
    const txt = readFileSync(path, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
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

function loadEnv(): void {
  // .env.local sist: dersom same noekkel finst begge stader, skal
  // .local-verdien vinne. loadEnvFile set ikkje noeklar som alt finst,
  // saa .local maa lesast foer .env for aa faa presedens.
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

// --- argument ---------------------------------------------------------

function parseArguments() {
  const { values } = parseArgs({
    options: {
      case: { type: "string" },
      runs: { type: "string" },
      base: { type: "string" },
      locale: { type: "string" },
    },
    allowPositionals: false,
  });
  return {
    caseFilter: values.case ?? null,
    runs: values.runs ? Math.max(1, parseInt(values.runs, 10)) : 5,
    base: values.base ?? "http://localhost:3000",
    locale: (values.locale === "nb" ? "nb" : "nn") as Locale,
  };
}

// --- éin køyring ------------------------------------------------------

/** Køyrer eitt golden-case éin gong og graderer. Feil -> KLASSIFISERINGSFEIL. */
async function koyrEinGong(
  base: string,
  golden: GoldenCase,
  locale: Locale,
): Promise<CaseRunVerdict> {
  try {
    const utfall = await runGoldenCase(base, golden, locale);

    if (utfall.kind === "tolkar-only") {
      return gradeRun(utfall.runRecord, golden);
    }

    const runRecord = await fetchRunRecord(utfall.runId);
    if (!runRecord) {
      return {
        case_id: golden.id,
        run_id: utfall.runId,
        rubrikk: "KLASSIFISERINGSFEIL",
        faktisk_status: null,
        status_ok: false,
        avvik_pct: null,
        innanfor_toleranse: null,
        verdikt: null,
        utloyste_detektorar: [],
        grunngiving:
          `Pipelinen fullførte, men runrecord-VIEW-en gav inga rad ` +
          `for ${utfall.runId}. Er steg 1c-SQL køyrd?`,
      };
    }
    return gradeRun(runRecord, golden);
  } catch (err) {
    const melding = err instanceof Error ? err.message : String(err);
    return {
      case_id: golden.id,
      run_id: "(pipeline-feil)",
      rubrikk: "KLASSIFISERINGSFEIL",
      faktisk_status: null,
      status_ok: false,
      avvik_pct: null,
      innanfor_toleranse: null,
      verdikt: null,
      utloyste_detektorar: [],
      grunngiving: `Pipeline-feil: ${melding}`,
    };
  }
}

// --- funn-observasjonar ----------------------------------------------

/**
 * Tel kor mange køyringar kvar detektor vart utløyst i. Eit funn merkt
 * "fiksa" i registeret som no blir observert = regresjon.
 */
function byggFunnObservasjonar(
  alleVerdikt: CaseRunVerdict[],
): FunnObservasjon[] {
  const tellingar = new Map<string, number>();
  for (const v of alleVerdikt) {
    for (const d of v.utloyste_detektorar) {
      tellingar.set(d.funn_id, (tellingar.get(d.funn_id) ?? 0) + 1);
    }
  }
  return FINDINGS.filter((f) => f.detector !== null).map((f) => {
    const count = tellingar.get(f.id) ?? 0;
    const observert = count > 0;
    const delta: FunnObservasjon["delta"] =
      observert && f.status === "fiksa" ? "regressert" : "uendra";
    return {
      id: f.id,
      registrert_status: f.status,
      delta,
      count,
    };
  });
}

// --- hovudløp ---------------------------------------------------------

async function main(): Promise<void> {
  loadEnv();
  const { caseFilter, runs, base, locale } = parseArguments();

  const cases = caseFilter
    ? GOLDEN_CASES.filter((c) => c.id === caseFilter)
    : GOLDEN_CASES;

  if (cases.length === 0) {
    console.error(`Ingen golden-case matcha "${caseFilter}".`);
    process.exit(2);
  }

  console.log(
    `\nTest-agent Modus A — ${cases.length} case x ${runs} køyringar ` +
      `mot ${base} (locale=${locale})\n`,
  );

  const aggregat: CaseAggregate[] = [];
  const alleVerdikt: CaseRunVerdict[] = [];

  for (const golden of cases) {
    process.stdout.write(`  ${golden.id} `);
    const verdikt: CaseRunVerdict[] = [];
    for (let i = 0; i < runs; i++) {
      const v = await koyrEinGong(base, golden, locale);
      verdikt.push(v);
      alleVerdikt.push(v);
      process.stdout.write(
        v.rubrikk === "KORREKT"
          ? "."
          : v.rubrikk === "FARLEG_FEIL"
            ? "X"
            : "!",
      );
    }
    const agg = aggregateCase(golden.id, verdikt);
    aggregat.push(agg);
    console.log(
      `  ${agg.korrekt_av_n}/${agg.runs_total} ` +
        `${agg.bestatt ? "BESTÅTT" : `(verst: ${agg.verdikt_verst})`}`,
    );
  }

  // --- aggreger til TestReport ---------------------------------------
  const portar = vurderPortar(aggregat);
  const tally = { korrekt: 0, trygt_feil: 0, farleg_feil: 0, klassifiseringsfeil: 0 };
  for (const v of alleVerdikt) {
    if (v.rubrikk === "KORREKT") tally.korrekt++;
    else if (v.rubrikk === "TRYGT_FEIL") tally.trygt_feil++;
    else if (v.rubrikk === "FARLEG_FEIL") tally.farleg_feil++;
    else tally.klassifiseringsfeil++;
  }

  const ts = new Date().toISOString();
  const report: TestReport = {
    report_id: `modus-a-${ts}`,
    ts,
    pipeline_build: process.env.PIPELINE_BUILD ?? "ukjend",
    mode: "A",
    runs_per_case: runs,
    rubric_tally: tally,
    port1_pct: portar.port1_pct,
    port1_pass: portar.port1_pass,
    port2_count: portar.port2_count,
    port2_pass: portar.port2_pass,
    per_case: aggregat,
    findings_observed: byggFunnObservasjonar(alleVerdikt),
  };

  // --- skriv rapport --------------------------------------------------
  mkdirSync("qa/reports", { recursive: true });
  const filnamn = `qa/reports/${ts.replace(/[:.]/g, "-")}.json`;
  writeFileSync(filnamn, JSON.stringify(report, null, 2), "utf8");

  // --- samandrag ------------------------------------------------------
  console.log(
    `\n  Port 1 (fagleg): ${portar.port1_pct.toFixed(1)} % bestått — ` +
      `${portar.port1_pass ? "GREIDD" : "IKKJE GREIDD"}`,
  );
  console.log(
    `  Port 2 (tryggleik): ${portar.port2_count} farlege feil — ` +
      `${portar.port2_pass ? "GREIDD" : "IKKJE GREIDD"}`,
  );
  console.log(`  Rapport: ${filnamn}\n`);

  const regresjonar = report.findings_observed.filter(
    (f) => f.delta === "regressert",
  );
  if (regresjonar.length > 0) {
    console.log(
      `  ⚠ REGRESJON: ${regresjonar.map((f) => f.id).join(", ")} ` +
        `(fiksa funn observert på nytt)\n`,
    );
  }

  // --- CI-gate --------------------------------------------------------
  const greidd = portar.port1_pass && portar.port2_pass;
  process.exit(greidd ? 0 : 1);
}

main().catch((err) => {
  console.error("Test-agent kræsja:", err);
  process.exit(2);
});

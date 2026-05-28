#!/usr/bin/env node
/**
 * Standalone runner for the 10 international test scenarios from
 * sources/observability/queries/intl-test-plan-10.md.
 *
 * Mirrors qa/run-pipeline.ts (Tolkar → init-run → A+B → C → D → E via HTTP)
 * but adds engineering_context so the intl-mode preamble (sprint 65.9),
 * NA-context override (sprint 65.11), and unit-aware comparator (sprint B)
 * are exercised.
 *
 * Cost note: each scenario fires ~6 LLM calls. Default behaviour is
 * --dry-run — prints what would be sent without burning tokens. Pass
 * --execute to actually run.
 *
 * Usage:
 *   node scripts/run-intl-tests.mjs                  # dry-run, lists all 10
 *   node scripts/run-intl-tests.mjs --execute        # run all 10 sequentially
 *   node scripts/run-intl-tests.mjs --case 7 --execute  # run only test 7
 *   node scripts/run-intl-tests.mjs --base http://localhost:3001 --execute
 *
 * Output: /tmp/intl-test-run-<timestamp>.json with per-test run_id + outcome.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// ---------- engineering_context builders --------------------------------
// Hardcoded per-profile shapes that mirror what lib/engineering-context/
// profiles.ts buildEngineeringContext produces. Kept inline to avoid
// .ts import resolution from a .mjs script.

function ctxUkNa() {
  return {
    language: "en",
    languagePolicy: {
      uiLocale: "en",
      outputMode: "match_user_prompt",
      fallbackLanguage: "en",
    },
    region: { countryCode: "GB", countryName: "United Kingdom" },
    standards: {
      family: "eurocode_uk_na",
      label: "Eurocode + UK National Annex",
      supportLevel: "experimental",
      confidence: "user_selected",
    },
    outputPreferences: { units: "metric", notationStyle: "eurocode" },
    safety: {
      professionalVerificationRequired: true,
      allowUnsupportedStandardClaims: false,
    },
  };
}

function ctxAisc() {
  return {
    language: "en",
    languagePolicy: {
      uiLocale: "en",
      outputMode: "match_user_prompt",
      fallbackLanguage: "en",
    },
    region: { countryCode: "US", countryName: "United States" },
    standards: {
      family: "aisc_asce_aci",
      label: "AISC / ASCE / ACI",
      supportLevel: "experimental",
      confidence: "user_selected",
    },
    outputPreferences: { units: "imperial", notationStyle: "us_customary" },
    safety: {
      professionalVerificationRequired: true,
      allowUnsupportedStandardClaims: false,
    },
  };
}

function ctxEurocodeGeneral() {
  return {
    language: "en",
    languagePolicy: {
      uiLocale: "en",
      outputMode: "match_user_prompt",
      fallbackLanguage: "en",
    },
    region: { countryCode: "EU", countryName: "European Union (generic)" },
    standards: {
      family: "eurocode_general",
      label: "Eurocode (generic, no national annex)",
      supportLevel: "partial",
      confidence: "user_selected",
    },
    outputPreferences: { units: "metric", notationStyle: "eurocode" },
    safety: {
      professionalVerificationRequired: true,
      allowUnsupportedStandardClaims: false,
    },
  };
}

function ctxCanadian() {
  return {
    language: "en",
    languagePolicy: {
      uiLocale: "en",
      outputMode: "match_user_prompt",
      fallbackLanguage: "en",
    },
    region: { countryCode: "CA", countryName: "Canada" },
    standards: {
      family: "canada",
      label: "Canadian standards (CSA)",
      supportLevel: "experimental",
      confidence: "user_selected",
    },
    outputPreferences: { units: "metric", notationStyle: "metric_general" },
    safety: {
      professionalVerificationRequired: true,
      allowUnsupportedStandardClaims: false,
    },
  };
}

// ---------- 10 scenarios ------------------------------------------------

const SCENARIOS = [
  {
    n: 1,
    title: "UK NA happy path (steel beam)",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxUkNa(),
    text: "Check a simply supported steel beam, 305x165x40 UB, S355. Span 6.0 m, characteristic g_k = 12 kN/m, q_k = 18 kN/m. Calculate M_Ed, V_Ed, and verify bending and shear capacity.",
  },
  {
    n: 2,
    title: "AISC simple beam (US imperial)",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxAisc(),
    text: "Evaluate a simply supported W12x26 steel beam, ASTM A992. Span 20 ft, Lb = 20 ft. Dead 0.45 kip/ft, live 0.80 kip/ft. Use ASCE 7 LRFD. Calculate factored moment and shear; check bending preliminarily.",
  },
  {
    n: 3,
    title: "Missing data UK NA (Tolkar guardrail)",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxUkNa(),
    text: "I have a steel beam in the UK. Span 7.2 m, distributed design load 18 kN/m. I haven't specified the profile, steel grade, or lateral restraint. Can you say if it passes?",
  },
  {
    n: 4,
    title: "AISC capacity without section properties (hallucination guard)",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxAisc(),
    text: "Check final AISC bending capacity for a W18x35 beam, ASTM A992, Lb = 28 ft. I have NOT given Zx, Sx, J, Cw, rts, Lp, or Lr. Tell me if it passes.",
  },
  {
    n: 5,
    title: "French user on UK NA (language mirror)",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxUkNa(),
    text: "Je verifie une poutre en acier S275, profile 254x146x31 UB, portee 5 m, charge permanente g_k = 8 kN/m, charge variable q_k = 12 kN/m. Annexe nationale UK. Calculez M_Ed et la capacite en flexion.",
  },
  {
    n: 6,
    title: "German user on generic Eurocode",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxEurocodeGeneral(),
    text: "Ich pruefe einen einfach gelagerten Stahltraeger HE 200 A, S235. Spannweite 8 m, staendige Last g_k = 5 kN/m, veraenderliche Last q_k = 10 kN/m. Berechnen Sie M_Ed und V_Ed nach Eurocode.",
  },
  {
    n: 7,
    title: "A/B disagreement (load combination ambiguity)",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxUkNa(),
    text: "Check a steel beam, S355, profile 305x165x40 UB, span 6 m. Permanent g_k = 8 kN/m, snow s_k = 4 kN/m. Calculate M_Ed using EC1 6.10 or 6.10a/b -- show which you chose and why.",
  },
  {
    n: 8,
    title: "Irrelevant input (Tolkar guardrail)",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxUkNa(),
    text: "I'm planning a birthday party for my dog. Can you also design a wedding cake?",
  },
  {
    n: 9,
    title: "Mixed input units (consistency test)",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxUkNa(),
    text: "Verify a 305 mm x 0.165 m x 40 kg/m UB steel beam, S355, span 6000 mm, with g_k = 0.012 N/mm and q_k = 18000 N/m, used in the UK. Calculate moment in Nm.",
  },
  {
    n: 10,
    title: "Canadian experimental profile + concrete",
    locale: "nn",
    displayLanguage: "en",
    engineeringContext: ctxCanadian(),
    text: "Check a concrete slab in Toronto, thickness 200 mm, concrete strength 30 MPa, #15M bars @ 150 mm c/c bottom. Span 4 m, live load 4.8 kPa, dead load 3.6 kPa. Use CSA A23.3.",
  },
];

// ---------- args --------------------------------------------------------

function parseArgs(argv) {
  const args = { execute: false, base: "http://localhost:3000", case: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--execute") args.execute = true;
    else if (a === "--dry-run") args.execute = false;
    else if (a === "--base") args.base = argv[++i];
    else if (a === "--case") args.case = parseInt(argv[++i], 10);
    else if (a === "--help" || a === "-h") {
      console.log(usage());
      process.exit(0);
    }
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/run-intl-tests.mjs                  # dry-run, list scenarios
  node scripts/run-intl-tests.mjs --execute        # run all 10 sequentially
  node scripts/run-intl-tests.mjs --case 7 --execute  # only test 7
  node scripts/run-intl-tests.mjs --base <url> --execute

Companion to sources/observability/queries/intl-test-plan-10.md.
Output: /tmp/intl-test-run-<timestamp>.json with run_id per test.
Cost: ~6 LLM calls per scenario. Full sweep = 60 calls.`;
}

// ---------- pipeline orchestration --------------------------------------

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      `${url} -> HTTP ${res.status}: ${data.error ?? "unknown error"}`,
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const TOLKAR_STOPP = new Set(["uklart", "mangelfull", "relevant_ikkje_stotta", "avvist"]);

async function runScenario(base, s) {
  const start = Date.now();
  const t0 = new Date();
  const log = { n: s.n, title: s.title, started_at: t0.toISOString() };

  try {
    // Step 0: Tolkar
    const tolkar = await postJson(`${base}/api/input-agent`, {
      text: s.text,
      locale: s.locale,
      engineering_context: s.engineeringContext,
    });
    const inputReview = tolkar.result ?? {};
    log.request_id = tolkar.request_id ?? null;
    log.tolkar_status = inputReview.status ?? null;

    if (log.tolkar_status && TOLKAR_STOPP.has(log.tolkar_status)) {
      log.outcome = "TOLKAR_STOP";
      log.elapsed_ms = Date.now() - start;
      return log;
    }
    if (!log.request_id) {
      log.outcome = "ERROR";
      log.error = "Tolkar gave no request_id";
      log.elapsed_ms = Date.now() - start;
      return log;
    }

    // Step 1: init-run (sprint D — sender engineering_context)
    const init = await postJson(`${base}/api/init-run`, {
      request_id: log.request_id,
      calculation_type: inputReview.berekningstype ?? null,
      run_type: "discovery", // mark as test runs, not live
      display_language: s.displayLanguage,
      engineering_context: s.engineeringContext,
    });
    log.run_id = init.run_id;

    // Step 2: A + B parallel
    const agentBody = {
      run_id: log.run_id,
      input_review: inputReview,
      locale: s.locale,
      engineering_context: s.engineeringContext,
    };
    const [a, b] = await Promise.all([
      postJson(`${base}/api/agent-a`, agentBody),
      postJson(`${base}/api/agent-b`, agentBody),
    ]);
    const calcA = a.result ?? {};
    const calcB = b.result ?? {};

    // Step 3: Samanliknar
    const c = await postJson(`${base}/api/agent-c`, {
      run_id: log.run_id,
      agent_a_output: calcA,
      agent_b_output: calcB,
      locale: s.locale,
      engineering_context: s.engineeringContext,
    });
    const comparison = c.result ?? {};

    // Step 4: Kontrollør
    const d = await postJson(`${base}/api/agent-d`, {
      run_id: log.run_id,
      input_review: inputReview,
      agent_a_output: calcA,
      agent_b_output: calcB,
      comparison_result: comparison,
      locale: s.locale,
      engineering_context: s.engineeringContext,
    });
    log.decision_status = d.result?.decision_status ?? null;

    // Step 5: Rapportør (will reach DB)
    await postJson(`${base}/api/agent-e`, {
      run_id: log.run_id,
      locale: s.locale,
      engineering_context: s.engineeringContext,
    });

    log.outcome = "OK";
    log.elapsed_ms = Date.now() - start;
    return log;
  } catch (err) {
    log.outcome = "ERROR";
    log.error = err.message;
    log.error_status = err.status ?? null;
    log.elapsed_ms = Date.now() - start;
    return log;
  }
}

// ---------- main --------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarios = args.case
    ? SCENARIOS.filter((s) => s.n === args.case)
    : SCENARIOS;

  if (scenarios.length === 0) {
    console.error(`No scenario matched --case ${args.case}.`);
    process.exit(2);
  }

  console.log(
    `${args.execute ? "EXECUTE" : "DRY-RUN"} | base=${args.base} | scenarios=${scenarios.length}`,
  );
  console.log("");
  for (const s of scenarios) {
    console.log(
      `[${s.n}] ${s.title}  (profile=${s.engineeringContext.standards.family}, country=${s.engineeringContext.region.countryCode})`,
    );
    if (!args.execute) {
      console.log(`     prompt: ${s.text.slice(0, 100)}...`);
    }
  }
  console.log("");

  if (!args.execute) {
    console.log(
      "Dry-run complete. Pass --execute to actually fire requests against the dev server.",
    );
    console.log("Make sure: dev server is running, Anthropic quota healthy.");
    return;
  }

  console.log(`Starting ${scenarios.length} scenario(s) sequentially...`);
  console.log("");
  const results = [];
  for (const s of scenarios) {
    process.stdout.write(`[${s.n}] ${s.title}  ... `);
    const log = await runScenario(args.base, s);
    results.push(log);
    if (log.outcome === "OK") {
      console.log(
        `OK (run_id=${log.run_id}, decision=${log.decision_status}, ${(log.elapsed_ms / 1000).toFixed(1)}s)`,
      );
    } else if (log.outcome === "TOLKAR_STOP") {
      console.log(
        `TOLKAR_STOP (status=${log.tolkar_status}, request_id=${log.request_id}, ${(log.elapsed_ms / 1000).toFixed(1)}s)`,
      );
    } else {
      console.log(`ERROR: ${log.error}`);
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = `/tmp/intl-test-run-${stamp}.json`;
  try {
    mkdirSync(path.dirname(outPath), { recursive: true });
  } catch {}
  writeFileSync(
    outPath,
    JSON.stringify({ base: args.base, started_at: new Date().toISOString(), results }, null, 2),
  );
  console.log("");
  console.log(`Summary written: ${outPath}`);
  console.log("");
  console.log("Next: run `npm run intl:test:analysis` and paste into Supabase.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

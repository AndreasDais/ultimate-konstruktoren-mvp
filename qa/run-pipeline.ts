/**
 * Test-agent — pipeline-runner (QA-spec 8.1, Fase 1 steg 4b).
 *
 * Køyrer eitt golden-case gjennom den LEVANDE Pilar-pipelinen via HTTP,
 * i nøyaktig den rekkjefølgja app/page.tsx brukar. Alle rutene svarar
 * rein JSON når Accept-headeren ikkje er text/event-stream — så dette er
 * berre fetch + .json() i sekvens.
 *
 * To utfall:
 *  - "run"          — pipelinen køyrde heilt; returnerer run_id (les
 *                     RunRecord via qa/fetch-runrecord).
 *  - "tolkar-only"  — Tolkar gav uklart/mangelfull/relevant_ikkje_stotta;
 *                     pipelinen stoppar her (rett, per A0). Ingen run_id —
 *                     vi byggjer ein syntetisk RunRecord frå Tolkar-svaret.
 *
 * Dette skriptet treff levande tenester og kan ikkje køyrast i isolasjon.
 */
import type { RunRecord } from "@/lib/runrecord";
import type { GoldenCase } from "@/golden/golden-set";

export type Locale = "nb" | "nn";

/** Tolkar-statusar som stoppar pipelinen — inga utrekning skal skje. */
const TOLKAR_STOPP = new Set([
  "uklart",
  "mangelfull",
  "relevant_ikkje_stotta",
]);

export type RunOutcome =
  | { kind: "run"; runId: string }
  | { kind: "tolkar-only"; runRecord: RunRecord };

/** POST JSON og parse svaret. Kastar med kontekst ved ikkje-200. */
async function postJson(
  url: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `${url} -> HTTP ${res.status}: ${
        (data.error as string) ?? "ukjend feil"
      }`,
    );
  }
  return data;
}

/**
 * Mappar Tolkar sitt HTTP-svar (AgentResult, nynorsk-nøklar) til same
 * form som input_reviews-rada — det er den forma runrecord-VIEW-en gjev,
 * og som graderaren + detektorane ventar.
 */
function tolkarTilInputReviewForm(
  result: Record<string, unknown>,
): Record<string, unknown> {
  return {
    input_status: result.status ?? null,
    calculation_type: result.berekningstype ?? null,
    discipline: result.fagomraade ?? null,
    extracted_inputs: result.tolkte_verdiar ?? {},
    missing_inputs: result.manglande_verdiar ?? [],
    can_calculate: result.kan_reknast_no ?? [],
    cannot_calculate: result.kan_ikkje_reknast ?? [],
    assumptions: result.antakingar ?? [],
    interpretation_summary: result.tolkings_oppsummering ?? "",
    confidence: result.konfidens ?? null,
  };
}

/** Syntetisk RunRecord for ei oppgåve som stoppa ved Tolkar. */
function syntetiskRunRecord(
  requestId: string | null,
  tolkarResult: Record<string, unknown>,
): RunRecord {
  return {
    run_id: `tolkar-only:${requestId ?? "ukjend"}`,
    run_type: "golden",
    run_status: "tolkar_stopp",
    calculation_type: null,
    started_at: null,
    completed_at: null,
    request: null,
    tolkar: tolkarTilInputReviewForm(tolkarResult),
    konstruktor_a: null,
    konstruktor_b: null,
    samanliknar: null,
    kontrollor: null,
    rapportor: null,
    steg_metrikkar: [],
  };
}

/**
 * Køyrer eitt golden-case gjennom pipelinen.
 *
 * @param baseUrl  rota til den køyrande Pilar-serveren, t.d.
 *                 http://localhost:3000
 * @param golden   golden-caset
 * @param locale   målform pipelinen skal bruke ("nn" / "nb")
 */
export async function runGoldenCase(
  baseUrl: string,
  golden: GoldenCase,
  locale: Locale,
): Promise<RunOutcome> {
  const base = baseUrl.replace(/\/$/, "");

  // --- Steg 0: Tolkar -------------------------------------------------
  const tolkar = await postJson(`${base}/api/input-agent`, {
    text: golden.input,
    locale,
  });
  const inputReview = (tolkar.result ?? {}) as Record<string, unknown>;
  const requestId = (tolkar.request_id as string | null) ?? null;
  const status = inputReview.status as string | undefined;

  // Tolkar stoppar pipelinen for uklart/mangelfull/relevant_ikkje_stotta.
  if (status && TOLKAR_STOPP.has(status)) {
    return {
      kind: "tolkar-only",
      runRecord: syntetiskRunRecord(requestId, inputReview),
    };
  }

  if (!requestId) {
    throw new Error("Tolkar gav inga request_id — kan ikkje opprette run.");
  }

  // --- Steg 1: init-run ----------------------------------------------
  const init = await postJson(`${base}/api/init-run`, {
    request_id: requestId,
    calculation_type: inputReview.berekningstype ?? null,
    run_type: "golden",
  });
  const runId = init.run_id as string;
  if (!runId) {
    throw new Error("init-run gav ingen run_id.");
  }

  // --- Steg 2: Konstruktør A + B parallelt ---------------------------
  const agentBody = { run_id: runId, input_review: inputReview, locale };
  const [svarA, svarB] = await Promise.all([
    postJson(`${base}/api/agent-a`, agentBody),
    postJson(`${base}/api/agent-b`, agentBody),
  ]);
  const calcA = svarA.result as Record<string, unknown>;
  const calcB = svarB.result as Record<string, unknown>;

  // --- Steg 3: Samanliknar -------------------------------------------
  const svarC = await postJson(`${base}/api/agent-c`, {
    run_id: runId,
    agent_a_output: calcA,
    agent_b_output: calcB,
    locale,
  });
  const comparison = svarC.result as Record<string, unknown>;

  // --- Steg 4: Kontrollør --------------------------------------------
  await postJson(`${base}/api/agent-d`, {
    run_id: runId,
    input_review: inputReview,
    agent_a_output: calcA,
    agent_b_output: calcB,
    comparison_result: comparison,
    locale,
  });

  // --- Steg 5: Rapportør ---------------------------------------------
  await postJson(`${base}/api/agent-e`, { run_id: runId, locale });

  return { kind: "run", runId };
}

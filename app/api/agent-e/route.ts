import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import {
  calculateTillitScore,
  FORMULA_VERSION,
  type TillitBreakdown,
  type ComparisonStatus,
  type ControllerStatus,
} from "@/lib/tillit-score";

import { coerceLocale, type Locale } from "@/lib/locale";
import type { EngineeringContext } from "@/lib/engineering-context";
import { buildAgentSystemPrompt, engineeringContextUserMessageBlock, parseEngineeringContextPayload } from "@/lib/engineering-context/agent";
import { formatAnthropicError } from "@/lib/anthropic-errors";
import { getSupabase } from "@/lib/supabase";
import { PIPELINE_MODEL } from "@/lib/models";
import { recordStepMetric } from "@/lib/step-metrics";
import { recordStepMessage } from "@/lib/step-messages/record-message";
import { insertReportIdempotently } from "@/lib/report/report-save-idempotency";

const PROMPT_VERSION = "agent_e_v0.3";
const MODEL = PIPELINE_MODEL;

const SYSTEM_PROMPT = `<role>
Du er Rapportør for Pilar — eit AI-basert verktøy for norsk byggfagleg praksis.

Rolla di er å skrive prosa-felta i ein berekningsrapport som vert lest av ingeniørar. Du syntetiserer arbeid som allereie er gjort av tidlegare agentar (Tolkar, Konstruktør A og Konstruktør B, Samanliknar, Kontrollør) til lesbar prosa. Du sjølv reknar IKKJE — ingen tal, formlar eller standardreferansar skal stamme frå deg.
</role>

<pipeline_position>
Du er siste ledd i pipelinen før rapport-rendering. Kontrollør har allereie gjort den endelege fagvurderinga (approved / approved_with_warnings / uncertain / rejected). Det er IKKJE di oppgåve å overstyre eller mjuke opp Kontrollør si avgjerd — det er di oppgåve å TRANSMITTERE ho fagleg riktig til lesaren.

Prosaen din vert vist saman med:
- Resultat-tabellar (numerisk data frå Konstruktørane, rendrast frå strukturert output)
- Stegvis utrekning (KaTeX-typesetta formlar frå Konstruktørane)
- Samanliknar-blokk og Kontrollør-avgjerd (rendrast direkte frå DB)

Du treng difor ikkje gjenta tal eller formlar. Skriv prosa som bind det fagleg saman.
</pipeline_position>

<task>
Lever gyldig JSON med tre prosa-felt: executive_summary, technical_assessment, conclusion. Ingen markdown-fences. Ingen tekst før eller etter.
</task>

<verification_first>
FØR du skriv prosaen, tenk gjennom:

1. Kva er Kontrollør si avgjerd? (approved / approved_with_warnings / uncertain / rejected) Den styrer tonen.
2. Kva er hovudresultatet — kva tal eller konklusjon vil ingeniøren ta med seg?
3. Er det kritisk usemje mellom Konstruktør A og Konstruktør B som Samanliknar har fanga opp?
4. Er det åtvaringar eller usikkerheiter som MÅ kome fram i prosaen?
5. Kva språk skreiv brukaren på? Speil det.

Når du har svart, skriv prosaen.
</verification_first>

<output_format>
{
  "executive_summary": "3-5 setningar — sjå field_specifications",
  "technical_assessment": "4-7 setningar — sjå field_specifications",
  "conclusion": "2-4 setningar — sjå field_specifications"
}
</output_format>

<field_specifications>
**executive_summary (3-5 setningar):**
Oppsummer kva oppgåva var og kva som vart funne. Lesaren skal kunne forstå essensen utan å lese resten. Start med kontekst (kva berekninga gjeld), så hovudresultat, så viktigaste åtvaring viss relevant.

GODT: "Berekninga gjeld dimensjonering av strekkarmering i ein enkeltarmert betongbjelke (b = 250 mm, d = 450 mm, C25/30) for eit dimensjonerande bøyemoment M_Ed = 120 kNm. Konstruktør A og Konstruktør B er fullt einige om at nødvendig armeringsareal er A_s,req = 751 mm² og at enkeltarmering er tilstrekkeleg. Kontrollør har godkjent berekninga som førebels grunnlag, og resultatet skal kontrollerast av ansvarleg fagperson før bruk i prosjektering."

DÅRLEG: "Brukaren har spurt om armering i ein betongbjelke. Vi har rekna ut at det trengs 751 mm². Alt ser fint ut. Sjå rapporten for detaljar." (Pratsam, usikker stemme, ikkje fagleg.)

**technical_assessment (4-7 setningar):**
Fagleg tolking av resultata i kontekst. Forklarer KVIFOR resultata ser ut som dei gjer, kva som er kritisk i føresetnadene, korleis ein erfaren ingeniør ville lese tala. IKKJE berre referer kva agentane gjorde — tolke det.

Døme på fagleg tolking: "Utnyttingsgraden på 56 % er moderat — det er god margin før kapasiteten er nådd, utan at tverrsnittet er overdimensjonert." Eller: "At μ_Ed ligg langt under μ_lim betyr at tverrsnittet har god duktilitet og at enkeltarmering er metodisk forsvarleg."

**conclusion (2-4 setningar):**
Praktisk vegvising. Kva skal lesaren gjere vidare? Ikkje overstyr Kontrollør — viss han har gitt "approved_with_warnings", reflekter det. Viss han har gitt "uncertain" eller "rejected", ver tydeleg om at brukaren må kontrollere på nytt eller søke fagperson FØR vidare bruk.
</field_specifications>

<anti_hallucination>
KRITISKE forbod:

- ALDRI inkluder NS-EN- eller EC-paragrafnummer i prosaen din. Konstruktørane har allereie referert dei i sin output — referer generisk til "EC2-metode" eller "etter Eurokode", ikkje spesifikke §-nummer. Du står langt frå utleiinga og kan ikkje verifisere referansane sjølv.
- ALDRI inkluder tal eller resultat som ikkje står eksplisitt i Konstruktør A eller B sitt results-felt eller short_conclusion. Viss du vil nemne eit tal, kopier det eksakt frå upstream — ikkje skriv om frå minnet.
- ALDRI bruk frasar som "berekninga er trygg", "kapasiteten er godkjent for bygging", "resultatet er konservativt for alle scenarier" eller liknande absolutte/normative påstandar. Alt er førebels og krev fagperson-verifikasjon.
- ALDRI finn opp materialdata, koeffisientar eller geometri som ikkje står i upstream-data.
</anti_hallucination>

<faithfulness_to_upstream>
Prosaen din MÅ vere lojal mot upstream-data. Den vanlegaste feilen ein AI-rapportør gjer er å mjuke opp ein streng kontrollør-vurdering. Du skal ikkje gjere det.

KONKRETE KRAV:

1. KONTROLLØR-VERDICT-MAPPING (styrer tonen i conclusion):
   - "approved" → prosaen kan seie "Kontrollør har godkjent berekninga som førebels grunnlag"
   - "approved_with_warnings" → prosaen MÅ seie "godkjent med åtvaringar" eller liknande, og åtvaringane MÅ nemnast i technical_assessment
   - "uncertain" → prosaen MÅ seie "Kontrollør har vurdert resultatet som usikkert" og lesaren MÅ varslast om at vidare arbeid krevst
   - "rejected" → prosaen MÅ seie "Kontrollør har avvist berekninga" — IKKJE softa det opp

2. SAMANLIKNAR-MAPPING (påverkar technical_assessment):
   - "match" eller "minor_differences" → kan seiast at konstruktørane er einige
   - "significant_differences" → MÅ nemne at det er fagleg avvik mellom Konstruktør A og Konstruktør B
   - "critical_disagreement" → MÅ nemne at det er kritisk usemje — dette er hovudbudskapet

3. BLOKKERTE RESULTAT (sjå controller_decision.notes eller liknande):
   Viss Kontrollør har blokkert enkelttall eller delkonklusjonar frå éin av Konstruktørane, presenter ikkje desse blokka verdiane som om dei vart godkjent. Skriv heller "Engineer X sine talverdiar er blokkerte av Kontrollør."

4. KONFIDENS-KONTEKST:
   Viss Konstruktør A eller B har "low" eller "medium" konfidens og Kontrollør likevel godkjent, er det relevant kontekst som kan nemnast i technical_assessment.

5. ÅTVARINGAR:
   Viss det er åtvaringar i Konstruktør- eller Kontrollør-output, må minst dei viktigaste reflekterast — særleg dei som påverkar gyldigheita av resultatet (t.d. "berre gyldig viss bjelken er sideavstiva").
</faithfulness_to_upstream>

<tone_and_voice>
- Skriv som ein ingeniør skriv ein intern memo til ein kollega: fagleg, presis, ikkje pratsam, ikkje overformell.
- Bruk passivform der det passar ("Berekninga er gjort etter EC2", ikkje "Vi har gjort berekninga").
- Tredjeperson for agent-referansar: "Konstruktør A og Konstruktør B har funne...", "Kontrollør har vurdert..." — aldri "vi" eller "eg" eller "Rapportør".
- Speil språket til brukaren, basert på Tolkar si tolkings_oppsummering.
- Unngå corporate-speak og akademisk overformulering. Engineering-stil har konkrete substantiv og aktive verb.
</tone_and_voice>

<rules>
- Du skriv IKKJE tal, formlar eller tabellar — dei rendrast frå strukturert data ved sida av prosaen din.
- Ikkje gjenta lange føresetnadslister — dei rendrast separat.
- Hald deg innanfor lengdeangjevingane (3-5 / 4-7 / 2-4 setningar). Lengre prosa er ikkje meir fagleg — han er meir prateleg.
- Viss upstream-data manglar eit felt du normalt ville referert til, skriv prosa som er gyldig utan det feltet — ikkje finn opp innhald.
</rules>`;


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 5,
});

/**
 * SSE event-formatering. Same format som agent-a/b sine streaming-routes.
 */
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Reknar tillit-score frå oppstrøms-data. Returnerer null viss kritisk data
 * manglar (då vert gauge'n vist som "Ikkje rekna" i UI).
 */
function computeTillitFor(
  inputReview: { can_calculate?: unknown; cannot_calculate?: unknown } | null,
  comparison: { match_status?: string } | null,
  controllerDecision: { decision_status?: string } | null
): TillitBreakdown | null {
  if (!comparison?.match_status) {
    console.warn("[tillit-score] Manglar comparison.match_status");
    return null;
  }
  if (!controllerDecision?.decision_status) {
    console.warn("[tillit-score] Manglar controller_decisions.decision_status");
    return null;
  }

  const kanReknast = Array.isArray(inputReview?.can_calculate)
    ? inputReview!.can_calculate.length
    : 0;
  const kanIkkjeReknast = Array.isArray(inputReview?.cannot_calculate)
    ? inputReview!.cannot_calculate.length
    : 0;
  const spurde = kanReknast + kanIkkjeReknast;

  try {
    return calculateTillitScore({
      comparison_status: comparison.match_status as ComparisonStatus,
      controller_verdict: controllerDecision.decision_status as ControllerStatus,
      rekna_storleikar: kanReknast,
      spurde_storleikar: spurde,
    });
  } catch (err) {
    console.warn("[tillit-score] Klarte ikkje rekne ut tillit-score:", err);
    return null;
  }
}

function isBreakdownStale(breakdown: unknown): boolean {
  if (!breakdown || typeof breakdown !== "object") return true;
  const b = breakdown as { formula_version?: string };
  return b.formula_version !== FORMULA_VERSION;
}

/**
 * Hentar all oppstrøms-data for ein rapport-generering.
 * Brukt i både SSE- og JSON-modus for å unngå duplikasjon.
 */
async function fetchUpstreamData(run_id: string) {
  const supabase = getSupabase();

  const { data: run, error: runError } = await supabase
    .from("calculation_runs")
    .select("*, request:requests(*)")
    .eq("id", run_id)
    .single();

  if (runError || !run) {
    return { error: "Calculation run not found" as const, status: 404 };
  }

  const { data: inputReview } = await supabase
    .from("input_reviews")
    .select("*")
    .eq("request_id", run.request_id)
    .maybeSingle();

  const { data: agentOutputs } = await supabase
    .from("agent_outputs")
    .select("*")
    .eq("run_id", run_id);

  const agentA = agentOutputs?.find((o) => o.agent_name === "agent_a");
  const agentB = agentOutputs?.find((o) => o.agent_name === "agent_b");

  const { data: comparison } = await supabase
    .from("comparisons")
    .select("*")
    .eq("run_id", run_id)
    .maybeSingle();

  const { data: controllerDecision } = await supabase
    .from("controller_decisions")
    .select("*")
    .eq("run_id", run_id)
    .maybeSingle();

  const { data: existing } = await supabase
    .from("reports")
    .select("*")
    .eq("run_id", run_id)
    .maybeSingle();

  return {
    run,
    inputReview,
    agentA,
    agentB,
    comparison,
    controllerDecision,
    existing,
  };
}

/**
 * Sjekkar cache + backfillar tillit-score om naudsynt. Returnerer
 * full FullReportResponse om cache-hit, eller null om vi må generere ny.
 */
async function handleCache(
  existing: Record<string, unknown> | null,
  inputReview: { can_calculate?: unknown; cannot_calculate?: unknown } | null,
  comparison: { match_status?: string } | null,
  controllerDecision: { decision_status?: string } | null,
) {
  if (!existing) return null;

  // Sprint 61.0a — detect-only: cache key ignorerer prompt_version
  // (P1 dokumentert i sources/codebase/PILAR_PIPELINE_DATAFLOW.md). Logg
  // når gammal prosa blir servert, men ikkje endre åtferd: full fiks
  // krev DB-constraint-verifikasjon (61.0b).
  const existingPromptVersion =
    typeof existing.prompt_version === "string" ? existing.prompt_version : null;
  if (existingPromptVersion !== null && existingPromptVersion !== PROMPT_VERSION) {
    const existingRunId =
      typeof existing.run_id === "string" ? existing.run_id : null;
    console.warn(
      `[agent-e] cache: stale prompt_version "${existingPromptVersion}" ` +
        `servert for run ${existingRunId ?? "(ukjent)"} ` +
        `(gjeldande ${PROMPT_VERSION}).`,
    );
    void recordStepMetric({
      runId: existingRunId,
      stepName: "rapportor_cache_stale",
      message: null,
      promptVersion: PROMPT_VERSION,
      latencyMs: 0,
      ok: false,
    });
  }

  const supabase = getSupabase();

  let enrichedReport = existing as { id: string; tillit_score: number | null; tillit_breakdown: unknown };
  const needsRecompute =
    enrichedReport.tillit_score === null ||
    enrichedReport.tillit_score === undefined ||
    isBreakdownStale(enrichedReport.tillit_breakdown);

  if (needsRecompute) {
    const tillit = computeTillitFor(inputReview, comparison, controllerDecision);
    if (tillit) {
      const { data: updated } = await supabase
        .from("reports")
        .update({
          tillit_score: tillit.total,
          tillit_breakdown: tillit,
        })
        .eq("id", enrichedReport.id)
        .select()
        .single();
      if (updated) enrichedReport = updated;
    }
  }

  return enrichedReport;
}

/**
 * Genererer rapport-prosa via Claude. Tek valfri onTextDelta-callback for
 * streaming. Returnerer ferdig parsed objekt eller kastar ein feil.
 */
async function callRapportor(
  run_id: string,
  upstream: {
    run: { request: { raw_text: string } };
    inputReview: unknown;
    agentA: unknown;
    agentB: unknown;
    comparison: unknown;
    controllerDecision: unknown;
  },
  locale: Locale,
  engineeringContext?: EngineeringContext,
  callbacks?: {
    onThinkingStart?: () => void;
    onTextStart?: () => void;
    onTextDelta?: (delta: string) => void;
  },
): Promise<{
  executive_summary: string;
  technical_assessment: string;
  conclusion: string;
}> {
  const userMessage = `${engineeringContextUserMessageBlock(engineeringContext)}Skriv rapport-prosa basert på følgjande arbeid frå tidlegare agentar:

BRUKAR-FORESPURNAD:
${upstream.run.request.raw_text}

TOLKAR SI VURDERING:
${JSON.stringify(upstream.inputReview, null, 2)}

KONSTRUKTØR A SI LØYSING:
${JSON.stringify((upstream.agentA as { structured_output?: unknown } | null)?.structured_output, null, 2)}

KONSTRUKTØR B SI LØYSING:
${JSON.stringify((upstream.agentB as { structured_output?: unknown } | null)?.structured_output, null, 2)}

SAMANLIKNAR SI VURDERING:
${JSON.stringify(upstream.comparison, null, 2)}

KONTROLLØR SI AVGJERD:
${JSON.stringify(upstream.controllerDecision, null, 2)}

Generer JSON med executive_summary, technical_assessment og conclusion. Hugs verification_first og faithfulness_to_upstream.`;

  // Bruk streaming via SDK uansett — gjev oss callbacks for både thinking
  // og text-deltaer. I JSON-modus akkumulerer vi internt; i SSE-modus
  // forwardar vi til klient.
  let fullText = "";
  let thinkingStartedNotified = false;
  let textStartedNotified = false;

  const t0 = Date.now();
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    thinking: {
      type: "enabled",
      budget_tokens: 2000,
    },
    system: [
      {
        type: "text",
        text: buildAgentSystemPrompt(SYSTEM_PROMPT, locale, engineeringContext),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  // Lytt på rå stream-events for å skilje thinking- vs text-fase
  stream.on("streamEvent", (event) => {
    if (event.type === "content_block_start") {
      const blockType = event.content_block?.type;
      if (blockType === "thinking" && !thinkingStartedNotified) {
        thinkingStartedNotified = true;
        callbacks?.onThinkingStart?.();
      } else if (blockType === "text" && !textStartedNotified) {
        textStartedNotified = true;
        callbacks?.onTextStart?.();
      }
    } else if (event.type === "content_block_delta") {
      const delta = event.delta;
      if (delta && delta.type === "text_delta" && "text" in delta) {
        const text = delta.text;
        fullText += text;
        callbacks?.onTextDelta?.(text);
      }
    }
  });

  // Vent til streaming er ferdig og hent final-meldinga
  const finalMessage = await stream.finalMessage();

  await recordStepMetric({
    runId: run_id,
    stepName: "rapportor",
    message: finalMessage,
    promptVersion: PROMPT_VERSION,
    latencyMs: Date.now() - t0,
    ok: finalMessage.stop_reason !== "max_tokens",
  });

  // Sprint 65.4 — full coverage per AGENT_ROUTE_AUDIT.md F5. Soft-fail.
  void recordStepMessage({
    runId: run_id,
    stepName: "rapportor",
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    temperature: null,
    maxTokens: 4000,
    rawMessage: finalMessage as unknown as Parameters<typeof recordStepMessage>[0]["rawMessage"],
  });

  // finalMessage gjev oss alle content-blokker — plukk text-blokken om vi
  // ikkje fekk text gjennom delta-loopen (defensiv)
  if (!fullText) {
    fullText = finalMessage.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");
  }

  const cleaned = fullText.replace(/^```json\s*|\s*```$/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    // Sprint 65.5 — symmetrisk fallback per AGENT_ROUTE_AUDIT.md F6.
    try {
      const repaired = jsonrepair(cleaned);
      const parsed = JSON.parse(repaired);
      console.warn("[agent-e] JSON reparert via jsonrepair fallback", {
        initialErr: initialErr instanceof Error ? initialErr.message : String(initialErr),
      });
      return parsed;
    } catch (parseErr) {
      console.error("[agent-e] JSON.parse feila (også etter jsonrepair):", {
        raw_length: fullText.length,
        initialErr: initialErr instanceof Error ? initialErr.message : String(initialErr),
        parseErr: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      throw new Error("Rapportør returned invalid JSON");
    }
  }
}

export async function POST(request: Request) {
  let locale: Locale = "nb";
  try {
    const body = await request.json();
    const { run_id } = body;
    locale = coerceLocale(body.locale);
    const engineeringContext = parseEngineeringContextPayload(body.engineering_context);

    if (!run_id) {
      return NextResponse.json(
        { error: "run_id is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const acceptHeader = request.headers.get("accept") ?? "";
    const wantsSSE = acceptHeader.includes("text/event-stream");

    // === SSE-MODUS ===
    if (wantsSSE) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let closed = false;
          const send = (event: string, data: unknown) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(sseEvent(event, data)));
            } catch {
              closed = true;
            }
          };

          try {
            const upstream = await fetchUpstreamData(run_id);
            if ("error" in upstream) {
              send("error", { message: upstream.error });
              return;
            }

            // Sjekk cache først — om hit, hopp rett til complete
            const cachedReport = await handleCache(
              upstream.existing,
              upstream.inputReview,
              upstream.comparison,
              upstream.controllerDecision,
            );

            if (cachedReport) {
              send("cached", {});
              send("complete", {
                report: cachedReport,
                cached: true,
                run: upstream.run,
                inputReview: upstream.inputReview,
                agentA: upstream.agentA,
                agentB: upstream.agentB,
                comparison: upstream.comparison,
                controllerDecision: upstream.controllerDecision,
              });
              return;
            }

            // Generer ny via streaming Claude-call
            const parsed = await callRapportor(run_id, upstream, locale, engineeringContext, {
              onThinkingStart: () => send("thinking_start", {}),
              onTextStart: () => send("text_start", {}),
              onTextDelta: (delta) => send("delta", { text: delta }),
            });

            const documentId = `PILAR-${run_id.split("-")[0].toUpperCase()}`;
            const tillit = computeTillitFor(
              upstream.inputReview,
              upstream.comparison,
              upstream.controllerDecision,
            );

            const saveResult = await insertReportIdempotently(supabase, {
              run_id,
              document_id: documentId,
              executive_summary: parsed.executive_summary,
              technical_assessment: parsed.technical_assessment,
              conclusion: parsed.conclusion,
              prompt_version: PROMPT_VERSION,
              tillit_score: tillit?.total ?? null,
              tillit_breakdown: tillit ?? null,
            });

            if (saveResult.error) {
              console.error("Failed to insert report:", saveResult.error);
              send("error", { message: "Failed to save report" });
              return;
            }

            send("complete", {
              report: saveResult.report,
              cached: saveResult.recoveredExisting,
              run: upstream.run,
              inputReview: upstream.inputReview,
              agentA: upstream.agentA,
              agentB: upstream.agentB,
              comparison: upstream.comparison,
              controllerDecision: upstream.controllerDecision,
            });
          } catch (err) {
            const { message } = formatAnthropicError(err, "Rapportør", locale);
            send("error", { message });
          } finally {
            closed = true;
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
          Connection: "keep-alive",
        },
      });
    }

    // === JSON-MODUS (bakoverkompatibel) ===
    const upstream = await fetchUpstreamData(run_id);
    if ("error" in upstream) {
      return NextResponse.json({ error: upstream.error }, { status: upstream.status });
    }

    const cachedReport = await handleCache(
      upstream.existing,
      upstream.inputReview,
      upstream.comparison,
      upstream.controllerDecision,
    );

    if (cachedReport) {
      return NextResponse.json({
        report: cachedReport,
        cached: true,
        run: upstream.run,
        inputReview: upstream.inputReview,
        agentA: upstream.agentA,
        agentB: upstream.agentB,
        comparison: upstream.comparison,
        controllerDecision: upstream.controllerDecision,
      });
    }

    const parsed = await callRapportor(run_id, upstream, locale, engineeringContext);

    const documentId = `PILAR-${run_id.split("-")[0].toUpperCase()}`;
    const tillit = computeTillitFor(
      upstream.inputReview,
      upstream.comparison,
      upstream.controllerDecision,
    );

    const saveResult = await insertReportIdempotently(supabase, {
      run_id,
      document_id: documentId,
      executive_summary: parsed.executive_summary,
      technical_assessment: parsed.technical_assessment,
      conclusion: parsed.conclusion,
      prompt_version: PROMPT_VERSION,
      tillit_score: tillit?.total ?? null,
      tillit_breakdown: tillit ?? null,
    });

    if (saveResult.error) {
      console.error("Failed to insert report:", saveResult.error);
      return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
    }

    return NextResponse.json({
      report: saveResult.report,
      cached: saveResult.recoveredExisting,
      run: upstream.run,
      inputReview: upstream.inputReview,
      agentA: upstream.agentA,
      agentB: upstream.agentB,
      comparison: upstream.comparison,
      controllerDecision: upstream.controllerDecision,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error in Rapportør";
    console.error("Rapportør error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

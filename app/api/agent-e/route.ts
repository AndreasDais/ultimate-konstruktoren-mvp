import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import {
  calculateTillitScore,
  FORMULA_VERSION,
  type TillitBreakdown,
  type ComparisonStatus,
  type ControllerStatus,
} from "@/lib/tillit-score";

const PROMPT_VERSION = "agent_e_v0.3";
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `<role>
Du er Rapportør for Pilar — eit AI-basert verktøy for norsk byggfagleg praksis.

Rolla di er å skrive prosa-felta i ein berekningsrapport som vert lest av ingeniørar. Du syntetiserer arbeid som allereie er gjort av tidlegare agentar (Tolkar, Konstruktør A og B, Samanliknar, Kontrollør) til lesbar prosa. Du sjølv reknar IKKJE — ingen tal, formlar eller standardreferansar skal stamme frå deg.
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
3. Er det kritisk usemje mellom Konstruktør A og B som Samanliknar har fanga opp?
4. Er det åtvaringar eller usikkerheiter som MÅ kome fram i prosaen?
5. Kva språk skreiv brukaren på (nynorsk/bokmål)? Speil det.

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

GOD: "Berekninga gjeld dimensjonering av strekkarmering i ein enkeltarmert betongbjelke (b = 250 mm, d = 450 mm, C25/30) for eit dimensjonerande bøyemoment M_Ed = 120 kNm. Konstruktør A og B er fullt einige om at nødvendig armeringsareal er A_s,req = 751 mm² og at enkeltarmering er tilstrekkeleg. Kontrollør har godkjent berekninga som førebels grunnlag, og resultatet skal kontrollerast av ansvarleg fagperson før bruk i prosjektering."

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
   - "significant_differences" → MÅ nemne at det er fagleg avvik mellom A og B
   - "critical_disagreement" → MÅ nemne at det er kritisk usemje — dette er hovudbudskapet

3. BLOKKERTE RESULTAT (sjå controller_decision.notes eller liknande):
   Viss Kontrollør har blokkert enkelttall eller delkonklusjonar frå éin av Konstruktørane, presenter ikkje desse blokka verdiane som om dei vart godkjent. Skriv heller "Konstruktør X sine talverdiar er blokkerte av Kontrollør."

4. KONFIDENS-KONTEKST:
   Viss Konstruktør A eller B har "low" eller "medium" konfidens og Kontrollør likevel godkjent, er det relevant kontekst som kan nemnast i technical_assessment.

5. ÅTVARINGAR:
   Viss det er åtvaringar i Konstruktør- eller Kontrollør-output, må minst dei viktigaste reflekterast — særleg dei som påverkar gyldigheita av resultatet (t.d. "berre gyldig viss bjelken er sideavstiva").
</faithfulness_to_upstream>

<tone_and_voice>
- Skriv som ein ingeniør skriv ein intern memo til ein kollega: fagleg, presis, ikkje pratsam, ikkje overformell.
- Bruk passivform der det passar ("Berekninga er gjort etter EC2", ikkje "Vi har gjort berekninga").
- Tredjeperson for agent-referansar: "Konstruktør A og B har funne...", "Kontrollør har vurdert..." — aldri "vi" eller "eg" eller "Rapportør".
- Speil språket til brukaren (nynorsk eller bokmål, basert på Tolkar si tolkings_oppsummering).
- Unngå corporate-speak og akademisk overformulering. Engineering-stil har konkrete substantiv og aktive verb.
</tone_and_voice>

<rules>
- Du skriv IKKJE tal, formlar eller tabellar — dei rendrast frå strukturert data ved sida av prosaen din.
- Ikkje gjenta lange føresetnadslister — dei rendrast separat.
- Hald deg innanfor lengdeangjevingane (3-5 / 4-7 / 2-4 setningar). Lengre prosa er ikkje meir fagleg — han er meir prateleg.
- Viss upstream-data manglar eit felt du normalt ville referert til, skriv prosa som er gyldig utan det feltet — ikkje finn opp innhald.
</rules>`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Reknar tillit-score frå oppstrøms-data. Returnerer null viss kritisk data
 * manglar (då vert gauge'n vist som "Ikkje rekna" i UI).
 *
 * Best-effort: feilar aldri request-en, berre loggar warning og returnerer null.
 *
 * MERK: input_reviews-tabellen brukar engelske kolonnenamn (can_calculate,
 * cannot_calculate) sjølv om JSON-felta frå Tolkar er nynorsk (kan_reknast_no,
 * kan_ikkje_reknast). Input-agenten mappar over ved INSERT. Vi les frå DB,
 * så vi brukar dei engelske namna her.
 */
function computeTillitFor(
  inputReview: { can_calculate?: unknown; cannot_calculate?: unknown } | null,
  comparison: { match_status?: string } | null,
  controllerDecision: { decision_status?: string } | null
): TillitBreakdown | null {
  if (!comparison?.match_status) {
    console.warn(
      "[tillit-score] Manglar comparison.match_status — kan ikkje rekne A/B-semje"
    );
    return null;
  }
  if (!controllerDecision?.decision_status) {
    console.warn(
      "[tillit-score] Manglar controller_decisions.decision_status — kan ikkje rekne kontrollør-verdict"
    );
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

/**
 * Avgjer om eit lagra breakdown er foreldra og må re-reknast.
 * Returnerer true viss formula_version manglar eller ikkje matchar gjeldande.
 */
function isBreakdownStale(breakdown: unknown): boolean {
  if (!breakdown || typeof breakdown !== "object") return true;
  const b = breakdown as { formula_version?: string };
  return b.formula_version !== FORMULA_VERSION;
}

export async function POST(request: Request) {
  try {
    const { run_id } = await request.json();

    if (!run_id) {
      return NextResponse.json(
        { error: "run_id is required" },
        { status: 400 }
      );
    }

    // Hent all oppstrøms-data — trengst både til LLM-kontekst og til rapport-rendering
    const { data: run, error: runError } = await supabase
      .from("calculation_runs")
      .select("*, request:requests(*)")
      .eq("id", run_id)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: "Calculation run not found" },
        { status: 404 }
      );
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

    // Sjekk caching for rapport
    const { data: existing } = await supabase
      .from("reports")
      .select("*")
      .eq("run_id", run_id)
      .maybeSingle();

    if (existing) {
      // Lazy backfill / re-utrekning:
      // 1. Viss tillit_score er null (gammal rapport før migrasjon)
      // 2. Viss breakdown sin formula_version ikkje matchar gjeldande (gammal formel)
      let enrichedReport = existing;
      const needsRecompute =
        existing.tillit_score === null ||
        existing.tillit_score === undefined ||
        isBreakdownStale(existing.tillit_breakdown);

      if (needsRecompute) {
        const tillit = computeTillitFor(
          inputReview,
          comparison,
          controllerDecision
        );
        if (tillit) {
          const { data: updated } = await supabase
            .from("reports")
            .update({
              tillit_score: tillit.total,
              tillit_breakdown: tillit,
            })
            .eq("id", existing.id)
            .select()
            .single();
          if (updated) enrichedReport = updated;
        }
      }

      return NextResponse.json({
        report: enrichedReport,
        cached: true,
        run,
        inputReview,
        agentA,
        agentB,
        comparison,
        controllerDecision,
      });
    }

    // Generer ny rapport via LLM
    const userMessage = `Skriv rapport-prosa basert på følgjande arbeid frå tidlegare agentar:

BRUKAR-FORESPURNAD:
${run.request.raw_text}

TOLKAR SI VURDERING:
${JSON.stringify(inputReview, null, 2)}

KONSTRUKTØR A SI LØYSING:
${JSON.stringify(agentA?.structured_output, null, 2)}

KONSTRUKTØR B SI LØYSING:
${JSON.stringify(agentB?.structured_output, null, 2)}

SAMANLIKNAR SI VURDERING:
${JSON.stringify(comparison, null, 2)}

KONTROLLØR SI AVGJERD:
${JSON.stringify(controllerDecision, null, 2)}

Generer JSON med executive_summary, technical_assessment og conclusion. Hugs verification_first og faithfulness_to_upstream.`;

    // Extended thinking enabled — gir Rapportør rom til å vurdere kontrollør-tone
    // og velje rett emfase før han skriv prosa. max_tokens MÅ vere strengt større
    // enn thinking.budget_tokens (4000 > 2000 gjev 2000 tokens til JSON-output,
    // som er rikeleg for 3 prosa-felt).
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      thinking: {
        type: "enabled",
        budget_tokens: 2000,
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText = response.content
  .filter((b) => b.type === "text")
  .map((b) => (b as { text: string }).text)
  .join("\n");

// Strip markdown-fences viss modellen har lagt dei til trass for prompt-instruks
const cleaned = responseText.replace(/^```json\s*|\s*```$/g, "").trim();

let parsed;
try {
  parsed = JSON.parse(cleaned);
} catch (e) {
  console.error("[agent-a] Failed to parse response. Raw text follows:");
  console.error("====== RAW START ======");
  console.error(responseText);
  console.error("====== RAW END ======");
  console.error("Parse error:", e);
  throw new Error("Klarte ikkje parse Konstruktør A sitt svar som JSON");
}

    let parsed: {
      executive_summary: string;
      technical_assessment: string;
      conclusion: string;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Rapportør response. Raw text was:");
      console.error(responseText);
      return NextResponse.json(
        { error: "Rapportør returned invalid JSON" },
        { status: 500 }
      );
    }

    // Generer dokument-ID frå dei første 8 teikna i run_id
    const documentId = `PILAR-${run_id.split("-")[0].toUpperCase()}`;

    // Rekn tillit-score før insert slik at han lagrast saman med rapporten.
    // Best-effort: viss null, rapporten lagrast utan score (kan backfille seinare).
    const tillit = computeTillitFor(inputReview, comparison, controllerDecision);

    const { data: newReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        run_id,
        document_id: documentId,
        executive_summary: parsed.executive_summary,
        technical_assessment: parsed.technical_assessment,
        conclusion: parsed.conclusion,
        prompt_version: PROMPT_VERSION,
        tillit_score: tillit?.total ?? null,
        tillit_breakdown: tillit ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert report:", insertError);
      return NextResponse.json(
        { error: "Failed to save report" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      report: newReport,
      cached: false,
      run,
      inputReview,
      agentA,
      agentB,
      comparison,
      controllerDecision,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error in Rapportør";
    console.error("Rapportør error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
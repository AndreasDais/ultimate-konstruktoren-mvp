import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `Du er Agent A, ein uavhengig løysingsagent for Ultimate Konstruktøren — eit AI-basert verktøy for norsk byggfagleg praksis.

Du tek imot strukturert input frå Input-agenten (som allereie har analysert oppgåva, trekt ut data, og bestemt kva som kan reknast). Oppgåva di er å løyse berekninga stegvis.

Du svarar ALLTID med gyldig JSON, og berre JSON. Ingen markdown-fences. Ingen tekst før eller etter.

Strukturen er:

{
  "short_conclusion": "Hovudresultatet i éi kort setning, t.d. 'M_Ed = 25,0 kNm og V_Ed = 20,0 kN'",
  "assumptions": ["liste over alle føresetnader du brukte"],
  "calculation_steps": [
    {
      "title": "Kort tittel for steget",
      "text": "Forklaring, formel, innsetting og resultat. Bruk \\n for linjeskift inni teksten."
    }
  ],
  "results": {
    "M_Ed": "25,0 kNm",
    "V_Ed": "20,0 kN"
  },
  "limitations": ["kva som ikkje er rekna og kvifor"],
  "warnings": ["eventuelle åtvaringar"],
  "confidence": "high" | "medium" | "low"
}

Reglar:
- Løys berre det som er i "kan reknast no". Hopp over det som er i "kan ikkje reknast" og forklar i limitations.
- Aldri finn opp manglande data. Viss noko manglar, set det i limitations.
- Vis formelen FØR innsettinga. Vis innsettinga FØR resultatet. Ikkje hopp direkte til svar.
- Bruk komma som desimalskiljeteikn i tekst og results-strenger (norsk standard): 25,0 kNm, ikkje 25.0 kNm.
- Bruk SI-einingar konsekvent.
- Skil mellom karakteristiske og dimensjonerande verdiar der det er relevant.
- Speil språkstilen til brukaren (nynorsk eller bokmål).
- Konfidens skal reflektere kor sikker du faktisk er. Sett "low" viss du gjettar.`;

const PROMPT_VERSION = "agent_a_v0.1";

export async function POST(request: Request) {
  try {
    const { request_id, input_review } = await request.json();

    if (!request_id || !input_review) {
      return Response.json(
        { error: "Manglar request_id eller input_review" },
        { status: 400 }
      );
    }

    // === BYGG USER MESSAGE MED KONTEKST ===
    const userMessage = `INPUT-AGENTENS TOLKING:
- Berekningstype: ${input_review.berekningstype ?? "ukjend"}
- Fagområde: ${input_review.fagomraade ?? "ukjend"}
- Tolkte verdiar: ${JSON.stringify(input_review.tolkte_verdiar ?? {})}
- Kan reknast no: ${JSON.stringify(input_review.kan_reknast_no ?? [])}
- Kan ikkje reknast: ${JSON.stringify(input_review.kan_ikkje_reknast ?? [])}
- Antakingar (frå Input-agenten): ${JSON.stringify(input_review.antakingar ?? [])}

Løys oppgåva i samsvar med systeminstruksen din.`;

    // === OPPRETT CALCULATION_RUN (status: running) ===
    let runId: string | null = null;
    let supabase;

    try {
      supabase = getSupabase();
      const { data: runData, error: runError } = await supabase
        .from("calculation_runs")
        .insert({
          request_id,
          run_status: "running",
          calculation_type: input_review.berekningstype,
          agent_package_version: "agents_v0.1",
        })
        .select("id")
        .single();

      if (runError) {
        console.error("Klarte ikkje lagre calculation_run:", runError);
      } else if (runData) {
        runId = runData.id;
      }
    } catch (dbError) {
      console.error("Database-init feil:", dbError);
    }

    // === KALL CLAUDE ===
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    const cleaned = responseText.replace(/^```json\s*|\s*```$/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Marker run som failed
      if (runId && supabase) {
        await supabase
          .from("calculation_runs")
          .update({
            run_status: "failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);
      }
      return Response.json(
        {
          error: "Klarte ikkje parse Agent A sitt svar som JSON",
          raw: responseText,
        },
        { status: 500 }
      );
    }

    // === LAGRE AGENT_OUTPUT OG OPPDATER RUN ===
    if (runId && supabase) {
      try {
        await supabase.from("agent_outputs").insert({
          run_id: runId,
          agent_name: "agent_a",
          prompt_version: PROMPT_VERSION,
          input_payload: input_review,
          output_text: responseText,
          structured_output: parsed,
          confidence: parsed.confidence,
          warnings: parsed.warnings ?? [],
        });

        await supabase
          .from("calculation_runs")
          .update({
            run_status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);
      } catch (dbError) {
        console.error("Klarte ikkje lagre agent output:", dbError);
      }
    }

    return Response.json({ result: parsed, run_id: runId });
  } catch (err) {
    console.error("Agent A error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `Du er Agent B, ein UAVHENGIG KONTROLL-LØYSAR for Ultimate Konstruktøren — eit AI-basert verktøy for norsk byggfagleg praksis.

Det finst ein anna agent (Agent A) som også løyser same oppgåve. Du har IKKJE sett hennar/hans svar. Oppgåva di er å løyse problemet uavhengig.

Der det er meiningsfullt, prøv å bruke alternative formuleringar eller sjekkar — slik at du gir ein reell uavhengig kontroll, ikkje ein ekko av same metoden Agent A truleg vil bruke. Eksempel:
- Viss det finst alternative formelvariantar (t.d. dimensjonsløyst µ-metode vs. direkte kraftlikevekt for armering), kan du velje den andre
- Sjekk dimensjonsanalyse på sluttsvaret om det går an
- Verifiser ved enkle grenseverdi-resonnement der det passar

Men ikkje overdriv: viss problemet er enkelt og det berre finst éin standard metode (t.d. M = qL²/8 for fritt opplagd bjelke med jamt fordelt last), bruk den standard metoden. Poenget er at du tenkjer sjølvstendig, ikkje at du finn opp alternativ unødig.

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
- VIKTIG: short_conclusion skal vise NØYAKTIG dei same tala som results-feltet og calculation_steps. Ikkje tenk på short_conclusion som ein oppsummering du kan formulere fritt — det er hovudresultatet, og må stemme med utrekninga 100 %.
- Bruk komma som desimalskiljeteikn i tekst og results-strenger (norsk standard): 25,0 kNm, ikkje 25.0 kNm.
- Bruk SI-einingar konsekvent.
- Skil mellom karakteristiske og dimensjonerande verdiar der det er relevant.
- Speil språkstilen til brukaren (nynorsk eller bokmål).
- Konfidens skal reflektere kor sikker du faktisk er. Sett "low" viss du gjettar.`;

const PROMPT_VERSION = "agent_b_v0.2";

export async function POST(request: Request) {
  try {
    const { run_id, input_review } = await request.json();

    if (!run_id || !input_review) {
      return Response.json(
        { error: "Manglar run_id eller input_review" },
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

    // === KALL CLAUDE ===
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
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
        const wasTruncated = message.stop_reason === "max_tokens";
        return Response.json(
          {
            error: wasTruncated
              ? "Agent B nådde token-grensa før han fullførte JSON. Aukar max_tokens i route.ts kan hjelpe."
              : "Klarte ikkje parse Agent B sitt svar som JSON",
            raw: responseText,
            stop_reason: message.stop_reason,
          },
          { status: 500 }
        );
    }
    // === LAGRE AGENT_OUTPUT (ingen run-status oppdatering — Agent A gjer det) ===
    let supabase;
    try {
      supabase = getSupabase();
      await supabase.from("agent_outputs").insert({
        run_id,
        agent_name: "agent_b",
        prompt_version: PROMPT_VERSION,
        input_payload: input_review,
        output_text: responseText,
        structured_output: parsed,
        confidence: parsed.confidence,
        warnings: parsed.warnings ?? [],
      });
    } catch (dbError) {
      console.error("Klarte ikkje lagre agent_output for B:", dbError);
    }

    return Response.json({ result: parsed });
  } catch (err) {
    console.error("Agent B error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
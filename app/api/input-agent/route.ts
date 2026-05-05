import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `Du er Input-agenten for Ultimate Konstruktøren, eit AI-basert verktøy for norsk byggfagleg praksis.

Oppgåva di er å lese ein konstruksjonsfagleg forespørsel frå ein brukar og returnere ei strukturert tolking. Du skal IKKJE løyse oppgåva — berre tolke, validere og strukturere.

Du svarar ALLTID med gyldig JSON, og berre JSON. Ingen forklaringar før eller etter. Ingen markdown-fences. Berre rein JSON.

Strukturen er:

{
  "status": "klar" | "delvis_klar" | "mangelfull" | "uklart" | "relevant_ikkje_stotta" | "avvist",
  "berekningstype": "kort namn på kva slags problem dette er, eller null",
  "fagomraade": "stål | betong | last | geoteknikk | osv | null",
  "tolkte_verdiar": { "L": "5,0 m", "q": "8,0 kN/m" },
  "manglande_verdiar": ["liste over data som trengst"],
  "kan_reknast_no": ["MEd", "VEd"],
  "kan_ikkje_reknast": ["kapasitetskontroll"],
  "antakingar": ["q tolka som dimensjonerande last"],
  "tolkings_oppsummering": "1-2 setningar som forklarer kva du har forstått",
  "konfidens": 0.85
}

Reglar:
- Heller stoppe og be om meir info enn å gjette
- Avvis input som ikkje er byggfagleg (status: "avvist")
- Bruk same språkstil som brukaren (nynorsk eller bokmål)
- Konfidens er ditt eige estimat på kor sikker du er på tolkinga (0.0 - 1.0)`;

const PROMPT_VERSION = "input_agent_v0.1";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "Manglar tekst-input" }, { status: 400 });
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
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
      return Response.json(
        { error: "Klarte ikkje parse svaret som JSON", raw: responseText },
        { status: 500 }
      );
    }

    // === LAGRING I SUPABASE ===
    // Vi feiler ikkje brukaren si forespørsel sjølv om logginga skulle krasje.
    let requestId: string | null = null;

    try {
      // Steg 1: Lagre rå brukarinput
      const { data: requestData, error: requestError } = await supabase
        .from("requests")
        .insert({
          raw_text: text,
          input_channel: "text",
          user_mode: "student",
        })
        .select("id")
        .single();

      if (requestError) {
        console.error("Klarte ikkje lagre request:", requestError);
      } else if (requestData) {
        requestId = requestData.id;

        // Steg 2: Lagre input-agentens tolking, knytta til request
        const { error: reviewError } = await supabase
          .from("input_reviews")
          .insert({
            request_id: requestId,
            input_status: parsed.status,
            calculation_type: parsed.berekningstype,
            discipline: parsed.fagomraade,
            extracted_inputs: parsed.tolkte_verdiar,
            missing_inputs: parsed.manglande_verdiar,
            can_calculate: parsed.kan_reknast_no,
            cannot_calculate: parsed.kan_ikkje_reknast,
            assumptions: parsed.antakingar,
            interpretation_summary: parsed.tolkings_oppsummering,
            confidence: parsed.konfidens,
            prompt_version: PROMPT_VERSION,
          });

        if (reviewError) {
          console.error("Klarte ikkje lagre input_review:", reviewError);
        }
      }
    } catch (dbError) {
      console.error("Database-feil:", dbError);
      // Brukaren får framleis svaret sitt
    }

    return Response.json({ result: parsed, request_id: requestId });
  } catch (err) {
    console.error("Input-agent error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
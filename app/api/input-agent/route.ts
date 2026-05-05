import Anthropic from "@anthropic-ai/sdk";

// Systemprompt — det Claude blir "instruert" som før kvar samtale
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

    // Hent ut tekstinnhaldet frå svaret
    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    // Prøv å parse som JSON. Strip evt. markdown-fences viss modellen la dei på.
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

    return Response.json({ result: parsed });
  } catch (err) {
    console.error("Input-agent error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
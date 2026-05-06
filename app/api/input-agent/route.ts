import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";

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

ARBEIDSFLYT — følg i denne rekkefølga:

1. Identifiser kva brukaren spør om (berekningstype, fagomraade)
2. List tolkte_verdiar (alt brukaren har oppgitt) og manglande_verdiar (alt som trengst men ikkje er der)
3. Avgjer KONKRET kva som faktisk kan reknast med oppgitt info — fyll inn kan_reknast_no
4. Vel status BASERT PÅ kan_reknast_no, etter reglane under

STATUS-DEFINISJONAR (gjensidig utelukkande):

- "avvist" — input er ikkje byggfagleg (t.d. bilde av fotball, matlagings-spørsmål)
- "uklart" — for vagt til å forstå kva brukaren spør om
- "relevant_ikkje_stotta" — byggfagleg, men utanfor det vi støttar enno (geoteknikk, brann, dynamikk osv.)
- "klar" — alle nødvendige data oppgitt. kan_reknast_no har innhald, manglande_verdiar er tom
- "delvis_klar" — nokre data manglar, men minst éin meiningsfull berekning kan utførast. KRAV: kan_reknast_no MÅ vere ikkje-tom
- "mangelfull" — relevant byggfagleg input, men ingenting kan reknast trygt utan meir data. KRAV: kan_reknast_no SKAL vere tom array

KRITISK REGEL — delvis_klar vs mangelfull:
Sjekk kan_reknast_no FØR du vel status. Desse to er logisk gjensidig utelukkande:
- delvis_klar betyr "eg kan rekne noko, men ikkje alt"
- mangelfull betyr "eg kan ikkje rekne noko enno, treng meir input"

Viss kan_reknast_no er tom array, er status alltid "mangelfull", aldri "delvis_klar". Punktum.

DØME PÅ KORREKT KLASSIFISERING:

Døme 1 — delvis_klar (lastverknad utan kapasitet):
Input: "Fritt opplagd stålbjelke L=5m, q=8 kN/m. Finn moment og skjær."
→ status: "delvis_klar"
→ kan_reknast_no: ["MEd", "VEd"]
→ manglande_verdiar: ["profil", "stålkvalitet"] (for evt. kapasitetskontroll)
→ Grunngiving: lastverknad krev berre L og q. Det er meiningsfullt sjølv utan profil.

Døme 2 — mangelfull (betongarmering utan material):
Input: "Betongbjelke b=250mm, h=500mm, MEd=120 kNm. Finn nødvendig armering."
→ status: "mangelfull" — IKKJE delvis_klar
→ kan_reknast_no: []
→ manglande_verdiar: ["betongkvalitet", "armeringskvalitet", "overdekning eller effektiv høgde"]
→ Grunngiving: utan materialkvalitetar finst det ingen meiningsfull delberekning. Geometri og moment åleine gir ingenting konkret.

Døme 3 — klar (alt på plass):
Input: "Fritt opplagd IPE 240 S355, L=5m, qEd=8 kN/m. Finn MEd og kapasitetskontroll."
→ status: "klar"
→ kan_reknast_no: ["MEd", "VEd", "Mpl,Rd", "Vpl,Rd", "utnyttingsgrad"]
→ manglande_verdiar: []

ANDRE REGLAR:
- Heller stoppe og be om meir info enn å gjette
- Bruk same språkstil som brukaren (nynorsk eller bokmål)
- Konfidens måler kor sikker du er på TOLKINGA, ikkje om det er nok data. Ein klart formulert mangelfull-forespørsel skal ha høg konfidens.`;

const PROMPT_VERSION = "input_agent_v0.2";

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
      const supabase = getSupabase();

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
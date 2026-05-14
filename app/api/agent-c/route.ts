import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { coerceLocale, wrapPromptWithLocale } from "@/lib/locale";

const SYSTEM_PROMPT = `Du er Samanliknar for Pilar, eit AI-basert verktøy for norsk byggfagleg praksis.

Du tek imot to uavhengige løysingar (frå Konstruktør A og Konstruktør B) som har løyst SAME problem utan å sjå kvarandre sine svar. Oppgåva di er å samanlikne dei og finne alle forskjellar — numerisk, metodisk, og i antakingar.

Du skal IKKJE løyse oppgåva sjølv. Du skal IKKJE seie kven av dei som har "rett" — du skal beskrive forskjellane og klassifisere alvorlegheit.

Du svarar ALLTID med gyldig JSON, og berre JSON. Ingen markdown-fences. Ingen tekst før eller etter.

SJØLVREFERANSE: I summary og andre prosa-felt skal du referere til deg sjølv som "Samanliknar" i tredjeperson eller bruke passivform — aldri "eg". Dei to løysingane skal alltid omtalast som "Konstruktør A" og "Konstruktør B", aldri som "Agent A/B".

I TILLEGG til å samanlikne A vs B, skal du sjekke INTERN KONSISTENS i kvar konstruktør:
- Stemmer short_conclusion med tala i results?
- Stemmer tala i calculation_steps med dei i results?
- Stemmer konklusjonen i short_conclusion med konklusjonen i results-feltet?

Dette er kritisk: ein konstruktør kan ha rett i utrekninga si men hallusinert tal i kort_svaret. Sluttbrukar les kort_svar først — så hallusinasjon der er farlegare enn ein liten avvik i mellomrekninga.

Strukturen er:

{
  "match_status": "match" | "minor_differences" | "significant_differences" | "critical_disagreement",
  "numeric_differences": [
    {
      "field": "navn på feltet, t.d. V_c,Rd",
      "agent_a_value": "515,5 kN",
      "agent_b_value": "477,7 kN",
      "percent_diff": 7.4,
      "severity": "low" | "medium" | "high" | "critical",
      "likely_cause": "Kort forklaring på sannsynleg årsak — bruk 'Konstruktør A' og 'Konstruktør B' i fritekst"
    }
  ],
  "method_differences": ["forskjellar i metode/formelbruk/standardreferanse — bruk 'Konstruktør A' og 'Konstruktør B' når du refererer til dei"],
  "assumption_differences": ["forskjellar i føresetnader brukt — bruk 'Konstruktør A' og 'Konstruktør B' når du refererer til dei"],
  "internal_consistency_issues": {
    "agent_a": [
      {
        "issue": "Konkret beskriving av inkonsistensen",
        "severity": "low" | "medium" | "high" | "critical"
      }
    ],
    "agent_b": []
  },
  "recommended_status": "approved_preliminary" | "uncertain" | "rejected_needs_review",
  "summary": "2-3 setningar fagleg samanlikning som forklarer kva brukaren bør vere merksam på — bruk 'Konstruktør A' og 'Konstruktør B' når du refererer til dei to løysingane"
}

MERK: JSON-nøklane "agent_a_value", "agent_b_value", "internal_consistency_issues.agent_a", "internal_consistency_issues.agent_b" er kode-identifikatorar — desse skal IKKJE endrast. Det er berre fritekst-feltet (method_differences-strenger, assumption_differences-strenger, summary, og likely_cause) som skal bruke "Konstruktør A/B"-terminologi.

Klassifiseringsreglar:

Numeriske forskjellar:
- < 0,5% er "low" (typisk avrunding)
- 0,5% - 5% er "low" til "medium" (rounding eller mindre metodisk val)
- 5% - 15% er "medium" til "high" (truleg metodisk forskjell, krev forklaring)
- > 15% er "critical" (signifikant fagleg uenigheit)

Intern konsistens:
- Forskjell mellom short_conclusion-tal og results-tal er ALLTID minst "high" — det er hallusinasjon
- Forskjell i konklusjon (held vs held ikkje) er ALLTID "critical"

match_status:
- "match": ingen forskjellar > 0,5%, ingen interne inkonsistensar
- "minor_differences": berre lave numeriske forskjellar, kan vere mindre interne issues
- "significant_differences": medium/high numeriske forskjellar ELLER medium/high interne issues
- "critical_disagreement": kritiske numeriske forskjellar ELLER ulike sluttkonklusjonar

recommended_status:
- "approved_preliminary": match eller minor_differences UTAN kritiske inkonsistensar
- "uncertain": significant_differences — bør sjåast på, men kanskje OK
- "rejected_needs_review": critical_disagreement eller alvorlege inkonsistensar

Bruk nynorsk eller bokmål — same språk som Konstruktør A og B brukte.`;

const PROMPT_VERSION = "agent_c_v0.1";

export async function POST(request: Request) {
  try {
    const { run_id, agent_a_output, agent_b_output } = await request.json();

    if (!run_id || !agent_a_output || !agent_b_output) {
      return Response.json(
        { error: "Manglar run_id, agent_a_output, eller agent_b_output" },
        { status: 400 }
      );
    }

    // === BYGG USER MESSAGE ===
    const userMessage = `KONSTRUKTØR A SITT SVAR:
${JSON.stringify(agent_a_output, null, 2)}

KONSTRUKTØR B SITT SVAR:
${JSON.stringify(agent_b_output, null, 2)}

Samanlikne desse to løysingane systematisk i samsvar med systeminstruksen. Sjekk også intern konsistens i kvar konstruktør. Hugs at i alle prosa-felt (method_differences, assumption_differences, summary, likely_cause) skal dei to løysingane omtalast som "Konstruktør A" og "Konstruktør B" — aldri "Agent A/B".`;

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
            ? "Samanliknar nådde token-grensa før han fullførte JSON. Aukar max_tokens kan hjelpe."
            : "Klarte ikkje parse Samanliknar sitt svar som JSON",
          raw: responseText,
          stop_reason: message.stop_reason,
        },
        { status: 500 }
      );
    }

    // === LAGRE COMPARISON ===
    let supabase;
    try {
      supabase = getSupabase();
      await supabase.from("comparisons").insert({
        run_id,
        match_status: parsed.match_status,
        numeric_differences: parsed.numeric_differences ?? [],
        method_differences: parsed.method_differences ?? [],
        assumption_differences: parsed.assumption_differences ?? [],
        internal_consistency_issues: parsed.internal_consistency_issues ?? {},
        recommended_status: parsed.recommended_status,
        summary: parsed.summary,
        prompt_version: PROMPT_VERSION,
      });
    } catch (dbError) {
      console.error("Klarte ikkje lagre comparison:", dbError);
    }

    return Response.json({ result: parsed });
  } catch (err) {
    console.error("Samanliknar error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
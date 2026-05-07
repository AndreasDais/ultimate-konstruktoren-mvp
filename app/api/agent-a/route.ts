import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import {
  extractMentionedProfiles,
  buildProfileDataPromptBlock,
} from "@/lib/profiles/extract";

const SYSTEM_PROMPT = `Du er Agent A, ein uavhengig løysingsagent for Ultimate Konstruktøren — eit AI-basert verktøy for norsk byggfagleg praksis.

Du tek imot strukturert input frå Input-agenten (som allereie har analysert oppgåva, trekt ut data, og bestemt kva som kan reknast). Oppgåva di er å løyse berekninga stegvis.

Du svarar ALLTID med gyldig JSON, og berre JSON. Ingen markdown-fences. Ingen tekst før eller etter.

VIKTIG OM REKKEFØLGE: Du skal generere felta i NØYAKTIG den rekkefølga dei står under. Det betyr: først tenkjer du gjennom føresetnader, så jobbar du deg systematisk gjennom calculation_steps med formel, innsetting og resultat per steg. Deretter samanstiller du results basert på det du nettopp har rekna. Limitations, warnings og confidence kjem etter. ALLER SIST skriv du short_conclusion — og då les du results-feltet du nettopp har laga og kopierer dei eksakte verdiane inn i konklusjonen. short_conclusion er ikkje ein gjetning du formulerer på førehand; det er ein oppsummering av tal som allereie er rekna.

Strukturen er:

{
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
  "confidence": "high" | "medium" | "low",
  "short_conclusion": "Hovudresultatet i éi kort setning. Bruk EKSAKT dei same tala som står i results-feltet ovanfor. Døme: 'M_Ed = 25,0 kNm og V_Ed = 20,0 kN'"
}

Reglar:
- Løys berre det som er i "kan reknast no". Hopp over det som er i "kan ikkje reknast" og forklar i limitations.
- Aldri finn opp manglande data. Viss noko manglar, set det i limitations.
- Vis formelen FØR innsettinga. Vis innsettinga FØR resultatet. Ikkje hopp direkte til svar.
- Bruk komma som desimalskiljeteikn i tekst og results-strenger (norsk standard): 25,0 kNm, ikkje 25.0 kNm.
- Bruk SI-einingar konsekvent.
- Skil mellom karakteristiske og dimensjonerande verdiar der det er relevant.
- Speil språkstilen til brukaren (nynorsk eller bokmål).
- Konfidens skal reflektere kor sikker du faktisk er. Sett "low" viss du gjettar.
- Når meldinga inneheld ei PROFILDATA-blokk øvst med eksakte tverrsnittsverdiar, bruk DESSE verdiane direkte. Ikkje hugs profil-data frå minnet — verdiane i blokka er autoritative.`;

const PROMPT_VERSION = "agent_a_v0.4";

export async function POST(request: Request) {
  try {
    const { run_id, input_review, raw_text } = await request.json();

    if (!run_id || !input_review) {
      return Response.json(
        { error: "Manglar run_id eller input_review" },
        { status: 400 }
      );
    }

    // === PROFIL-DATA INJEKSJON ===
    // Søk gjennom både raw_text (viss tilgjengeleg) og heile input_review.
    // Profilar som blir funne får sine eksakte verdiar injisert i prompten.
    const searchText = `${raw_text ?? ""} ${JSON.stringify(input_review)}`;
    const mentionedProfiles = extractMentionedProfiles(searchText);
    const profileBlock = buildProfileDataPromptBlock(mentionedProfiles);

    if (mentionedProfiles.length > 0) {
      console.log(
        `[agent-a] Injecting ${mentionedProfiles.length} profile(s):`,
        mentionedProfiles.map((p) => p.name).join(", ")
      );
    }

    const userMessage = `${profileBlock}INPUT-AGENTENS TOLKING:
- Berekningstype: ${input_review.berekningstype ?? "ukjend"}
- Fagområde: ${input_review.fagomraade ?? "ukjend"}
- Tolkte verdiar: ${JSON.stringify(input_review.tolkte_verdiar ?? {})}
- Kan reknast no: ${JSON.stringify(input_review.kan_reknast_no ?? [])}
- Kan ikkje reknast: ${JSON.stringify(input_review.kan_ikkje_reknast ?? [])}
- Antakingar (frå Input-agenten): ${JSON.stringify(input_review.antakingar ?? [])}

Løys oppgåva i samsvar med systeminstruksen din.`;

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
            ? "Agent A nådde token-grensa før han fullførte JSON. Aukar max_tokens i route.ts kan hjelpe."
            : "Klarte ikkje parse Agent A sitt svar som JSON",
          raw: responseText,
          stop_reason: message.stop_reason,
        },
        { status: 500 }
      );
    }

    let supabase;
    try {
      supabase = getSupabase();
      await supabase.from("agent_outputs").insert({
        run_id,
        agent_name: "agent_a",
        prompt_version: PROMPT_VERSION,
        input_payload: {
          ...input_review,
          _injected_profiles: mentionedProfiles.map((p) => p.name),
        },
        output_text: responseText,
        structured_output: parsed,
        confidence: parsed.confidence,
        warnings: parsed.warnings ?? [],
      });
    } catch (dbError) {
      console.error("Klarte ikkje lagre agent output for A:", dbError);
    }

    return Response.json({ result: parsed });
  } catch (err) {
    console.error("Agent A error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
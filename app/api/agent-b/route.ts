import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { getSupabase } from "@/lib/supabase";
import {
  extractMentionedProfiles,
  buildProfileDataPromptBlock,
} from "@/lib/profiles/extract";
import { coerceLocale, wrapPromptWithLocale, type Locale } from "@/lib/locale";

const SYSTEM_PROMPT = `<role>
Du er Konstruktør B, ein UAVHENGIG KONTROLL-LØYSAR for Pilar — eit AI-basert verktøy for norsk byggfagleg praksis.

Det finst ein anna konstruktør (Konstruktør A) som også løyser same oppgåve. Du har IKKJE sett hennar/hans svar. Oppgåva di er å løyse problemet uavhengig — og ditt arbeid blir samanlikna mot A si løysing av Samanliknar.

Det er ditt ansvar å levere RIKTIG arbeid. Som uavhengig kontroll er du verdfull berre om du faktisk vurderer fagleg sjølvstendig — ikkje viss du gir same svar som A av tilfeldigheit eller dårleg validering.
</role>

<independence_principle>
Der det er meiningsfullt, prøv å bruke alternative formuleringar eller sjekkar — slik at du gir ein reell uavhengig kontroll, ikkje ein ekko av same metoden Konstruktør A truleg vil bruke.

VALIDE alternativ:
- Annan formelvariant som GIR SAME SVAR (t.d. moment via M=qL²/8 vs via diagram-likevekt)
- Anna metode-rute som er fagleg etablert i Eurokode-kontekst (t.d. µ-metode vs direkte armering-formel)
- Dimensjonsanalyse-sjekk på sluttsvar
- Grenseverdi-resonnement (t.d. samanlikne med enkel handel-formel)

IKKJE valide "alternativ":
- Finne opp nye formuleringar utan fagleg grunnlag
- Bruke metode frå annan standard (t.d. ACI i staden for EC2) — vi held oss til Eurokode + norsk NA
- Endre talverdiar "for å sjå om svaret blir det same"
- Tommelfingerreglar som du ikkje kan utleie (t.d. "Kbal ≈ 0,167" som ikkje stammar frå EC2)

Men ikkje overdriv: viss problemet er enkelt og det berre finst éin standard metode (t.d. M = qL²/8 for fritt opplagd bjelke med jamt fordelt last), bruk den standard metoden. Poenget er å tenke sjølvstendig, ikkje finne opp alternativ unødig.
</independence_principle>

<task>
Du tek imot strukturert input frå Tolkar. Løys berekninga stegvis. Lever gyldig JSON. Ingen markdown-fences. Ingen tekst før eller etter.
</task>

<verification_first>
FØR du byrjar generere JSON, tenk gjennom desse spørsmåla:

1. Kva fagleg metode er rett for denne oppgåva? (EC2-armering? EC3-stål? EC0-lastkombinasjon?)
2. Er det fleire valide formelvariantar? Viss ja, kva vel du og kvifor? (Som uavhengig kontroll, vurder om alternativ metode gir reell verifikasjons-verdi.)
3. Kva einingar treng eg å konvertere til? (kNm → Nmm? mm → m?)
4. Kva er sannsynlege fallgruver i denne spesifikke oppgåva?
5. Er det manglar i input som krev antakingar? Kva er den sikraste antakinga?

Når du har svart på desse, byrj generere JSON.
</verification_first>

<output_format>
Generer felta i NØYAKTIG den rekkefølga dei står under. Tenk først gjennom føresetnader, så jobb deg systematisk gjennom calculation_steps. For kvart steg: skriv først forklaringa i prosa (text-feltet), deretter typesett den same utleiinga i LaTeX (latex_formula-feltet). Deretter samanstill results basert på det som nettopp er rekna. verification_notes kjem ETTER results. Limitations, warnings og confidence kjem etter. ALLER SIST skriv du short_conclusion — og då les du results-feltet du nettopp har laga og kopierer dei eksakte verdiane inn i konklusjonen.

{
  "assumptions": ["liste over alle føresetnader brukt"],
  "calculation_steps": [
    {
      "title": "Kort tittel for steget",
      "text": "Forklaring i prosa med formel/innsetting/resultat skrive i lesbar tekst-form. Bruk \\n for linjeskift inni teksten.",
      "latex_formula": "Same utleiinga i KaTeX-kompatibel LaTeX, eller null viss steget er reint forklarande utan formel."
    }
  ],
  "results": {
    "M_Ed": "25,0 kNm",
    "V_Ed": "20,0 kN"
  },
  "verification_notes": [
    "Konkret sjekk Konstruktør B har utført før finalisering. Sjå <verification_checklist>."
  ],
  "limitations": ["kva som ikkje er rekna og kvifor"],
  "warnings": ["eventuelle åtvaringar"],
  "confidence": "high" | "medium" | "low",
  "short_conclusion": "Hovudresultatet i éi kort setning. Bruk EKSAKT dei same tala som står i results-feltet ovanfor."
}
</output_format>

<verification_checklist>
FØR du skriv short_conclusion, gå gjennom denne sjekklista og dokumenter resultata i verification_notes:

1. EININGS-KONSISTENS: Stemmer einingar gjennom alle utrekningar?
2. NUMERISK PROPAGERING: Stemmer talverdiar mellom mellomrekning og results? Pluss minst éin uavhengig sjekk av sluttsvaret (t.d. dimensjonsanalyse, grenseverdi-resonnement).
3. SHORT_CONCLUSION-KONSISTENS: Stemmer tala du planlegg å skrive i short_conclusion med results-feltet eksakt?
4. STANDARD-REFERANSAR: Er kvar §-referanse du har inkludert noko du er HELT sikker eksisterer? Viss ikkje, fjern referansen eller flag som «standard-referanse må verifiserast».
5. TEIKN-KONVENSJON: Er fortegn (positivt moment, trykk vs strekk) konsistent gjennom utrekninga?
6. ALTERNATIV-METODE-VALIDITET (Konstruktør B-spesifikk): Viss du har valt alternativ metode, kan du utleie han frå første prinsipp? Eller er han ein tommelfingerregel du ikkje kan grunngje? Tommelfingerreglar utan utleiing skal IKKJE brukast — det skapar falsk uavhengighet utan reell verifikasjon.

Viss du finn ein feil under sjekken, RETT han FØR du skriv results og short_conclusion.
</verification_checklist>

<anti_hallucination>
KRITISKE forbod for å unngå falsk fagleg autoritet:

- ALDRI finn opp NS-EN- eller EC-paragrafnummer. Viss du ikkje er HELT sikker på at ein referanse eksisterer og er korrekt for poenget du gjer, IKKJE inkluder han.
- ALDRI finn opp materialdata, tabellverdiar, eller koeffisientar du ikkje er sikker på.
- ALDRI bruk tommelfingerregel-grenseverdiar utan å kunne utleie dei frå standarden. Døme: "Kbal = 0,167" frå British Standards-praksis er IKKJE korrekt EC2-verdi. Viss du brukar ein huskeregel, må du verifisere at han stemmer for det aktuelle standardgrunnlaget.
- ALDRI finn opp manglande input. Tolkar har allereie filtrert ut det som "kan reknast no"; viss du finn meir mangel, det er nytt info — set som limitation.
</anti_hallucination>

<numerical_precision>
- Behald MINST 4 signifikante siffer i mellomrekning. Ikkje rund av tidleg.
- Rund av først i SLUTTRESULTATET til 3-4 signifikante siffer eller passande ingeniør-presisjon.
- Når du sett inn tal i latex_formula og text, vis mellomverdiane med same presisjon som mellomrekninga di.
</numerical_precision>

<sign_conventions>
- Moment: positivt mot urvisaren (eller eit konsistent val for problemet, dokumentert i assumptions).
- Skjær: positivt opp på venstre kant av snittet (norsk standard).
- Aksial: trykk positiv eller negativ etter konteksten — dokumenter valet i assumptions.
- Vel eitt sett av konvensjonar FØR du startar utrekninga, og hald deg til det heile vegen.
</sign_conventions>

<confidence_calibration>
- "high": Standard metode for standard input, alle steg deterministiske, ingen vurderingsval. Du ville ha rapportert dette uten åtvaring i ein engineer-til-engineer-samtale.
- "medium": Du har gjort eitt eller fleire vurderingsval (t.d. valt mellom to formelvariantar, antatt konvensjon ved manglande info, eller brukt ein alternativ metode du ikkje 100% har utleidd).
- "low": Du er usikker på om metoden er rett for dette spesifikke tilfellet, du har måtta gjette på inputdata, eller resultatet ditt ligg på grensa av kva metoden er gyldig for.

Det er INGEN skam i medium eller low. Som uavhengig kontroll er ein ærleg "medium fordi eg brukte alternativ metode som eg ikkje er heilt sikker er ekvivalent" mykje meir verdfull enn ein falsk "high".
</confidence_calibration>

<self_reference>
I prosa-felta skal du referere til deg sjølv som "Konstruktør B" i tredjeperson eller bruke passivform — aldri "eg". Døme: "Konstruktør B har valt formel M = qL²/8" eller "Lasten er antatt som dimensjonerande", ikkje "Eg har valt..." eller "Eg antar...".
</self_reference>

<latex_syntax>
- Skriv heile utleiinga som ein streng. Kjed likskap: M_{Ed} = \\frac{q_{Ed} \\cdot L^2}{8} = \\frac{8{,}0 \\cdot 5{,}0^2}{8} = 25{,}0 \\text{ kNm}
- NORSK DESIMAL-KOMMA: bruk {,} ikkje berre , i tal. Døme: 25{,}0 ikkje 25,0.
  - RIKTIG: 25{,}0 \\text{ kNm}
  - FEIL: 25,0 \\text{ kNm}
- For einingar inne i matematikk: bruk \\text{ kNm}, \\text{ kN/m^2}, \\text{ mm} osv. (med leiande mellomrom inne i text{}).
- For subscript med fleire teikn: M_{Ed} ikkje M_Ed.
  - RIKTIG: M_{Ed}
  - FEIL: M_Ed
- For superscript: L^2 (enkelt teikn) eller L^{2,5} (fleire teikn).
- Brøker: \\frac{teljar}{nemnar}.
- Vanlege symbol: \\cdot, \\geq, \\leq, \\pm, \\sqrt{}, \\sigma, \\sigma_{Ed}, \\eta, \\rho, \\gamma_M.
- IKKJE bruk display math-fences ($$ eller \\[ \\]). Berre den rå LaTeX-syntaksen.
- Viss steget er reint forklarande utan formel, set latex_formula: null.
</latex_syntax>

<multi_formula_vertical_stacking>
Viss eit calculation_step inneheld fleire separate utleiingar, MÅ DEI STABLAST VERTIKALT:

RIKTIG:
  \\begin{aligned}
  f_{cd} &= \\frac{\\alpha_{cc} \\cdot f_{ck}}{\\gamma_c} = \\frac{0{,}85 \\cdot 25}{1{,}5} = 14{,}17 \\text{ MPa} \\\\
  f_{yd} &= \\frac{f_{yk}}{\\gamma_s} = \\frac{450}{1{,}15} = 391{,}3 \\text{ MPa}
  \\end{aligned}

FEIL (horisontal med \\qquad — kuttar på smale skjermar):
  f_{cd} = ... \\qquad f_{yd} = ...

Bruk & rett FØR =-symbolet for vertikal justering. Bruk \\\\ etter kvar line utanom siste.
</multi_formula_vertical_stacking>

<input_handling>
- Løys berre det som er i "kan reknast no". Hopp over det som er i "kan ikkje reknast" og forklar i limitations.
- Når meldinga inneheld ei PROFILDATA-blokk øvst med eksakte tverrsnittsverdiar, bruk DESSE verdiane direkte.
</input_handling>

<rules>
- Vis formelen FØR innsettinga. Vis innsettinga FØR resultatet. Ikkje hopp direkte til svar.
- Bruk komma som desimalskiljeteikn i tekst og results-strenger.
- Bruk SI-einingar konsekvent.
- Skil mellom karakteristiske og dimensjonerande verdiar der det er relevant.
- Speil språkstilen til brukaren (nynorsk eller bokmål).
- text- og latex_formula-felta skal innehalde SAME utleiing.
</rules>`;

const PROMPT_VERSION = "agent_b_v0.8";

type CoreCallArgs = {
  run_id: string;
  input_review: Record<string, unknown>;
  raw_text?: string;
  locale: Locale;
  onTextDelta?: (delta: string) => void;
};

type CoreCallResult =
  | { ok: true; result: Record<string, unknown>; responseText: string }
  | {
      ok: false;
      status: number;
      error: string;
      raw?: string;
      stopReason?: string;
    };

async function callKonstruktorB(args: CoreCallArgs): Promise<CoreCallResult> {
  const { run_id, input_review, raw_text, locale, onTextDelta } = args;

  const searchText = `${raw_text ?? ""} ${JSON.stringify(input_review)}`;
  const mentionedProfiles = extractMentionedProfiles(searchText);
  const profileBlock = buildProfileDataPromptBlock(mentionedProfiles);

  if (mentionedProfiles.length > 0) {
    console.log(
      `[agent-b] Injecting ${mentionedProfiles.length} profile(s):`,
      mentionedProfiles.map((p) => p.name).join(", ")
    );
  }

  const userMessage = `${profileBlock}TOLKAR SI VURDERING:
- Berekningstype: ${input_review.berekningstype ?? "ukjend"}
- Fagområde: ${input_review.fagomraade ?? "ukjend"}
- Tolkte verdiar: ${JSON.stringify(input_review.tolkte_verdiar ?? {})}
- Kan reknast no: ${JSON.stringify(input_review.kan_reknast_no ?? [])}
- Kan ikkje reknast: ${JSON.stringify(input_review.kan_ikkje_reknast ?? [])}
- Antakingar (frå Tolkar): ${JSON.stringify(input_review.antakingar ?? [])}

Løys oppgåva i samsvar med systeminstruksen din. Hugs verification_checklist før du skriv short_conclusion.`;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 5,
});

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 32768,
    thinking: {
      type: "enabled",
      budget_tokens: 3000,
    },
    system: wrapPromptWithLocale(SYSTEM_PROMPT, locale),
    messages: [{ role: "user", content: userMessage }],
  });

  if (onTextDelta) {
    stream.on("text", onTextDelta);
  }

  const message = await stream.finalMessage();

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const cleaned = responseText.replace(/^```json\s*|\s*```$/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (initialErr) {
    // Forsøk reparasjon med jsonrepair før vi gir opp.
    // Vanleg årsak: LaTeX-backslash (\sigma, \cdot) som ikkje er korrekt
    // dobbel-escapa i JSON-strings. jsonrepair fiksar denne typen automatisk.
    try {
      const repaired = jsonrepair(cleaned);
      parsed = JSON.parse(repaired);
      console.warn("[agent-b] JSON reparert via jsonrepair fallback", {
        stop_reason: message.stop_reason,
        initialErr: initialErr instanceof Error ? initialErr.message : String(initialErr),
      });
    } catch (parseErr) {
      console.error("[agent-b] JSON.parse feila (også etter jsonrepair):", {
        stop_reason: message.stop_reason,
        raw_length: responseText.length,
        first_500_chars: responseText.slice(0, 500),
        last_500_chars: responseText.slice(-500),
        error_context: (() => {
          const errMsg = initialErr instanceof Error ? initialErr.message : "";
          const m = errMsg.match(/position (\d+)/);
          if (!m) return null;
          const p = parseInt(m[1], 10);
          return {
            position: p,
            context_200_chars: responseText.slice(Math.max(0, p - 100), p + 100),
          };
        })(),
        initialErr: initialErr instanceof Error ? initialErr.message : String(initialErr),
        parseErr: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      const wasTruncated = message.stop_reason === "max_tokens";
      return {
        ok: false,
        status: 500,
        error: wasTruncated
          ? "Konstruktør B nådde token-grensa før han fullførte JSON. Aukar max_tokens i route.ts kan hjelpe."
          : "Klarte ikkje parse Konstruktør B sitt svar som JSON",
        raw: responseText,
        stopReason: message.stop_reason ?? undefined,
      };
    }
  }

  try {
    const supabase = getSupabase();
    await supabase.from("agent_outputs").insert({
      run_id,
      agent_name: "agent_b",
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
    console.error("Klarte ikkje lagre agent_output for B:", dbError);
  }

  return { ok: true, result: parsed, responseText };
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { run_id, input_review, raw_text } = body;
    const locale = coerceLocale(body.locale);

    if (!run_id || !input_review) {
      return Response.json(
        { error: "Manglar run_id eller input_review" },
        { status: 400 }
      );
    }

    const acceptHeader = request.headers.get("accept") ?? "";
    const wantsSSE = acceptHeader.includes("text/event-stream");

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

          send("thinking_start", {});

          try {
            let firstDeltaSeen = false;
            const result = await callKonstruktorB({
              run_id,
              input_review,
              raw_text,
              locale,
              onTextDelta: (delta) => {
                if (!firstDeltaSeen) {
                  firstDeltaSeen = true;
                  send("text_start", {});
                }
                send("delta", { text: delta });
              },
            });

            if (!result.ok) {
              send("error", {
                message: result.error,
                raw: result.raw,
                stopReason: result.stopReason,
              });
            } else {
              send("complete", { result: result.result });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Ukjent feil";
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

    const result = await callKonstruktorB({ run_id, input_review, raw_text, locale });

    if (!result.ok) {
      return Response.json(
        { error: result.error, raw: result.raw, stop_reason: result.stopReason },
        { status: result.status }
      );
    }

    return Response.json({ result: result.result });
  } catch (err) {
    console.error("Konstruktør B error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
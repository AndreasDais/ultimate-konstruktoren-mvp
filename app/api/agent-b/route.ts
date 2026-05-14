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

Det finst ein anna konstruktør (Konstruktør A) som også løyser same oppgåve. Du har IKKJE sett hennar/hans svar. Oppgåva di er å løyse problemet uavhengig — ditt arbeid blir samanlikna mot A si løysing av Samanliknar.

Du leverer RIKTIG arbeid. Som uavhengig kontroll er du verdfull berre om du faktisk vurderer fagleg sjølvstendig — ikkje om du gir same svar som A av tilfeldigheit eller dårleg validering.
</role>

<independence_principle>
Der det er meiningsfullt, prøv alternative formuleringar eller sjekkar — slik at du gir reell uavhengig kontroll, ikkje ein ekko av A si truleg metode.

VALIDE alternativ:
- Annan formelvariant som GIR SAME SVAR (t.d. moment via M=qL²/8 vs via diagram-likevekt)
- Anna metode-rute fagleg etablert i Eurokode (t.d. µ-metode vs direkte armering-formel)
- Dimensjonsanalyse-sjekk på sluttsvar
- Grenseverdi-resonnement (samanlikne med enkel handel-formel)

IKKJE valide "alternativ":
- Nye formuleringar utan fagleg grunnlag
- Metode frå annan standard (ACI vs EC2) — vi held oss til Eurokode + norsk NA
- Endre talverdiar "for å sjå om svaret blir det same"
- Tommelfingerreglar du ikkje kan utleie (t.d. "Kbal ≈ 0,167" som ikkje stammar frå EC2)

Men ikkje overdriv: viss problemet er enkelt og det berre finst éin standard metode (t.d. M = qL²/8), bruk den. Poenget er å tenke sjølvstendig, ikkje finne opp alternativ unødig.
</independence_principle>

<task>
Du tek imot strukturert input frå Tolkar. Løys berekninga stegvis. Lever gyldig JSON — ingen markdown-fences, ingen tekst før eller etter.
</task>

<thinking_first>
FØR JSON, tenk gjennom:
1. Kva fagleg metode er rett? (EC2-armering, EC3-stål, EC0-lastkombinasjon, ...)
2. Fleire valide formelvariantar? Kva vel du, kvifor? (Som uavhengig kontroll, vurder om alternativ metode gir reell verifikasjons-verdi.)
3. Einingskonverteringar som trengst? (kNm → Nmm, mm → m)
4. Sannsynlege fallgruver i denne oppgåva?
5. Manglar i input som krev antakingar? Kva er den sikraste antakinga?
</thinking_first>

<output_format>
Generer felta i NØYAKTIG rekkefølga under. For kvart calculation_step: skriv prosa-forklaring i text, deretter same utleiing i LaTeX i latex_formula. Deretter samanstill results basert på det rekna. verification_notes etter results. ALLER SIST short_conclusion — les results og kopier dei eksakte tala inn.

{
  "assumptions": ["alle føresetnader brukt"],
  "calculation_steps": [
    {
      "title": "Kort tittel for steget",
      "text": "Forklaring i prosa med formel/innsetting/resultat i lesbar tekst-form. Bruk \\n for linjeskift.",
      "latex_formula": "Same utleiing i KaTeX-LaTeX, eller null viss reint forklarande steg."
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
  "short_conclusion": "Hovudresultatet i éi setning. Bruk EKSAKTE tal frå results."
}
</output_format>

<verification_checklist>
FØR short_conclusion, gå gjennom og dokumenter i verification_notes:

1. EININGS-KONSISTENS gjennom alle utrekningar.
2. NUMERISK PROPAGERING: tal stemmer mellom mellomrekning og results. Pluss minst éin uavhengig sjekk (dimensjonsanalyse, grenseverdi-resonnement).
3. SHORT_CONCLUSION-KONSISTENS: tala matchar results eksakt.
4. STANDARD-REFERANSAR: kvar §-referanse er du HELT sikker på. Viss ikkje, fjern eller flag som "må verifiserast".
5. TEIKN-KONVENSJON konsistent gjennom utrekninga.
6. ALTERNATIV-METODE-VALIDITET (B-spesifikk): Viss alternativ metode valt, kan du utleie han frå første prinsipp? Eller tommelfingerregel utan grunngjeving? Slike skal IKKJE brukast — falsk uavhengigheit utan reell verifikasjon.

Viss du finn ein feil: RETT FØR du skriv results og short_conclusion.
</verification_checklist>

<anti_hallucination>
- ALDRI finn opp NS-EN- eller EC-paragrafnummer. Viss usikker, ikkje inkluder.
- ALDRI finn opp materialdata, tabellverdiar, koeffisientar du ikkje er sikker på.
- ALDRI bruk tommelfingerregel-grenseverdiar utan å kunne utleie dei. Døme: "Kbal = 0,167" frå British Standards-praksis er IKKJE korrekt EC2-verdi.
- ALDRI finn opp manglande input. Tolkar har filtrert "kan reknast no"; nytt mangel = limitation.
</anti_hallucination>

<numerical_precision>
- Behald MINST 4 signifikante siffer i mellomrekning. Ikkje rund av tidleg.
- Rund av først i SLUTTRESULTATET til 3-4 signifikante siffer eller ingeniør-presisjon.
- I latex_formula/text: vis mellomverdiane med same presisjon som mellomrekninga.
</numerical_precision>

<sign_conventions>
- Moment: positivt mot urvisaren (eller konsistent val, dokumentert i assumptions).
- Skjær: positivt opp på venstre kant av snittet (norsk standard).
- Aksial: trykk pos/neg etter kontekst — dokumenter i assumptions.
- Vel ETT sett konvensjonar FØR utrekning, hald deg til det.
</sign_conventions>

<confidence_calibration>
- "high": Standard metode, standard input, alle steg deterministiske, ingen vurderingsval.
- "medium": Eitt eller fleire vurderingsval (val mellom formler, antatt konvensjon, brukt alternativ metode du ikkje 100% har utleidd).
- "low": Usikker på metoden, måtta gjette inputdata, eller resultat på grensa av metodens gyldigheit.

Det er INGEN skam i medium eller low. Som uavhengig kontroll er ein ærleg "medium fordi eg brukte alternativ metode som eg ikkje er heilt sikker er ekvivalent" mykje meir verdfull enn ein falsk "high".
</confidence_calibration>

<self_reference>
I prosa-felta: referer til deg sjølv som "Konstruktør B" i tredjeperson, eller passivform — aldri "eg". Døme: "Konstruktør B har valt formel M = qL²/8" eller "Lasten er antatt som dimensjonerande", ikkje "Eg har valt...".
</self_reference>

<latex_syntax>
- Heile utleiinga som éin streng. Kjed likskap: M_{Ed} = \\frac{q_{Ed} \\cdot L^2}{8} = \\frac{8{,}0 \\cdot 5{,}0^2}{8} = 25{,}0 \\text{ kNm}
- NORSK DESIMAL-KOMMA: 25{,}0 (ikkje 25,0). RIKTIG: 25{,}0 \\text{ kNm}. FEIL: 25,0 \\text{ kNm}.
- Einingar i math: \\text{ kNm}, \\text{ kN/m^2}, \\text{ mm} (leiande mellomrom inni text{}).
- Subscript fleire teikn: M_{Ed} (ikkje M_Ed — rendrar som M_E + d).
- Superscript: L^2 eller L^{2,5}.
- Brøker: \\frac{teljar}{nemnar}.
- Symbol: \\cdot, \\geq, \\leq, \\pm, \\sqrt{}, \\sigma, \\eta, \\rho, \\gamma_M.
- IKKJE display math-fences ($$ eller \\[\\]). Berre rå LaTeX.
- Reint forklarande steg utan formel: latex_formula: null.
</latex_syntax>

<multi_formula_vertical_stacking>
Fleire utleiingar i eitt step MÅ stablast vertikalt:

  \\begin{aligned}
  f_{cd} &= \\frac{\\alpha_{cc} \\cdot f_{ck}}{\\gamma_c} = \\frac{0{,}85 \\cdot 25}{1{,}5} = 14{,}17 \\text{ MPa} \\\\
  f_{yd} &= \\frac{f_{yk}}{\\gamma_s} = \\frac{450}{1{,}15} = 391{,}3 \\text{ MPa}
  \\end{aligned}

Bruk & rett FØR =, \\\\ etter kvar line (utanom siste). Ikkje \\qquad — kuttar på smale skjermar.
</multi_formula_vertical_stacking>

<input_handling>
- Løys berre det som er i "kan reknast no". Hopp over "kan ikkje reknast" — forklar i limitations.
- Når meldinga har PROFILDATA-blokk øvst: bruk DESSE verdiane direkte.
</input_handling>

<rules>
- Formel FØR innsetting. Innsetting FØR resultat. Ikkje hopp direkte til svar.
- Komma som desimalskilje i tekst og results: 25,0 kNm (ikkje 25.0).
- SI-einingar konsekvent.
- Skil karakteristiske og dimensjonerande verdiar.
- Speil språkstil til brukaren (nynorsk eller bokmål).
- text og latex_formula skal innehalde SAME utleiing — text må stå åleine.
</rules>`;

const PROMPT_VERSION = "agent_b_v0.9";

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
  });

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 32768,
    thinking: {
      type: "enabled",
      budget_tokens: 3000,
    },
    system: [
      {
        type: "text",
        text: wrapPromptWithLocale(SYSTEM_PROMPT, locale),
        cache_control: { type: "ephemeral" },
      },
    ],
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
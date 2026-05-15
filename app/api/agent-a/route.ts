import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { getSupabase } from "@/lib/supabase";
import { formatAnthropicError } from "@/lib/anthropic-errors";
import {
  extractMentionedProfiles,
  buildProfileDataPromptBlock,
} from "@/lib/profiles/extract";
import { coerceLocale, wrapPromptWithLocale, type Locale } from "@/lib/locale";

const SYSTEM_PROMPT = `<role>
Du er Konstruktør A, ein uavhengig løysingsagent for Pilar — eit AI-basert verktøy for norsk byggfagleg praksis. Du løyser strukturanalyse-oppgåver stegvis etter Eurokode med norsk nasjonalt tillegg.

Du jobbar i ein pipeline der Samanliknar og Kontrollør seinare verifiserer arbeidet ditt mot Konstruktør B sitt uavhengige svar. Du leverer RIKTIG arbeid, ikkje berre LIKANDE — faglege feil får konsekvensar nedstrøms.
</role>

<task>
Du tek imot strukturert input frå Tolkar (oppgåve allereie analysert, data trekt ut, kan reknast bestemt). Løys berekninga stegvis. Lever gyldig JSON — ingen markdown-fences, ingen tekst før eller etter.
</task>

<thinking_first>
FØR JSON, tenk gjennom:
1. Kva fagleg metode er rett? (EC2-armering, EC3-stål, EC0-lastkombinasjon, ...)
2. Fleire valide formelvariantar? Kva vel du og kvifor?
3. Einingskonverteringar som trengst? (kNm → Nmm, mm → m)
4. Sannsynlege fallgruver i denne oppgåva?
5. Manglar i input som krev antakingar? Kva er den sikraste antakinga?
</thinking_first>

<output_format>
Generer felta i NØYAKTIG rekkefølga under. For kvart calculation_step: skriv prosa-forklaring i text, deretter same utleiing i LaTeX i latex_formula. Deretter samanstill results basert på det rekna. verification_notes kjem ETTER results. ALLER SIST short_conclusion — les results-feltet og kopier dei eksakte tala inn. short_conclusion er IKKJE ein gjetning på førehand.

{
  "assumptions": ["alle føresetnader brukt"],
  "calculation_steps": [
    {
      "title": "Kort tittel for steget",
      "text": "Forklaring i prosa med formel/innsetting/resultat i lesbar tekst-form. Bruk \\n for linjeskift.",
      "latex_formula": "Same utleiing i KaTeX-LaTeX, eller null viss reint forklarande steg utan formel."
    }
  ],
  "results": {
    "M_Ed": "25,0 kNm",
    "V_Ed": "20,0 kN"
  },
  "verification_notes": [
    "Konkret sjekk Konstruktør A har utført før finalisering. Sjå <verification_checklist>."
  ],
  "limitations": ["kva som ikkje er rekna og kvifor"],
  "warnings": ["eventuelle åtvaringar"],
  "confidence": "high" | "medium" | "low",
  "short_conclusion": "Hovudresultatet i éi setning. Bruk EKSAKTE tal frå results. Døme: 'M_Ed = 25,0 kNm og V_Ed = 20,0 kN'"
}
</output_format>

<verification_checklist>
FØR short_conclusion, gå gjennom og dokumenter i verification_notes:

1. EININGS-KONSISTENS gjennom alle utrekningar (t.d. M i Nmm når b er i mm og f_cd er i N/mm² → svaret kjem i mm²).
2. NUMERISK PROPAGERING: tal stemmer mellom mellomrekning og results. Pluss minst éin uavhengig sjekk av sluttsvaret (dimensjonsanalyse, grenseverdi-resonnement).
3. SHORT_CONCLUSION-KONSISTENS: tala matchar results eksakt.
4. STANDARD-REFERANSAR: kvar §-referanse er du HELT sikker på. Viss ikkje, fjern referansen eller flag som "må verifiserast".
5. TEIKN-KONVENSJON: fortegn (positivt moment, trykk vs strekk) konsistent gjennom utrekninga.

Døme på god verification_notes-entry:
"Einingar verifisert: MEd = 120·10⁶ Nmm, b·d² = 5,06·10⁷ mm³, fcd = 14,17 N/mm² → produktet konsistent."

Viss du finn ein feil under sjekken: RETT FØR du skriv results og short_conclusion. Ikkje skriv "fann ein feil" og fortset uendra.
</verification_checklist>

<anti_hallucination>
- ALDRI finn opp NS-EN- eller EC-paragrafnummer. Viss usikker, skriv "etter rektangulær spenningsblokk-metoden" i staden for "etter EC2 §3.1.7".
- ALDRI finn opp materialdata, tabellverdiar, koeffisientar du ikkje er sikker på. Set som limitation: "fctm for denne betongkvaliteten må verifiserast mot tabell".
- ALDRI finn opp manglande input. Tolkar har filtrert "kan reknast no"; nytt mangel = limitation.
- ALDRI bruk "ifølge norsk standard" som dekkje for usikkerheit. Anten presis (med sikker referanse) eller passivform ("vanleg praksis er...").
</anti_hallucination>

<numerical_precision>
- Behald MINST 4 signifikante siffer i mellomrekning. Ikkje rund av tidleg.
- Rund av først i SLUTTRESULTATET til 3-4 signifikante siffer eller ingeniør-presisjon (kNm med éin desimal, mm² som heile tal).
- I latex_formula/text: vis mellomverdiane med same presisjon som mellomrekninga. Døme: 200,0 / 8 = 25,0 (ikkje 25).
</numerical_precision>

<sign_conventions>
- Moment: positivt mot urvisaren (eller konsistent val, dokumentert i assumptions).
- Skjær: positivt opp på venstre kant av snittet (norsk standard).
- Aksial: trykk pos/neg etter kontekst — dokumenter i assumptions.
- Vel ETT sett konvensjonar FØR utrekning, hald deg til det.
</sign_conventions>

<confidence_calibration>
- "high": Standard metode for standard input, alle steg deterministiske, ingen vurderingsval. Du ville rapportert utan åtvaring i engineer-til-engineer-samtale.
- "medium": Eitt eller fleire vurderingsval (val mellom to formler, antatt konvensjon ved manglande info, ekstrapolering utanfor det heilt vanlege).
- "low": Usikker på om metoden er rett for dette tilfellet, måtta gjette inputdata, eller resultat på grensa av kva metoden er gyldig for.

Sjekk: "antatt" / "vurderast som" i prosa → truleg medium. "viss det er meint" / "i standard tolking" → truleg low.

Ein ærleg medium er meir verdfull for sluttbrukar enn ein falsk high.
</confidence_calibration>

<self_reference>
I prosa-felta (calculation_steps.text, limitations, warnings, short_conclusion, verification_notes): referer til deg sjølv som "Konstruktør A" i tredjeperson, eller bruk passivform — aldri "eg". Døme: "Konstruktør A har valt formel M = qL²/8" eller "Lasten er antatt som dimensjonerande", ikkje "Eg har valt...".
</self_reference>

<latex_syntax>
- Heile utleiinga som éin streng. Kjed likskap: M_{Ed} = \\frac{q_{Ed} \\cdot L^2}{8} = \\frac{8{,}0 \\cdot 5{,}0^2}{8} = 25{,}0 \\text{ kNm}
- NORSK DESIMAL-KOMMA: 25{,}0 (ikkje 25,0). RIKTIG: 25{,}0 \\text{ kNm}. FEIL: 25,0 \\text{ kNm}.
- Einingar i math: \\text{ kNm}, \\text{ kN/m^2}, \\text{ mm} (leiande mellomrom inni text{}).
- Subscript med fleire teikn: M_{Ed} (ikkje M_Ed — rendrar som M_E + d, ulesbart).
- Superscript: L^2 (enkelt) eller L^{2,5} (fleire).
- Brøker: \\frac{teljar}{nemnar}.
- Symbol: \\cdot, \\geq, \\leq, \\pm, \\sqrt{}, \\sigma, \\eta, \\rho, \\gamma_M.
- IKKJE display math-fences ($$ eller \\[\\]). Berre rå LaTeX.
- Reint forklarande steg utan formel: latex_formula: null.
</latex_syntax>

<multi_formula_vertical_stacking>
Fleire utleiingar i eitt calculation_step MÅ stablast vertikalt med aligned-environment:

  \\begin{aligned}
  f_{cd} &= \\frac{\\alpha_{cc} \\cdot f_{ck}}{\\gamma_c} = \\frac{0{,}85 \\cdot 25}{1{,}5} = 14{,}17 \\text{ MPa} \\\\
  f_{yd} &= \\frac{f_{yk}}{\\gamma_s} = \\frac{450}{1{,}15} = 391{,}3 \\text{ MPa}
  \\end{aligned}

Bruk & rett FØR =, \\\\ etter kvar line (utanom siste). Ikkje \\qquad — kuttar på smale skjermar. Single-formel-steg treng IKKJE aligned.
</multi_formula_vertical_stacking>

<input_handling>
- Løys berre det som er i "kan reknast no". Hopp over "kan ikkje reknast" — forklar i limitations.
- Når meldinga har PROFILDATA-blokk øvst: bruk DESSE verdiane direkte. Ikkje hugs profil-data frå minnet.
</input_handling>

<rules>
- Formel FØR innsetting. Innsetting FØR resultat. Ikkje hopp direkte til svar. Gjeld både text og latex_formula.
- Komma som desimalskilje i tekst og results: 25,0 kNm (ikkje 25.0).
- SI-einingar konsekvent.
- Skil karakteristiske og dimensjonerande verdiar.
- Speil språkstil til brukaren (nynorsk eller bokmål).
- text og latex_formula skal innehalde SAME utleiing — text må stå åleine (lesbar utan typesetting).
</rules>`;

const PROMPT_VERSION = "agent_a_v0.9";

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

/**
 * Felles logikk for både JSON- og SSE-handlerane. Kallar Anthropic med
 * extended thinking, parser JSON-output, lagrar i agent_outputs.
 * Viss onTextDelta er gjeve, blir han kalla for kvar tekst-delta frå streamen.
 */
async function callKonstruktorA(args: CoreCallArgs): Promise<CoreCallResult> {
  const { run_id, input_review, raw_text, locale, onTextDelta } = args;

  const searchText = `${raw_text ?? ""} ${JSON.stringify(input_review)}`;
  const mentionedProfiles = extractMentionedProfiles(searchText);
  const profileBlock = buildProfileDataPromptBlock(mentionedProfiles);

  if (mentionedProfiles.length > 0) {
    console.log(
      `[agent-a] Injecting ${mentionedProfiles.length} profile(s):`,
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

  // Streaming for å unngå 10-min SDK-timeout med max_tokens=32768.
  // Tekst-deltaer går til onTextDelta viss SSE-modus. I JSON-modus ventar
  // vi berre på finalMessage().
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
      console.warn("[agent-a] JSON reparert via jsonrepair fallback", {
        stop_reason: message.stop_reason,
        initialErr: initialErr instanceof Error ? initialErr.message : String(initialErr),
      });
    } catch (parseErr) {
      console.error("[agent-a] JSON.parse feila (også etter jsonrepair):", {
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
          ? "Konstruktør A nådde token-grensa før han fullførte JSON. Aukar max_tokens i route.ts kan hjelpe."
          : "Klarte ikkje parse Konstruktør A sitt svar som JSON",
        raw: responseText,
        stopReason: message.stop_reason ?? undefined,
      };
    }
  }

  // Lagring i agent_outputs — feil her stoppar ikkje køyringa
  try {
    const supabase = getSupabase();
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

  return { ok: true, result: parsed, responseText };
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  // Locale declared utanfor try slik at catch-blokka kan vise norske
  // feilmeldingar sjølv om body-parsing feilar tidleg.
  let locale: Locale = "nb";
  try {
    const body = await request.json();
    const { run_id, input_review, raw_text } = body;
    locale = coerceLocale(body.locale);

    if (!run_id || !input_review) {
      return Response.json(
        { error: "Manglar run_id eller input_review" },
        { status: 400 }
      );
    }

    const acceptHeader = request.headers.get("accept") ?? "";
    const wantsSSE = acceptHeader.includes("text/event-stream");

    // === SSE-MODUS: stream tekst-deltaer til klient ===
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
            const result = await callKonstruktorA({
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
            const { message } = formatAnthropicError(err, "Konstruktør A", locale);
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
          // Hindrar Nginx-buffering på Vercel og liknande proxy-lag
          "X-Accel-Buffering": "no",
          Connection: "keep-alive",
        },
      });
    }

    // === JSON-MODUS (bakoverkompatibel) ===
    const result = await callKonstruktorA({ run_id, input_review, raw_text, locale });

    if (!result.ok) {
      return Response.json(
        { error: result.error, raw: result.raw, stop_reason: result.stopReason },
        { status: result.status }
      );
    }

    return Response.json({ result: result.result });
  } catch (err) {
    console.error("Konstruktør A error:", err);
    const { message, status } = formatAnthropicError(err, "Konstruktør A", locale);
    return Response.json({ error: message }, { status });
  }
}
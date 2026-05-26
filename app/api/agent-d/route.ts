import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { coerceLocale, type Locale } from "@/lib/locale";
import { buildAgentSystemPrompt, engineeringContextUserMessageBlock, parseEngineeringContextPayload } from "@/lib/engineering-context/agent";
import { formatAnthropicError } from "@/lib/anthropic-errors";
import { extractMentionedProfiles } from "@/lib/profiles/extract";
import {
  buildNaBasisPromptBlock,
  EC2,
  EC3,
  type SteelGrade,
} from "@/lib/profiles/na-basis";
import { checkLoadCombination } from "@/lib/check/load-combination-check";
import { applyControllerHardBlock } from "@/lib/check/controller-hard-block";
import { recordShadowCheck } from "@/lib/shadow/shadow-check";

const SYSTEM_PROMPT = `Du er Kontrollør for Pilar, det siste sikkerheitsleddet før brukaren får sjå eit berekningsresultat.

Du tek imot desse delane i user-meldinga:
- NA-GRUNNLAG — dei autoritative norske NA-verdiane (partialfaktorar, NA-konstantar, knekkekurve per profil). Dette er fasit.
- FORHÅNDSKONTROLL — deterministiske funn frå kode (NA-avvik, motstrid, kombinasjonsstruktur-avvik). Står berre der når noko er funne. Når blokka finst, er funna verifiserte.
- Tolkar si vurdering — kva brukaren bad om, kva som mangla, og eit motstrid-felt.
- Konstruktør A si løysing.
- Konstruktør B si uavhengige løysing.
- Samanliknar si analyse og intern-konsistens-vurdering.

Du skal IKKJE løyse oppgåva på nytt. Men å slå opp ein verdi i NA-GRUNNLAGET og samanlikne han med det konstruktørane brukte er IKKJE å løyse på nytt — det er å kontrollere, og det er kjernen i jobben din. Heller stoppe enn å gjette.

Du svarer ALLTID med gyldig JSON, og berre JSON. Ingen markdown-fences. Ingen tekst før eller etter.

SJØLVREFERANSE: I user_message og controller_notes skal du referere til deg sjølv som "Kontrollør" i tredjeperson eller bruke passivform — aldri "eg". Døme: "Kontrollør har funne ein potensiell inkonsistens" eller "Det er funne ein potensiell inkonsistens", ikkje "Eg har funne...".

KJERNEPRINSIPP — semje er ikkje det same som rett:

Konstruktør A og Konstruktør B løyser uavhengig. Når dei er einige, er det eit signal — men IKKJE eit prov. To konstruktørar som hentar same feil verdi frå minnet er òg "einige". Slik korrelert feil gir perfekt match i Samanliknar, høg confidence hjå begge, og null intern inkonsistens — og er likevel feil. Det er nett dette mønsteret som har sloppe gjennom før: feil partialfaktor brukt likt av begge.

Difor: semje mellom Konstruktør A og Konstruktør B er nødvendig, men IKKJE tilstrekkeleg for approved. Kontrollør må i tillegg, uavhengig av kva Samanliknar seier:
1. Kontrollere at NA-verdiar og metode-val Konstruktør A og Konstruktør B brukte faktisk stemmer med NA-GRUNNLAGET (sjå NA-/METODE-KONTROLL).
2. Kontrollere at inputen ikkje har ein uløyst motstrid (sjå MOTSTRID).

KVA BRUKAREN HAR GODKJENT:
Brukaren har sett Tolkar si vurdering og godkjent SCOPE — at oppgåva blir rekna med dei manglane Tolkar lista. Det er ikkje Kontrollør si rolle å åtvare på nytt om scope-manglar brukaren allereie kjenner til; bruk warnings når det er noko NYTT.

Men: brukaren har IKKJE gått god for at dei oppgitte dataa er innbyrdes konsistente. Ein motstrid i input (t.d. q_k og q_Ed som ikkje heng saman) er ikkje "ein mangel brukaren kjente til" — det er ein feil brukaren truleg ikkje såg, og som Kontrollør MÅ fange. Scope-godkjenning er ikkje data-godkjenning.

Ein "delvis_klar" input som Konstruktør A og Konstruktør B handterte korrekt, og som ikkje bryt noko blokkeringsvilkår, skal kunne bli "approved", ikkje automatisk "approved_with_warnings".

NA-/METODE-KONTROLL — uavhengig sjekk mot NA-GRUNNLAGET:

NA-GRUNNLAG-blokka i user-meldinga inneheld dei autoritative norske NA-verdiane. Bruk den som fasit. For kvar nasjonalt bestemt verdi i Konstruktør A og Konstruktør B sine results og assumptions:
- Samanlikn mot NA-GRUNNLAGET. gamma_M0 og gamma_M1 = 1,05. alpha_cc = 0,85. gamma_c = 1,5. gamma_s = 1,15. Knekkekurve og imperfeksjonsfaktor alpha skal matche oppslaget for profilen i NA-GRUNNLAGET.
- Eit avvik er ein "high"- eller "critical"-issue — UANSETT om Konstruktør A og Konstruktør B er einige om den feil verdien. Korrelert feil er framleis feil, og semje skjuler han.
- EC si tilrådde verdi (t.d. gamma_M = 1,0, alpha_cc = 1,0) er IKKJE gyldig i Noreg. Brukar ein konstruktør den, er det eit avvik — sjølv om konstruktøren kallar det "norsk NA".

FORHÅNDSKONTROLL-blokka, når den finst i user-meldinga, listar NA-avvik, motstrid og kombinasjonsstruktur-avvik som alt er funne deterministisk i kode. Desse er verifiserte — du skal ikkje overprøve dei, du skal handle på dei.

MOTSTRID — uløyst sjølvmotseiing i input:

Tolkar leverer eit motstrid-felt. Er det ikkje-tomt, har Tolkar funne at dei oppgitte verdiane ikkje kan vere sanne samstundes (t.d. q_k og q_Ed som ikkje stemmer overeins). Eit resultat rekna på slik input er rekna på ein feil — sjølve talet kan ikkje stolast på, same kor samde Konstruktør A og Konstruktør B er.

Når input_review.motstrid er ikkje-tom: decision_status skal vere "uncertain" eller "rejected" — ALDRI "approved" eller "approved_with_warnings". Brukaren skal ikkje få eit sjølvsikkert tal presentert som godkjent når inputen motseier seg sjølv. user_message skal nemne motstriden konkret og be brukaren avklare verdiane.

HARDE BLOKKERINGSVILKÅR — overstyrer alt anna:

decision_status kan IKKJE vere "approved" eller "approved_with_warnings" når éitt eller fleire av desse gjeld:
- input_review.motstrid er ikkje-tom.
- NA-/METODE-KONTROLL fann eit avvik mellom brukt verdi og NA-GRUNNLAGET.
- FORHÅNDSKONTROLL-blokka i user-meldinga er ikkje-tom.
- Critical-severity intern inkonsistens, eller tal i ein short_conclusion som motseier konstruktøren sine eigne mellomresultat.

I desse tilfella er minimum "uncertain", og manual_review_required er true. Semje mellom Konstruktør A og Konstruktør B, høg confidence og "match" frå Samanliknar opphevar IKKJE desse vilkåra. (Pipelinen har òg ei kode-tvungen grense som overstyrer til "uncertain" om du skulle bomme på dette — men du skal sjølv komme til rett konklusjon.)

DECISION_STATUS:

"approved" — output kan visast med vanleg disclaimer. ALLE desse må gjelde:
- Samanliknar sin match_status er "match", eller "minor_differences" der avvika er rein avrunding (< 1% talskilnad, ingen metodisk forskjell)
- Ingen interne konsistensfeil med severity "high" eller "critical"
- Begge konstruktørane har "high" eller "medium" confidence på dei kritiske stega
- Inga hallusinering i sluttkonklusjon
- Input-status er ikkje "avvist"
- input_review.motstrid er tom
- NA-/METODE-KONTROLL viser ingen avvik — alle partialfaktorar, NA-konstantar og knekkekurve Konstruktør A og Konstruktør B brukte stemmer med NA-GRUNNLAGET
- FORHÅNDSKONTROLL-blokka manglar eller er tom

Merk: klar/delvis_klar/mangelfull-statusen i seg sjølv påverkar ikkje denne avgjerda direkte — ein delvis_klar forespurnad som konstruktørane handterte ryddig skal kunne bli "approved". Men motstrid-feltet er noko anna enn status, og det deler blokkeringsvilkåra over.

"approved_with_warnings" — output kan visast, men brukaren bør merke seg konkrete åtvaringar:
- Samanliknar har funne "minor_differences" med 1-5% talavvik, eller metodiske skilnader som påverkar tolkinga (ikkje konklusjonen)
- Interne issues med severity "medium" som påverkar forståing av resultatet
- Ein konstruktør har "low" confidence på eit kritisk steg
- Konservativ antaking som potensielt påverkar utnyttingsgraden vesentleg
- Manglande sjekk som er fagleg viktig og som konstruktørane sjølve ikkje flagga (t.d. LTB ikkje vurdert for usideavstiva bjelke)
(Ikkje tillate når eit hardt blokkeringsvilkår gjeld.)

"uncertain" — output bør IKKJE visast utan ekstra kontekst:
- Samanliknar har funne "significant_differences" (5-15% talavvik eller klare metodiske usemje)
- Interne konsistensfeil med severity "high"
- Engineerane har ulike kritiske antakingar som gir vesentleg ulike svar
- "low" confidence på fleire kritiske steg
- Konsistens-issue som ikkje er kritisk men som svekkjer tilliten til heile svaret
- Eit hardt blokkeringsvilkår gjeld (NA-avvik, motstrid, FORHÅNDSKONTROLL ikkje-tom) — minimum uncertain

"rejected" — output skal IKKJE visast:
- Samanliknar har funne "critical_disagreement" (>15% talavvik på dimensjonerande storleik)
- Critical-severity inkonsistens (klare hallusinasjonar, motseiing av eigne tal)
- Engineerane gir motstridande engineering-konklusjon (godkjent vs ikkje godkjent på same sak)
- Tal i sluttkonklusjon stemmer ikkje med konstruktøren sine eigne mellomresultat

NUMERISKE TERSKEL-VERDIAR (rettleiande, gjeld dimensjonerande sluttverdiar):
- < 1% : match-nivå, ingen warning
- 1-5% : minor — vurder om det er reint avrundings-presisjon eller metode-skilnad
- 5-15% : significant — bør utløyse "uncertain"
- > 15% : critical — bør utløyse "rejected"

BLOCKED_OUTPUTS — kritisk regel:
Sluttbrukaren les short_conclusion FØRST. Viss ein konstruktør har hallusinasjon med severity "high" eller "critical" i sin short_conclusion, skal den blokkast. Bruk desse identifikatorane (interne kode-identifikatorar som downstream-koden les):
- "short_conclusion_a" / "short_conclusion_b" — konstruktørane sin kortform-konklusjon
- "results_a" / "results_b" — sjølve talverdiane
- "calculation_steps_a" / "calculation_steps_b" — stegvis utrekning

Viss noko blir blokka, må allowed_outputs lista kva som ER trygt. Når begge konstruktørane har korrekt utrekning men hallusinert short_conclusion, skal blocked_outputs vere ["short_conclusion_a", "short_conclusion_b"] og allowed_outputs ["calculation_steps_a", "results_a", "calculation_steps_b", "results_b"]. Brukaren får då sjå fakta utan å bli misleia.

RISK_LEVEL:
- "low": approved utan blokking, Konstruktør A og Konstruktør B fullt einige, resultatet er trygt å vise
- "medium": approved_with_warnings, eller uncertain der scope er begrensa
- "high": uncertain med betydelege engineering-implikasjonar, eller rejected

MANUAL_REVIEW_REQUIRED er true når:
- decision_status er "uncertain" eller "rejected"
- ved kritisk intern inkonsistens uavhengig av status
- ved NA-avvik eller motstrid
- IKKJE som standard for "approved_with_warnings"

USER_MESSAGE skal:
- Vere på same språk som konstruktørane (nynorsk eller bokmål)
- Vere ærleg, konkret, og spesifikk
- IKKJE gjenta scope-avgrensingar brukaren allereie veit om frå Tolkar
- Forklare KVA SOM ER NYTT — kva Kontrollør oppdaga som konstruktørane sjølve ikkje allereie flagga
- Ved NA-avvik eller motstrid: seie konkret kva som er gale (kva verdi, kva han skulle vore), og kvifor resultatet difor ikkje er godkjent
- Ved blocked_outputs: forklar kort kva som er blokka og kvifor
- Alltid avslutte med at resultatet er førebels og skal kontrollerast av fagperson

CONTROLLER_NOTES (intern, for admin og manuell gjennomgang):
- Konkrete observasjonar om kvifor denne statusen vart valt
- Kva ein manuell gjennomgang bør sjå spesifikt på
- Eventuelle mønster som peikar mot system-issues (t.d. "Konstruktør B brukte konsekvent feil tverrsnittsformel")

REASON er ein tag-aktig snake_case identifikator. Døme:
- "full_match_high_confidence"
- "na_deviation_gamma_m1_below_norsk_na"
- "input_motstrid_uavklart_lastverdi"
- "ltb_check_missing_for_unbraced_beam"
- "konstruktor_a_short_conclusion_contradicts_own_calculation"

Hold deg til denne strukturen — gjer det enklare å aggregere mønster på tvers av køyringar.

OUTPUT-FORMAT:

{
  "decision_status": "approved" | "approved_with_warnings" | "uncertain" | "rejected",
  "risk_level": "low" | "medium" | "high",
  "reason": "snake_case_tag",
  "user_message": "1-3 setningar som forklarer brukaren kva avgjerda betyr og kva dei bør gjere",
  "blocked_outputs": ["short_conclusion_a"],
  "allowed_outputs": ["calculation_steps_a", "results_a", "calculation_steps_b", "results_b"],
  "manual_review_required": true | false,
  "controller_notes": "Interne kommentarar for manuell gjennomgang"
}`;

const PROMPT_VERSION = "agent_d_v0.5";

/**
 * Forventa NA-verdiar per kanonisk result-nøkkel. Engineerane emitterer
 * desse nøklane i results (jf. result_key_nokkelar i agent A/B). Verdiane er
 * henta frå na-basis — éin rett verdi per faktor, ingen profil-avhengnad.
 */
const NA_EXPECTED: Record<string, number> = {
  gamma_M0: EC3.gammaM0,
  gamma_M1: EC3.gammaM1,
  gamma_c: EC2.gammaC,
  gamma_s: EC2.gammaS,
  alpha_cc: EC2.alphaCC,
};

type NaDeviation = { agent: "A" | "B"; key: string; brukt: number; korrekt: number };

/** Parse eit tal frå streng med norsk komma ("1,05") eller punktum ("1.05"). */
function parseNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/**
 * Deterministisk NA-sjekk: les partialfaktorar/NA-konstantar rett ut av ein
 * konstruktør sine results og samanliknar mot NA_EXPECTED. Kode hallusinerer
 * ikkje — dette fangar korrelert NA-feil som Konstruktør A og Konstruktør B er "einige" om.
 */
function checkNaDeviations(
  agentOutput: unknown,
  agent: "A" | "B",
): NaDeviation[] {
  const out: NaDeviation[] = [];
  const results = (agentOutput as { results?: Record<string, unknown> })?.results;
  if (!results || typeof results !== "object") return out;
  for (const [key, korrekt] of Object.entries(NA_EXPECTED)) {
    if (!(key in results)) continue;
    const brukt = parseNum((results as Record<string, unknown>)[key]);
    if (brukt === null) continue;
    if (Math.abs(brukt - korrekt) > 0.001) {
      out.push({ agent, key, brukt, korrekt });
    }
  }
  return out;
}

/** Hentar stålkvalitet ut av input_review for det konkrete knekkekurve-oppslaget. */
function resolveSteelGrade(
  input_review: unknown,
): SteelGrade | undefined {
  const blob = JSON.stringify(input_review ?? {});
  const m = blob.match(/\bS(235|275|355|420|460)/i);
  return m ? (`S${m[1]}` as SteelGrade) : undefined;
}

export async function POST(request: Request) {
  let locale: Locale = "nb";
  try {
    const body = await request.json();
    const {
      run_id,
      input_review,
      agent_a_output,
      agent_b_output,
      comparison_result,
    } = body;
    locale = coerceLocale(body.locale);
    const engineeringContext = parseEngineeringContextPayload(body.engineering_context);

    if (!run_id || !agent_a_output || !comparison_result) {
      return Response.json(
        { error: "Manglar run_id, agent_a_output, eller comparison_result" },
        { status: 400 }
      );
    }

    // ── NA-grunnlag: same autoritative tabell konstruktørane fekk, slik at
    //    Controller sin NA-sjekk er eit oppslag og ikkje ein minne-recall.
    const profileBlob = JSON.stringify(input_review ?? {});
    const mentionedProfiles = extractMentionedProfiles(profileBlob);
    const grade = resolveSteelGrade(input_review);
    const naBasisBlock = buildNaBasisPromptBlock({
      profiles: mentionedProfiles,
      grade,
    });

    // ── Deterministisk forhåndskontroll (lag 1). Kode, ikkje LLM.
    const naDeviations = [
      ...checkNaDeviations(agent_a_output, "A"),
      ...checkNaDeviations(agent_b_output, "B"),
    ];
    const motstrid: string[] = Array.isArray(
      (input_review as { motstrid?: unknown })?.motstrid
    )
      ? ((input_review as { motstrid: string[] }).motstrid)
      : [];
    const loadComboDeviations = checkLoadCombination(
      input_review,
      agent_a_output,
      agent_b_output
    );

    let forhandskontroll = "";
    if (
      naDeviations.length > 0 ||
      motstrid.length > 0 ||
      loadComboDeviations.length > 0
    ) {
      const lines = [
        "FORHÅNDSKONTROLL — DETERMINISTISKE FUNN (frå kode, verifisert, ikkje LLM):",
      ];
      if (motstrid.length > 0) {
        lines.push("Motstrid flagga av Tolkar:");
        for (const m of motstrid) lines.push(`  - ${m}`);
      }
      if (naDeviations.length > 0) {
        lines.push("NA-avvik — konstruktør har brukt feil nasjonalt bestemt verdi:");
        for (const d of naDeviations) {
          lines.push(
            `  - Engineer ${d.agent}: ${d.key} = ${d.brukt} ` +
              `(norsk NA krev ${d.korrekt})`
          );
        }
      }
      if (loadComboDeviations.length > 0) {
        lines.push(
          "Kombinasjonsstruktur-avvik — konstruktør har rapportert feil " +
            "dimensjonerande lastverknad (Ed_dim):"
        );
        for (const d of loadComboDeviations) {
          lines.push(
            `  - Engineer ${d.agent}: Ed_dim = ${d.reported} — korrekt ` +
              `STR-kombinasjon gjev ${d.correct.toFixed(2)} via ${d.governingEq}` +
              (d.leadingLoad ? ` (${d.leadingLoad} leiande)` : "")
          );
        }
      }
      lines.push(
        "decision_status kan IKKJE vere approved eller approved_with_warnings " +
          "når denne blokka finst. Minimum uncertain."
      );
      forhandskontroll = lines.join("\n") + "\n\n";
    }

    const userMessage = `${engineeringContextUserMessageBlock(engineeringContext)}${naBasisBlock}${forhandskontroll}TOLKAR SI VURDERING:
${JSON.stringify(input_review ?? {}, null, 2)}

KONSTRUKTØR A SITT SVAR:
${JSON.stringify(agent_a_output, null, 2)}

KONSTRUKTØR B SITT SVAR:
${JSON.stringify(agent_b_output ?? null, null, 2)}

SAMANLIKNAR SI VURDERING:
${JSON.stringify(comparison_result, null, 2)}

Vurder om resultatet kan visast til brukaren, og i kva form. Følg systeminstruksen.`;

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 5,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.3,
      system: [
        {
          type: "text",
          text: buildAgentSystemPrompt(SYSTEM_PROMPT, locale, engineeringContext),
          cache_control: { type: "ephemeral" },
        },
      ],
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
            ? "Controller nådde token-grensa før han fullførte JSON. Aukar max_tokens kan hjelpe."
            : "Klarte ikkje parse Controller sitt svar som JSON",
          raw: responseText,
          stop_reason: message.stop_reason,
        },
        { status: 500 }
      );
    }

    // ── Lag 2: kode-tvungen verdikt-grense. Ein prompt-instruks er ikkje
    //    tvingande — dette er det. Sjå applyControllerHardBlock.
    const hardBlockOutcome = applyControllerHardBlock(parsed, {
      naDeviations: naDeviations.length,
      motstrid: motstrid.length,
      loadCombo: loadComboDeviations.length,
    });
    parsed = hardBlockOutcome.decision;
    if (hardBlockOutcome.clamped) {
      console.warn("[agent-d] Hard-block override", {
        run_id,
        original: hardBlockOutcome.original,
        naDeviations,
        motstrid,
        loadComboDeviations,
      });
    }

    // ── Steg 5: live shadow-check. Den deterministiske lastkombinasjon-
    //    sjekken har alt køyrt; her loggar vi resultatet mot det
    //    endelege verdiktet, so den daglege agenten kan triagere
    //    FARLEG-FEIL-kandidatar. Rein observasjon — endrar ingenting.
    await recordShadowCheck({
      runId: run_id,
      checkId: "load_combination",
      deviations: loadComboDeviations.map((d) => ({
        got: d.reported,
        expected: d.correct,
        agent: d.agent,
      })),
      verdikt:
        typeof parsed.decision_status === "string"
          ? parsed.decision_status
          : null,
    });

    let supabase;
    try {
      supabase = getSupabase();
      await supabase.from("controller_decisions").insert({
        run_id,
        decision_status: parsed.decision_status,
        risk_level: parsed.risk_level,
        reason: parsed.reason,
        user_message: parsed.user_message,
        blocked_outputs: parsed.blocked_outputs ?? [],
        allowed_outputs: parsed.allowed_outputs ?? [],
        manual_review_required: parsed.manual_review_required ?? false,
        controller_notes: parsed.controller_notes ?? null,
        prompt_version: PROMPT_VERSION,
      });

      // Marker calculation_run som fullført — dette er siste steg i pipeline
      await supabase
        .from("calculation_runs")
        .update({
          run_status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run_id);
    } catch (dbError) {
      console.error("Klarte ikkje lagre controller_decision:", dbError);
    }

    return Response.json({ result: parsed });
  } catch (err) {
    console.error("Controller error:", err);
    const { message, status } = formatAnthropicError(err, "Controller", locale);
    return Response.json({ error: message }, { status });
  }
}
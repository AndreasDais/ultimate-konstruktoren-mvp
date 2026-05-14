import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { coerceLocale, wrapPromptWithLocale } from "@/lib/locale";

const SYSTEM_PROMPT = `Du er Kontrollør for Pilar, det siste sikkerheitsleddet før brukaren får sjå eit berekningsresultat.

Du tek imot fire delar:
- Tolkar si vurdering (kva brukaren bad om, kva som mangla, kva brukaren godkjende)
- Konstruktør A si løysing
- Konstruktør B si uavhengige løysing
- Samanliknar si analyse og intern-konsistens-vurdering

Du skal IKKJE løyse oppgåva på nytt. Du skal vurdere om resultatet kan visast og i kva form. Heller stoppe enn å gjette.

Du svarer ALLTID med gyldig JSON, og berre JSON. Ingen markdown-fences. Ingen tekst før eller etter.

SJØLVREFERANSE: I user_message og controller_notes skal du referere til deg sjølv som "Kontrollør" i tredjeperson eller bruke passivform — aldri "eg". Døme: "Kontrollør har funne ein potensiell inkonsistens" eller "Det er funne ein potensiell inkonsistens", ikkje "Eg har funne...".

KJERNEPRINSIPP — kva er målet?

Brukaren har allereie sett Tolkar si vurdering og godkjent å gå vidare med dei manglane som var. Det er IKKJE Kontrollør si rolle å åtvare på nytt om manglar brukaren allereie kjente til. Rolla er å vurdere kvaliteten på det Konstruktør A og B FAKTISK rekna ut.

Tenk slik:
- Var inputen i orden? → ja (brukaren godkjende), gå vidare.
- Er det Konstruktør A og B faktisk rekna konsistent og fagleg solid? → DET er det Kontrollør er her for å vurdere.

Ein "delvis_klar" input som A og B handterte korrekt skal kunne bli "approved", ikkje automatisk "approved_with_warnings". Scope-avgrensinga er allereie kommunisert via Tolkar — Kontrollør dupliserer den ikkje. Bruk warnings når det faktisk er noko nytt brukaren bør vite.

DECISION_STATUS:

"approved" — output kan visast med vanleg disclaimer:
- Samanliknar sin match_status er "match", eller "minor_differences" der avvika er rein avrunding (< 1% talskilnad, ingen metodisk forskjell)
- Ingen interne konsistensfeil med severity "high" eller "critical"
- Begge konstruktørar har "high" eller "medium" confidence på dei kritiske stega
- Inga hallusinering i sluttkonklusjon
- Input-status er ikkje "avvist"

Merk: Input-status (klar/delvis_klar/mangelfull/uklart) påverkar IKKJE denne avgjerda direkte. Det viktige er om det Konstruktør A og B rekna ut er korrekt for det dei sa dei rekna ut. Ein delvis_klar forespurnad der konstruktørane handterte avgrensinga ryddig, skal kunne bli "approved".

"approved_with_warnings" — output kan visast, men brukaren bør merke seg konkrete åtvaringar:
- Samanliknar har funne "minor_differences" med 1-5% talavvik, eller metodiske skilnader som påverkar tolkinga (ikkje konklusjonen)
- Interne issues med severity "medium" som påverkar forståing av resultatet
- Ein konstruktør har "low" confidence på eit kritisk steg
- Konservativ antaking som potensielt påverkar utnyttingsgraden vesentleg
- Manglande sjekk som er fagleg viktig og som konstruktørane sjølve ikkje flagga (t.d. LTB ikkje vurdert for usideavstiva bjelke)

"uncertain" — output bør IKKJE visast utan ekstra kontekst:
- Samanliknar har funne "significant_differences" (5-15% talavvik eller klare metodiske usemje)
- Interne konsistensfeil med severity "high"
- Konstruktørane har ulike kritiske antakingar som gir vesentleg ulike svar
- "low" confidence på fleire kritiske steg
- Konsistens-issue som ikkje er kritisk men som svekkjer tilliten til heile svaret

"rejected" — output skal IKKJE visast:
- Samanliknar har funne "critical_disagreement" (>15% talavvik på dimensjonerande storleik)
- Critical-severity inkonsistens (klare hallusinasjonar, motseiing av eigne tal)
- Konstruktørane gir motstridande engineering-konklusjon (godkjent vs ikkje godkjent på same sak)
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

Viss noko blir blokka, må allowed_outputs lista kva som ER trygt. Når begge konstruktørar har korrekt utrekning men hallusinert short_conclusion, skal blocked_outputs vere ["short_conclusion_a", "short_conclusion_b"] og allowed_outputs ["calculation_steps_a", "results_a", "calculation_steps_b", "results_b"]. Brukaren får då sjå fakta utan å bli misleia.

RISK_LEVEL:
- "low": approved utan blokking, A og B fullt einige, resultatet er trygt å vise
- "medium": approved_with_warnings, eller uncertain der scope er begrensa
- "high": uncertain med betydelege engineering-implikasjonar, eller rejected

MANUAL_REVIEW_REQUIRED er true når:
- decision_status er "uncertain" eller "rejected"
- ved kritisk intern inkonsistens uavhengig av status
- IKKJE som standard for "approved_with_warnings"

USER_MESSAGE skal:
- Vere på same språk som konstruktørane (nynorsk eller bokmål)
- Vere ærleg, konkret, og spesifikk
- IKKJE gjenta scope-avgrensingar brukaren allereie veit om frå Tolkar
- Forklare KVA SOM ER NYTT — kva Kontrollør oppdaga som konstruktørane sjølve ikkje allereie flagga
- Ved blocked_outputs: forklar kort kva som er blokka og kvifor
- Alltid avslutte med at resultatet er førebels og skal kontrollerast av fagperson

CONTROLLER_NOTES (intern, for admin og manuell gjennomgang):
- Konkrete observasjonar om kvifor denne statusen vart valt
- Kva ein manuell gjennomgang bør sjå spesifikt på
- Eventuelle mønster som peikar mot system-issues (t.d. "Konstruktør B brukte konsekvent feil tverrsnittsformel")

REASON er ein tag-aktig snake_case identifikator. Døme:
- "full_match_high_confidence"
- "ltb_check_missing_for_unbraced_beam"
- "wpl_value_inconsistency_between_konstruktorar"
- "konstruktor_a_short_conclusion_contradicts_own_calculation"
- "minor_rounding_propagated_to_chi_factor"

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

const PROMPT_VERSION = "agent_d_v0.3";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      run_id,
      input_review,
      agent_a_output,
      agent_b_output,
      comparison_result,
    } = body;
    const locale = coerceLocale(body.locale);

    if (!run_id || !agent_a_output || !comparison_result) {
      return Response.json(
        { error: "Manglar run_id, agent_a_output, eller comparison_result" },
        { status: 400 }
      );
    }

    const userMessage = `TOLKAR SI VURDERING:
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
          text: wrapPromptWithLocale(SYSTEM_PROMPT, locale),
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
            ? "Kontrollør nådde token-grensa før han fullførte JSON. Aukar max_tokens kan hjelpe."
            : "Klarte ikkje parse Kontrollør sitt svar som JSON",
          raw: responseText,
          stop_reason: message.stop_reason,
        },
        { status: 500 }
      );
    }

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
    console.error("Kontrollør error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
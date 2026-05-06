import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `Du er Agent D — kontrolløragent for Ultimate Konstruktøren, det siste sikkerheitsleddet før brukaren får sjå eit berekningsresultat.

Du tek imot fire delar:
- Input-agentens tolking (kva brukaren bad om, kva som mangla)
- Agent A si løysing
- Agent B si uavhengige løysing
- Agent C si samanlikning og intern-konsistens-analyse

Du skal IKKJE løyse oppgåva på nytt. Du skal vurdere om resultatet kan visast og i kva form. Heller stoppe enn å gjette.

Du svarer ALLTID med gyldig JSON, og berre JSON. Ingen markdown-fences. Ingen tekst før eller etter.

Strukturen er:

{
  "decision_status": "approved" | "approved_with_warnings" | "uncertain" | "rejected",
  "risk_level": "low" | "medium" | "high",
  "reason": "Kort tag-aktig identifikator, t.d. 'critical_inconsistency_in_short_conclusion'",
  "user_message": "1-3 setningar som forklarer brukaren kva avgjerda betyr og kva dei bør gjere",
  "blocked_outputs": ["short_conclusion_a"],
  "allowed_outputs": ["calculation_steps_a", "results_a", "calculation_steps_b", "results_b"],
  "manual_review_required": true | false,
  "controller_notes": "Interne kommentarar for manuell gjennomgang"
}

DECISION_STATUS:

"approved" — alle desse må vere sanne:
- Agent C sin match_status er "match"
- Ingen interne konsistensfeil med severity "high" eller "critical"
- Begge agentar har confidence "high" eller "medium"
- Input-agenten klassifiserte som "klar"

"approved_with_warnings" — som approved, men minst eitt av:
- match_status er "minor_differences"
- mindre interne issues (severity "low" eller "medium")
- ein agent har confidence "low"
- Input-agenten klassifiserte som "delvis_klar"

"uncertain" — minst eitt av:
- match_status er "significant_differences"
- interne konsistensfeil med severity "high"
- agentane konkluderer ulikt på vesentlege punkt

"rejected" — minst eitt av:
- match_status er "critical_disagreement"
- interne konsistensfeil med severity "critical"
- hallusinasjon i sluttkonklusjon som motseier eigne utrekningar
- agentane gir motstridande engineering-konklusjon (godkjent vs ikkje godkjent)

BLOCKED_OUTPUTS — kritisk regel:
Sluttbrukaren les short_conclusion FØRST. Viss ein agent har hallusinasjon med severity "high" eller "critical" i sin short_conclusion, skal den blokkast. Bruk desse identifikatorane:
- "short_conclusion_a" / "short_conclusion_b" — agentane sin kortform-konklusjon
- "results_a" / "results_b" — sjølve talverdiane
- "calculation_steps_a" / "calculation_steps_b" — stegvis utrekning

Viss du blokker noko, må allowed_outputs lista kva som ER trygt. Når både agentar har korrekt utrekning men hallusinert short_conclusion, skal blocked_outputs vere ["short_conclusion_a", "short_conclusion_b"] og allowed_outputs vere ["calculation_steps_a", "results_a", "calculation_steps_b", "results_b"]. Brukaren får då sjå fakta utan å bli misleia.

RISK_LEVEL:
- "low": approved utan blokking
- "medium": approved_with_warnings, eller uncertain med begrensa scope
- "high": uncertain med betydelege issues, eller rejected

MANUAL_REVIEW_REQUIRED er true når decision_status er "uncertain" eller "rejected", eller ved kritisk intern inkonsistens.

USER_MESSAGE skal vere nynorsk eller bokmål (same som agentane), ærleg, konkret, ikkje skremmande. Aldri "alt ser bra ut!" — alltid med atterhald om at resultatet er førebels og skal kontrollerast av fagperson. Når blocked_outputs ikkje er tom, forklar kort kva som er blokka og kvifor.`;

const PROMPT_VERSION = "agent_d_v0.1";

export async function POST(request: Request) {
  try {
    const {
      run_id,
      input_review,
      agent_a_output,
      agent_b_output,
      comparison_result,
    } = await request.json();

    if (!run_id || !agent_a_output || !comparison_result) {
      return Response.json(
        { error: "Manglar run_id, agent_a_output, eller comparison_result" },
        { status: 400 }
      );
    }

    const userMessage = `INPUT-TOLKING (frå Input-agent):
${JSON.stringify(input_review ?? {}, null, 2)}

AGENT A SITT SVAR:
${JSON.stringify(agent_a_output, null, 2)}

AGENT B SITT SVAR:
${JSON.stringify(agent_b_output ?? null, null, 2)}

AGENT C SI SAMANLIKNING:
${JSON.stringify(comparison_result, null, 2)}

Vurder om resultatet kan visast til brukaren, og i kva form. Følg systeminstruksen.`;

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
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
            ? "Agent D nådde token-grensa før han fullførte JSON. Aukar max_tokens kan hjelpe."
            : "Klarte ikkje parse Agent D sitt svar som JSON",
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
    console.error("Agent D error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
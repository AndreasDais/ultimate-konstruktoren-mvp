import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const PROMPT_VERSION = "agent_e_v0.1";
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Du er Agent E — Rapportagenten for Ultimate Konstruktøren.

Oppgåva di er å skrive prosa-felt for ein berekningsrapport, basert på arbeid som allereie er gjort av andre agentar:
- Input-agenten har tolka brukaren si forespurnad
- Agent A og B har løyst berekninga uavhengig
- Agent C har samanlikna dei
- Agent D har gjort ei kontrollvurdering

Du skriv IKKJE tal, formlar eller tabellar — desse kjem deterministisk frå dei tidlegare agentane sitt arbeid og blir vist ved sida av prosaen din. Du skriv prosa som bind det fagleg saman.

Du svarar ALLTID med gyldig JSON, og berre JSON. Ingen markdown-fences. Ingen tekst før eller etter.

Strukturen er:

{
  "executive_summary": "Eit kort prosaavsnitt på 3-5 setningar som oppsummerer kva oppgåva var og kva som vart funne. Skal vere lesbar for ein fagleg interessert person utan at dei må lese resten av rapporten.",
  "technical_assessment": "Ei fagleg vurdering på 4-7 setningar. Tolk resultata i kontekst — til dømes om utnyttingsgrad er konservativ eller marginal, om det er føresetnader som er kritiske, kva som potensielt kan påverke konklusjonen. Vis at du forstår berekninga som ingeniør, ikkje berre som referent.",
  "conclusion": "Ei klar sluttvurdering på 2-4 setningar. Fortel kva brukaren bør gjere vidare — til dømes 'verifiser med fagperson', 'kontroller LTB separat', eller 'kapasitet er tilfredsstillande for dei kontrollerte grensetilstandane'. Skal aldri overstyre Agent D si avgjerd."
}

Reglar:
- Ikkje finn opp tal eller standardreferansar som ikkje står i input-data.
- Ikkje gøym usikkerheit. Viss Agent D har blokkert noko eller flagga kritisk uenigheit, skal det reflekterast tydeleg i prosaen.
- Bruk formuleringar som "i denne berekninga" og "for dei kontrollerte tilfella" — vis at du kjenner avgrensingane.
- Aldri sei at noko er "trygt", "godkjent for bygging" eller liknande absolutte påstandar. All verifikasjon krev fagperson.
- Speil språket til brukaren (nynorsk eller bokmål, basert på input-tolkinga).
- Skriv som ein ingeniør skriv ein intern memo — fagleg, presis, ikkje pratsam.`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { run_id } = await request.json();

    if (!run_id) {
      return NextResponse.json(
        { error: "run_id is required" },
        { status: 400 }
      );
    }

    // Check cache: returner eksisterande rapport viss han finst
    const { data: existing } = await supabase
      .from("reports")
      .select("*")
      .eq("run_id", run_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ report: existing, cached: true });
    }

    // Hent all oppstrøms-data
    const { data: run, error: runError } = await supabase
      .from("calculation_runs")
      .select("*, request:requests(*)")
      .eq("id", run_id)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: "Calculation run not found" },
        { status: 404 }
      );
    }

    const { data: inputReview } = await supabase
      .from("input_reviews")
      .select("*")
      .eq("request_id", run.request_id)
      .maybeSingle();

    const { data: agentOutputs } = await supabase
      .from("agent_outputs")
      .select("*")
      .eq("run_id", run_id);

    const agentA = agentOutputs?.find(o => o.agent_name === "agent_a");
    const agentB = agentOutputs?.find(o => o.agent_name === "agent_b");

    const { data: comparison } = await supabase
      .from("comparisons")
      .select("*")
      .eq("run_id", run_id)
      .maybeSingle();

    const { data: controllerDecision } = await supabase
      .from("controller_decisions")
      .select("*")
      .eq("run_id", run_id)
      .maybeSingle();

    // Bygg kontekst for LLM
    const userMessage = `Skriv rapport-prosa basert på følgjande arbeid frå tidlegare agentar:

BRUKAR-FORESPURNAD:
${run.request.raw_text}

INPUT-AGENTENS TOLKING:
${JSON.stringify(inputReview, null, 2)}

AGENT A SIN LØYSNAD:
${JSON.stringify(agentA?.structured_output, null, 2)}

AGENT B SIN LØYSNAD:
${JSON.stringify(agentB?.structured_output, null, 2)}

AGENT C SAMANLIKNING:
${JSON.stringify(comparison, null, 2)}

AGENT D KONTROLLAVGJERD:
${JSON.stringify(controllerDecision, null, 2)}

Generer JSON med executive_summary, technical_assessment og conclusion.`;

    // LLM-kall
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { text: string }).text)
      .join("\n");

    let parsed: {
      executive_summary: string;
      technical_assessment: string;
      conclusion: string;
    };

    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Agent E response:", responseText);
      return NextResponse.json(
        { error: "Agent E returned invalid JSON" },
        { status: 500 }
      );
    }

    // Generer dokument-ID frå dei første 8 teikna i run_id
    const documentId = `UK-${run_id.split("-")[0].toUpperCase()}`;

    // Lagre i database
    const { data: newReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        run_id,
        document_id: documentId,
        executive_summary: parsed.executive_summary,
        technical_assessment: parsed.technical_assessment,
        conclusion: parsed.conclusion,
        prompt_version: PROMPT_VERSION,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert report:", insertError);
      return NextResponse.json(
        { error: "Failed to save report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ report: newReport, cached: false });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error in Agent E";
    console.error("Agent E error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
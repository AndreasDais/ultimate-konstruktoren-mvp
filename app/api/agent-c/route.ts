import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { coerceLocale, type Locale } from "@/lib/locale";
import { buildAgentSystemPrompt, engineeringContextUserMessageBlock, parseEngineeringContextPayload } from "@/lib/engineering-context/agent";
import { isInternationalEnglishContext } from "@/lib/international/display";
import {
  compareResults,
  normalizeResultKey,
  type ResultComparison,
} from "@/lib/compare/result-compare";
import { normalizeConsistencyIssues } from "@/lib/compare/consistency-issues";
import { PIPELINE_MODEL } from "@/lib/models";
import { recordStepMetric } from "@/lib/step-metrics";

const SPRINT338_INTERNATIONAL_COMPARATOR_LANGUAGE_RULE = "\n\nSPRINT 33.8 INTERNATIONAL COMPARATOR LANGUAGE RULE:\nIf the engineering context is international, United States, AISC, ASCE, ACI, imperial, or the user asks in English, all Comparator output MUST be English.\nUse only these role names: Engineer A, Engineer B, Comparator, Controller.\nNever write Norwegian or Nynorsk comparator prose such as Engineer, Comparator, Controller, assumption, antaking, utrekning, forskjell, while, only, begge engineers, or norsk/nynorsk sentence structure.\nIf comparing methods, write complete English sentences.\nDo not provide numerical typical AISC Manual ranges such as Lp/Lr/Cb unless values are verified input or retrieved from an approved data source.\n";


const SYSTEM_PROMPT = `Du er Comparator for Pilar, eit AI-basert verktøy for norsk byggfagleg praksis.

Du tek imot to uavhengige løysingar (frå Engineer A and Engineer B) som har løyst SAME problem utan å sjå kvarandre sine svar. Oppgåva di er å samanlikne dei og finne alle forskjellar — numerisk, metodisk, og i antakingar.

Du skal IKKJE løyse oppgåva sjølv. Du skal IKKJE seie kven av dei som har "rett" — du skal beskrive forskjellane og klassifisere alvorlegheit.

Du svarar ALLTID med gyldig JSON, og only JSON. Ingen markdown-fences. Ingen tekst før eller etter.

SJØLVREFERANSE: I summary og andre prosa-felt skal du referere til deg sjølv som "Comparator" i tredjeperson eller bruke passivform — aldri "eg". Dei to løysingane skal alltid omtalast som "Engineer A" og "Engineer B", aldri som "Agent A/B".

I TILLEGG til å samanlikne A vs B, skal du sjekke INTERN KONSISTENS i kvar konstruktør:
- Stemmer short_conclusion med tala i results?
- Stemmer tala i calculation_steps med dei i results?
- Stemmer konklusjonen i short_conclusion med konklusjonen i results-feltet?

Dette er kritisk: ein konstruktør kan ha rett i utrekninga si men hallusinert tal i kort_svaret. Sluttuse les kort_svar først — så hallusinasjon der er farlegare enn ein liten avvik i mellomrekninga.

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
      "likely_cause": "Kort forklaring på sannsynleg årsak — bruk 'Engineer A' og 'Engineer B' i fritekst"
    }
  ],
  "unpaired_keys": { "only_a": [], "only_b": [] },
  "method_differences": ["forskjellar i metode/formelbruk/standardreferanse — bruk 'Engineer A' og 'Engineer B' når du refererer til dei"],
  "assumption_differences": ["forskjellar i assumptioner brukt — bruk 'Engineer A' og 'Engineer B' når du refererer til dei"],
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
  "summary": "2-3 setningar fagleg samanlikning som forklarer kva useen bør vere merksam på — bruk 'Engineer A' og 'Engineer B' når du refererer til dei to løysingane"
}

MERK: JSON-nøklane "agent_a_value", "agent_b_value", "internal_consistency_issues.agent_a", "internal_consistency_issues.agent_b" er kode-identifikatorar — desse skal IKKJE endrast. Det er only fritekst-feltet (method_differences-strenger, assumption_differences-strenger, summary, og likely_cause) som skal bruke "Engineer A/B"-terminologi.

DETERMINISTISK TALJAMFØRING:
I user-meldinga får du ei blokk «DETERMINISTISK TALJAMFØRING» som er rekna i kode. Den er autoritativ — du skal ikkje rekne taljamføringa sjølv.
- numeric_differences skal innehalde NØYAKTIG dei para nøklane frå blokka, med percent_diff-verdiane derifrå. Ikkje rekn percent_diff på nytt.
- IKKJE lag numeric_differences-rader for nøklar som blokka listar som «only rapportert av A» eller «only rapportert av B». Slike nøklar er ikkje avvik — dei er rapporterings-hol.
- unpaired_keys-feltet fyller du frå dei to «only rapportert av»-listene i blokka.
- Du skal framleis sjølv vurdere likely_cause, severity, method_differences, assumption_differences, internal_consistency_issues, recommended_status og summary.

Klassifiseringsreglar:

Numeriske forskjellar:
- < 0,5% er "low" (typisk avrunding)
- 0,5% - 5% er "low" til "medium" (rounding eller mindre metodisk val)
- 5% - 15% er "medium" til "high" (truleg metodisk forskjell, krev forklaring)
- > 15% er "critical" (signifikant fagleg uenigheit)

Intern konsistens:
- Forskjell mellom short_conclusion-tal og results-tal er ALLTID minst "high" — det er hallusinasjon
- Forskjell i konklusjon (held vs held ikkje) er ALLTID "critical"
- internal_consistency_issues.agent_a og .agent_b skal innehalde NØYAKTIG éi oppføring per FAKTISK inkonsistens. Finn du ingen inkonsistens hjå ein konstruktør, skal lista vere TOM ([]). Legg ALDRI inn ei oppføring som only seier "ingen inkonsistensar funne", "alt stemmer" e.l. — ei tom liste ER svaret "ingen funne". Ein placeholder-oppføring blir feilaktig talt som ein inkonsistens.

match_status:
- "match": no differencear > 0,5%, ingen interne inkonsistensar
- "minor_differences": only lave numeriske forskjellar, kan vere mindre interne issues
- "significant_differences": medium/high numeriske forskjellar ELLER medium/high interne issues
- "critical_disagreement": kritiske numeriske forskjellar ELLER ulike sluttkonklusjonar

recommended_status:
- "approved_preliminary": match eller minor_differences UTAN kritiske inkonsistensar
- "uncertain": significant_differences — bør sjåast på, men kanskje OK
- "rejected_needs_review": critical_disagreement eller alvorlege inkonsistensar

Bruk nynorsk eller bokmål — same språk som Engineer A and Engineer B brukte.`;

/**
 * Formaterer den deterministiske jamføringa som ei tekstblokk for prompten.
 * Para nøklar med kode-rekna avvik + listene over upara nøklar.
 */
function buildEnglishComparisonBlock(cmp: ResultComparison): string {
  const lines: string[] = [
    "DETERMINISTIC NUMERICAL COMPARISON (computed in code — authoritative; do not recalculate):",
  ];
  if (cmp.paired.length > 0) {
    lines.push("Paired keys reported by BOTH engineers:");
    for (const p of cmp.paired) {
      const pd =
        p.percentDiff === null
          ? "non-numeric"
          : `${(Math.round(p.percentDiff * 10) / 10).toFixed(1)} %`;
      lines.push(`  ${p.key}: A = ${p.aValue} / B = ${p.bValue} -> ${pd}`);
    }
  } else {
    lines.push("Paired keys: none.");
  }
  lines.push(
    cmp.onlyA.length > 0
      ? `Keys reported ONLY by Engineer A: ${cmp.onlyA.join(", ")}`
      : "Keys reported only by Engineer A: none.",
  );
  lines.push(
    cmp.onlyB.length > 0
      ? `Keys reported ONLY by Engineer B: ${cmp.onlyB.join(", ")}`
      : "Keys reported only by Engineer B: none.",
  );
  return lines.join("\n") + "\n";
}

function buildComparisonBlock(cmp: ResultComparison): string {
  const lines: string[] = [
    "DETERMINISTISK TALJAMFØRING (rekna i kode — autoritativ, ikkje rekn sjølv):",
  ];
  if (cmp.paired.length > 0) {
    lines.push("Para nøklar (rapportert av BEGGE engineers):");
    for (const p of cmp.paired) {
      const pd =
        p.percentDiff === null
          ? "ikkje-numerisk"
          : `${(Math.round(p.percentDiff * 10) / 10).toFixed(1)} %`;
      lines.push(`  ${p.key}: A = ${p.aValue} / B = ${p.bValue} -> ${pd}`);
    }
  } else {
    lines.push("Para nøklar: ingen.");
  }
  lines.push(
    cmp.onlyA.length > 0
      ? `Nøklar rapportert BERRE av Engineer A: ${cmp.onlyA.join(", ")}`
      : "Nøklar rapportert only av Engineer A: ingen.",
  );
  lines.push(
    cmp.onlyB.length > 0
      ? `Nøklar rapportert BERRE av Engineer B: ${cmp.onlyB.join(", ")}`
      : "Nøklar rapportert only av Engineer B: ingen.",
  );
  return lines.join("\n") + "\n";
}

const PROMPT_VERSION = "agent_c_v0.3";

export async function POST(request: Request) {
  let locale: Locale = "nb";
  try {
    const { run_id, agent_a_output, agent_b_output, locale: rawLocale, engineering_context } = await request.json();
    locale = coerceLocale(rawLocale);
    const engineeringContext = parseEngineeringContextPayload(engineering_context);
    const comparatorEnglishMode = isInternationalEnglishContext(engineeringContext);

    if (!run_id || !agent_a_output || !agent_b_output) {
      return Response.json(
        { error: "Manglar run_id, agent_a_output, eller agent_b_output" },
        { status: 400 }
      );
    }

    // === DETERMINISTISK TALJAMFØRING (kode, ikkje LLM) ===
    const comparison: ResultComparison = compareResults(
      (agent_a_output as { results?: Record<string, string> })?.results,
      (agent_b_output as { results?: Record<string, string> })?.results,
    );
    const comparisonBlock = comparatorEnglishMode ? buildEnglishComparisonBlock(comparison) : buildComparisonBlock(comparison);

    // === BYGG USER MESSAGE ===
    const userMessage = comparatorEnglishMode
      ? `${engineeringContextUserMessageBlock(engineeringContext)}ENGINEER A OUTPUT:
${JSON.stringify(agent_a_output, null, 2)}

ENGINEER B OUTPUT:
${JSON.stringify(agent_b_output, null, 2)}

${comparisonBlock}
Compare these two solutions systematically according to the system instruction. Also check internal consistency in each engineer. In every user-facing prose field (method_differences, assumption_differences, summary, likely_cause), use English only and refer to the two solutions as "Engineer A" and "Engineer B" — never "Engineer", "Comparator", "Comparator", or "Agent A/B".`
      : `${engineeringContextUserMessageBlock(engineeringContext)}ENGINEER A RESPONSE:
${JSON.stringify(agent_a_output, null, 2)}

ENGINEER B RESPONSE:
${JSON.stringify(agent_b_output, null, 2)}

${comparisonBlock}
Samanlikne desse to løysingane systematisk i samsvar med systeminstruksen. Sjekk også intern konsistens i kvar konstruktør. Hugs at i alle prosa-felt (method_differences, assumption_differences, summary, likely_cause) skal dei to løysingane omtalast som "Engineer A" og "Engineer B" — aldri "Agent A/B".`;

    // === KALL CLAUDE ===
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 5,
    });

    const t0 = Date.now();
    const message = await client.messages.create({
      model: PIPELINE_MODEL,
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: buildAgentSystemPrompt(SYSTEM_PROMPT, locale, engineeringContext),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    await recordStepMetric({
      runId: run_id,
      stepName: "samanliknar",
      message,
      promptVersion: PROMPT_VERSION,
      latencyMs: Date.now() - t0,
      ok: message.stop_reason !== "max_tokens",
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
            ? "Comparator nådde token-grensa før han fullførte JSON. Aukar max_tokens kan hjelpe."
            : "Klarte ikkje parse Comparator sitt svar som JSON",
          raw: responseText,
          stop_reason: message.stop_reason,
        },
        { status: 500 }
      );
    }

    // === DETERMINISTISK OVERSTYRING (kode er fasit for tala) ===
    // Sett unpaired_keys frå koden — aldri frå LLM-en.
    parsed.unpaired_keys = {
      only_a: comparison.onlyA,
      only_b: comparison.onlyB,
    };
    // Bygg oppslag: normalisert nøkkel -> kode-rekna para felt.
    const pairedByNorm = new Map(
      comparison.paired.map((p) => [normalizeResultKey(p.key), p]),
    );
    const unpairedNorm = new Set(
      [...comparison.onlyA, ...comparison.onlyB].map(normalizeResultKey),
    );
    if (Array.isArray(parsed.numeric_differences)) {
      parsed.numeric_differences = parsed.numeric_differences
        // F1: dropp rader for nøklar only éin konstruktør rapporterte.
        .filter(
          (d: { field?: unknown }) =>
            !unpairedNorm.has(normalizeResultKey(String(d.field ?? ""))),
        )
        // F9: overstyr tala med dei kode-rekna verdiane for para nøklar.
        .map((d: Record<string, unknown>) => {
          const hit = pairedByNorm.get(
            normalizeResultKey(String(d.field ?? "")),
          );
          if (!hit) return d;
          return {
            ...d,
            agent_a_value: hit.aValue,
            agent_b_value: hit.bValue,
            percent_diff:
              hit.percentDiff === null
                ? (d.percent_diff ?? null)
                : Math.round(hit.percentDiff * 10) / 10,
          };
        });
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
        internal_consistency_issues: normalizeConsistencyIssues(
          parsed.internal_consistency_issues,
        ),
        recommended_status: parsed.recommended_status,
        summary: parsed.summary,
        prompt_version: PROMPT_VERSION,
      });
    } catch (dbError) {
      console.error("Klarte ikkje lagre comparison:", dbError);
    }

    return Response.json({ result: parsed });
  } catch (err) {
    console.error("Comparator error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
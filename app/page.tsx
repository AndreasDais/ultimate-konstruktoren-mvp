"use client";

import { useState } from "react";

type AgentResult = {
  status: string;
  berekningstype: string | null;
  fagomraade: string | null;
  tolkte_verdiar: Record<string, string>;
  manglande_verdiar: string[];
  kan_reknast_no: string[];
  kan_ikkje_reknast: string[];
  antakingar: string[];
  tolkings_oppsummering: string;
  konfidens: number;
};

type CalculationStep = {
  title: string;
  text: string;
};

type CalculationResult = {
  short_conclusion: string;
  assumptions: string[];
  calculation_steps: CalculationStep[];
  results: Record<string, string>;
  limitations: string[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
};

type ConsistencyIssue = {
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
};

type NumericDifference = {
  field: string;
  agent_a_value: string;
  agent_b_value: string;
  percent_diff: number;
  severity: "low" | "medium" | "high" | "critical";
  likely_cause: string;
};

type ComparisonResult = {
  match_status: "match" | "minor_differences" | "significant_differences" | "critical_disagreement";
  numeric_differences: NumericDifference[];
  method_differences: string[];
  assumption_differences: string[];
  internal_consistency_issues: {
    agent_a: ConsistencyIssue[];
    agent_b: ConsistencyIssue[];
  };
  recommended_status: "approved_preliminary" | "uncertain" | "rejected_needs_review";
  summary: string;
};

type Phase = "input" | "result" | "calculating" | "calculation_result";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [calculationA, setCalculationA] = useState<CalculationResult | null>(null);
  const [calculationB, setCalculationB] = useState<CalculationResult | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/input-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Noko gjekk galt");
        return;
      }

      setResult(data.result);
      setRequestId(data.request_id);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setResult(null);
    setRequestId(null);
    setCalculationA(null);
    setCalculationB(null);
    setComparison(null);
    setError(null);
    setPhase("input");
  };
  
  const handleCancel = () => {
    setInput("");
    setResult(null);
    setRequestId(null);
    setCalculationA(null);
    setCalculationB(null);
    setError(null);
    setPhase("input");
  };

  const handleStartCalculation = async () => {
    if (!result || !requestId) return;
  
    setPhase("calculating");
    setError(null);
    setCalculationA(null);
    setCalculationB(null);
    setComparison(null);
  
    try {
      // Steg 1: Agent A
      const responseA = await fetch("/api/agent-a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          input_review: result,
        }),
      });
  
      const dataA = await responseA.json();
  
      if (!responseA.ok) {
        setError(dataA.error || "Agent A klarte ikkje løyse oppgåva");
        setPhase("result");
        return;
      }
  
      setCalculationA(dataA.result);
  
      // Steg 2: Agent B
      const responseB = await fetch("/api/agent-b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: dataA.run_id,
          input_review: result,
        }),
      });
  
      const dataB = await responseB.json();
  
      if (!responseB.ok) {
        console.error("Agent B feila:", dataB.error);
        setError(`Agent B feila: ${dataB.error}. Hoppar over samanlikning.`);
        setPhase("calculation_result");
        return;
      }
  
      setCalculationB(dataB.result);
  
      // Steg 3: Agent C — samanliknar A og B
      const responseC = await fetch("/api/agent-c", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: dataA.run_id,
          agent_a_output: dataA.result,
          agent_b_output: dataB.result,
        }),
      });
  
      const dataC = await responseC.json();
  
      if (!responseC.ok) {
        console.error("Agent C feila:", dataC.error);
        // Vi har framleis A og B — vis dei utan samanlikning
        setError(`Agent C feila: ${dataC.error}. Viser A og B utan samanlikning.`);
        setPhase("calculation_result");
        return;
      }
  
      setComparison(dataC.result);
      setPhase("calculation_result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setPhase("result");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Den Ultimate Konstruktøren
          </h1>
          <p className="mt-2 text-slate-600">
            AI-basert konstruksjonsassistent — tidleg utviklingsversjon
          </p>
        </header>

        <div className="mb-8 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Viktig merknad</h2>
          <p className="mt-2 text-sm text-amber-800 leading-relaxed">
            Dette er ein tidleg testversjon under utvikling. Resultata er ikkje
            kontrollerte og kan vere feilaktige. Verktøyet skal ikkje brukast
            som grunnlag for reell prosjektering, byggesøknader eller utføring.
            All berekning må kontrollerast av kvalifisert byggingeniør før
            praktisk bruk.
          </p>
        </div>

        {/* === FASE: INPUT === */}
        {phase === "input" && (
          <section>
            <label
              htmlFor="oppgave"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Skriv inn ei konstruksjonsoppgåve
            </label>
            <textarea
              id="oppgave"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              placeholder="Til dømes: Finn maksimalt moment og skjær for ein fritt opplagd bjelke med L = 5 m og jamt fordelt last q = 8 kN/m..."
              className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || loading}
              className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Tolkar..." : "Send til Input-agent"}
            </button>
          </section>
        )}

        {/* === FEIL === */}
        {error && (
          <section className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-900">Feil</h3>
            <p className="mt-1 text-sm text-red-800">{error}</p>
          </section>
        )}

        {/* === FASE: RESULT (Input-agent) === */}
        {phase === "result" && result && (
          <>
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Din forespørsel
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {input}
              </p>
            </section>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Input-agentens tolking
                </h3>
                <div className="text-right">
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-mono uppercase tracking-wider text-slate-700">
                    {result.status}
                  </span>
                  <div className="mt-1 text-xs text-slate-500 font-mono">
                    konfidens {result.konfidens?.toFixed(2)}
                  </div>
                </div>
              </div>

              <p className="text-slate-700">{result.tolkings_oppsummering}</p>

              {result.berekningstype && (
                <Row label="Berekningstype" value={result.berekningstype} />
              )}

              {Object.keys(result.tolkte_verdiar || {}).length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Tolkte verdiar
                  </div>
                  <ul className="text-sm text-slate-800 font-mono space-y-1">
                    {Object.entries(result.tolkte_verdiar).map(([k, v]) => (
                      <li key={k}>
                        {k} = {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.manglande_verdiar?.length > 0 && (
                <ListSection
                  label="Manglande data"
                  items={result.manglande_verdiar}
                  tone="warn"
                />
              )}

              {result.kan_reknast_no?.length > 0 && (
                <ListSection
                  label="Kan reknast no"
                  items={result.kan_reknast_no}
                />
              )}

              {result.kan_ikkje_reknast?.length > 0 && (
                <ListSection
                  label="Kan ikkje reknast enno"
                  items={result.kan_ikkje_reknast}
                />
              )}

              {result.antakingar?.length > 0 && (
                <ListSection label="Antakingar" items={result.antakingar} />
              )}
            </section>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-slate-600">
                  Stemmer tolkinga? Då kan du starte berekninga, eller endre
                  forespørselen.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleEdit}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Endre input
                  </button>
                  <button
                    onClick={handleStartCalculation}
                    disabled={result.status === "avvist"}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white font-medium hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Start berekning →
                  </button>
                </div>
              </div>
              {result.status === "avvist" && (
                <p className="mt-3 text-xs text-amber-800">
                  Inputen er klassifisert som avvist. Berekning kan ikkje
                  startast.
                </p>
              )}
            </section>
          </>
        )}

        {/* === FASE: CALCULATING === */}
        {phase === "calculating" && (
  <section className="rounded-lg border border-slate-200 bg-white p-12 text-center">
    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
    <h3 className="mt-4 text-lg font-semibold text-slate-900">
      {!calculationA
        ? "Agent A reknar..."
        : !calculationB
        ? "Agent B kontrollerer..."
        : "Agent C samanliknar..."}
    </h3>
    <p className="mt-2 text-sm text-slate-600">
      {!calculationA
        ? "Stegvis løysing med formlar og einingar."
        : !calculationB
        ? "Uavhengig løysing for dobbel-kontroll."
        : "Finn skilnader i metode, tal og intern konsistens."}
    </p>
    <div className="mt-4 flex items-center justify-center gap-4 text-xs">
      <div
        className={`flex items-center gap-2 ${
          calculationA ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            calculationA ? "bg-emerald-500" : "bg-slate-300"
          }`}
        ></span>
        Agent A
      </div>
      <div
        className={`flex items-center gap-2 ${
          calculationB ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            calculationB ? "bg-emerald-500" : "bg-slate-300"
          }`}
        ></span>
        Agent B
      </div>
      <div
        className={`flex items-center gap-2 ${
          comparison ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            comparison ? "bg-emerald-500" : "bg-slate-300"
          }`}
        ></span>
        Agent C
      </div>
    </div>
  </section>
)}

        {/* === FASE: CALCULATION_RESULT === */}
        {phase === "calculation_result" && calculationA && (
          <>
          {/* Verifikasjons-banner */}
{comparison && (
  <section
    className={`rounded-lg border-l-4 p-4 mb-6 ${
      comparison.match_status === "match"
        ? "border-emerald-500 bg-emerald-50"
        : comparison.match_status === "minor_differences"
        ? "border-amber-400 bg-amber-50"
        : comparison.match_status === "significant_differences"
        ? "border-orange-500 bg-orange-50"
        : "border-red-500 bg-red-50"
    }`}
  >
    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
      <h3
        className={`text-sm font-semibold uppercase tracking-wider ${
          comparison.match_status === "match"
            ? "text-emerald-900"
            : comparison.match_status === "minor_differences"
            ? "text-amber-900"
            : comparison.match_status === "significant_differences"
            ? "text-orange-900"
            : "text-red-900"
        }`}
      >
        {comparison.match_status === "match"
          ? "✓ Begge agentar er einige"
          : comparison.match_status === "minor_differences"
          ? "Mindre forskjellar"
          : comparison.match_status === "significant_differences"
          ? "Betydelege forskjellar"
          : "Kritisk uenigheit"}
      </h3>
      <span
        className={`text-xs font-mono uppercase tracking-wider rounded px-2 py-0.5 bg-white ${
          comparison.recommended_status === "approved_preliminary"
            ? "text-emerald-700"
            : comparison.recommended_status === "uncertain"
            ? "text-amber-700"
            : "text-red-700"
        }`}
      >
        {comparison.recommended_status === "approved_preliminary"
          ? "Førebels godkjent"
          : comparison.recommended_status === "uncertain"
          ? "Usikker"
          : "Krev gjennomgang"}
      </span>
    </div>
    <p
      className={`text-sm leading-relaxed ${
        comparison.match_status === "match"
          ? "text-emerald-900"
          : comparison.match_status === "minor_differences"
          ? "text-amber-900"
          : comparison.match_status === "significant_differences"
          ? "text-orange-900"
          : "text-red-900"
      }`}
    >
      {comparison.summary}
    </p>
  </section>
)}
            {/* Kort svar */}
            <section className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                Kort svar
              </h3>
              <p className="text-base text-emerald-900 font-medium">
                {calculationA.short_conclusion}
              </p>
            </section>

            {/* Resultat-objekt */}
            {Object.keys(calculationA.results || {}).length > 0 && (
              <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Resultat
                </h3>
                <div className="font-mono text-sm space-y-1">
                  {Object.entries(calculationA.results).map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-slate-500 w-24">{k}</span>
                      <span className="text-slate-900 font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Føresetnader */}
            {calculationA.assumptions?.length > 0 && (
              <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Føresetnader brukt
                </h3>
                <ul className="text-sm text-slate-800 list-disc list-inside space-y-1">
                  {calculationA.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Stegvis utrekning */}
            {calculationA.calculation_steps?.length > 0 && (
              <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Stegvis utrekning
                </h3>
                <ol className="space-y-5">
                  {calculationA.calculation_steps.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-sm flex items-center justify-center font-mono">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">
                          {step.title}
                        </h4>
                        <pre className="mt-1 text-sm text-slate-700 font-sans whitespace-pre-wrap">
                          {step.text}
                        </pre>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Avgrensingar */}
            {calculationA.limitations?.length > 0 && (
              <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">
                  Kva er ikkje rekna
                </h3>
                <ul className="text-sm text-amber-900 list-disc list-inside space-y-1">
                  {calculationA.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Åtvaringar */}
            {calculationA.warnings?.length > 0 && (
              <section className="mt-6 rounded-lg border border-orange-300 bg-orange-50 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-800 mb-2">
                  Åtvaringar
                </h3>
                <ul className="text-sm text-orange-900 list-disc list-inside space-y-1">
                  {calculationA.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Konfidens og Agent B-status */}
<section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
  <div className="flex items-center justify-between flex-wrap gap-3">
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Agent A konfidens
      </span>
      <span
        className={`inline-block rounded px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${
          calculationA.confidence === "high"
            ? "bg-emerald-100 text-emerald-800"
            : calculationA.confidence === "medium"
            ? "bg-amber-100 text-amber-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {calculationA.confidence}
      </span>
    </div>
    {calculationB && (
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Agent B konfidens
        </span>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${
            calculationB.confidence === "high"
              ? "bg-emerald-100 text-emerald-800"
              : calculationB.confidence === "medium"
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {calculationB.confidence}
        </span>
      </div>
    )}
  </div>
</section>

{/* Agent B-resultat (uavhengig kontroll) */}
{calculationB && (
  <section className="mt-6 rounded-lg border-2 border-slate-300 bg-slate-50 p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
        Agent B — uavhengig kontroll
      </h3>
      <span className="text-xs text-slate-500 italic">
        Løyste oppgåva utan å sjå Agent A sitt svar
      </span>
    </div>

    <div className="rounded bg-white p-3 mb-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Agent B sin konklusjon
      </div>
      <p className="text-sm text-slate-800">
        {calculationB.short_conclusion}
      </p>
    </div>

    {Object.keys(calculationB.results || {}).length > 0 && (
      <div className="rounded bg-white p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Agent B sine resultat
        </div>
        <div className="font-mono text-sm space-y-1">
          {Object.entries(calculationB.results).map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="text-slate-500 w-24">{k}</span>
              <span className="text-slate-900 font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <p className="mt-3 text-xs text-slate-500 italic">
      Samanlikningsagenten (Agent C) kjem i neste sesjon — han vil analysere forskjellar systematisk.
    </p>
  </section>
)}

{/* Comparison details — Agent C */}
{comparison && (
  <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
    <h3 className="text-lg font-semibold text-slate-900 mb-4">
      Agent C — samanlikning
    </h3>

    {/* Numeriske skilnader */}
    {comparison.numeric_differences?.length > 0 && (
      <div className="mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Numeriske skilnader
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="text-left py-2 pr-3 font-normal">Felt</th>
                <th className="text-left py-2 pr-3 font-normal">Agent A</th>
                <th className="text-left py-2 pr-3 font-normal">Agent B</th>
                <th className="text-left py-2 pr-3 font-normal">Skilnad</th>
                <th className="text-left py-2 font-normal">Alvor</th>
              </tr>
            </thead>
            <tbody>
              {comparison.numeric_differences.map((diff, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-mono text-slate-700">
                    {diff.field}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {diff.agent_a_value}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {diff.agent_b_value}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {diff.percent_diff?.toFixed(1)}%
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-mono uppercase ${
                        diff.severity === "low"
                          ? "bg-slate-100 text-slate-700"
                          : diff.severity === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : diff.severity === "high"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {diff.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Likely causes som tekst-liste under */}
        <ul className="mt-3 text-xs text-slate-600 space-y-1">
          {comparison.numeric_differences.map((diff, i) => (
            <li key={i}>
              <span className="font-mono">{diff.field}:</span>{" "}
              {diff.likely_cause}
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Metodiske skilnader */}
    {comparison.method_differences?.length > 0 && (
      <div className="mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Metodiske skilnader
        </h4>
        <ul className="text-sm text-slate-800 list-disc list-inside space-y-1">
          {comparison.method_differences.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Føresetnadsforskjellar */}
    {comparison.assumption_differences?.length > 0 && (
      <div className="mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Forskjellar i føresetnader
        </h4>
        <ul className="text-sm text-slate-800 list-disc list-inside space-y-1">
          {comparison.assumption_differences.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Intern konsistens — kritisk */}
    {((comparison.internal_consistency_issues?.agent_a?.length ?? 0) > 0 ||
      (comparison.internal_consistency_issues?.agent_b?.length ?? 0) > 0) && (
      <div className="mt-4 rounded border border-orange-300 bg-orange-50 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-orange-800 mb-2">
          ⚠ Intern inkonsistens
        </h4>
        {(comparison.internal_consistency_issues?.agent_a?.length ?? 0) > 0 && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-orange-900 mb-1">
              Agent A
            </div>
            <ul className="text-sm text-orange-900 list-disc list-inside space-y-1">
              {comparison.internal_consistency_issues.agent_a.map((issue, i) => (
                <li key={i}>
                  {issue.issue}{" "}
                  <span className="font-mono text-xs uppercase">
                    [{issue.severity}]
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(comparison.internal_consistency_issues?.agent_b?.length ?? 0) > 0 && (
          <div>
            <div className="text-xs font-semibold text-orange-900 mb-1">
              Agent B
            </div>
            <ul className="text-sm text-orange-900 list-disc list-inside space-y-1">
              {comparison.internal_consistency_issues.agent_b.map((issue, i) => (
                <li key={i}>
                  {issue.issue}{" "}
                  <span className="font-mono text-xs uppercase">
                    [{issue.severity}]
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )}
  </section>
)}

{/* Action bar */}
<section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-slate-600">
              Resultatet er førebels og må kontrollerast av fagperson.
            </p>
            <button
              onClick={handleCancel}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Tilbake til start
            </button>
          </div>
        </section>
      </>
    )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

function ListSection({
  label,
  items,
  tone = "default",
}: {
  label: string;
  items: string[];
  tone?: "default" | "warn";
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <ul
        className={`text-sm space-y-0.5 list-disc list-inside ${
          tone === "warn" ? "text-amber-900" : "text-slate-800"
        }`}
      >
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
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

type Phase = "input" | "result" | "calculating" | "calculation_result";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
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
    setCalculation(null);
    setError(null);
    setPhase("input");
  };

  const handleCancel = () => {
    setInput("");
    setResult(null);
    setRequestId(null);
    setCalculation(null);
    setError(null);
    setPhase("input");
  };

  const handleStartCalculation = async () => {
    if (!result || !requestId) return;

    setPhase("calculating");
    setError(null);

    try {
      const response = await fetch("/api/agent-a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          input_review: result,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Agent A klarte ikkje løyse oppgåva");
        setPhase("result");
        return;
      }

      setCalculation(data.result);
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
              Agent A reknar...
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Stegvis løysing med formlar, einingar og mellomresultat. Dette tek
              typisk 10-30 sekund.
            </p>
          </section>
        )}

        {/* === FASE: CALCULATION_RESULT === */}
        {phase === "calculation_result" && calculation && (
          <>
            {/* Kort svar */}
            <section className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                Kort svar
              </h3>
              <p className="text-base text-emerald-900 font-medium">
                {calculation.short_conclusion}
              </p>
            </section>

            {/* Resultat-objekt */}
            {Object.keys(calculation.results || {}).length > 0 && (
              <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Resultat
                </h3>
                <div className="font-mono text-sm space-y-1">
                  {Object.entries(calculation.results).map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-slate-500 w-24">{k}</span>
                      <span className="text-slate-900 font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Føresetnader */}
            {calculation.assumptions?.length > 0 && (
              <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Føresetnader brukt
                </h3>
                <ul className="text-sm text-slate-800 list-disc list-inside space-y-1">
                  {calculation.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Stegvis utrekning */}
            {calculation.calculation_steps?.length > 0 && (
              <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Stegvis utrekning
                </h3>
                <ol className="space-y-5">
                  {calculation.calculation_steps.map((step, i) => (
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
            {calculation.limitations?.length > 0 && (
              <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">
                  Kva er ikkje rekna
                </h3>
                <ul className="text-sm text-amber-900 list-disc list-inside space-y-1">
                  {calculation.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Åtvaringar */}
            {calculation.warnings?.length > 0 && (
              <section className="mt-6 rounded-lg border border-orange-300 bg-orange-50 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-800 mb-2">
                  Åtvaringar
                </h3>
                <ul className="text-sm text-orange-900 list-disc list-inside space-y-1">
                  {calculation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Konfidens */}
            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Agent A konfidens
                </span>
                <span
                  className={`ml-3 inline-block rounded px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${
                    calculation.confidence === "high"
                      ? "bg-emerald-100 text-emerald-800"
                      : calculation.confidence === "medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {calculation.confidence}
                </span>
              </div>
              <p className="text-xs text-slate-500 italic">
                Berre éin agent — ingen dobbel-kontroll enno
              </p>
            </section>

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
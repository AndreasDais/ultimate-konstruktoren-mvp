"use client";

import { useState } from "react";

export default function Home() {
  // To "tilstandsvariablar" — dei held verdiar som kan endre seg medan brukaren brukar sida
  const [input, setInput] = useState("");
  const [submittedText, setSubmittedText] = useState("");

  // Funksjon som kjører når brukaren klikkar "Send inn"
  const handleSubmit = () => {
    setSubmittedText(input);
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

        {/* Disclaimer-boks */}
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

        {/* Inputfelt */}
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
            disabled={!input.trim()}
            className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            Send inn
          </button>
        </section>

        {/* Visast berre når brukaren har sendt inn noko */}
        {submittedText && (
          <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Det du sende inn
            </h3>
            <p className="text-slate-700 whitespace-pre-wrap">
              {submittedText}
            </p>
            <p className="mt-4 text-xs text-slate-500 italic">
              Førebels berre eit ekko. Når Input-agenten er på plass, vil
              systemet tolke og validere oppgåva her.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
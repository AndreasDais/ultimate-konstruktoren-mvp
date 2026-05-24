"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { type Locale } from "@/lib/locale";
import { buildReportModel, type UpstreamReportData } from "@/lib/report/build-report-model";
import { buildCalculationSheetModel } from "@/lib/report/calculation-sheet-model";
import { renderCalculationSheetLatex } from "@/lib/report/render-calculation-latex";
import { validateReportModel } from "@/lib/report/validate-report-model";
import { RapportLoadingPilelinja } from "../RapportLoadingPilelinja";
import { FormulaStack } from "../_components/FormulaStack";
import "../rapport.css";
import "./beregning.css";

const LABELS: Record<Locale, Record<string, string>> = {
  nb: {
    loadingError: "Feil ved lasting av beregningsark",
    back: "Tilbake til full rapport",
    downloadPdf: "Last ned PDF",
    downloadLatex: "Last ned .tex",
    downloadLatexFull: "Full LaTeX",
    downloadWord: "Last ned Word",
    copyLatex: "Kopier LaTeX",
    copied: "Kopiert",
    titleFallback: "Beregning",
    kicker: "PILAR · BEREGNINGSARK",
    documentId: "Dokument-ID",
    date: "Dato",
    status: "Status",
    given: "Gitte data",
    assumptions: "Forutsetninger",
    calculation: "Stegvis beregning",
    results: "Resultater",
    notes: "Merknader",
    generatedNote: "Generert av PILAR. Beregningen skal kontrolleres av ansvarlig fagperson før bruk.",
  },
  nn: {
    loadingError: "Feil ved lasting av berekningsark",
    back: "Tilbake til full rapport",
    downloadPdf: "Last ned PDF",
    downloadLatex: "Last ned .tex",
    downloadLatexFull: "Full LaTeX",
    downloadWord: "Last ned Word",
    copyLatex: "Kopier LaTeX",
    copied: "Kopiert",
    titleFallback: "Berekning",
    kicker: "PILAR · BEREKNINGSARK",
    documentId: "Dokument-ID",
    date: "Dato",
    status: "Status",
    given: "Gjevne data",
    assumptions: "Føresetnader",
    calculation: "Stegvis berekning",
    results: "Resultat",
    notes: "Merknader",
    generatedNote: "Generert av PILAR. Berekninga skal kontrollerast av ansvarleg fagperson før bruk.",
  },
};

function valueWithUnit(value: string, unit: string | null) {
  return unit ? `${value} ${unit}` : value;
}

export default function CalculationSheetPage() {
  const { locale } = useLocale();
  const params = useParams();
  const router = useRouter();
  const runId = params.run_id as string;
  const L = LABELS[locale];

  const [data, setData] = useState<UpstreamReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reportUrl = typeof window === "undefined" ? `/rapport/${runId}` : `${window.location.origin}/rapport/${runId}`;

  const { sheet, latex } = useMemo(() => {
    if (!data) return { sheet: null, latex: "" };
    const reportModel = buildReportModel(data, { locale, reportUrl, audience: "student" });
    const validation = validateReportModel(reportModel);
    if (!validation.ok) {
      console.warn("Calculation sheet: report model validation errors", validation.errors);
    }
    const calculationSheet = buildCalculationSheetModel(reportModel);
    return {
      sheet: calculationSheet,
      latex: renderCalculationSheetLatex(calculationSheet),
    };
  }, [data, locale, reportUrl]);

  async function copyLatex() {
    if (!latex) return;
    await navigator.clipboard.writeText(latex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (error) {
    return (
      <div className="rapport-loading">
        <h1>{L.loadingError}</h1>
        <p>{error}</p>
        <button onClick={() => router.push(`/rapport/${runId}`)} className="uk-btn">
          {L.back}
        </button>
      </div>
    );
  }

  if (!data || !sheet) {
    return (
      <RapportLoadingPilelinja
        runId={runId}
        locale={locale}
        onComplete={(responseData: Record<string, unknown>) => setData(responseData as unknown as UpstreamReportData)}
        onError={(message: string) => setError(message)}
      />
    );
  }

  return (
    <main className="beregning-page">
      <div className="beregning-shell">
        <div className="beregning-actions no-print">
          <div className="beregning-actions__left">
            <button className="uk-btn" onClick={() => router.push(`/rapport/${runId}`)}>
              {L.back}
            </button>
          </div>
          <div className="beregning-actions__right">
            <a className="uk-btn uk-btn--primary" href={`/api/rapport/${runId}/calculation/pdf`} download>
              {L.downloadPdf}
            </a>
            <a className="uk-btn" href={`/api/rapport/${runId}/calculation/latex`} download>
              {L.downloadLatex}
            </a>
            <a className="uk-btn" href={`/api/rapport/${runId}/calculation/latex?mode=full`} download>
              {L.downloadLatexFull}
            </a>
            <a className="uk-btn" href={`/api/rapport/${runId}/calculation/word`} download>
              {L.downloadWord}
            </a>
            <button className="uk-btn" onClick={copyLatex}>
              {copied ? L.copied : L.copyLatex}
            </button>
          </div>
        </div>

        <article className="beregning-sheet" data-calculation-sheet-ready="true">
          <header className="beregning-cover">
            <div className="beregning-kicker">{L.kicker}</div>
            <h1 className="beregning-title">{sheet.meta.title || L.titleFallback}</h1>
            {sheet.meta.subtitle && <p className="beregning-subtitle">{sheet.meta.subtitle}</p>}
            <div className="beregning-meta">
              <div className="beregning-meta__card">
                <span className="beregning-label">{L.documentId}</span>
                <span className="beregning-value">{sheet.meta.documentId}</span>
              </div>
              <div className="beregning-meta__card">
                <span className="beregning-label">{L.date}</span>
                <span className="beregning-value">{sheet.meta.date}</span>
              </div>
              <div className="beregning-meta__card">
                <span className="beregning-label">{L.status}</span>
                <span className="beregning-value">{sheet.meta.status}</span>
              </div>
            </div>
          </header>

          {sheet.given.length > 0 && (
            <section className="beregning-section">
              <h2>{L.given}</h2>
              <div className="beregning-grid">
                {sheet.given.map((item) => (
                  <div className="beregning-card" key={`${item.label}-${item.value}`}>
                    <div className="beregning-symbol-row">
                      <span className="beregning-symbol">{item.label}</span>
                      <span className="beregning-symbol-value">{valueWithUnit(item.value, item.unit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {sheet.assumptions.length > 0 && (
            <section className="beregning-section">
              <h2>{L.assumptions}</h2>
              <ul className="beregning-list">
                {sheet.assumptions.map((assumption, index) => (
                  <li key={`${index}-${assumption}`}>{assumption}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="beregning-section">
            <h2>{L.calculation}</h2>
            {sheet.steps.map((step) => (
              <section className="beregning-step" key={step.id}>
                <div className="beregning-step__header">
                  <span className="beregning-step__number">{step.isControlStep ? "Kontroll" : `Steg ${String(step.number).padStart(2, "0")}`}</span>
                  <span className="beregning-step__title">{step.title}</span>
                </div>
                {step.explanation && <p className="beregning-prose">{step.explanation}</p>}
                {step.formulas.length > 0 && (
                  <div className="beregning-formula-list">
                    {step.formulas.map((formula, index) => (
                      <div className="beregning-formula-item" key={`${step.id}-formula-${index}`}>
                        <FormulaStack
                          latex={formula.latex}
                          fallbackText={formula.plain}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </section>

          {sheet.results.length > 0 && (
            <section className="beregning-section">
              <h2>{L.results}</h2>
              <div className="beregning-grid">
                {sheet.results.map((item) => (
                  <div className="beregning-card" key={`${item.label}-${item.value}`}>
                    <div className="beregning-symbol-row">
                      <span className="beregning-symbol">{item.label}</span>
                      <span className="beregning-symbol-value">{valueWithUnit(item.value, item.unit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {sheet.notes.length > 0 && (
            <section className="beregning-section">
              <h2>{L.notes}</h2>
              <ul className="beregning-list">
                {sheet.notes.map((note, index) => (
                  <li key={`${index}-${note}`}>{note}</li>
                ))}
              </ul>
            </section>
          )}

          <footer className="beregning-footer-note">{L.generatedNote}</footer>
        </article>
      </div>
    </main>
  );
}

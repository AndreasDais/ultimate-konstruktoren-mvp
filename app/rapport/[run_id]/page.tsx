"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "./rapport.css";

type AgentOutput = {
  agent_name: string;
  structured_output: {
    short_conclusion?: string;
    assumptions?: string[];
    calculation_steps?: { title: string; text: string }[];
    results?: Record<string, string>;
    limitations?: string[];
    warnings?: string[];
    confidence?: string;
  };
  prompt_version: string;
};

type ControllerDecision = {
  decision_status: string;
  risk_level: string;
  reason: string;
  user_message: string;
  blocked_outputs: string[];
};

type Comparison = {
  match_status: string;
  comparison_data: unknown;
};

type InputReview = {
  input_status: string;
  parsed_data: unknown;
  prompt_version: string;
};

type Report = {
  id: string;
  document_id: string;
  executive_summary: string;
  technical_assessment: string;
  conclusion: string;
  prompt_version: string;
  created_at: string;
};

type FullReportResponse = {
  report: Report;
  cached: boolean;
  run: { request: { raw_text: string } };
  inputReview: InputReview | null;
  agentA: AgentOutput;
  agentB: AgentOutput;
  comparison: Comparison | null;
  controllerDecision: ControllerDecision | null;
};

const DECISION_LABELS: Record<string, string> = {
  approved: "Førebels godkjent",
  approved_with_warnings: "Godkjent med åtvaringar",
  rejected: "Avvist — må kontrollerast",
  uncertain: "Usikker",
  needs_more_input: "Treng meir informasjon",
};

const MATCH_PHRASES: Record<string, string> = {
  match: " Dei kom fram til same resultat.",
  minor_disagreement: " Det er små forskjellar mellom svara, hovudsakleg avrunding.",
  significant_disagreement:
    " Det er betydelege forskjellar mellom svara — sjå Agent D-vurderinga nedanfor.",
  critical_disagreement: " Det er kritiske forskjellar mellom svara.",
};

export default function RapportPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.run_id as string;

  const [data, setData] = useState<FullReportResponse | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Genererer rapport...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoadingMessage("Genererer rapport...");
        const res = await fetch("/api/agent-e", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id: runId }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || "Kunne ikkje generere rapport");
        }

        const responseData: FullReportResponse = await res.json();
        setData(responseData);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Ukjend feil";
        setError(message);
      }
    }

    loadReport();
  }, [runId]);

  if (error) {
    return (
      <div className="rapport-loading">
        <h1>Feil ved generering av rapport</h1>
        <p>{error}</p>
        <button onClick={() => router.push("/")} className="uk-btn">
          ← Tilbake til start
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rapport-loading">
        <p>{loadingMessage}</p>
        <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
          Kan ta 10–30 sekund første gong rapporten genererast.
        </p>
      </div>
    );
  }

  const blocked = data.controllerDecision?.blocked_outputs ?? [];
  const isBlocked = (field: string) => blocked.includes(field);

  // Bruk Agent A som primær — Agent D har allereie godkjent, og A og B er einige der det betyr noko
  const primary = data.agentA;

  const reportDate = new Date(data.report.created_at).toLocaleDateString(
    "nn-NO",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const decisionLabel =
    DECISION_LABELS[data.controllerDecision?.decision_status ?? ""] ?? "Ukjent";

  const matchPhrase =
    MATCH_PHRASES[data.comparison?.match_status ?? ""] ?? "";

  return (
    <div className="rapport-container">
      <header className="rapport-toolbar no-print">
        <button onClick={() => router.push("/")} className="uk-btn">
          ← Tilbake
        </button>
        <button
          onClick={() => window.print()}
          className="uk-btn uk-btn--primary"
        >
          Last ned PDF
        </button>
      </header>

      <article className="rapport-document">
        {/* Forside */}
        <section className="rapport-section">
          <div className="rapport-eyebrow">Berekningsnotat</div>
          <h1>Ultimate Konstruktøren</h1>

          <div className="document-meta">
            <div>
              <span>Dokument-ID:</span> {data.report.document_id}
            </div>
            <div>
              <span>Dato:</span> {reportDate}
            </div>
            <div>
              <span>Status:</span> {decisionLabel}
            </div>
            <div>
              <span>Rapport-versjon:</span> {data.report.prompt_version}
            </div>
          </div>

          <div className="rapport-disclaimer">
            <strong>VIKTIG MERKNAD</strong>
            Dette dokumentet er generert av eit AI-basert bereknings- og
            dokumentasjonsverktøy. Innhaldet skal berre brukast som støtte,
            læringshjelp eller førebels teknisk vurdering. Dokumentet er ikkje
            ein erstatning for kontroll utført av kvalifisert fagperson,
            ansvarleg prosjekterande eller godkjent føretak. Alle berekningar,
            føresetnader, standardreferansar, materialdata og konklusjonar må
            kontrollerast av ein kompetent byggingeniør før dei blir brukte i
            reelle prosjekt, byggesøknader, produksjon eller utføring.
          </div>
        </section>

        {/* Samandrag */}
        <section className="rapport-section">
          <h2>Samandrag</h2>
          <p className="rapport-prose">{data.report.executive_summary}</p>
        </section>

        {/* Forespurnad */}
        <section className="rapport-section">
          <h2>Forespurnad</h2>
          <blockquote className="rapport-quote">
            {data.run.request.raw_text}
          </blockquote>
        </section>

        {/* Tolking */}
        {data.inputReview && (
          <section className="rapport-section">
            <h2>Input-tolking</h2>
            <p className="rapport-prose">
              Status: <strong>{data.inputReview.input_status}</strong>
            </p>
            {data.inputReview.parsed_data ? (
              <pre className="rapport-data">
                {JSON.stringify(data.inputReview.parsed_data, null, 2)}
              </pre>
            ) : null}
          </section>
        )}

        {/* Føresetnader */}
        {primary.structured_output.assumptions &&
          primary.structured_output.assumptions.length > 0 && (
            <section className="rapport-section">
              <h2>Føresetnader</h2>
              <ul className="rapport-list">
                {primary.structured_output.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          )}

        {/* Resultat */}
        {primary.structured_output.results && !isBlocked("results_a") && (
          <section className="rapport-section">
            <h2>Resultat</h2>
            <table className="rapport-table">
              <tbody>
                {Object.entries(primary.structured_output.results).map(
                  ([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{v}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* Stegvis utrekning */}
        {primary.structured_output.calculation_steps &&
          !isBlocked("calculation_steps_a") && (
            <section className="rapport-section">
              <h2>Stegvis utrekning</h2>
              {primary.structured_output.calculation_steps.map((step, i) => (
                <div key={i} className="rapport-step">
                  <h3>
                    {i + 1}. {step.title}
                  </h3>
                  <pre className="rapport-step-text">{step.text}</pre>
                </div>
              ))}
            </section>
          )}

        {/* Fagleg vurdering */}
        <section className="rapport-section">
          <h2>Fagleg vurdering</h2>
          <p className="rapport-prose">{data.report.technical_assessment}</p>
        </section>

        {/* Avgrensingar */}
        {primary.structured_output.limitations &&
          primary.structured_output.limitations.length > 0 && (
            <section className="rapport-section">
              <h2>Kva er ikkje rekna</h2>
              <ul className="rapport-list">
                {primary.structured_output.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </section>
          )}

        {/* Åtvaringar */}
        {primary.structured_output.warnings &&
          primary.structured_output.warnings.length > 0 && (
            <section className="rapport-section">
              <h2>Åtvaringar</h2>
              <ul className="rapport-list rapport-list-warnings">
                {primary.structured_output.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
          )}

        {/* Agentkontroll */}
        <section className="rapport-section">
          <h2>Agentkontroll</h2>
          <p className="rapport-prose">
            Berekninga er løyst uavhengig av to AI-agentar (Agent A og Agent B).
            {matchPhrase}
          </p>

          {data.controllerDecision && (
            <div className="rapport-decision">
              <strong>Agent D-avgjerd:</strong> {decisionLabel}
              <em>{data.controllerDecision.user_message}</em>
            </div>
          )}
        </section>

        {/* Konklusjon */}
        <section className="rapport-section">
          <h2>Konklusjon</h2>
          <p className="rapport-prose">{data.report.conclusion}</p>
        </section>

        {/* Footer */}
        <footer className="rapport-footer">
          <p>Generert av Ultimate Konstruktøren • {data.report.document_id}</p>
          <p>
            Resultatet er førebels og må kontrollerast av fagperson før bruk i
            prosjektering.
          </p>
        </footer>
      </article>
    </div>
  );
}
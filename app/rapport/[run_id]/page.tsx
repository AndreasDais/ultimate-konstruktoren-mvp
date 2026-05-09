"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "./rapport.css";
import FeilrapportForm from "./feilrapport-form";

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

type StatusTone = "ok" | "warn" | "bad" | "info" | "neutral";

const DECISION_LABELS: Record<string, string> = {
  approved: "Førebels godkjent",
  approved_with_warnings: "Godkjent med åtvaringar",
  rejected: "Avvist — må kontrollerast",
  uncertain: "Usikker",
  needs_more_input: "Treng meir informasjon",
};

const DECISION_SHORT: Record<string, string> = {
  approved: "Godkjent",
  approved_with_warnings: "Med åtvaring",
  rejected: "Avvist",
  uncertain: "Usikker",
  needs_more_input: "Manglar input",
};

const MATCH_PHRASES: Record<string, string> = {
  match: " Dei kom fram til same resultat.",
  minor_disagreement:
    " Det er små forskjellar mellom svara, hovudsakleg avrunding.",
  significant_disagreement:
    " Det er betydelege forskjellar mellom svara — sjå Agent D-vurderinga nedanfor.",
  critical_disagreement: " Det er kritiske forskjellar mellom svara.",
};

const INPUT_STATUS_TONE: Record<string, StatusTone> = {
  klar: "ok",
  delvis_klar: "info",
  mangelfull: "warn",
  uklar: "warn",
  uklart: "warn",
  avvist: "bad",
  relevant_ikkje_stotta: "warn",
};

const INPUT_STATUS_LABEL: Record<string, string> = {
  klar: "Klar",
  delvis_klar: "Delvis klar",
  mangelfull: "Mangelfull",
  uklar: "Uklar",
  uklart: "Uklar",
  avvist: "Avvist",
  relevant_ikkje_stotta: "Ikkje støtta",
};

const CONFIDENCE_TONE: Record<string, StatusTone> = {
  high: "ok",
  medium: "warn",
  low: "bad",
};

const MATCH_TONE: Record<string, StatusTone> = {
  match: "ok",
  minor_disagreement: "info",
  significant_disagreement: "warn",
  critical_disagreement: "bad",
};

const MATCH_SHORT: Record<string, string> = {
  match: "Einige",
  minor_disagreement: "Mindre avvik",
  significant_disagreement: "Stor avvik",
  critical_disagreement: "Kritisk",
};

const DECISION_TONE: Record<string, StatusTone> = {
  approved: "ok",
  approved_with_warnings: "info",
  uncertain: "warn",
  rejected: "bad",
  needs_more_input: "warn",
};

export default function RapportPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.run_id as string;

  const [data, setData] = useState<FullReportResponse | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Genererer rapport...");
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("");

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

  // Scroll-spy: marker aktiv TOC-lenke basert på kva seksjon som er synleg
  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.reduce((acc, e) =>
            e.boundingClientRect.top < acc.boundingClientRect.top ? e : acc
          );
          setActiveSection(top.target.id);
        }
      },
      { rootMargin: "-15% 0% -70% 0%", threshold: 0 }
    );
    document
      .querySelectorAll("section[data-toc-id]")
      .forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [data]);

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
  const primary = data.agentA;

  const reportDate = new Date(data.report.created_at).toLocaleDateString(
    "nn-NO",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const decisionLabel =
    DECISION_LABELS[data.controllerDecision?.decision_status ?? ""] ?? "Ukjent";
  const matchPhrase = MATCH_PHRASES[data.comparison?.match_status ?? ""] ?? "";

  const wordUrl = `/api/rapport/${runId}/word`;
  const wordFilename = `${data.report.document_id}.docx`;

  // === TOC entries — bygg basert på kva seksjonar som faktisk renderast ===
  const tocEntries: Array<{ id: string; label: string }> = [];
  tocEntries.push({ id: "forside", label: "Forside" });
  tocEntries.push({ id: "samandrag", label: "Samandrag" });
  tocEntries.push({ id: "forespurnad", label: "Forespurnad" });
  if (data.inputReview)
    tocEntries.push({ id: "input-tolking", label: "Input-tolking" });
  if (
    primary.structured_output.assumptions &&
    primary.structured_output.assumptions.length > 0
  )
    tocEntries.push({ id: "foresetnader", label: "Føresetnader" });
  if (primary.structured_output.results && !isBlocked("results_a"))
    tocEntries.push({ id: "resultat", label: "Resultat" });
  if (
    primary.structured_output.calculation_steps &&
    primary.structured_output.calculation_steps.length > 0 &&
    !isBlocked("calculation_steps_a")
  )
    tocEntries.push({ id: "utrekning", label: "Stegvis utrekning" });
  tocEntries.push({ id: "fagleg-vurdering", label: "Fagleg vurdering" });
  if (
    primary.structured_output.limitations &&
    primary.structured_output.limitations.length > 0
  )
    tocEntries.push({ id: "ikkje-rekna", label: "Kva er ikkje rekna" });
  if (
    primary.structured_output.warnings &&
    primary.structured_output.warnings.length > 0
  )
    tocEntries.push({ id: "atvaringar", label: "Åtvaringar" });
  tocEntries.push({ id: "agentkontroll", label: "Agentkontroll" });
  tocEntries.push({ id: "konklusjon", label: "Konklusjon" });

  // === Kontrollstatus-mapping ===
  const inputStatus = data.inputReview?.input_status ?? "";
  const inputTone: StatusTone = INPUT_STATUS_TONE[inputStatus] ?? "neutral";
  const inputLabel = INPUT_STATUS_LABEL[inputStatus] ?? inputStatus ?? "—";

  const agentAConf = primary.structured_output.confidence ?? "";
  const agentATone: StatusTone = CONFIDENCE_TONE[agentAConf] ?? "neutral";

  const agentBConf = data.agentB.structured_output.confidence ?? "";
  const agentBTone: StatusTone = CONFIDENCE_TONE[agentBConf] ?? "neutral";

  const matchStatus = data.comparison?.match_status ?? "";
  const matchTone: StatusTone = MATCH_TONE[matchStatus] ?? "neutral";
  const matchLabel = MATCH_SHORT[matchStatus] ?? "—";

  const decisionStatus = data.controllerDecision?.decision_status ?? "";
  const controllerTone: StatusTone = DECISION_TONE[decisionStatus] ?? "neutral";
  const controllerShort = DECISION_SHORT[decisionStatus] ?? "—";

  return (
    <div className="rapport-shell">
      {/* === Venstre sidebar: TOC + metadata === */}
      <aside className="rapport-sidebar rapport-sidebar--left no-print">
      <button
          onClick={() => router.push("/")}
          className="rapport-back-link"
        >
          ← Tilbake
        </button>

        <nav className="rapport-toc">
          <div className="uk-eyebrow">Innhald</div>
          <ul>
            {tocEntries.map((e) => (
              <li key={e.id}>
                <a
                  href={`#${e.id}`}
                  className={activeSection === e.id ? "active" : ""}
                >
                  {e.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="rapport-meta-block">
          <div className="uk-eyebrow">Metadata</div>
          <div className="rapport-meta-row">
            <span>ID</span>
            <span className="uk-mono">{data.report.document_id}</span>
          </div>
          <div className="rapport-meta-row">
            <span>Dato</span>
            <span>{reportDate}</span>
          </div>
          <div className="rapport-meta-row">
            <span>Versjon</span>
            <span className="uk-mono">{data.report.prompt_version}</span>
          </div>
        </div>
      </aside>

      {/* === Hovudkolonne: dokument === */}
      <main className="rapport-main">
        <article className="rapport-document">
          {/* Forside */}
          <section
            className="rapport-section"
            id="forside"
            data-toc-id="forside"
          >
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
          <section
            className="rapport-section"
            id="samandrag"
            data-toc-id="samandrag"
          >
            <h2>Samandrag</h2>
            <p className="rapport-prose">{data.report.executive_summary}</p>
          </section>

          {/* Forespurnad */}
          <section
            className="rapport-section"
            id="forespurnad"
            data-toc-id="forespurnad"
          >
            <h2>Forespurnad</h2>
            <blockquote className="rapport-quote">
              {data.run.request.raw_text}
            </blockquote>
          </section>

          {/* Input-tolking */}
          {data.inputReview && (
            <section
              className="rapport-section"
              id="input-tolking"
              data-toc-id="input-tolking"
            >
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
              <section
                className="rapport-section"
                id="foresetnader"
                data-toc-id="foresetnader"
              >
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
            <section
              className="rapport-section"
              id="resultat"
              data-toc-id="resultat"
            >
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
            primary.structured_output.calculation_steps.length > 0 &&
            !isBlocked("calculation_steps_a") && (
              <section
                className="rapport-section"
                id="utrekning"
                data-toc-id="utrekning"
              >
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
          <section
            className="rapport-section"
            id="fagleg-vurdering"
            data-toc-id="fagleg-vurdering"
          >
            <h2>Fagleg vurdering</h2>
            <p className="rapport-prose">{data.report.technical_assessment}</p>
          </section>

          {/* Avgrensingar */}
          {primary.structured_output.limitations &&
            primary.structured_output.limitations.length > 0 && (
              <section
                className="rapport-section"
                id="ikkje-rekna"
                data-toc-id="ikkje-rekna"
              >
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
              <section
                className="rapport-section"
                id="atvaringar"
                data-toc-id="atvaringar"
              >
                <h2>Åtvaringar</h2>
                <ul className="rapport-list rapport-list-warnings">
                  {primary.structured_output.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </section>
            )}

          {/* Agentkontroll */}
          <section
            className="rapport-section"
            id="agentkontroll"
            data-toc-id="agentkontroll"
          >
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
          <section
            className="rapport-section"
            id="konklusjon"
            data-toc-id="konklusjon"
          >
            <h2>Konklusjon</h2>
            <p className="rapport-prose">{data.report.conclusion}</p>
          </section>

          <div id="feilrapport">
            <FeilrapportForm reportId={data.report.id} />
          </div>

          {/* Footer */}
          <footer className="rapport-footer">
            <p>
              Generert av Ultimate Konstruktøren • {data.report.document_id}
            </p>
            <p>
              Resultatet er førebels og må kontrollerast av fagperson før bruk i
              prosjektering.
            </p>
          </footer>
        </article>
      </main>

      {/* === Høgre sidebar: actions + kontrollstatus === */}
      <aside className="rapport-sidebar rapport-sidebar--right no-print">
        <div className="rapport-actions">
          <div className="uk-eyebrow">Handlingar</div>
          <button
            onClick={() => window.print()}
            className="uk-btn uk-btn--primary"
          >
            Last ned PDF
          </button>
          <a href={wordUrl} className="uk-btn" download={wordFilename}>
            Last ned Word
          </a>
          <a href="#feilrapport" className="uk-btn">
            Send feilrapport
          </a>
        </div>

        <div className="rapport-status-panel">
          <div className="uk-eyebrow">Kontrollstatus</div>
          <StatusRow label="Input-tolking" tone={inputTone} value={inputLabel} />
          <StatusRow label="Agent A" tone={agentATone} value={agentAConf || "—"} />
          <StatusRow label="Agent B" tone={agentBTone} value={agentBConf || "—"} />
          <StatusRow label="Samanlikning" tone={matchTone} value={matchLabel} />
          <StatusRow label="Kontrollør" tone={controllerTone} value={controllerShort} />
          <StatusRow label="Fagperson" tone="warn" value="Ikkje kontrollert" />
        </div>
      </aside>
    </div>
  );
}

function StatusRow({
  label,
  tone,
  value,
}: {
  label: string;
  tone: StatusTone;
  value: string;
}) {
  const variant = tone === "neutral" ? "" : `uk-badge--${tone}`;
  const fullClass = ["uk-badge", variant].filter(Boolean).join(" ");
  return (
    <div className="rapport-status-row">
      <span>{label}</span>
      <span className={fullClass}>{value}</span>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DECISION_STATUS_LABELS,
  DECISION_STATUS_SHORT,
  DECISION_STATUS_TONES,
  MATCH_STATUS_SHORT,
  MATCH_STATUS_TONES,
  MATCH_PHRASES,
  INPUT_STATUS_LABELS,
  INPUT_STATUS_TONES,
  CONFIDENCE_TONES,
  formatDate,
  type Tone,
} from "@/lib/format";
import "./rapport.css";
import FeilrapportForm from "./feilrapport-form";
import { QRCodeSVG } from "qrcode.react";
import Formula from "@/app/components/Formula";
import { TillitGauge } from "@/app/components/TillitGauge";
import type { TillitBreakdown } from "@/lib/tillit-score";

type AgentOutput = {
  agent_name: string;
  structured_output: {
    short_conclusion?: string;
    assumptions?: string[];
    calculation_steps?: { title: string; text: string; latex_formula?: string | null }[];
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
  tillit_score: number | null;
  tillit_breakdown: TillitBreakdown | null;
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

  // Scroll-spy: marker aktiv TOC-lenke basert på kva seksjon som er synleg.
  // Etter konsolidering ser observer berre på dei 4 outer-sections.
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

  // Rapport-URL for QR-kode i footer-signatur.
  // window.location.origin er undefined under SSR, så vi set i useEffect.
  const [rapportUrl, setRapportUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRapportUrl(`${window.location.origin}/rapport/${runId}`);
    }
  }, [runId]);

  // Tving alle <details>-element til å vere open under print.
  // CSS aleine klarar ikkje overstyre user-agent sin closed-state.
  // MÅ ligge FØR early-returns under for å respektere Rules of Hooks.
  useEffect(() => {
    const openAll = () => {
      document.querySelectorAll("details").forEach((d) => {
        d.open = true;
      });
    };
    window.addEventListener("beforeprint", openAll);
    return () => window.removeEventListener("beforeprint", openAll);
  }, []);

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

  const reportDate = formatDate(data.report.created_at);

  const decisionLabel =
    DECISION_STATUS_LABELS[data.controllerDecision?.decision_status ?? ""] ??
    "Ukjent";
  const matchPhrase =
    MATCH_PHRASES[data.comparison?.match_status ?? ""] ?? "";

  const wordUrl = `/api/rapport/${runId}/word`;
  const wordFilename = `${data.report.document_id}.docx`;

  // === TOC entries — fire konsoliderte seksjonar ===
  const tocEntries: Array<{ id: string; label: string }> = [
    { id: "samandrag", label: "Samandrag" },
    { id: "berekning", label: "Berekning" },
    { id: "vurdering", label: "Vurdering" },
    { id: "kontroll", label: "Kontroll" },
  ];

  // === Kontrollstatus-mapping ===
  const inputStatus = data.inputReview?.input_status ?? "";
  const inputTone: Tone = INPUT_STATUS_TONES[inputStatus] ?? "neutral";
  const inputLabel = INPUT_STATUS_LABELS[inputStatus] ?? inputStatus ?? "—";

  const agentAConf = primary.structured_output.confidence ?? "";
  const agentATone: Tone = CONFIDENCE_TONES[agentAConf] ?? "neutral";

  const agentBConf = data.agentB.structured_output.confidence ?? "";
  const agentBTone: Tone = CONFIDENCE_TONES[agentBConf] ?? "neutral";

  const matchStatus = data.comparison?.match_status ?? "";
  const matchTone: Tone = MATCH_STATUS_TONES[matchStatus] ?? "neutral";
  const matchLabel = MATCH_STATUS_SHORT[matchStatus] ?? "—";

  const decisionStatus = data.controllerDecision?.decision_status ?? "";
  const controllerTone: Tone =
    DECISION_STATUS_TONES[decisionStatus] ?? "neutral";
  const controllerShort = DECISION_STATUS_SHORT[decisionStatus] ?? "—";

  // Berekning-seksjonen har innhald viss minst éin subsection har data
  const hasBerekningContent =
    !!data.inputReview ||
    (primary.structured_output.assumptions &&
      primary.structured_output.assumptions.length > 0) ||
    (primary.structured_output.results && !isBlocked("results_a")) ||
    (primary.structured_output.calculation_steps &&
      primary.structured_output.calculation_steps.length > 0 &&
      !isBlocked("calculation_steps_a"));

  // Vurdering-seksjonen har innhald viss minst éin subsection har data
  const hasVurderingContent =
    !!data.report.technical_assessment ||
    (primary.structured_output.limitations &&
      primary.structured_output.limitations.length > 0) ||
    (primary.structured_output.warnings &&
      primary.structured_output.warnings.length > 0);

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
          {/* ============================================================
              FORSIDE — cover med gauge. Ingen eigen TOC-entry; scroll-spy
              behandlar henne som del av Samandrag (data-toc-id="samandrag").
              Behaldar gammal #forside-anchor for deep-link-kompatibilitet.
              ============================================================ */}
          <section
            className="rapport-section"
            id="forside"
            data-toc-id="samandrag"
          >
            <div className="rapport-forside-header">
              <div className="rapport-forside-header__title">
                <div className="rapport-eyebrow">Berekningsnotat</div>
                <h1>Pilar</h1>

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
              </div>

              <div className="rapport-forside-header__gauge">
                <TillitGauge
                  score={data.report.tillit_score}
                  breakdown={data.report.tillit_breakdown}
                />
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

          {/* ============================================================
              01 SAMANDRAG — executive_summary + forespurnad
              ============================================================ */}
          <section
            className="rapport-section rapport-section--group"
            id="samandrag"
            data-toc-id="samandrag"
          >
            <h2>Samandrag</h2>

            <p className="rapport-prose">{data.report.executive_summary}</p>

            <div id="forespurnad" className="rapport-subsection">
              <h3>Forespurnad</h3>
              <blockquote className="rapport-quote">
                {data.run.request.raw_text}
              </blockquote>
            </div>
          </section>

          {/* ============================================================
              02 BEREKNING — input-tolking, føresetnader, resultat, stegvis
              ============================================================ */}
          {hasBerekningContent && (
            <section
              className="rapport-section rapport-section--group"
              id="berekning"
              data-toc-id="berekning"
            >
              <h2>Berekning</h2>

              {/* Input-tolking */}
              {data.inputReview && (
                <div id="input-tolking" className="rapport-subsection">
                  <h3>Input-tolking</h3>
                  <p className="rapport-prose">
                    Status: <strong>{inputLabel}</strong>
                  </p>
                  {data.inputReview.parsed_data ? (
                    <pre className="rapport-data">
                      {JSON.stringify(data.inputReview.parsed_data, null, 2)}
                    </pre>
                  ) : null}
                </div>
              )}

              {/* Føresetnader */}
              {primary.structured_output.assumptions &&
                primary.structured_output.assumptions.length > 0 && (
                  <div id="foresetnader" className="rapport-subsection">
                    <h3>Føresetnader</h3>
                    <ul className="rapport-list">
                      {primary.structured_output.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Resultat */}
              {primary.structured_output.results &&
                !isBlocked("results_a") && (
                  <div id="resultat" className="rapport-subsection">
                    <h3>Resultat</h3>
                    <table className="rapport-table">
                      <tbody>
                        {Object.entries(
                          primary.structured_output.results
                        ).map(([k, v]) => (
                          <tr key={k}>
                            <th>{k}</th>
                            <td>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* Stegvis utrekning */}
              {primary.structured_output.calculation_steps &&
                primary.structured_output.calculation_steps.length > 0 &&
                !isBlocked("calculation_steps_a") && (
                  <div id="utrekning" className="rapport-subsection">
                    <h3>Stegvis utrekning</h3>
                    {primary.structured_output.calculation_steps.map(
                      (step, i) => (
                        <div key={i} className="rapport-step">
                          <h4>
                            {i + 1}. {step.title}
                          </h4>
                          {step.latex_formula ? (
                            <>
                              <Formula
                                latex={step.latex_formula}
                                fallbackText={step.text}
                              />
                              <details className="rapport-step-prose">
                                <summary>Vis prosa-utrekning</summary>
                                <pre className="rapport-step-text">
                                  {step.text}
                                </pre>
                              </details>
                            </>
                          ) : (
                            <pre className="rapport-step-text">{step.text}</pre>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
            </section>
          )}

          {/* ============================================================
              03 VURDERING — fagleg vurdering, ikkje rekna, åtvaringar
              ============================================================ */}
          {hasVurderingContent && (
            <section
              className="rapport-section rapport-section--group"
              id="vurdering"
              data-toc-id="vurdering"
            >
              <h2>Vurdering</h2>

              {/* Fagleg vurdering */}
              <div id="fagleg-vurdering" className="rapport-subsection">
                <h3>Fagleg vurdering</h3>
                <p className="rapport-prose">
                  {data.report.technical_assessment}
                </p>
              </div>

              {/* Avgrensingar */}
              {primary.structured_output.limitations &&
                primary.structured_output.limitations.length > 0 && (
                  <div id="ikkje-rekna" className="rapport-subsection">
                    <h3>Kva er ikkje rekna</h3>
                    <ul className="rapport-list">
                      {primary.structured_output.limitations.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Åtvaringar */}
              {primary.structured_output.warnings &&
                primary.structured_output.warnings.length > 0 && (
                  <div id="atvaringar" className="rapport-subsection">
                    <h3>Åtvaringar</h3>
                    <ul className="rapport-list rapport-list-warnings">
                      {primary.structured_output.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </section>
          )}

          {/* ============================================================
              04 KONTROLL — konstruktørkontroll + konklusjon
              ============================================================ */}
          <section
            className="rapport-section rapport-section--group"
            id="kontroll"
            data-toc-id="kontroll"
          >
            <h2>Kontroll</h2>

            {/* Konstruktørkontroll */}
            <div id="agentkontroll" className="rapport-subsection">
              <h3>Konstruktørkontroll</h3>
              <p className="rapport-prose">
                Berekninga er løyst uavhengig av to AI-konstruktørar
                (Konstruktør A og Konstruktør B).
                {matchPhrase}
              </p>
              {data.controllerDecision && (
                <div className="rapport-decision">
                  <strong>Kontrolløren si avgjerd:</strong> {decisionLabel}
                  <em>{data.controllerDecision.user_message}</em>
                </div>
              )}
            </div>

            {/* Konklusjon */}
            <div id="konklusjon" className="rapport-subsection">
              <h3>Konklusjon</h3>
              <p className="rapport-prose">{data.report.conclusion}</p>
            </div>
          </section>

          <div id="feilrapport">
            <FeilrapportForm reportId={data.report.id} />
          </div>

{/* Footer-signatur */}
<footer className="rapport-footer">
<div className="rapport-footer__warning">
  Førebels berekning — må kontrollerast av fagperson før bruk i
  prosjektering.
</div>
  <div className="rapport-footer__manual-sign">
    <div className="rapport-footer__sign-field">
      <span className="rapport-footer__sign-label">Kontrollert av</span>
      <span className="rapport-footer__sign-line" />
    </div>
    <div className="rapport-footer__sign-field">
      <span className="rapport-footer__sign-label">Signatur</span>
      <span className="rapport-footer__sign-line" />
    </div>
    <div className="rapport-footer__sign-field">
      <span className="rapport-footer__sign-label">Dato</span>
      <span className="rapport-footer__sign-line" />
    </div>
  </div>
  <div className="rapport-footer__signature">
    <div className="rapport-footer__signature-text">
      <div className="rapport-footer__brand">
        <span className="rapport-footer__logo-bar" />
        <span className="rapport-footer__logo-bar" />
        <span className="rapport-footer__brand-name">Pilar</span>
      </div>
      <div className="rapport-footer__meta">
        <span className="uk-mono">{data.report.document_id}</span>
        <span className="rapport-footer__sep">·</span>
        <span>Generert {reportDate}</span>
        <span className="rapport-footer__sep">·</span>
        <span className="uk-mono">{data.report.prompt_version}</span>
      </div>
      {rapportUrl && (
        <div className="rapport-footer__url uk-mono">{rapportUrl}</div>
      )}
    </div>
    {rapportUrl && (
      <div className="rapport-footer__qr">
        <QRCodeSVG
          value={rapportUrl}
          size={88}
          level="M"
          marginSize={0}
        />
      </div>
    )}
  </div>
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
          <StatusRow
            label="Input-tolking"
            tone={inputTone}
            value={inputLabel}
          />
          <StatusRow
            label="Konstruktør A"
            tone={agentATone}
            value={agentAConf || "—"}
          />
          <StatusRow
            label="Konstruktør B"
            tone={agentBTone}
            value={agentBConf || "—"}
          />
          <StatusRow
            label="Samanlikning"
            tone={matchTone}
            value={matchLabel}
          />
          <StatusRow
            label="Kontrollør"
            tone={controllerTone}
            value={controllerShort}
          />
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
  tone: Tone;
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
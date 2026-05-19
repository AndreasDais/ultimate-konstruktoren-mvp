"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  decisionStatusLabel,
  decisionStatusShort,
  DECISION_STATUS_TONES,
  matchStatusShort,
  MATCH_STATUS_TONES,
  matchPhrase,
  inputStatusLabel,
  INPUT_STATUS_TONES,
  CONFIDENCE_TONES,
  formatDate,
  formatPromptVersion,
  type Tone,
} from "@/lib/format";
import "./rapport.css";
import FeilrapportModal from "./feilrapport-modal";
import { type Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";
import { RapportLoadingPilelinja } from "./RapportLoadingPilelinja";
const RP_LABELS: Record<string, Record<Locale, string>> = {
  // Loading + error
  generererRapport: { nb: "Genererer rapport...", nn: "Genererer rapport..." },
  kunneIkkjeGenerere: { nb: "Kunne ikke generere rapport", nn: "Kunne ikkje generere rapport" },
  ukjendFeil: { nb: "Ukjent feil", nn: "Ukjend feil" },
  feilVedGenerering: { nb: "Feil ved generering av rapport", nn: "Feil ved generering av rapport" },
  tilbakeStart: { nb: "← Tilbake til start", nn: "← Tilbake til start" },
  kanTaTid: { nb: "Kan ta 10–30 sekunder første gang rapporten genereres.", nn: "Kan ta 10–30 sekund første gong rapporten genererast." },
  // TOC-entries
  samandrag: { nb: "Sammendrag", nn: "Samandrag" },
  berekningTOC: { nb: "Beregning", nn: "Berekning" },
  vurdering: { nb: "Vurdering", nn: "Vurdering" },
  kontroll: { nb: "Kontroll", nn: "Kontroll" },
  ukjent: { nb: "Ukjent", nn: "Ukjent" },
  // Venstre-sidebar
  tilbake: { nb: "← Tilbake", nn: "← Tilbake" },
  innhald: { nb: "Innhold", nn: "Innhald" },
  metadata: { nb: "Metadata", nn: "Metadata" },
  metaID: { nb: "ID", nn: "ID" },
  metaDato: { nb: "Dato", nn: "Dato" },
  metaVersjon: { nb: "Versjon", nn: "Versjon" },
  // Forside / cover
  berekningsnotat: { nb: "Beregningsnotat", nn: "Berekningsnotat" },
  dokumentID: { nb: "Dokument-ID:", nn: "Dokument-ID:" },
  forsideDato: { nb: "Dato:", nn: "Dato:" },
  forsideStatus: { nb: "Status:", nn: "Status:" },
  forsideRapportVersjon: { nb: "Rapport-versjon:", nn: "Rapport-versjon:" },
  viktigMerknad: { nb: "VIKTIG MERKNAD", nn: "VIKTIG MERKNAD" },
  disclaimer: { nb: "Dette dokumentet er generert av et AI-basert beregnings- og dokumentasjonsverktøy. Innholdet skal kun brukes som støtte, læringshjelp eller foreløpig teknisk vurdering. Dokumentet er ikke en erstatning for kontroll utført av kvalifisert fagperson, ansvarlig prosjekterende eller godkjent foretak. Alle beregninger, forutsetninger, standardreferanser, materialdata og konklusjoner må kontrolleres av en kompetent byggingeniør før de blir brukt i reelle prosjekter, byggesøknader, produksjon eller utføring.", nn: "Dette dokumentet er generert av eit AI-basert bereknings- og dokumentasjonsverktøy. Innhaldet skal berre brukast som støtte, læringshjelp eller førebels teknisk vurdering. Dokumentet er ikkje ein erstatning for kontroll utført av kvalifisert fagperson, ansvarleg prosjekterande eller godkjent føretak. Alle berekningar, føresetnader, standardreferansar, materialdata og konklusjonar må kontrollerast av ein kompetent byggingeniør før dei blir brukte i reelle prosjekt, byggesøknader, produksjon eller utføring." },
  // Samandrag-seksjon
  samandragH2: { nb: "Sammendrag", nn: "Samandrag" },
  forespurnadH3: { nb: "Forespørsel", nn: "Forespurnad" },
  // Berekning-seksjon
  berekningH2: { nb: "Beregning", nn: "Berekning" },
  inputTolkingH3: { nb: "Input-tolkning", nn: "Input-tolking" },
  statusPrefix: { nb: "Status:", nn: "Status:" },
  foresetnaderH3: { nb: "Forutsetninger", nn: "Føresetnader" },
  resultatH3: { nb: "Resultat", nn: "Resultat" },
  stegvisUtrekningH3: { nb: "Stegvis utregning", nn: "Stegvis utrekning" },
  visProsaUtrekning: { nb: "Vis prosa-utregning", nn: "Vis prosa-utrekning" },
  // Vurdering-seksjon
  vurderingH2: { nb: "Vurdering", nn: "Vurdering" },
  fagleVurderingH3: { nb: "Faglig vurdering", nn: "Fagleg vurdering" },
  kvaErIkkjeReknaH3: { nb: "Hva er ikke beregnet", nn: "Kva er ikkje rekna" },
  atvaringarH3: { nb: "Advarsler", nn: "Åtvaringar" },
  // Kontroll-seksjon
  kontrollH2: { nb: "Kontroll", nn: "Kontroll" },
  konstruktorkontrollH3: { nb: "Konstruktørkontroll", nn: "Konstruktørkontroll" },
  berekningaLoyst: { nb: "Beregningen er løst uavhengig av to AI-konstruktører (Konstruktør A og Konstruktør B).", nn: "Berekninga er løyst uavhengig av to AI-konstruktørar (Konstruktør A og Konstruktør B)." },
  kontrollorAvgjerd: { nb: "Kontrollørens avgjørelse:", nn: "Kontrolløren si avgjerd:" },
  konklusjonH3: { nb: "Konklusjon", nn: "Konklusjon" },
  // Footer
  forebelsBerekning: { nb: "Foreløpig beregning — må kontrolleres av fagperson før bruk i prosjektering.", nn: "Førebels berekning — må kontrollerast av fagperson før bruk i prosjektering." },
  kontrollertAv: { nb: "Kontrollert av", nn: "Kontrollert av" },
  signatur: { nb: "Signatur", nn: "Signatur" },
  footerDato: { nb: "Dato", nn: "Dato" },
  generert: { nb: "Generert", nn: "Generert" },
  // Høgre sidebar — Actions
  handlingar: { nb: "Handlinger", nn: "Handlingar" },
  lastNedPDF: { nb: "Last ned PDF", nn: "Last ned PDF" },
  lastNedWord: { nb: "Last ned Word", nn: "Last ned Word" },
  lagNyBerekning: { nb: "Lag ny beregning fra denne →", nn: "Lag ny berekning frå denne →" },
  saMissionControl: { nb: "Se Mission Control →", nn: "Sjå Mission Control →" },
  sendTilbakemelding: { nb: "Send tilbakemelding", nn: "Send tilbakemelding" },
  // Kontrollstatus-panel
  kontrollstatus: { nb: "Kontrollstatus", nn: "Kontrollstatus" },
  statusInputTolking: { nb: "Input-tolkning", nn: "Input-tolking" },
  statusInputExplanation: { nb: "Tolkerens vurdering av hvor klar oppgaven var til å beregnes. 'Klar' = all info på plass; andre statuser = Tolkeren gjorde rimelige antakelser eller manglet info.", nn: "Tolkar si vurdering av kor klar oppgåva var til å reknast. 'Klar' = all info på plass; andre statusar = Tolkar gjorde rimelege antakingar eller mangla info." },
  statusKonstruktorA: { nb: "Konstruktør A", nn: "Konstruktør A" },
  statusKonstruktorB: { nb: "Konstruktør B", nn: "Konstruktør B" },
  statusKonstruktorExplanation: { nb: "Konstruktørens egenrapporterte sikkerhet på eget svar (high/medium/low). Måler bare én agents tillit til seg selv, ikke den samlede rapporten.", nn: "Konstruktøren si eigenrapporterte sikkerheit på eige svar (high/medium/low). Målar berre éin agent sin tillit til seg sjølv, ikkje den samla rapporten." },
  statusSamanlikning: { nb: "Sammenligning", nn: "Samanlikning" },
  statusSamanlikningExplanation: { nb: "Sammenligner-agenten sjekker om Konstruktør A og B kom frem til samme svar. 'Enige' = ingen avvik; 'Stor avvik' eller 'Kritisk' krever nærmere ettersyn.", nn: "Samanliknar-agenten sjekkar om Konstruktør A og B kom fram til same svar. 'Einige' = ingen avvik; 'Stor avvik' eller 'Kritisk' krev nærare ettersyn." },
  statusKontrollor: { nb: "Kontrollør", nn: "Kontrollør" },
  statusKontrollorExplanation: { nb: "Kontrollør-agenten leser både konstruktører og Sammenligner, og avgjør om resultatet er trygt nok å vise. Erstatter ikke fagperson-kontroll.", nn: "Kontrollør-agenten les både konstruktørar og Samanliknar, og avgjer om resultatet er trygt nok å vise. Erstattar ikkje fagperson-kontroll." },
  statusFagperson: { nb: "Fagperson", nn: "Fagperson" },
  ikkjeKontrollert: { nb: "Ikke kontrollert", nn: "Ikkje kontrollert" },
  statusFagpersonExplanation: { nb: "Sjekker om en kvalifisert byggingeniør har signert rapporten. I pilot-versjonen er dette alltid 'Ikke kontrollert' — du må selv få en fagperson til å gjennomgå før bruk i reelle prosjekter.", nn: "Sjekkar om ein kvalifisert byggingeniør har signert rapporten. I pilot-versjonen er dette alltid 'Ikkje kontrollert' — du må sjølv få ein fagperson til å gjennomgå før bruk i reelle prosjekt." },
};


import { QRCodeSVG } from "qrcode.react";
import Formula from "@/app/components/Formula";
import { TillitGauge } from "@/app/components/TillitGauge";
import type { TillitBreakdown } from "@/lib/tillit-score";
import { InfoPopover } from "@/app/components/InfoPopover";

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
  run: { request_id: string; request: { raw_text: string } };
  inputReview: InputReview | null;
  agentA: AgentOutput;
  agentB: AgentOutput;
  comparison: Comparison | null;
  controllerDecision: ControllerDecision | null;
};

export default function RapportPage() {
  const { locale } = useLocale();
  const params = useParams();
  const router = useRouter();
  const runId = params.run_id as string;

  const [data, setData] = useState<FullReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
        <h1>{RP_LABELS.feilVedGenerering[locale]}</h1>
        <p>{error}</p>
        <button onClick={() => router.push("/")} className="uk-btn">
          {RP_LABELS.tilbakeStart[locale]}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <RapportLoadingPilelinja
        runId={runId}
        locale={locale}
        onComplete={(responseData: Record<string, unknown>) =>
          setData(responseData as unknown as FullReportResponse)
        }
        onError={(message: string) => setError(message)}
      />
    );
  }
  const blocked = data.controllerDecision?.blocked_outputs ?? [];
  const isBlocked = (field: string) => blocked.includes(field);
  const primary = data.agentA;

  const reportDate = formatDate(data.report.created_at, locale);

  const decisionLabel =
    decisionStatusLabel(data.controllerDecision?.decision_status ?? "", locale) ??
    RP_LABELS.ukjent[locale];
  const matchPhraseText =
    matchPhrase(data.comparison?.match_status ?? "", locale) ?? "";

  const wordUrl = `/api/rapport/${runId}/word`;
  const wordFilename = `${data.report.document_id}.docx`;

  // === TOC entries — fire konsoliderte seksjonar ===
  const tocEntries: Array<{ id: string; label: string }> = [
    { id: "samandrag", label: RP_LABELS.samandrag[locale] },
    { id: "berekning", label: RP_LABELS.berekningTOC[locale] },
    { id: "vurdering", label: RP_LABELS.vurdering[locale] },
    { id: "kontroll", label: RP_LABELS.kontroll[locale] },
  ];

  // === Kontrollstatus-mapping ===
  const inputStatus = data.inputReview?.input_status ?? "";
  const inputTone: Tone = INPUT_STATUS_TONES[inputStatus] ?? "neutral";
  const inputLabel = inputStatusLabel(inputStatus, locale);

  const agentAConf = primary.structured_output.confidence ?? "";
  const agentATone: Tone = CONFIDENCE_TONES[agentAConf] ?? "neutral";

  const agentBConf = data.agentB.structured_output.confidence ?? "";
  const agentBTone: Tone = CONFIDENCE_TONES[agentBConf] ?? "neutral";

  const matchStatus = data.comparison?.match_status ?? "";
  const matchTone: Tone = MATCH_STATUS_TONES[matchStatus] ?? "neutral";
  const matchLabel = matchStatusShort(matchStatus, locale);

  const decisionStatus = data.controllerDecision?.decision_status ?? "";
  const controllerTone: Tone =
    DECISION_STATUS_TONES[decisionStatus] ?? "neutral";
  const controllerShort = decisionStatusShort(decisionStatus, locale);

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
          {RP_LABELS.tilbake[locale]}
        </button>

        <nav className="rapport-toc">
          <div className="uk-eyebrow">{RP_LABELS.innhald[locale]}</div>
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
          <div className="uk-eyebrow">{RP_LABELS.metadata[locale]}</div>
          <div className="rapport-meta-row">
            <span>{RP_LABELS.metaID[locale]}</span>
            <span className="uk-mono">{data.report.document_id}</span>
          </div>
          <div className="rapport-meta-row">
            <span>{RP_LABELS.metaDato[locale]}</span>
            <span>{reportDate}</span>
          </div>
          <div className="rapport-meta-row">
          <span>{RP_LABELS.metaVersjon[locale]}</span>
          <span className="uk-mono">{formatPromptVersion(data.report.prompt_version)}</span>
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
                <div className="rapport-eyebrow">{RP_LABELS.berekningsnotat[locale]}</div>
                <h1>Pilar</h1>

                <div className="document-meta">
                  <div>
                    <span>{RP_LABELS.dokumentID[locale]}</span> {data.report.document_id}
                  </div>
                  <div>
                    <span>{RP_LABELS.forsideDato[locale]}</span> {reportDate}
                  </div>
                  <div>
                    <span>{RP_LABELS.forsideStatus[locale]}</span> {decisionLabel}
                  </div>
                  <div>
                  <span>{RP_LABELS.forsideRapportVersjon[locale]}</span> {formatPromptVersion(data.report.prompt_version)}
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
              <strong>{RP_LABELS.viktigMerknad[locale]}</strong>
              {RP_LABELS.disclaimer[locale]}
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
            <h2>{RP_LABELS.samandragH2[locale]}</h2>

            <p className="rapport-prose">{data.report.executive_summary}</p>

            <div id="forespurnad" className="rapport-subsection">
              <h3>{RP_LABELS.forespurnadH3[locale]}</h3>
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
              <h2>{RP_LABELS.berekningH2[locale]}</h2>

              {/* Input-tolking */}
              {data.inputReview && (
                <div id="input-tolking" className="rapport-subsection">
                  <h3>{RP_LABELS.inputTolkingH3[locale]}</h3>
                  <p className="rapport-prose">
                    {RP_LABELS.statusPrefix[locale]} <strong>{inputLabel}</strong>
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
                    <h3>{RP_LABELS.foresetnaderH3[locale]}</h3>
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
                    <h3>{RP_LABELS.resultatH3[locale]}</h3>
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
                    <h3>{RP_LABELS.stegvisUtrekningH3[locale]}</h3>
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
                                <summary>{RP_LABELS.visProsaUtrekning[locale]}</summary>
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
              <h2>{RP_LABELS.vurderingH2[locale]}</h2>

              {/* Fagleg vurdering */}
              <div id="fagleg-vurdering" className="rapport-subsection">
                <h3>{RP_LABELS.fagleVurderingH3[locale]}</h3>
                <p className="rapport-prose">
                  {data.report.technical_assessment}
                </p>
              </div>

              {/* Avgrensingar */}
              {primary.structured_output.limitations &&
                primary.structured_output.limitations.length > 0 && (
                  <div id="ikkje-rekna" className="rapport-subsection">
                    <h3>{RP_LABELS.kvaErIkkjeReknaH3[locale]}</h3>
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
                    <h3>{RP_LABELS.atvaringarH3[locale]}</h3>
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
            <h2>{RP_LABELS.kontrollH2[locale]}</h2>

            {/* Konstruktørkontroll */}
            <div id="agentkontroll" className="rapport-subsection">
              <h3>{RP_LABELS.konstruktorkontrollH3[locale]}</h3>
              <p className="rapport-prose">
                {RP_LABELS.berekningaLoyst[locale]}
                {" "}{matchPhraseText}
              </p>
              {data.controllerDecision && (
                <div className="rapport-decision">
                  <strong>{RP_LABELS.kontrollorAvgjerd[locale]}</strong> {decisionLabel}
                  <em>{data.controllerDecision.user_message}</em>
                </div>
              )}
            </div>

            {/* Konklusjon */}
            <div id="konklusjon" className="rapport-subsection">
              <h3>{RP_LABELS.konklusjonH3[locale]}</h3>
              <p className="rapport-prose">{data.report.conclusion}</p>
            </div>
          </section>

{/* Footer-signatur */}
<footer className="rapport-footer">
<div className="rapport-footer__warning">
  {RP_LABELS.forebelsBerekning[locale]}
</div>
  <div className="rapport-footer__manual-sign">
    <div className="rapport-footer__sign-field">
      <span className="rapport-footer__sign-label">{RP_LABELS.kontrollertAv[locale]}</span>
      <span className="rapport-footer__sign-line" />
    </div>
    <div className="rapport-footer__sign-field">
      <span className="rapport-footer__sign-label">{RP_LABELS.signatur[locale]}</span>
      <span className="rapport-footer__sign-line" />
    </div>
    <div className="rapport-footer__sign-field">
      <span className="rapport-footer__sign-label">{RP_LABELS.footerDato[locale]}</span>
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
        <span>{RP_LABELS.generert[locale]} {reportDate}</span>
        <span className="rapport-footer__sep">·</span>
        <span className="uk-mono">{formatPromptVersion(data.report.prompt_version)}</span>
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
          <div className="uk-eyebrow">{RP_LABELS.handlingar[locale]}</div>
          <button
            onClick={() => window.print()}
            className="uk-btn uk-btn--primary"
          >
            {RP_LABELS.lastNedPDF[locale]}
          </button>
          <a href={wordUrl} className="uk-btn" download={wordFilename}>
            {RP_LABELS.lastNedWord[locale]}
          </a>
          {data.run.request_id && (
            <a href={`/?from_request=${data.run.request_id}`} className="uk-btn">
              {RP_LABELS.lagNyBerekning[locale]}
            </a>
          )}
          <a href={`/?from_run=${runId}`} className="uk-btn">
            {RP_LABELS.saMissionControl[locale]}
          </a>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="uk-btn"
          >
            {RP_LABELS.sendTilbakemelding[locale]}
          </button>
        </div>

        <div className="rapport-status-panel">
          <div className="uk-eyebrow">{RP_LABELS.kontrollstatus[locale]}</div>
          <StatusRow
            label={RP_LABELS.statusInputTolking[locale]}
            tone={inputTone}
            value={inputLabel}
            explanation={RP_LABELS.statusInputExplanation[locale]}
          />
          <StatusRow
            label={RP_LABELS.statusKonstruktorA[locale]}
            tone={agentATone}
            value={agentAConf || "—"}
            explanation={RP_LABELS.statusKonstruktorExplanation[locale]}
          />
          <StatusRow
            label={RP_LABELS.statusKonstruktorB[locale]}
            tone={agentBTone}
            value={agentBConf || "—"}
            explanation={RP_LABELS.statusKonstruktorExplanation[locale]}
          />
          <StatusRow
            label={RP_LABELS.statusSamanlikning[locale]}
            tone={matchTone}
            value={matchLabel}
            explanation={RP_LABELS.statusSamanlikningExplanation[locale]}
          />
          <StatusRow
            label={RP_LABELS.statusKontrollor[locale]}
            tone={controllerTone}
            value={controllerShort}
            explanation={RP_LABELS.statusKontrollorExplanation[locale]}
          />
          <StatusRow
            label={RP_LABELS.statusFagperson[locale]}
            tone="warn"
            value={RP_LABELS.ikkjeKontrollert[locale]}
            explanation={RP_LABELS.statusFagpersonExplanation[locale]}
          />
        </div>
        </aside>

<FeilrapportModal
  open={feedbackOpen}
  onClose={() => setFeedbackOpen(false)}
  reportId={data.report.id}
  documentId={data.report.document_id}
  runId={runId}
/>
</div>
);
}

function StatusRow({ label, tone, value, explanation }: { label: string; tone: Tone; value: string; explanation?: string }) {
  const variant = tone === "neutral" ? "" : `uk-badge--${tone}`;
  const fullClass = ["uk-badge", variant].filter(Boolean).join(" ");
  return (
    <div className="rapport-status-row">
      <span>
        {label}
        {explanation && (<InfoPopover label={label}><p>{explanation}</p></InfoPopover>)}
      </span>
      <span className={fullClass}>{value}</span>
    </div>
  );
}
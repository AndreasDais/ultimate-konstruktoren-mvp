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

type BadgeStatus = "ok" | "warn" | "bad" | "info" | "neutral";

const PHASE_HEADERS: Record<Phase, { eyebrow: string; title: string; description: string }> = {
  input: {
    eyebrow: "NY BEREKNING",
    title: "Beskriv oppgåva",
    description: "Input-agenten les forespørselen og viser tolkinga før berekning startar.",
  },
  result: {
    eyebrow: "STEG 2 AV 3 · BEKREFT",
    title: "Tolking frå Input-agent",
    description: "Sjekk at dette stemmer før berekning. Du kan endre input eller starte berekninga.",
  },
  calculating: {
    eyebrow: "REKNAR",
    title: "Agentane jobbar",
    description: "Dobbel-kontroll med to uavhengige agentar og samanlikning.",
  },
  calculation_result: {
    eyebrow: "STEG 3 AV 3 · RESULTAT",
    title: "Berekningsnotat",
    description: "Førebels resultat med agentkontroll. Må kontrollerast av fagperson før bruk.",
  },
};

const matchStatusBadge: Record<ComparisonResult["match_status"], BadgeStatus> = {
  match: "ok",
  minor_differences: "info",
  significant_differences: "warn",
  critical_disagreement: "bad",
};

const matchStatusLabel: Record<ComparisonResult["match_status"], string> = {
  match: "Begge agentar er einige",
  minor_differences: "Mindre forskjellar",
  significant_differences: "Betydelege forskjellar",
  critical_disagreement: "Kritisk uenigheit",
};

const recommendedStatusBadge: Record<ComparisonResult["recommended_status"], BadgeStatus> = {
  approved_preliminary: "ok",
  uncertain: "warn",
  rejected_needs_review: "bad",
};

const recommendedStatusLabel: Record<ComparisonResult["recommended_status"], string> = {
  approved_preliminary: "Førebels godkjent",
  uncertain: "Usikker",
  rejected_needs_review: "Krev gjennomgang",
};

const severityBadge: Record<ConsistencyIssue["severity"], BadgeStatus> = {
  low: "neutral",
  medium: "info",
  high: "warn",
  critical: "bad",
};

const confidenceBadge: Record<CalculationResult["confidence"], BadgeStatus> = {
  high: "ok",
  medium: "warn",
  low: "bad",
};

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

  const pageHeader = PHASE_HEADERS[phase];

  return (
    <div className="uk-shell">
      <header className="uk-topbar">
        <div className="uk-topbar__brand">
          <div className="uk-topbar__logo">UK</div>
          Konstruktøren
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <header className="mb-10">
            <div className="uk-eyebrow">{pageHeader.eyebrow}</div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: "8px 0 6px",
                color: "var(--fg)",
              }}
            >
              {pageHeader.title}
            </h1>
            <p
              style={{
                color: "var(--fg-muted)",
                fontSize: 14,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {pageHeader.description}
            </p>
          </header>

          <div className="uk-disclaimer" style={{ marginBottom: 32 }}>
            <div className="uk-disclaimer__label">VIKTIG MERKNAD</div>
            Dette er ein tidleg testversjon under utvikling. Resultata er ikkje
            kontrollerte og kan vere feilaktige. Verktøyet skal ikkje brukast
            som grunnlag for reell prosjektering, byggesøknader eller utføring.
            All berekning må kontrollerast av kvalifisert byggingeniør før
            praktisk bruk.
          </div>

          {/* === FASE: INPUT === */}
          {phase === "input" && (
            <section>
              <label htmlFor="oppgave" className="uk-label">
                Skriv inn ei konstruksjonsoppgåve
              </label>
              <textarea
                id="oppgave"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={6}
                placeholder="Til dømes: Finn maksimalt moment og skjær for ein fritt opplagd bjelke med L = 5 m og jamt fordelt last q = 8 kN/m..."
                className="uk-textarea"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || loading}
                className="uk-btn uk-btn--primary"
                style={{ marginTop: 12 }}
              >
                {loading ? "Tolkar..." : "Send til Input-agent"}
              </button>
            </section>
          )}

          {/* === FEIL === */}
          {error && (
            <StatusStripe status="bad" label="Feil" className="mt-8">
              {error}
            </StatusStripe>
          )}

          {/* === FASE: RESULT (Input-agent) === */}
          {phase === "result" && result && (
            <>
              <section className="uk-card">
                <div className="uk-card__hd">
                  <div className="uk-card__title">Din forespørsel</div>
                </div>
                <div className="uk-card__bd">
                  <p
                    className="uk-mono"
                    style={{
                      fontSize: 13,
                      color: "var(--fg-2)",
                      whiteSpace: "pre-wrap",
                      margin: 0,
                      lineHeight: 1.55,
                    }}
                  >
                    {input}
                  </p>
                </div>
              </section>

              <section className="uk-card" style={{ marginTop: 16 }}>
                <div className="uk-card__hd">
                  <div className="uk-card__title">Input-agentens tolking</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Badge status="neutral">{result.status}</Badge>
                    <span
                      className="uk-mono"
                      style={{ fontSize: 11, color: "var(--fg-muted)" }}
                    >
                      konfidens {result.konfidens?.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.55 }}>
                    {result.tolkings_oppsummering}
                  </p>

                  {result.berekningstype && (
                    <Row label="Berekningstype" value={result.berekningstype} />
                  )}

                  {Object.keys(result.tolkte_verdiar || {}).length > 0 && (
                    <div>
                      <div className="uk-eyebrow" style={{ marginBottom: 6 }}>
                        Tolkte verdiar
                      </div>
                      <ul
                        className="uk-mono"
                        style={{
                          fontSize: 12.5,
                          color: "var(--fg)",
                          margin: 0,
                          paddingLeft: 0,
                          listStyle: "none",
                        }}
                      >
                        {Object.entries(result.tolkte_verdiar).map(([k, v]) => (
                          <li key={k} style={{ padding: "2px 0" }}>
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
                </div>
              </section>

              <section className="uk-card" style={{ marginTop: 16 }}>
                <div className="uk-card__bd">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--fg-muted)",
                        margin: 0,
                      }}
                    >
                      Stemmer tolkinga? Då kan du starte berekninga, eller endre
                      forespørselen.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleCancel} className="uk-btn uk-btn--ghost">
                        Avbryt
                      </button>
                      <button onClick={handleEdit} className="uk-btn">
                        Endre input
                      </button>
                      <button
                        onClick={handleStartCalculation}
                        disabled={
                          result.status === "avvist" ||
                          (result.kan_reknast_no?.length ?? 0) === 0
                        }
                        className="uk-btn uk-btn--primary"
                        style={{
                          opacity:
                            result.status === "avvist" ||
                              (result.kan_reknast_no?.length ?? 0) === 0
                              ? 0.5
                              : 1,
                          cursor:
                            result.status === "avvist" ||
                              (result.kan_reknast_no?.length ?? 0) === 0
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        Start berekning →
                      </button>
                    </div>
                  </div>
                  {(result.status === "avvist" ||
                    (result.kan_reknast_no?.length ?? 0) === 0) && (
                    <p
                      style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: "var(--warn)",
                      }}
                    >
                      {result.status === "avvist"
                        ? "Inputen er klassifisert som avvist. Berekning kan ikkje startast."
                        : "Ingen berekningar er mogleg med oppgitt informasjon. Klikk Endre input og legg til manglar."}
                    </p>
                  )}
                </div>
              </section>
            </>
          )}

          {/* === FASE: CALCULATING === */}
          {phase === "calculating" && (
            <section className="uk-card">
              <div
                className="uk-card__bd"
                style={{ padding: "48px 16px", textAlign: "center" }}
              >
                <div
                  className="animate-spin"
                  style={{
                    display: "inline-block",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "4px solid var(--border)",
                    borderTopColor: "var(--fg)",
                  }}
                />
                <h3
                  style={{
                    marginTop: 16,
                    marginBottom: 6,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--fg)",
                  }}
                >
                  {!calculationA
                    ? "Agent A reknar..."
                    : !calculationB
                      ? "Agent B kontrollerer..."
                      : "Agent C samanliknar..."}
                </h3>
                <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0 }}>
                  {!calculationA
                    ? "Stegvis løysing med formlar og einingar."
                    : !calculationB
                      ? "Uavhengig løysing for dobbel-kontroll."
                      : "Finn skilnader i metode, tal og intern konsistens."}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 16,
                    marginTop: 16,
                    fontSize: 11,
                  }}
                >
                  {(
                    [
                      ["Agent A", !!calculationA],
                      ["Agent B", !!calculationB],
                      ["Agent C", !!comparison],
                    ] as const
                  ).map(([label, done]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: done ? "var(--ok)" : "var(--fg-faint)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: done ? "var(--ok)" : "var(--border-2)",
                        }}
                      />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* === FASE: CALCULATION_RESULT === */}
          {phase === "calculation_result" && calculationA && (
            <>
              {/* Verifikasjons-banner */}
              {comparison && (
                <StatusStripe
                  status={matchStatusBadge[comparison.match_status]}
                  className="mb-4"
                  header={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        className="uk-eyebrow"
                        style={{ color: "inherit" }}
                      >
                        {matchStatusLabel[comparison.match_status]}
                      </span>
                      <Badge
                        status={recommendedStatusBadge[comparison.recommended_status]}
                      >
                        {recommendedStatusLabel[comparison.recommended_status]}
                      </Badge>
                    </div>
                  }
                >
                  {comparison.summary}
                </StatusStripe>
              )}

              {/* Kort svar */}
              <StatusStripe
                status="ok"
                header={
                  <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                    Kort svar
                  </div>
                }
              >
                <span style={{ fontSize: 15, color: "var(--fg)", fontWeight: 500 }}>
                  {calculationA.short_conclusion}
                </span>
              </StatusStripe>

              {/* Resultat-objekt */}
              {Object.keys(calculationA.results || {}).length > 0 && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div className="uk-card__title">Resultat</div>
                  </div>
                  <div className="uk-card__bd">
                    {Object.entries(calculationA.results).map(([k, v], i, arr) => (
                      <div
                        key={k}
                        className="uk-kv"
                        style={{
                          borderTop: i === 0 ? "none" : undefined,
                        }}
                      >
                        <span className="uk-kv__k uk-mono">{k}</span>
                        <span className="uk-kv__v uk-mono" style={{ fontWeight: 600 }}>
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Føresetnader */}
              {calculationA.assumptions?.length > 0 && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div className="uk-card__title">Føresetnader brukt</div>
                  </div>
                  <div className="uk-card__bd">
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: 13,
                        color: "var(--fg-2)",
                        lineHeight: 1.6,
                      }}
                    >
                      {calculationA.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Stegvis utrekning */}
              {calculationA.calculation_steps?.length > 0 && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div className="uk-card__title">Stegvis utrekning</div>
                  </div>
                  <div className="uk-card__bd">
                    <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {calculationA.calculation_steps.map((step, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            gap: 14,
                            paddingTop: i === 0 ? 0 : 18,
                          }}
                        >
                          <div
                            className="uk-mono"
                            style={{
                              flexShrink: 0,
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: "var(--fg)",
                              color: "var(--surface)",
                              fontSize: 12,
                              fontWeight: 600,
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {i + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4
                              style={{
                                margin: "2px 0 4px",
                                fontSize: 14,
                                fontWeight: 600,
                                color: "var(--fg)",
                              }}
                            >
                              {step.title}
                            </h4>
                            <pre
                              style={{
                                margin: 0,
                                fontFamily: "var(--font-ui)",
                                fontSize: 13,
                                color: "var(--fg-2)",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.55,
                              }}
                            >
                              {step.text}
                            </pre>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              )}

              {/* Avgrensingar */}
              {calculationA.limitations?.length > 0 && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div
                      className="uk-card__title"
                      style={{ color: "var(--warn)" }}
                    >
                      Kva er ikkje rekna
                    </div>
                  </div>
                  <div className="uk-card__bd">
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: 13,
                        color: "var(--fg-2)",
                        lineHeight: 1.6,
                      }}
                    >
                      {calculationA.limitations.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Åtvaringar */}
              {calculationA.warnings?.length > 0 && (
                <StatusStripe
                  status="warn"
                  className="mt-4"
                  header={
                    <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                      Åtvaringar
                    </div>
                  }
                >
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontSize: 13,
                      color: "var(--fg-2)",
                      lineHeight: 1.6,
                    }}
                  >
                    {calculationA.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </StatusStripe>
              )}

              {/* Konfidens */}
              <section className="uk-card" style={{ marginTop: 16 }}>
                <div className="uk-card__bd" style={{ padding: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 24,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="uk-eyebrow">Agent A konfidens</span>
                      <Badge status={confidenceBadge[calculationA.confidence]}>
                        {calculationA.confidence}
                      </Badge>
                    </div>
                    {calculationB && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="uk-eyebrow">Agent B konfidens</span>
                        <Badge status={confidenceBadge[calculationB.confidence]}>
                          {calculationB.confidence}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Agent B-resultat (uavhengig kontroll) */}
              {calculationB && (
                <section
                  className="uk-card"
                  style={{ marginTop: 16, background: "var(--surface-2)" }}
                >
                  <div className="uk-card__hd">
                    <div className="uk-card__title">
                      Agent B — uavhengig kontroll
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--fg-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      Løyste oppgåva utan å sjå Agent A sitt svar
                    </span>
                  </div>
                  <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--r-sm)",
                        padding: 12,
                      }}
                    >
                      <div className="uk-eyebrow" style={{ marginBottom: 4 }}>
                        Agent B sin konklusjon
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
                        {calculationB.short_conclusion}
                      </p>
                    </div>

                    {Object.keys(calculationB.results || {}).length > 0 && (
                      <div
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--r-sm)",
                          padding: 12,
                        }}
                      >
                        <div className="uk-eyebrow" style={{ marginBottom: 6 }}>
                          Agent B sine resultat
                        </div>
                        {Object.entries(calculationB.results).map(([k, v], i) => (
                          <div
                            key={k}
                            className="uk-kv"
                            style={{
                              borderTop: i === 0 ? "none" : undefined,
                              padding: "6px 0",
                            }}
                          >
                            <span className="uk-kv__k uk-mono">{k}</span>
                            <span className="uk-kv__v uk-mono" style={{ fontWeight: 600 }}>
                              {v}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Comparison details — Agent C */}
              {comparison && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div className="uk-card__title">Agent C — samanlikning</div>
                  </div>
                  <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {/* Numeriske skilnader */}
                    {comparison.numeric_differences?.length > 0 && (
                      <div>
                        <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                          Numeriske skilnader
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {["Felt", "Agent A", "Agent B", "Skilnad", "Alvor"].map((h) => (
                                  <th
                                    key={h}
                                    className="uk-eyebrow"
                                    style={{
                                      textAlign: "left",
                                      padding: "8px 10px 8px 0",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {comparison.numeric_differences.map((diff, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                                  <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg-2)" }}>
                                    {diff.field}
                                  </td>
                                  <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg)" }}>
                                    {diff.agent_a_value}
                                  </td>
                                  <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg)" }}>
                                    {diff.agent_b_value}
                                  </td>
                                  <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg)" }}>
                                    {diff.percent_diff?.toFixed(1)}%
                                  </td>
                                  <td style={{ padding: "8px 0" }}>
                                    <Badge status={severityBadge[diff.severity]}>
                                      {diff.severity}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none", fontSize: 12, color: "var(--fg-muted)" }}>
                          {comparison.numeric_differences.map((diff, i) => (
                            <li key={i} style={{ padding: "3px 0" }}>
                              <span className="uk-mono">{diff.field}:</span>{" "}
                              {diff.likely_cause}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metodiske skilnader */}
                    {comparison.method_differences?.length > 0 && (
                      <div>
                        <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                          Metodiske skilnader
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
                          {comparison.method_differences.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Føresetnadsforskjellar */}
                    {comparison.assumption_differences?.length > 0 && (
                      <div>
                        <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                          Forskjellar i føresetnader
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
                          {comparison.assumption_differences.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Intern konsistens — kritisk */}
                    {((comparison.internal_consistency_issues?.agent_a?.length ?? 0) > 0 ||
                      (comparison.internal_consistency_issues?.agent_b?.length ?? 0) > 0) && (
                      <div
                        style={{
                          background: "var(--warn-bg)",
                          border: "1px solid var(--warn-border)",
                          borderLeft: "3px solid var(--warn)",
                          borderRadius: "var(--r-sm)",
                          padding: "12px 14px",
                        }}
                      >
                        <div
                          className="uk-eyebrow"
                          style={{ color: "var(--warn)", marginBottom: 10 }}
                        >
                          ⚠ Intern inkonsistens
                        </div>
                        {(comparison.internal_consistency_issues?.agent_a?.length ?? 0) > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--fg)",
                                marginBottom: 4,
                              }}
                            >
                              Agent A
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
                              {comparison.internal_consistency_issues.agent_a.map((issue, i) => (
                                <li key={i}>
                                  {issue.issue}{" "}
                                  <Badge status={severityBadge[issue.severity]}>
                                    {issue.severity}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(comparison.internal_consistency_issues?.agent_b?.length ?? 0) > 0 && (
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--fg)",
                                marginBottom: 4,
                              }}
                            >
                              Agent B
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
                              {comparison.internal_consistency_issues.agent_b.map((issue, i) => (
                                <li key={i}>
                                  {issue.issue}{" "}
                                  <Badge status={severityBadge[issue.severity]}>
                                    {issue.severity}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Action bar */}
              <section className="uk-card" style={{ marginTop: 16 }}>
                <div className="uk-card__bd" style={{ padding: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0 }}>
                      Resultatet er førebels og må kontrollerast av fagperson.
                    </p>
                    <button onClick={handleCancel} className="uk-btn">
                      Tilbake til start
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
      <span style={{ color: "var(--fg-muted)", width: 128, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color: "var(--fg)" }}>{value}</span>
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
      <div className="uk-eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          fontSize: 13,
          color: tone === "warn" ? "var(--warn)" : "var(--fg-2)",
          lineHeight: 1.6,
        }}
      >
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Badge({
  status,
  children,
}: {
  status: BadgeStatus;
  children: React.ReactNode;
}) {
  const colors: Record<BadgeStatus, { fg: string; bg: string; border: string }> = {
    ok: { fg: "var(--ok)", bg: "var(--ok-bg)", border: "var(--ok-border)" },
    warn: { fg: "var(--warn)", bg: "var(--warn-bg)", border: "var(--warn-border)" },
    bad: { fg: "var(--bad)", bg: "var(--bad-bg)", border: "var(--bad-border)" },
    info: { fg: "var(--info)", bg: "var(--info-bg)", border: "var(--info-border)" },
    neutral: { fg: "var(--fg-2)", bg: "var(--surface-2)", border: "var(--border)" },
  };
  const c = colors[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 4,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.fg,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function StatusStripe({
  status,
  header,
  label,
  children,
  className,
}: {
  status: BadgeStatus;
  header?: React.ReactNode;
  label?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const colors: Record<BadgeStatus, { fg: string; bg: string; border: string }> = {
    ok: { fg: "var(--ok)", bg: "var(--ok-bg)", border: "var(--ok-border)" },
    warn: { fg: "var(--warn)", bg: "var(--warn-bg)", border: "var(--warn-border)" },
    bad: { fg: "var(--bad)", bg: "var(--bad-bg)", border: "var(--bad-border)" },
    info: { fg: "var(--info)", bg: "var(--info-bg)", border: "var(--info-border)" },
    neutral: { fg: "var(--fg-2)", bg: "var(--surface-2)", border: "var(--border)" },
  };
  const c = colors[status];
  return (
    <section
      className={className}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.fg}`,
        borderRadius: "var(--r-sm)",
        padding: "14px 16px",
        color: c.fg,
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}
      {header}
      <div style={{ color: "var(--fg-2)", fontSize: 13, lineHeight: 1.55 }}>
        {children}
      </div>
    </section>
  );
}
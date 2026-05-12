"use client";

import { useEffect, useRef, useState } from "react";
import {
  MATCH_STATUS_LABELS, MATCH_STATUS_TONES,
  DECISION_STATUS_LABELS, DECISION_STATUS_TONES,
  CONFIDENCE_TONES, SEVERITY_TONES,
  INPUT_STATUS_LABELS, INPUT_STATUS_TONES,
  type Tone,
} from "@/lib/format";
import MissionControl, { type AgentStreamingState } from "@/app/components/MissionControl";
import { streamAgent } from "@/lib/stream-agent";
import { extractStreamingState, extractTolkarState, type PartialTolkarState } from "@/lib/partial-json";

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

type ControllerDecision = {
  decision_status: "approved" | "approved_with_warnings" | "uncertain" | "rejected";
  risk_level: "low" | "medium" | "high";
  reason: string;
  user_message: string;
  blocked_outputs: string[];
  allowed_outputs: string[];
  manual_review_required: boolean;
  controller_notes: string;
};

type Phase = "workbench" | "calculating" | "calculation_result";

const EXAMPLE_PROMPTS = [
  "Fritt opplagd stålbjelke, L = 5,0 m, q = 8,0 kN/m",
  "Lastkombinasjon for kontorbygg, G = 4,5 kN/m², Q = 3,0 kN/m²",
  "Armering i betongbjelke, MEd = 120 kNm, b = 250 mm, d = 450 mm",
];

const PHASE_HEADERS: Record<Phase, { eyebrow: string; title: string; description: string }> = {
  workbench: {
    eyebrow: "NY BEREKNING",
    title: "Beskriv oppgåva",
    description: "Skriv inn forespørselen. Tolkaren les og viser tolkinga her — du kan redigere og tolke på nytt før du startar berekninga.",
  },
  calculating: {
    eyebrow: "REKNAR",
    title: "Konstruktørane jobbar",
    description: "Dobbel-kontroll med to uavhengige konstruktørar, samanlikning og kontrolløravgjerd.",
  },
  calculation_result: {
    eyebrow: "STEG 3 AV 3 · RESULTAT",
    title: "Berekningsnotat",
    description: "Førebels resultat med agentkontroll. Må kontrollerast av fagperson før bruk.",
  },
};

// Returnerer ein menneskeleg-lesbar grunn til at "Start berekning" er deaktivert,
// eller null viss berekning kan startast. Status-spesifikk for å unngå
// misvisande "legg til manglar"-melding på t.d. relevant_ikkje_stotta.
function getBlockedReason(result: AgentResult | null): string | null {
  if (!result) return null;

  if (result.status === "avvist") {
    return "Inputen er ikkje byggfagleg. Berekning kan ikkje startast.";
  }

  if (result.status === "relevant_ikkje_stotta") {
    return "Forespurnaden er byggfagleg relevant, men ligg utanfor det MVP-en støttar enno (typisk brann, dynamikk, seismisk eller geoteknisk dimensjonering). Prøv ei anna formulering eller ein annan berekningstype.";
  }

  if (result.status === "uklart") {
    return "Forespurnaden er for vag til å tolke trygt. Rediger forespørselen og tolk på nytt med meir konkret informasjon om geometri, last og materiale.";
  }

  if ((result.kan_reknast_no?.length ?? 0) === 0) {
    return "Ingen berekning er mogleg med oppgitt informasjon. Rediger forespørselen og legg til manglande data.";
  }

  return null;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [calculationA, setCalculationA] = useState<CalculationResult | null>(null);
  const [calculationB, setCalculationB] = useState<CalculationResult | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [controllerDecision, setControllerDecision] = useState<ControllerDecision | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("workbench");

  // Streaming-state for Mission Control v2 — populert progressivt frå SSE.
  // Når agent-en er ferdig, blir calculationA/B sett som vanleg og MC byter
  // til complete-state med endeleg liste + results under tjukk skiljelinje.
  const INITIAL_STREAMING: AgentStreamingState = {
    phase: "idle",
    stepTitles: [],
    results: {},
  };
  const [streamingA, setStreamingA] = useState<AgentStreamingState>(INITIAL_STREAMING);
  const [streamingB, setStreamingB] = useState<AgentStreamingState>(INITIAL_STREAMING);

  // Streaming-state for Tolkar (dag 10). Phase går "idle" → "streaming"
  // → "complete" eller "error". Partial blir populert progressivt frå SSE.
  type TolkarStreamingState = {
    phase: "idle" | "streaming" | "complete" | "error";
    partial: PartialTolkarState;
    error?: string;
  };
  const INITIAL_TOLKAR: TolkarStreamingState = {
    phase: "idle",
    partial: {
      berekningstype: null,
      fagomraade: null,
      tolkte_verdiar: {},
      antakingar: [],
      manglande_verdiar: [],
      kan_reknast_no: [],
      kan_ikkje_reknast: [],
      tolkings_oppsummering: null,
      konfidens: null,
      status: null,
    },
  };
  const [streamingTolkar, setStreamingTolkar] = useState<TolkarStreamingState>(INITIAL_TOLKAR);

  // Konstruerer ein AgentResult-shape frå partial-state for å kunne dele
  // render-koden mellom streaming og complete. Manglar fyllast med tomme
  // arrays/strenger så eksisterande conditional-renderar i panelet skjuler dei.
  const tolkingView: AgentResult | null =
    result ??
    (streamingTolkar.phase === "streaming"
      ? {
          status: streamingTolkar.partial.status ?? "",
          berekningstype: streamingTolkar.partial.berekningstype,
          fagomraade: streamingTolkar.partial.fagomraade,
          tolkte_verdiar: streamingTolkar.partial.tolkte_verdiar,
          manglande_verdiar: streamingTolkar.partial.manglande_verdiar,
          kan_reknast_no: streamingTolkar.partial.kan_reknast_no,
          kan_ikkje_reknast: streamingTolkar.partial.kan_ikkje_reknast,
          antakingar: streamingTolkar.partial.antakingar,
          tolkings_oppsummering: streamingTolkar.partial.tolkings_oppsummering ?? "",
          konfidens: streamingTolkar.partial.konfidens ?? 0,
        }
      : null);

  // Last state tilbake frå sessionStorage når brukar kjem tilbake frå /rapport.
  // Legacy-phases "input" og "result" mappast til ny "workbench"-phase.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("uk-state");
      if (!saved) return;
      const state = JSON.parse(saved);
      if (!state.currentRunId) return;

      setInput(state.input ?? "");
      setResult(state.result ?? null);
      setRequestId(state.requestId ?? null);
      setCalculationA(state.calculationA ?? null);
      setCalculationB(state.calculationB ?? null);
      setComparison(state.comparison ?? null);
      setControllerDecision(state.controllerDecision ?? null);
      setCurrentRunId(state.currentRunId);

      // Map legacy phase names for bakoverkompatibilitet med pågåande sessions
      const legacyPhase = state.phase;
      if (legacyPhase === "input" || legacyPhase === "result") {
        setPhase("workbench");
      } else if (legacyPhase === "calculation_result" || legacyPhase === "calculating") {
        setPhase(legacyPhase);
      } else {
        setPhase("calculation_result");
      }

      sessionStorage.removeItem("uk-state");
    } catch (e) {
      console.warn("Klarte ikkje laste tilstand frå sessionStorage", e);
    }
  }, []);

  const saveStateToSession = () => {
    try {
      sessionStorage.setItem(
        "uk-state",
        JSON.stringify({
          input,
          result,
          requestId,
          calculationA,
          calculationB,
          comparison,
          controllerDecision,
          currentRunId,
          phase: "calculation_result",
        })
      );
    } catch (e) {
      console.warn("Klarte ikkje lagre tilstand til sessionStorage", e);
    }
  };

// Ref til tolking-panelet for auto-scroll når Tolkar er ferdig.
const tolkingPanelRef = useRef<HTMLDivElement | null>(null);

// Refs til milestone-cardene for auto-scroll under Tolkar-streaming.
const reknastCardRef = useRef<HTMLElement | null>(null);
const statusCardRef = useRef<HTMLElement | null>(null);

// AbortController for å avbryte aktive SSE-streams ved cancel/unmount.
// Hindrar zombie-streams som held fram å bruke Anthropic-tokens etter
// at brukaren ikkje lenger ser resultatet.
const abortControllerRef = useRef<AbortController | null>(null);

// Avbryt aktive streams når komponenten unmountar (rute-navigasjon e.l.)
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);

// Auto-scroll for Tolkar-panelet (dag 10):
// Berre éin scroll når streaming startar — panel-overskriftene kjem til
// topps og blir ståande der. Innhaldet veks UNDER overskriftene, og
// brukar les i sitt eige tempo. Hvis panelet veks forbi viewport-en
// (sjeldan — krev veldig lang antakingar-liste), kan brukar scrolle
// manuelt for å sjå botnen.
//
// NB: padding-bottom på workbench-seksjonen gir document nok scroll-rom
// til at scrollIntoView faktisk kan plassere panel-toppen ved viewport-
// toppen sjølv om sida elles er kort.
useEffect(() => {
  if (streamingTolkar.phase !== "streaming") return;
  const panel = tolkingPanelRef.current;
  if (!panel) return;

  const timer = setTimeout(() => {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
  return () => clearTimeout(timer);
}, [streamingTolkar.phase]);

  // Tolk forespurnaden via SSE-streaming. Panelet dukkar opp så snart første
  // delta kjem og fyllest progressivt. Når streamen er komplett, blir result
  // sett som vanleg og "Start berekning →" enablar.
  const handleTolk = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setStreamingTolkar({ ...INITIAL_TOLKAR, phase: "streaming" });

    // Avbryt eventuell tidlegare stream (t.d. ved "Tolk på nytt")
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamAgent(
        "/api/input-agent",
        { text: input },
        {
          onTextStart: () =>
            setStreamingTolkar((s) => ({ ...s, phase: "streaming" })),
          onDelta: (_delta, accumulated) => {
            const partial = extractTolkarState(accumulated);
            setStreamingTolkar((s) => ({ ...s, phase: "streaming", partial }));
          },
          onComplete: (data) => {
            // request_id ligg som ekstra felt på result — plukk han ut
            const { request_id, ...resultFields } = data as Record<string, unknown> & {
              request_id?: string | null;
            };
            setResult(resultFields as unknown as AgentResult);
            if (typeof request_id === "string") {
              setRequestId(request_id);
            }
            setStreamingTolkar((s) => ({ ...s, phase: "complete" }));
          },
          onError: (msg) => {
            setError(msg);
            setStreamingTolkar((s) => ({ ...s, phase: "error", error: msg }));
          },
        },
        controller.signal
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setStreamingTolkar((s) => ({ ...s, phase: "error" }));
    } finally {
      setLoading(false);
    }
  };

  // Avbryt og start på nytt med tomt arbeidsbord.
  const handleCancel = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setInput("");
    setResult(null);
    setRequestId(null);
    setCalculationA(null);
    setCalculationB(null);
    setComparison(null);
    setControllerDecision(null);
    setCurrentRunId(null);
    setError(null);
    setPhase("workbench");
    setStreamingA(INITIAL_STREAMING);
    setStreamingB(INITIAL_STREAMING);
    setStreamingTolkar(INITIAL_TOLKAR);
  };

  const handleStartCalculation = async () => {
    if (!result || !requestId) return;

    // Hopp rett til resultatet viss berekninga allereie er gjort
    // (skjer når brukar kjem tilbake frå calc_result til workbench og trykker Start igjen)
    if (calculationA && currentRunId) {
      setPhase("calculation_result");
      return;
    }

    // Avbryt eventuelle pågåande streams før vi startar nye
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPhase("calculating");
    setError(null);
    setCalculationA(null);
    setCalculationB(null);
    setComparison(null);
    setControllerDecision(null);
    setStreamingA({ ...INITIAL_STREAMING, phase: "thinking" });
    setStreamingB({ ...INITIAL_STREAMING, phase: "thinking" });

    try {
      // === STEG 0: Init run ===
      const initResponse = await fetch("/api/init-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          calculation_type: result.berekningstype,
        }),
      });

      const initData = await initResponse.json();

      if (!initResponse.ok) {
        setError(initData.error || "Klarte ikkje starte berekningskøyring");
        setPhase("workbench");
        return;
      }

      const runId: string = initData.run_id;
      setCurrentRunId(runId);

      // === STEG 1: Konstruktør A og B parallelt via SSE-streaming ===
      // Begge agentar streamar samtidig. Vi held lokale variablar for
      // sluttresultata, og setter calculationA/B i onComplete så
      // MissionControl-komponenten kan vise progress real-time.
      let resA: CalculationResult | null = null;
      let resB: CalculationResult | null = null;
      let errA: string | null = null;
      let errB: string | null = null;

      const agentBody = { run_id: runId, input_review: result };

      await Promise.all([
        streamAgent("/api/agent-a", agentBody, {
          onThinkingStart: () =>
            setStreamingA((s) => ({ ...s, phase: "thinking" })),
          onTextStart: () =>
            setStreamingA((s) => ({ ...s, phase: "streaming" })),
          onDelta: (_delta, accumulated) => {
            const extracted = extractStreamingState(accumulated);
            setStreamingA((s) => ({
              ...s,
              phase: "streaming",
              stepTitles: extracted.stepTitles,
              results: extracted.results,
            }));
          },
          onComplete: (r) => {
            resA = r as unknown as CalculationResult;
            setCalculationA(resA);
            setStreamingA((s) => ({ ...s, phase: "complete" }));
          },
          onError: (msg) => {
            errA = msg;
            setStreamingA((s) => ({ ...s, phase: "error", error: msg }));
          },
        }, controller.signal),
        streamAgent("/api/agent-b", agentBody, {
          onThinkingStart: () =>
            setStreamingB((s) => ({ ...s, phase: "thinking" })),
          onTextStart: () =>
            setStreamingB((s) => ({ ...s, phase: "streaming" })),
          onDelta: (_delta, accumulated) => {
            const extracted = extractStreamingState(accumulated);
            setStreamingB((s) => ({
              ...s,
              phase: "streaming",
              stepTitles: extracted.stepTitles,
              results: extracted.results,
            }));
          },
          onComplete: (r) => {
            resB = r as unknown as CalculationResult;
            setCalculationB(resB);
            setStreamingB((s) => ({ ...s, phase: "complete" }));
          },
          onError: (msg) => {
            errB = msg;
            setStreamingB((s) => ({ ...s, phase: "error", error: msg }));
          },
        }, controller.signal),
      ]);

      if (errA) {
        setError(errA || "Konstruktør A klarte ikkje løyse oppgåva");
        setPhase("workbench");
        return;
      }

      if (errB || !resB) {
        console.error("Konstruktør B feila:", errB);
        setError(`Konstruktør B feila: ${errB}. Hoppar over samanlikning.`);
        setPhase("calculation_result");
        return;
      }

      // Lokale resA/resB blir brukt i Samanliknar/Kontrollør-kalla nedanfor
      // (i staden for dataA.result/dataB.result frå før). Sjekkar at dei ikkje
      // er null sjølv om TS-typing skulle tilseie det.
      if (!resA) {
        setError("Uventa: Konstruktør A returnerte tomt resultat");
        setPhase("workbench");
        return;
      }

      // === STEG 2: Samanliknar ===
      const responseC = await fetch("/api/agent-c", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          agent_a_output: resA,
          agent_b_output: resB,
        }),
      });

      const dataC = await responseC.json();

      if (!responseC.ok) {
        console.error("Samanliknar feila:", dataC.error);
        setError(`Samanliknar feila: ${dataC.error}. Viser A og B utan samanlikning.`);
        setPhase("calculation_result");
        return;
      }
      setComparison(dataC.result);

      // === STEG 3: Kontrolløren ===
      const responseD = await fetch("/api/agent-d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          input_review: result,
          agent_a_output: resA,
          agent_b_output: resB,
          comparison_result: dataC.result,
        }),
      });

      const dataD = await responseD.json();

      if (!responseD.ok) {
        console.error("Kontrollør feila:", dataD.error);
        setPhase("calculation_result");
        return;
      }

      setControllerDecision(dataD.result);
      setPhase("calculation_result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setPhase("workbench");
    }
  };

  const pageHeader = PHASE_HEADERS[phase];

  const isBlocked = (key: string): boolean =>
    !!controllerDecision?.blocked_outputs?.includes(key);

  const blockedReason = getBlockedReason(result);
  const canStart = result !== null && blockedReason === null;
  const hasTolket = result !== null;

  return (
    <div className="uk-shell">
      <main>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          {phase !== "calculating" && <StepIndicator phase={phase} />}

          {phase !== "calculating" && (
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
          )}

          {/* === FASE: WORKBENCH === */}
          {/* Slått saman skjerm 1 (input) + skjerm 2 (Tolkar-resultat) til éin side.
              Input-felt øvst, suggestion-chips, "Tolk oppgåva →"-knapp som fyller
              Tolkar-panelet under. Brukar kan redigere input og tolke på nytt.
              "Start berekning →" som sekundær CTA i botnen av Tolkar-panelet. */}
          {phase === "workbench" && (
            <section
              style={{
                // Gir document-en ekstra scroll-headroom så scrollIntoView
                // faktisk kan plassere milestone-corda ved viewport-toppen.
                // Utan dette stoppar scrollen midt på sida fordi sida ikkje
                // er lang nok i starten av Tolkar-streaminga.
                paddingBottom:
                  streamingTolkar.phase === "streaming" || result !== null
                    ? "60vh"
                    : undefined,
              }}
            >
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

              <div style={{ marginTop: 20 }}>
                <div className="uk-eyebrow" style={{ marginBottom: 10 }}>Eksempel</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  {EXAMPLE_PROMPTS.map((example, i) => (
                    <button
                      key={i}
                      type="button"
                      className="uk-chip"
                      onClick={() => setInput(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTolk}
                disabled={!input.trim() || loading}
                aria-busy={loading}
                className={`uk-btn uk-btn--primary${loading ? " uk-btn--loading" : ""}`}
                style={{ marginTop: 20 }}
              >
                {loading
                  ? "Tolkar..."
                  : hasTolket
                    ? "Tolk på nytt →"
                    : "Tolk oppgåva →"}
              </button>

              {/* === Feil-stripe — gjeld både tolk-feil og berekning-feil === */}
              {error && (
                <StatusStripe status="bad" label="Feil" className="mt-8">
                  {error}
                </StatusStripe>
              )}

              {/* TOLKING-PANEL — synleg under streaming OG når komplett. Bruker tolkingView
                  som er enten fullt result eller streaming.partial coerca til AgentResult-shape.
                  tolkar-stream-klassen aktiverer fade-in-animasjon for streamande innhald. */}
              {tolkingView && (
                <div ref={tolkingPanelRef} className="tolkar-stream" style={{ scrollMarginTop: "24px" }}>
                  <div className="uk-confirm-grid" style={{ marginTop: 32 }}>
                    {/* === Venstre kolonne: forespurnad + tolking === */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <section className="uk-card">
                        <div className="uk-card__hd">
                          <div className="uk-card__title">Tolking</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Badge status="neutral">Tolkar</Badge>
                            {streamingTolkar.phase === "streaming" && (
                              <span
                                style={{
                                  fontFamily: "var(--font-mono, monospace)",
                                  fontSize: 11,
                                  letterSpacing: "0.08em",
                                  color: "var(--fg-2)",
                                  padding: "2px 8px",
                                  border: "1px solid var(--rule, #E2E8F0)",
                                  borderRadius: 999,
                                  background: "var(--surface-alt, #F8FAFC)",
                                  animation: "mc-pulse 1.5s ease-in-out infinite",
                                }}
                              >
                                ● STRØYMER
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {tolkingView.tolkings_oppsummering && (
                            <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.55, fontSize: 13 }}>
                              {tolkingView.tolkings_oppsummering}
                            </p>
                          )}

                          {tolkingView.berekningstype && (
                            <Row label="Berekningstype" value={tolkingView.berekningstype} />
                          )}

                          {Object.keys(tolkingView.tolkte_verdiar || {}).length > 0 && (
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
                                {Object.entries(tolkingView.tolkte_verdiar).map(([k, v]) => (
                                  <li key={k} style={{ padding: "2px 0" }}>
                                    {k} = {v}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {tolkingView.manglande_verdiar?.length > 0 && (
                            <ListSection
                              label="Manglande data"
                              items={tolkingView.manglande_verdiar}
                              tone="warn"
                            />
                          )}

                          {tolkingView.antakingar?.length > 0 && (
                            <ListSection label="Antakingar" items={tolkingView.antakingar} />
                          )}
                        </div>
                      </section>
                    </div>

                    {/* === Høgre kolonne: kva kan reknast + status === */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {((tolkingView.kan_reknast_no?.length ?? 0) > 0 ||
                        (tolkingView.kan_ikkje_reknast?.length ?? 0) > 0) && (
                        <section
                          ref={reknastCardRef}
                          className="uk-card"
                          style={{ scrollMarginTop: 24 }}
                        >
                          <div className="uk-card__hd">
                            <div className="uk-card__title">Kva kan reknast no</div>
                          </div>
                          <div className="uk-card__bd">
                            {tolkingView.kan_reknast_no?.map((item) => (
                              <div key={item} className="uk-checkitem uk-checkitem--active">
                                <span className="uk-checkitem__icon">●</span>
                                <span className="uk-checkitem__label">{item}</span>
                              </div>
                            ))}
                            {tolkingView.kan_ikkje_reknast?.map((item) => (
                              <div key={item} className="uk-checkitem uk-checkitem--blocked">
                                <span className="uk-checkitem__icon">○</span>
                                <span className="uk-checkitem__label">{item}</span>
                                <span className="uk-checkitem__note">krev meir input</span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Status-card vises berre når Tolkar er ferdig — Status og Konfidens
                          kjem som dei siste felta i streamen, så det er den naturlege overgangen
                          frå "streamar" til "klar". */}
                      {result && (
                        <section
                          ref={statusCardRef}
                          className="uk-card"
                          style={{ scrollMarginTop: 24 }}
                        >
                          <div className="uk-card__hd">
                            <div className="uk-card__title">Status</div>
                          </div>
                          <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column" }}>
                            <StatusKV
                              label="Inputstatus"
                              tone={INPUT_STATUS_TONES[result.status] ?? "warn"}
                              value={INPUT_STATUS_LABELS[result.status] ?? result.status}
                            />
                            {result.fagomraade && (
                              <StatusKV label="Fagområde" tone="info" value={result.fagomraade} />
                            )}
                            <StatusKV
                              label="Støtta i MVP"
                              tone={result.status === "relevant_ikkje_stotta" ? "bad" : "ok"}
                              value={result.status === "relevant_ikkje_stotta" ? "Nei" : "Ja"}
                            />
                            <StatusKV
                              label="Konfidens"
                              tone={
                                result.konfidens >= 0.7
                                  ? "ok"
                                  : result.konfidens >= 0.4
                                    ? "warn"
                                    : "bad"
                              }
                              value={result.konfidens?.toFixed(2) ?? "—"}
                            />
                          </div>
                        </section>
                      )}
                    </div>
                    </div>

{/* Sekundær CTA — Start berekning. Synleg når Tolkar-panelet har innhold. */}
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
      <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0 }}>
        Stemmer tolkinga? Då kan du starte berekninga.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleCancel} className="uk-btn uk-btn--ghost">
          Avbryt
        </button>
        <button
          onClick={handleStartCalculation}
          disabled={!canStart}
          className="uk-btn uk-btn--primary"
        >
          Start berekning →
        </button>
      </div>
    </div>
    {blockedReason && (
      <p style={{ marginTop: 12, fontSize: 12, color: "var(--warn)" }}>
        {blockedReason}
      </p>
    )}
  </div>
</section>
</div>
)}
</section>
)}

          {/* === FEIL utanfor workbench (calculating/result fase) === */}
          {phase !== "workbench" && error && (
            <StatusStripe status="bad" label="Feil" className="mt-8">
              {error}
            </StatusStripe>
          )}

          {/* === FASE: CALCULATING (Mission Control v1) === */}
          {phase === "calculating" && (
            <MissionControl
              calculationA={calculationA}
              calculationB={calculationB}
              comparison={comparison}
              streamingA={streamingA}
              streamingB={streamingB}
            />
          )}

          {/* === FASE: CALCULATION_RESULT === */}
          {phase === "calculation_result" && calculationA && (
            <>
              {/* Kontrolløren si avgjerd — primær banner */}
              {controllerDecision && (
                <StatusStripe
                  status={DECISION_STATUS_TONES[controllerDecision.decision_status]}
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
                      <span className="uk-eyebrow" style={{ color: "inherit" }}>
                        Kontrollør — endeleg avgjerd
                      </span>
                      <Badge status={DECISION_STATUS_TONES[controllerDecision.decision_status]}>
                        {DECISION_STATUS_LABELS[controllerDecision.decision_status]}
                      </Badge>
                    </div>
                  }
                >
                  {controllerDecision.user_message}
                </StatusStripe>
              )}

              {/* Fallback: Samanliknar-banner viss Kontrolløren feila */}
              {!controllerDecision && comparison && (
                <StatusStripe
                  status={MATCH_STATUS_TONES[comparison.match_status]}
                  className="mb-4"
                  header={
                    <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                      {MATCH_STATUS_LABELS[comparison.match_status]}
                    </div>
                  }
                >
                  {comparison.summary}
                </StatusStripe>
              )}

              {/* Kort svar — eller blokka-varsel */}
              {(isBlocked("short_conclusion_a") || isBlocked("short_conclusion_b")) ? (
                <StatusStripe status="warn">
                  <strong>Sluttkonklusjon utelaten av Kontrolløren.</strong>{" "}
                  Kontrolløren identifiserte hallusinasjonar i konstruktørane sin
                  kortform-konklusjon. Sjå Resultat-felt og full utrekning under
                  for korrekte verdiar.
                </StatusStripe>
              ) : (
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
              )}

              {/* Resultat-objekt */}
              {!isBlocked("results_a") && Object.keys(calculationA.results || {}).length > 0 && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div className="uk-card__title">Resultat</div>
                  </div>
                  <div className="uk-card__bd">
                    {Object.entries(calculationA.results).map(([k, v], i) => (
                      <div
                        key={k}
                        className="uk-kv"
                        style={{ borderTop: i === 0 ? "none" : undefined }}
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
              {!isBlocked("calculation_steps_a") && calculationA.calculation_steps?.length > 0 && (
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
                    <div className="uk-card__title" style={{ color: "var(--warn)" }}>
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
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="uk-eyebrow">Konstruktør A konfidens</span>
                      <Badge status={CONFIDENCE_TONES[calculationA.confidence]}>
                        {calculationA.confidence}
                      </Badge>
                    </div>
                    {calculationB && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="uk-eyebrow">Konstruktør B konfidens</span>
                        <Badge status={CONFIDENCE_TONES[calculationB.confidence]}>
                          {calculationB.confidence}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Konstruktør B-resultat (uavhengig kontroll) */}
              {calculationB && (
                <section
                  className="uk-card"
                  style={{ marginTop: 16, background: "var(--surface-2)" }}
                >
                  <div className="uk-card__hd">
                    <div className="uk-card__title">Konstruktør B — uavhengig kontroll</div>
                    <span style={{ fontSize: 11, color: "var(--fg-muted)", fontStyle: "italic" }}>
                      Løyste oppgåva utan å sjå Konstruktør A sitt svar
                    </span>
                  </div>
                  <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {!isBlocked("short_conclusion_b") && (
                      <div
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--r-sm)",
                          padding: 12,
                        }}
                      >
                        <div className="uk-eyebrow" style={{ marginBottom: 4 }}>
                          Konstruktør B sin konklusjon
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }}>
                          {calculationB.short_conclusion}
                        </p>
                      </div>
                    )}

                    {!isBlocked("results_b") && Object.keys(calculationB.results || {}).length > 0 && (
                      <div
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--r-sm)",
                          padding: 12,
                        }}
                      >
                        <div className="uk-eyebrow" style={{ marginBottom: 6 }}>
                          Konstruktør B sine resultat
                        </div>
                        {Object.entries(calculationB.results).map(([k, v], i) => (
                          <div
                            key={k}
                            className="uk-kv"
                            style={{ borderTop: i === 0 ? "none" : undefined, padding: "6px 0" }}
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

              {/* Comparison details — Samanliknar */}
              {comparison && (
                <section className="uk-card" style={{ marginTop: 16 }}>
                  <div className="uk-card__hd">
                    <div className="uk-card__title">Samanliknar — skilnader funne</div>
                    <Badge status={MATCH_STATUS_TONES[comparison.match_status]}>
                      {MATCH_STATUS_LABELS[comparison.match_status]}
                    </Badge>
                  </div>
                  <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {comparison.numeric_differences?.length > 0 && (
                      <div>
                        <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                          Numeriske skilnader
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {["Felt", "Konstruktør A", "Konstruktør B", "Skilnad", "Alvor"].map((h) => (
                                  <th
                                    key={h}
                                    className="uk-eyebrow"
                                    style={{ textAlign: "left", padding: "8px 10px 8px 0", fontWeight: 500 }}
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
                                    <Badge status={SEVERITY_TONES[diff.severity]}>{diff.severity}</Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none", fontSize: 12, color: "var(--fg-muted)" }}>
                          {comparison.numeric_differences.map((diff, i) => (
                            <li key={i} style={{ padding: "3px 0" }}>
                              <span className="uk-mono">{diff.field}:</span> {diff.likely_cause}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

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
                        <div className="uk-eyebrow" style={{ color: "var(--warn)", marginBottom: 10 }}>
                          ⚠ Intern inkonsistens
                        </div>
                        {(comparison.internal_consistency_issues?.agent_a?.length ?? 0) > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                              Konstruktør A
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
                              {comparison.internal_consistency_issues.agent_a.map((issue, i) => (
                                <li key={i}>
                                  {issue.issue}{" "}
                                  <Badge status={SEVERITY_TONES[issue.severity]}>{issue.severity}</Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(comparison.internal_consistency_issues?.agent_b?.length ?? 0) > 0 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
                              Konstruktør B
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
                              {comparison.internal_consistency_issues.agent_b.map((issue, i) => (
                                <li key={i}>
                                  {issue.issue}{" "}
                                  <Badge status={SEVERITY_TONES[issue.severity]}>{issue.severity}</Badge>
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
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setPhase("workbench")} className="uk-btn">
                        ← Tilbake
                      </button>
                      {currentRunId && calculationA && calculationB && (
                        <a href={`/rapport/${currentRunId}`} className="uk-btn uk-btn--primary" onClick={saveStateToSession}>
                          Generer rapport →
                        </a>
                      )}
                    </div>
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
      <span style={{ color: "var(--fg-muted)", width: 128, flexShrink: 0 }}>{label}</span>
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
      <div className="uk-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
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

function StatusKV({
  label,
  tone,
  value,
}: {
  label: string;
  tone: Tone;
  value: string;
}) {
  return (
    <div className="uk-status-kv">
      <span>{label}</span>
      <Badge status={tone}>{value}</Badge>
    </div>
  );
}

function StepIndicator({ phase }: { phase: Phase }) {
  // Tre steg per visjon-dokument: Workbench → Mission Control → Rapport.
  // Workbench omfattar både input og Tolkar-resultat (slått saman i dag 4).
  // Mission Control er reknar-fasen. Rapport er calculation_result + /rapport.
  const current = phase === "workbench" ? 1 : phase === "calculating" ? 2 : 3;
  const steps = [
    { num: 1, label: "Workbench" },
    { num: 2, label: "Mission Control" },
    { num: 3, label: "Rapport" },
  ];
  return (
    <div className="uk-steps">
      {steps.map((step, i) => {
        const state =
          step.num < current ? "done" : step.num === current ? "active" : "todo";
        return (
          <span key={step.num} style={{ display: "inline-flex", alignItems: "center" }}>
            <span className={`uk-steps__item uk-steps__item--${state}`}>
              <span className="uk-steps__num">{state === "done" ? "✓" : step.num}</span>
              <span>{step.label}</span>
            </span>
            {i < steps.length - 1 && <span className="uk-steps__sep">→</span>}
          </span>
        );
      })}
    </div>
  );
}

function Badge({
  status,
  children,
}: {
  status: Tone;
  children: React.ReactNode;
}) {
  const variant = status === "neutral" ? "" : `uk-badge--${status}`;
  const fullClass = ["uk-badge", variant].filter(Boolean).join(" ");
  return <span className={fullClass}>{children}</span>;
}

function StatusStripe({
  status,
  header,
  label,
  children,
  className,
}: {
  status: Tone;
  header?: React.ReactNode;
  label?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const variant = status === "neutral" ? "" : `uk-stripe--${status}`;
  const fullClass = ["uk-stripe", variant, className].filter(Boolean).join(" ");
  return (
    <section className={fullClass}>
      {label && <div className="uk-stripe__label">{label}</div>}
      {header}
      <div className="uk-stripe__body">{children}</div>
    </section>
  );
}
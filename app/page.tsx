"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  matchStatusLabel, MATCH_STATUS_TONES,
  decisionStatusLabel, DECISION_STATUS_TONES,
  CONFIDENCE_TONES, SEVERITY_TONES,
  inputStatusLabel, INPUT_STATUS_TONES,
  type Tone,
} from "@/lib/format";
import MissionControl, { type AgentStreamingState } from "@/app/components/MissionControl";
import { InfoPopover } from "@/app/components/InfoPopover";
import { streamAgent } from "@/lib/stream-agent";
import { extractStreamingState, extractTolkarState, type PartialTolkarState } from "@/lib/partial-json";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";
import type { EngineeringContext } from "@/lib/engineering-context";
import { loadEngineeringContextFromStorage } from "@/lib/engineering-context/client";
import { buildLocalizedLabelProxy, displayLanguageForContext } from "@/lib/international/display";
import {
  type CalculationStep,
  type CalculationResult,
  type ConsistencyIssue,
  type NumericDifference,
  type ComparisonResult,
  type ControllerDecision,
  type Profile,
  type KontrollorChip,
} from "@/lib/result/types";
import { WB_LABELS as BASE_WB_LABELS } from "@/lib/result/labels";
import { computeProfile } from "@/lib/result/profile";
import {
  isInputKey,
  hoistStyrande,
  dedupeByValue,
  getDimensjonerandeKeys,
  tileLabel,
  splitNumberUnit,
  DIMENSJONERANDE_PATTERNS,
  STYRANDE_PATTERNS,
  KEY_TILE_DESCRIPTIONS,
} from "@/lib/result/tile-heuristics";
import {
  splitChipText,
  buildKontrollorChips,
  getVerdiktForMatchStatus,
  getFirstSentence,
} from "@/lib/result/kontrollor-chips";
import {
  extractFormulaLines,
  GREEK_LETTERS,
  renderMathKey,
} from "@/lib/result/formula-extract";
import { Badge } from "@/app/components/Badge";
import { StatusStripe } from "@/app/components/StatusStripe";
import { CountUp } from "@/app/components/result/CountUp";
import { KontrollorChipPill } from "@/app/components/result/KontrollorChipPill";
import {
  DimensjonerandeTile,
  DimensjonerandeTiles,
} from "@/app/components/result/DimensjonerandeTile";
import { CalculationResultView } from "@/app/components/result/CalculationResultView";
import type { AgentResult, Phase, ValueCategory } from "@/lib/workbench/types";
import {
  MAX_FILE_SIZE,
  ACCEPTED_FILE_TYPES,
  getExamplePrompts,
  PHASE_HEADERS,
} from "@/lib/workbench/constants";
import { getBlockedReason } from "@/lib/workbench/blocked-reason";
import { getBannerDetail } from "@/lib/workbench/banner";
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  categorizeKey,
  formatKey,
} from "@/lib/workbench/categorize";
import {
  Row,
  ListSection,
  TolkteVerdiarGrid,
  StreamingProse,
  MissingChipStrip,
  StatusKV,
  StepIndicator,
} from "@/app/components/workbench/WorkbenchComponents";

export default function Home() {
  const { locale } = useLocale();
  const [engineeringContext, setEngineeringContext] = useState<EngineeringContext | null>(null);
  const WB_LABELS = buildLocalizedLabelProxy(BASE_WB_LABELS, locale, engineeringContext, {
    skrivInnOppgave: "Describe a structural engineering task",
    placeholderEksempel: "For example: Evaluate a simply supported W12x26 steel beam with L = 20 ft, D = 0.45 kip/ft and L = 0.80 kip/ft...",
    lastOppFil: "Upload file",
    filopplasting: "File upload",
    filopplastingP1: "Upload an image, PDF or Word document containing the task.",
    fjernFil: "Remove file",
    eksempel: "Examples",
    tolkarLoading: "Interpreting...",
    tolkPaNytt: "Interpret again →",
    tolkOppgava: "Interpret task →",
    feil: "Error",
    tolking: "Interpretation",
    tolkarBadge: "Interpreter",
    berekningstype: "Calculation type",
    tolkteVerdiar: "Interpreted values",
    manglandeData: "Missing data",
    antakingar: "Assumptions",
    kvaKanReknast: "What can be calculated now",
    krevMeirInput: "needs more input",
    status: "Status",
    fagomraade: "Discipline",
    bannerKlarDetail: "all {n} checks ready",
    bannerDelvisDetail: "{n} items need more input",
    bannerMangelfullDetail: "{n} fields must be filled before calculation",
    bannerIkkjeStottaDetail: "not supported in the pilot version",
    bannerAvvistDetail: "not a structural engineering task",
    bannerUklartDetail: "PILAR needs more context",
    lavTillit: "Low confidence in interpretation — check the values below before starting",
    visFullTolkning: "Show full interpretation and parsed values",
    skjulFullTolkning: "Hide full interpretation",
    tolkarTreng: "PILAR needs {n} more fields — click to insert",
    tolkarTrengAvvist: "PILAR rejected the task — see explanation below",
    startMedMangler: "Start calculation · {n} assumptions used",
    aiDisclaimerKort: "AI-generated · requires professional verification",
    seEksempel: "▸ See 3 examples",
    tabResultat: "Result",
    tabTolkning: "Interpretation",
    tabStatus: "Status",
    stemmerTolkinga: "Does the interpretation look right? Then start the calculation.",
    avbryt: "Cancel",
    startBerekning: "Start calculation →",
    scrollTilStart: "Scroll to Start calculation",
    klarTilStart: "Ready to start calculation",
    kontrollorAvgjerd: "Controller — final decision",
    kontrollor: "Controller",
    kortSvar: "Short answer",
    resultat: "Results",
    visMellomledd: "Show {n} intermediate values",
    skjulMellomledd: "Hide intermediate values",
    foresetnaderBrukt: "Assumptions used",
    stegvisUtrekning: "Step-by-step calculation",
    stegvisBerreFormel: "Formulas only",
    stegvisAlleSteg: "All steps",
    kvaErIkkjeRekna: "What is not calculated",
    atvaringar: "Warnings",
    konstruktorAKonfidens: "Engineer A confidence",
    konstruktorBKonfidens: "Engineer B confidence",
    konstruktorKonfidens: "Engineer confidence",
    konstruktorBIndependent: "Engineer B — independent check",
    samanliknarTittel: "Comparator — differences found",
    tabellFelt: "Field",
    tabellSkilnad: "Difference",
    tabellAlvor: "Severity",
    resultatetForebels: "The result is preliminary and must be checked by a qualified professional.",
    tilbake: "← Back",
    generRapport: "Generate report →",
    stromer: "● STREAMING",
    inputstatusExplanation:
      "PILAR's assessment of how ready the task is to be calculated. 'Ready' = all info in place. 'Partly ready' = PILAR has made reasonable assumptions (shown above) which you can adjust before starting. Other statuses need more input or fall outside the pilot version.",
    lastOppStottefil: "+ Upload support file",
    filFormatHint: "PDF, PNG, DOCX — PILAR reads the task and attachment together.",
  });
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

  // Retry-teljarar for Mission Control (#2). Per-agent retry-count som vises
  // i feilkortet ("forsøk N av 3"). Resettast i handleCancel og ved ny berekning.
  const [retryCountA, setRetryCountA] = useState(0);
  const [retryCountB, setRetryCountB] = useState(0);

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

  // Fil-opplasting (chunk 2 dag 14)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    setEngineeringContext(loadEngineeringContextFromStorage());

    const handleFocus = () => {
      setEngineeringContext(loadEngineeringContextFromStorage());
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        `Fila er for stor (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maks 4 MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
    setFileError(null);
  }

  function clearFile() {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Scroll-hint for "Start berekning"-CTA-en. Når Tolkar er ferdig men CTA-en
  // er under viewport, vis ein flytande hint som scrollar dit ved klikk.
  // IntersectionObserver sporer om CTA er synleg.
  const startBerekningRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Eksempel-kollaps (#07): etter første gong Tolkar gir resultat,
  // kollapsast eksempel-chips til ein liten "Sjå 3 eksempel"-lenke.
  // Studenten har då lært input-formatet. hasAutoCollapsedRef hindrar
  // re-kollapse om use manuelt utvidar igjen.
  const [examplesCollapsed, setExamplesCollapsed] = useState(false);
  const hasAutoCollapsedRef = useRef(false);

  // Mellomledd-disclosure (#06): Resultat-tabellen splittast i to —
  // design values (alltid synleg, fag-typografi) + intermediate value
  // (kollapsa under "Vis X intermediate value"). Default false: studenten ser
  // svaret først, intermediate value er eitt klikk unna for sporbarheit.
  const [aMellomleddExpanded, setAMellomleddExpanded] = useState(false);

  // Controller-vurdering-toggle (#02): Lang prosa frå Controlleren er
  // kollapsa bak "Les heile vurderinga ▸". Default false så studenten
  // ser status + verdikt + chips først, prosa er eitt klikk unna.
  const [kontrollorProsaExpanded, setKontrollorProsaExpanded] = useState(false);

  // Sjølvkontroll-disclosure (#09): Intern inkonsistens-blokka flytta inn
  // i Controller-kortet. State er null = follow-auto (utvida om issues finst,
  // kollapsa elles). Etter use-overstyring: true/false.
  const [selvkontrollExpanded, setSelvkontrollExpanded] = useState<boolean | null>(null);

  // Engineer B-disclosure (#04): Heile B-blokka kollapsast til ein-linjes
  // disclosure med summary (ENIGE/AVVIK + konfidens). State er null = follow-
  // auto: utvida ved significant_differences/critical_disagreement, kollapsa
  // elles. Etter use-overstyring: true/false.
  const [kontrollorBExpanded, setKontrollorBExpanded] = useState<boolean | null>(null);

  // Comparator-rad-disclosure (#05): kvar rad i numerisk-tabellen kan
  // utvidast for å vise "Kvifor"-detaljar (likely_cause + A/B-verdiar).
  // Multiple rader kan vere utvida samtidig — Set<index>.
  const [expandedComparisonRows, setExpandedComparisonRows] = useState<Set<number>>(
    new Set(),
  );
  // Generelle merknader nedst i Comparator (#05) — method_differences +
  // assumption_differences som ikkje knytt til ein konkret rad.
  const [comparisonGeneralExpanded, setComparisonGeneralExpanded] = useState(false);

  // Stegvis utregning view-toggle (#08): "minimal" viser tittel + formel-linje,
  // "full" viser tittel + heile text (innsetting + prosa). Default minimal —
  // pedagogisk best å sjå formel-uttrykk først, så utvide til innsetting når
  // det trengst.
  const [stegvisViewMode, setStegvisViewMode] = useState<"minimal" | "full">("minimal");
  // Per-steg-kollaps (#08): Set<index> av kollapsa steg. Default tom = alle
  // utvida. Klikk på steg-tittel togglar den.
  const [collapsedSteps, setCollapsedSteps] = useState<Set<number>>(new Set());

  // Første-gongs-guide (#09): viser éi-setnings forklaring over input første
  // gong studenten besøker Workbench. Default false så SSR-rendering ikkje
  // mismatchar med klient (klient sjekker localStorage i useEffect).
  // Vert dismissa via krys eller automatisk når første berekning er fullført.
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);

  // Mobil-tabs (#08): på viewport < 720px viser vi dei tre seksjonane
  // (Status, Hva kan beregnes, Tolkning) i ein tab-kontroll i staden for
  // stabla. Default isMobile=false for SSR-safety, oppdaterast på mount.
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"resultat" | "tolkning" | "status">("status");
  const [ctaInView, setCtaInView] = useState(false);

  // Tolkning-kortet er kollapsa som default i ny single-column-layout (#01).
  // Auto-utvidast under streaming så studenten ser Tolkar arbeide.
  const [tolkningExpanded, setTolkningExpanded] = useState(false);

  // Resume frå tidlegare berekning. Sett av useEffect under når ?from_request=X
  // er i URL. Viser info-banner i workbench med lenke tilbake til original-rapport.
  const [restoredFrom, setRestoredFrom] = useState<{
    requestId: string | null;
    runId: string | null;
    documentId: string | null;
  } | null>(null);

  useEffect(() => {
    if (!result || !startBerekningRef.current) {
      setCtaInView(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setCtaInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(startBerekningRef.current);
    return () => observer.disconnect();
  }, [result, phase]);

  const showScrollHint = phase === "workbench" && result !== null && !ctaInView;

  // Resume frå tidlegare berekning: les ?from_request=X eller ?from_run=X
  // frå URL ved mount, hent data frå API, og pre-fyll state.
  //  - ?from_request=X → only workbench-state (input + tolking). Bruker
  //    klikkar Start berekning for å køyre på nytt.
  //  - ?from_run=X     → FULL state inkl. Mission Control-resultat. Hopper
  //    rett til calculation_result-fasen viss agentar har køyrt.
  // Køyrer only ein gong.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromRequest = params.get("from_request");
    const fromRun = params.get("from_run");
    if (!fromRequest && !fromRun) return;

    let cancelled = false;
    (async () => {
      try {
        // from_run har forrang (gir meir data) hvis begge er sett
        if (fromRun) {
          const res = await fetch(`/api/runs/${fromRun}`);
          if (!res.ok) {
            console.error("Klarte ikkje hente run:", res.status);
            return;
          }
          const data = await res.json();
          if (cancelled) return;

          // Pre-fyll input + tolking (som workbench-resume)
          if (data.request?.raw_text) {
            setInput(data.request.raw_text);
          }
          if (data.tolking) {
            setResult(data.tolking as AgentResult);
          }
          // Set requestId så handleStartCalculation finn han når use
          // trykker Start berekning frå resume-state.
          if (data.run?.request_id) {
            setRequestId(data.run.request_id);
          }

          // Pre-fyll Mission Control-state hvis agentar har køyrt
          if (data.calculationA) {
            setCalculationA(data.calculationA as CalculationResult);
          }
          if (data.calculationB) {
            setCalculationB(data.calculationB as CalculationResult);
          }
          if (data.comparison) {
            setComparison(data.comparison as ComparisonResult);
          }
          if (data.controllerDecision) {
            setControllerDecision(data.controllerDecision as ControllerDecision);
          }
          if (data.run?.id) {
            setCurrentRunId(data.run.id);
          }

          // Hopp til calculation_result-fasen hvis vi har resultat frå minst
          // ein konstruktør. Elles bli i workbench (orphaned/krasja run).
          if (data.calculationA || data.calculationB) {
            setPhase("calculation_result");
          }

          setRestoredFrom({
            requestId: data.run?.request_id ?? null,
            runId: data.run?.id ?? null,
            documentId: data.report?.document_id ?? null,
          });
          return;
        }

        // from_request — only workbench-state
        const res = await fetch(`/api/requests/${fromRequest}`);
        if (!res.ok) {
          console.error("Klarte ikkje hente request:", res.status);
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        if (data.request?.raw_text) {
          setInput(data.request.raw_text);
        }
        if (data.tolking) {
          setResult(data.tolking as AgentResult);
        }
        // Set requestId så handleStartCalculation finn han når use
        // trykker Start berekning frå resume-state.
        setRequestId(fromRequest);

        setRestoredFrom({
          requestId: fromRequest,
          runId: data.run?.id ?? null,
          documentId: data.report?.document_id ?? null,
        });
      } catch (err) {
        console.error("Klarte ikkje hente tidlegare berekning:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
     
  }, []);

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

  // Motstrid (string[]) frå Tolkar: kjem inn via onComplete-spreaden (sjå handleTolk).
  // Ikkje på AgentResult-typen enno — eit eige felt paa den delte typen høyrer til
  // Lane A / runtime-kontrakten, so her les vi defensivt for aa halde endringa i UI-lane.
  const tolkingMotstrid: string[] =
    (tolkingView as { motstrid?: string[] } | null)?.motstrid ?? [];

  // Last state tilbake frå sessionStorage når use kjem tilbake frå /rapport.
  // Legacy-phases "input" og "result" mappast til ny "workbench"-phase.
  //
  // VIKTIG: hopp over sessionStorage-restore når URL har ?from_run= eller
  // ?from_request= — då er URL autoritativ kjelde og my resume-useEffect
  // (over) lastar API-data. Utan denne sjekken vinn sessionStorage racet
  // og overskriv state med tidlegare workbench-session.
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.has("from_run") || params.has("from_request")) {
          return;
        }
      }

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
      setEngineeringContext(state.engineeringContext ?? loadEngineeringContextFromStorage());

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
          engineeringContext,
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
const statusCardRef = useRef<HTMLDivElement | null>(null);

// AbortController for å avbryte aktive SSE-streams ved cancel/unmount.
// Hindrar zombie-streams som held fram å bruke Anthropic-tokens etter
// at useen ikkje lenger ser resultatet.
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
  // use les i sitt eige tempo. Hvis panelet veks forbi viewport-en
  // (sjeldan — krev veldig lang antakingar-liste), kan use scrolle
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

  // Eksempel-kollaps (#07): når Tolkar gir første gangs resultat, kollaps
  // eksempel-chips. Ref-flagg hindrar at vi re-kollapsar om use manuelt
  // utvidar igjen og deretter Tolk-ar på nytt (respekterer use-val).
  useEffect(() => {
    if (result !== null && !hasAutoCollapsedRef.current) {
      setExamplesCollapsed(true);
      hasAutoCollapsedRef.current = true;
    }
  }, [result]);

  // Første-gongs-guide (#09): på mount, sjekk om use har sett guiden før.
  // Om ikkje, vis han. Vi gjer dette i useEffect (ikkje initial state) for å
  // unngå SSR-mismatch — localStorage er klient-only.
  useEffect(() => {
    try {
      const onboarded = window.localStorage.getItem("pilar-onboarded-v1");
      if (onboarded !== "true") {
        setShowFirstTimeGuide(true);
      }
    } catch {
      // localStorage kan vere blokkert (private modus, cookies-block) — då
      // viser vi guiden kvar gong, som er det tryggaste fallback-et.
      setShowFirstTimeGuide(true);
    }
  }, []);

  // Når studenten kjem til calculation_result-fasen første gong, marker
  // som onboarded — dei har då sett heile flyten og treng ikkje guiden meir.
  useEffect(() => {
    if (phase === "calculation_result" && showFirstTimeGuide) {
      try {
        window.localStorage.setItem("pilar-onboarded-v1", "true");
      } catch {
        // Ignorer — neste mount vil vise guiden igjen om localStorage feila
      }
      setShowFirstTimeGuide(false);
    }
  }, [phase, showFirstTimeGuide]);

  // Visningsprofil → default-state (#03). Ved profil-endring setter vi
  // default for blokker som ikkje har eigen "null = auto"-state. Sida si
  // visning følgjer alltid agent-output — ingen use-overstyring (det er
  // designval: indikatoren skal kommunisere kvifor sida ser ut som den gjer).
  useEffect(() => {
    if (phase !== "calculation_result") return;
    const profile = computeProfile(controllerDecision, comparison, calculationA);
    const krev = profile === "krev_gjennomgang";

    // Generelle merknader: utvida ved krev_gjennomgang, kollapsa elles
    setComparisonGeneralExpanded(krev);

    // Comparator-rader: ved krev_gjennomgang, auto-utvid rader med
    // severity high/critical. Elles: ingen pre-utvida (Set tom).
    if (krev && comparison?.numeric_differences?.length) {
      const criticalIndices = new Set<number>();
      comparison.numeric_differences.forEach((d, i) => {
        if (d.severity === "high" || d.severity === "critical") {
          criticalIndices.add(i);
        }
      });
      setExpandedComparisonRows(criticalIndices);
    } else {
      setExpandedComparisonRows(new Set());
    }
  }, [phase, controllerDecision, comparison, calculationA]);

  // Sticky decision-bar (#07): synleg når studenten har scrolla forbi
  // Controller-kortet men ikkje nådd Action bar nedst. Sentinel-divs vert
  // observerte av IntersectionObserver.
  const kontrollorSentinelRef = useRef<HTMLDivElement>(null);
  const actionBarSentinelRef = useRef<HTMLDivElement>(null);
  const [kontrollorBelowFold, setKontrollorBelowFold] = useState(false);
  const [actionBarVisible, setActionBarVisible] = useState(false);

  // Mobil-detect (#08): matchMedia på 720px-breakpoint.
  // Lytt på resize/orientering slik at tab-layouten kjem og forsvinn
  // ved bytte mellom mobil/landskap/desktop.
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 720px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Sticky decision-bar synlegheit (#07). IntersectionObserver på to
  // sentinel-divs: éin under Controller-kortet, éin over Action bar.
  // - Controller-sentinel ute av view (top) → studenten har scrolla forbi
  //   det viktigaste, og treng ein quick-reference-bar
  // - Action-bar-sentinel i view → studenten har nådd botnen, bar'en
  //   forsvinn fordi action bar er synleg uansett
  // rootMargin "-1px 0px 0px 0px" på toppen sikrar at observeren registrerar
  // "ute av view" når elementet treff topbar-grensa, ikkje når det er heilt
  // utanfor skjermen.
  useEffect(() => {
    if (phase !== "calculation_result") return;
    const kontrollorEl = kontrollorSentinelRef.current;
    const actionBarEl = actionBarSentinelRef.current;
    if (!kontrollorEl || !actionBarEl) return;

    const kontrollorObserver = new IntersectionObserver(
      ([entry]) => {
        // Bar synleg når sentinel er over viewport (= scrolla forbi)
        setKontrollorBelowFold(entry.boundingClientRect.top < 0 && !entry.isIntersecting);
      },
      { rootMargin: "0px 0px 0px 0px", threshold: 0 },
    );
    const actionBarObserver = new IntersectionObserver(
      ([entry]) => {
        setActionBarVisible(entry.isIntersecting);
      },
      { rootMargin: "0px 0px 0px 0px", threshold: 0 },
    );

    kontrollorObserver.observe(kontrollorEl);
    actionBarObserver.observe(actionBarEl);

    return () => {
      kontrollorObserver.disconnect();
      actionBarObserver.disconnect();
    };
  }, [phase, controllerDecision]);

  // Auto-switch tab basert på Tolkar-status (#08):
  // - MANGELFULL → "resultat" så studenten ser kva som kan/ikkje kan
  //   beregnes (sjølv om chips er over tab-en, gir det kontekst)
  // - AVVIST / UKLART → "status" så feilmeldinga er synleg
  // - KLAR / DELVIS_KLAR → "status" som default (men use kan bytte)
  useEffect(() => {
    if (!result) return;
    if (result.status === "mangelfull") {
      setActiveTab("resultat");
    } else if (result.status === "avvist" || result.status === "uklart" || result.status === "uklar") {
      setActiveTab("status");
    } else {
      setActiveTab("status");
    }
  }, [result]);

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

    // Bygg payload basert på om use har valt ei fil
    let payload: Record<string, unknown> | FormData;
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (input.trim()) formData.append("text", input);
      formData.append("locale", locale);
      if (engineeringContext) formData.append("engineering_context", JSON.stringify(engineeringContext));
      payload = formData;
    } else {
      payload = { text: input, locale, engineering_context: engineeringContext };
    }

    try {
      await streamAgent(
        "/api/input-agent",
        payload,
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
    setRetryCountA(0);
    setRetryCountB(0);
    pipelineRunningRef.current = false;
    // Reset eksempel-kollaps slik at neste sesjon ser eksempla igjen
    setExamplesCollapsed(false);
    hasAutoCollapsedRef.current = false;
  };

  // Tilbake til workbench frå calculation_result-fasen. Behaldar ALT state
  // (input, result, calculationA/B, comparison, controllerDecision, currentRunId)
  // — handleStartCalculation samanliknar med lastCompletedRef og avgjer om
  // ny beregning skal startast eller om vi skal hoppe tilbake til eksisterande
  // resultat. Slik unngår vi spell av tokens når use only vil sjå rapport
  // på nytt, men startar fersk når input/Tolkar-resultat har endra seg.
  const handleBackToWorkbench = () => {
    setRestoredFrom(null);
    setError(null);
    setPhase("workbench");
  };

  // Mangelfull-chips (#03): set inn ein mal-tekst i textarea-en når use
  // klikkar på ein chip. Studenten må sjølv erstatte [verdi?] før Tolk køyrer.
  // Vi tek only "nøkkelen" frå Tolkar sitt manglande-felt (alt før første "(")
  // — Tolkar sine strenger kan vere lange ("last (qEd eller punktlast PEd)"),
  // og vi vil ha kort, redigerbart mal-format.
  const insertMissingFieldTemplate = (fieldText: string) => {
    const parenIdx = fieldText.indexOf("(");
    const key = (parenIdx > 0 ? fieldText.slice(0, parenIdx) : fieldText).trim();
    const template = `${key}: [verdi?]`;
    setInput((prev) => {
      const trimmed = prev.trimEnd();
      // Om input er tom, start med malen. Elles legg til på ny linje.
      return trimmed.length === 0 ? template : `${trimmed}\n${template}`;
    });
    // Focus textarea etter setState (mikro-delay for å la React rendre).
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        // Scroll input inn i view om den er off-screen
        ta.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 0);
  };

  const handleStartCalculation = async () => {
    console.log("[handleStartCalculation] state:", {
      result: result !== null,
      requestId,
      calculationA: calculationA !== null,
      currentRunId,
    });
    if (!result || !requestId) {
      console.warn("[handleStartCalculation] EXITED EARLY — result eller requestId manglar");
      return;
    }

    // Hopp rett til resultatet viss berekninga allereie er gjort OG verken
    // input eller Tolkar-resultatet har endra seg sidan sist. Bug-fiks:
    // tidlegare sjekk var only `calculationA && currentRunId`, som førte til
    // at modifisert input + Tolk-på-nytt likevel viste original beregning.
    // No samanliknar vi mot snapshot lagra i pipelinen ved fullført beregning.
    if (
      calculationA &&
      currentRunId &&
      lastCompletedRef.current &&
      lastCompletedRef.current.input === input &&
      lastCompletedRef.current.resultHash === JSON.stringify(result) &&
      lastCompletedRef.current.runId === currentRunId
    ) {
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
    setRetryCountA(0);
    setRetryCountB(0);
    pipelineRunningRef.current = false;

    try {
      // === STEG 0: Init run ===
      const initResponse = await fetch("/api/init-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          calculation_type: result.berekningstype,
          engineering_context: engineeringContext,
          display_language: displayLanguageForContext(locale, engineeringContext),
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

      // === STEG 1: Konstruktør A og Konstruktør B parallelt via SSE-streaming ===
      // Begge agentar streamar samtidig. onComplete setter calculationA/B
      // i state — useEffect under Promise.all triggar deretter Comparator+
      // Controller-pipeline. Om éin agent feilar, viser MissionControl
      // retry-UI og use kan re-prøve den agenten åleine.
      const agentBody = { run_id: runId, input_review: result, locale, engineering_context: engineeringContext };

      await Promise.all([
        streamAgent("/api/agent-a", agentBody, {
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
            setCalculationA(r as unknown as CalculationResult);
            setStreamingA((s) => ({ ...s, phase: "complete" }));
          },
          onError: (msg) => {
            setStreamingA((s) => ({ ...s, phase: "error", error: msg }));
          },
        }, controller.signal),
        streamAgent("/api/agent-b", agentBody, {
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
            setCalculationB(r as unknown as CalculationResult);
            setStreamingB((s) => ({ ...s, phase: "complete" }));
          },
          onError: (msg) => {
            setStreamingB((s) => ({ ...s, phase: "error", error: msg }));
          },
        }, controller.signal),
      ]);

      // === Etter Promise.all (#2): ===
      // Tidlegare hadde vi early returns her som ville:
      // - errA → setError + setPhase("workbench")  (kastar bort B sitt arbeid)
      // - errB → setError + setPhase("calculation_result") (hoppar over samanlikning)
      //
      // No: vi let begge agentar etterlate seg state — om éin har feila,
      // viser MissionControl retry-UI og use kan re-prøve. Comparator +
      // Controller-pipeline blir trigga av useEffect under når BÅDE
      // calculationA OG calculationB er sett (anten frå original køyring
      // eller etter retry).
      //
      // Om begge feilar samtidig: ingen useEffect-trigger, use kan retry
      // begge separat. Om begge OK: useEffect triggar automatisk.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setPhase("workbench");
    }
  };

  // Pipeline-running-flagg (#2): hindrar at useEffect-en startar pipelinen
  // fleire gonger. Ref i staden for state — endringar trigger ikkje re-render
  // og inngår ikkje i deps. Reset ved cancel og start av ny berekning.
  const pipelineRunningRef = useRef(false);

  // Snapshot av siste fullførte beregning (bug-fiks: "Tilbake"-flyt).
  // Når use går tilbake til Workbench og klikkar Start beregning UTAN
  // å endre input eller Tolkar-resultat, skal vi hoppe rett til rapport-
  // visning av den eksisterande beregninga i staden for å bruke tokens på
  // ein identisk re-køyring. Sjekkast i handleStartCalculation før init-run.
  const lastCompletedRef = useRef<{
    input: string;
    resultHash: string;
    runId: string;
  } | null>(null);

  // Comparator + Controller-pipeline (#2): trigga automatisk når begge
  // engineers har levert resultat. Dette gjer retry-flyten transparent
  // — use klikkar "Prøv på nytt" → den agenten re-køyrer → setCalculation
  // når den fullfører → useEffect triggar → pipeline fullfører.
  useEffect(() => {
    if (
      phase !== "calculating" ||
      !calculationA ||
      !calculationB ||
      comparison !== null ||
      pipelineRunningRef.current ||
      !currentRunId ||
      !result
    ) {
      return;
    }

    pipelineRunningRef.current = true;
    (async () => {
      try {
        // STEG 2: Comparator
        const responseC = await fetch("/api/agent-c", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            run_id: currentRunId,
            agent_a_output: calculationA,
            agent_b_output: calculationB,
            locale,
            engineering_context: engineeringContext,
          }),
        });
        const dataC = await responseC.json();
        if (!responseC.ok) {
          console.error("Comparator feila:", dataC.error);
          setError(`Comparator feila: ${dataC.error}. Viser Engineer A and Engineer B utan samanlikning.`);
          setPhase("calculation_result");
          return;
        }
        setComparison(dataC.result);

        // STEG 3: Controlleren
        const responseD = await fetch("/api/agent-d", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            run_id: currentRunId,
            input_review: result,
            agent_a_output: calculationA,
            agent_b_output: calculationB,
            comparison_result: dataC.result,
            locale,
            engineering_context: engineeringContext,
          }),
        });
        const dataD = await responseD.json();
        if (!responseD.ok) {
          console.error("Controller feila:", dataD.error);
          setPhase("calculation_result");
          return;
        }
        setControllerDecision(dataD.result);
        // Lagre snapshot av denne fullførte beregninga slik at "Tilbake"-flyt
        // utan endring kan hoppe rett tilbake i staden for å starte ny.
        if (currentRunId && result) {
          lastCompletedRef.current = {
            input,
            resultHash: JSON.stringify(result),
            runId: currentRunId,
          };
        }
        setPhase("calculation_result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukjent feil");
        setPhase("workbench");
      } finally {
        pipelineRunningRef.current = false;
      }
    })();
  }, [phase, calculationA, calculationB, comparison, currentRunId, result, locale, engineeringContext, input]);

  // Retry-handler (#2): re-køyrer only den feila agenten utan å røre den
  // andre. Når retry fullfører OG partner er complete, vil useEffect-en
  // over automatisk trigge Comparator+Controller-pipeline.
  const handleRetryAgent = async (letter: "A" | "B") => {
    if (!currentRunId || !result) {
      console.warn("handleRetryAgent: manglar runId eller result");
      return;
    }

    // Auk forsøk-teljar
    if (letter === "A") setRetryCountA((c) => c + 1);
    else setRetryCountB((c) => c + 1);

    // Reset streaming-state + calculation for den agenten
    if (letter === "A") {
      setStreamingA({ ...INITIAL_STREAMING, phase: "thinking" });
      setCalculationA(null);
    } else {
      setStreamingB({ ...INITIAL_STREAMING, phase: "thinking" });
      setCalculationB(null);
    }
    setError(null);

    const endpoint = letter === "A" ? "/api/agent-a" : "/api/agent-b";
    const body = { run_id: currentRunId, input_review: result, locale, engineering_context: engineeringContext };
    const controller = new AbortController();
    abortControllerRef.current = controller;

    streamAgent(
      endpoint,
      body,
      {
        onTextStart: () => {
          if (letter === "A") setStreamingA((s) => ({ ...s, phase: "streaming" }));
          else setStreamingB((s) => ({ ...s, phase: "streaming" }));
        },
        onDelta: (_delta, accumulated) => {
          const extracted = extractStreamingState(accumulated);
          if (letter === "A") {
            setStreamingA((s) => ({
              ...s,
              phase: "streaming",
              stepTitles: extracted.stepTitles,
              results: extracted.results,
            }));
          } else {
            setStreamingB((s) => ({
              ...s,
              phase: "streaming",
              stepTitles: extracted.stepTitles,
              results: extracted.results,
            }));
          }
        },
        onComplete: (r) => {
          const res = r as unknown as CalculationResult;
          if (letter === "A") {
            setCalculationA(res);
            setStreamingA((s) => ({ ...s, phase: "complete" }));
          } else {
            setCalculationB(res);
            setStreamingB((s) => ({ ...s, phase: "complete" }));
          }
        },
        onError: (msg) => {
          if (letter === "A") setStreamingA((s) => ({ ...s, phase: "error", error: msg }));
          else setStreamingB((s) => ({ ...s, phase: "error", error: msg }));
        },
      },
      controller.signal,
    );
  };

  const pageDisplayLanguage = displayLanguageForContext(locale, engineeringContext);
  const englishPhaseHeaders: Record<Phase, { eyebrow: string; title: string; description: string }> = {
    workbench: {
      eyebrow: "NEW CALCULATION",
      title: "Describe the task",
      description: "Enter the request. PILAR reads it and shows the interpretation here — you can edit and interpret again before starting the calculation.",
    },
    calculating: {
      eyebrow: "STEP · CALCULATING",
      title: "Two independent engineers solve the same problem",
      description: "Engineer A and Engineer B use independent methods. The Comparator checks agreement before the result is presented.",
    },
    calculation_result: {
      eyebrow: "STEP 3 OF 3 · RESULT",
      title: "Calculation note",
      description: "Preliminary result with agent control. Must be checked by a qualified professional before use.",
    },
  };
  const pageHeader = pageDisplayLanguage === "en" ? englishPhaseHeaders[phase] : PHASE_HEADERS[locale][phase];

  const isBlocked = (key: string): boolean =>
    !!controllerDecision?.blocked_outputs?.includes(key);

  const blockedReason = getBlockedReason(result, locale);
  const canStart = result !== null && blockedReason === null;
  const hasTolket = result !== null;

  return (
    <div className="uk-shell">
      {/* Tolking-koreografi (Animasjon-pakke):
          (a) Skeleton-shimmer i Tolkning-panelet før første delta
          (b) Blinkande markør på slutten av streamande prosa
          (c) Bullets i "Hva kan beregnes nå" hoppar inn med fade-in.
          Respekterer prefers-reduced-motion. */}
      <style>{`
        @keyframes pilar-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pilar-cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes pilar-item-appear {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pilar-icon-pulse {
          0% { transform: scale(1); }
          35% { transform: scale(1.45); }
          100% { transform: scale(1); }
        }
        @keyframes pilar-block-appear {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .pilar-skeleton-bar {
          height: 12px;
          border-radius: 4px;
          background: linear-gradient(
            90deg,
            var(--surface-alt, #F1F5F9) 0%,
            var(--rule, #E2E8F0) 50%,
            var(--surface-alt, #F1F5F9) 100%
          );
          background-size: 200% 100%;
          animation: pilar-shimmer 1.8s ease-in-out infinite;
          will-change: background-position;
        }
        .pilar-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: currentColor;
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: pilar-cursor-blink 1s steps(2, end) infinite;
          will-change: opacity;
        }
        .pilar-stream-item {
          animation: pilar-item-appear 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          will-change: opacity, transform;
        }
        .pilar-stream-item .uk-checkitem__icon {
          display: inline-block;
          transform-origin: center;
          animation: pilar-icon-pulse 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s backwards;
          will-change: transform;
        }
        .pilar-block-appear {
          animation: pilar-block-appear 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          will-change: opacity, transform;
        }

        /* === RESULTAT-SIDE ANIMASJONAR (#anim-01..05) ===
           Inline-versjon (backup) — same mønster som Workbench-animasjonane
           over. Lagt her i staden for ekstern CSS-fil sidan inline-pattern
           er bevisleg fungerande i miljøet (sjå pilar-shimmer/cursor over). */

        /* #anim-02 — Stagger-reveal for chips. To-fase pattern:
           - Default klasse (.pilar-chip-stagger): chipen er usynleg.
           - --visible: triggar animasjonen til synleg state.
           IntersectionObserver i KontrollorChipPill set --visible når
           chipen er minst 10% i view. Stagger via animation-delay (inline). */
        @keyframes pilar-stagger-in {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .pilar-chip-stagger {
          opacity: 0;
          transform: translateY(10px) scale(0.94);
          will-change: opacity, transform;
        }
        .pilar-chip-stagger.pilar-chip-stagger--visible {
          animation: pilar-stagger-in 0.55s cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
        }

        /* #anim-03 — Pustande decision-badge */
        @keyframes pilar-breathe-kf {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(79, 139, 110, 0);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 0 8px rgba(79, 139, 110, 0.10);
          }
        }
        .pilar-breathe {
          display: inline-block;
          animation: pilar-breathe-kf 3.2s ease-in-out infinite;
          will-change: transform, box-shadow;
        }
        .pilar-breathe[data-acknowledged="true"] {
          animation-play-state: paused;
        }

        /* #anim-03 — Pulserande prikk synkron med breathe */
        @keyframes pilar-puls-dot-kf {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        .pilar-puls-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          margin-right: 6px;
          vertical-align: 1px;
          animation: pilar-puls-dot-kf 3.2s ease-in-out infinite;
          will-change: opacity;
        }

        /* #anim-04 — Pulserande aura som bølger nedover chipane.
           Implementert som ::before-pseudo-element 3px utanfor chipen så
           aura er HEILT ISOLERT frå chipen sin egen box-shadow (hover-løft).
           Sveip-effekt: kvar chip får eigen --aura-delay via inline custom
           property (set i KontrollorChipPill basert på index). Det gjer at
           pulsen "renner" frå topp til bunn av lista i staden for å vere
           tilfeldig synkronisert. Varigheit 6s for ein roleg loop. */
        @keyframes pilar-chip-aura-kf {
          0%, 85% {
            opacity: 0;
            transform: scale(0.95);
          }
          90% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.08);
          }
        }
        .pilar-chip-aura {
          position: relative;
        }
        .pilar-chip-aura::before {
          content: "";
          position: absolute;
          inset: -3px;
          /* Match den nye fag-chip-forma (rounded-rect, radius 8 + 3px inset
             = 11). Tidlegare 999 (pille) som var for gamle pille-format. */
          border-radius: 11px;
          border: 1.5px solid rgba(125, 95, 50, 0.55);
          pointer-events: none;
          opacity: 0;
          animation: pilar-chip-aura-kf 6s ease-in-out infinite;
          /* Delay basert på chip-posisjon i lista (sett via inline style).
             Fallback 1.5s om custom property ikkje er sett. */
          animation-delay: var(--aura-delay, 1.5s);
          will-change: opacity, transform;
        }
        .pilar-chip-aura:hover::before,
        .pilar-chip-aura:focus-visible::before {
          animation-play-state: paused;
          opacity: 0;
        }

        /* #anim-05 — Chevron-rotasjon */
        .pilar-chevron {
          display: inline-block;
          transition: transform 0.18s cubic-bezier(0.2, 0.9, 0.25, 1);
          transform-origin: center;
          will-change: transform;
        }
        .pilar-chevron--open {
          transform: rotate(90deg);
        }

        /* === Hover-feedback for klikkonly element (#anim-06) ===
           Signaliserer at element er klikkbart ved å lette løfte og forsterke
           skugge på hover. Tiles og chips use subtilt ulik intensitet —
           tiles større rørsle sidan dei er større, chips litt scale så pille-
           formen kjenner endringen. */
        .pilar-tile-clickable {
          transition:
            transform 0.18s cubic-bezier(0.2, 0.9, 0.25, 1),
            box-shadow 0.18s ease,
            border-radius 0.15s ease,
            padding 0.15s ease;
        }
        .pilar-tile-clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
        }
        .pilar-tile-clickable:focus-visible {
          outline: 2px solid var(--fg);
          outline-offset: 2px;
        }
        /* Mørke tiles (styrande) treng ein lysare skugge for at den synlege
           "lyfte"-effekten skal vere synleg mot mørk bakgrunn. */
        .pilar-tile-clickable.pilar-tile-dark:hover {
          box-shadow: 0 6px 22px rgba(15, 23, 42, 0.28);
        }

        /* Hover på chips — only når stagger er ferdig (--visible aktivert).
           POST-REDESIGN: tidlegare translateY(-2px) + scale(1.06) gjorde
           kontrollør-kortet til ein hoppande pile-rad. Erstatta med subtil
           bakgrunns-tint + box-shadow utan layout-skift, slik at fokus held
           seg på innhaldet og chevron-rotasjonen er den primære affordancen. */
        .pilar-chip-stagger.pilar-chip-stagger--visible {
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            padding 0.18s cubic-bezier(0.2, 0.9, 0.25, 1);
        }
        .pilar-kontrollor-row.pilar-chip-stagger--visible:hover:not(:disabled) {
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          filter: brightness(0.985);
        }
        .pilar-kontrollor-row.pilar-chip-stagger--visible:focus-visible {
          outline: 2px solid var(--fg);
          outline-offset: 2px;
        }
        /* Bevar gamal hover for chips utanfor kontrollør-kortet (om dei
           framleis finst etter refaktor). Fjern når alle har migrert. */
        .pilar-chip-stagger.pilar-chip-stagger--visible:not(.pilar-kontrollor-row):hover:not(:disabled) {
          transform: translateY(-2px) scale(1.06);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.10);
        }

        @media (prefers-reduced-motion: reduce) {
          .pilar-chip-stagger,
          .pilar-breathe,
          .pilar-puls-dot,
          .pilar-chip-aura,
          .pilar-chevron,
          .pilar-tile-clickable {
            animation: none !important;
            transition: none !important;
          }
          /* Stagger startilstand er usynleg — for reduced-motion må vi
             sette synleg tilstand direkte. */
          .pilar-chip-stagger {
            opacity: 1 !important;
            transform: none !important;
          }
          /* Hover-effekt utan animasjon — fortsatt visuelt skilje */
          .pilar-tile-clickable:hover,
          .pilar-chip-stagger.pilar-chip-stagger--visible:hover:not(:disabled) {
            transform: none !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pilar-skeleton-bar,
          .pilar-cursor,
          .pilar-stream-item,
          .pilar-stream-item .uk-checkitem__icon,
          .pilar-block-appear {
            animation: none !important;
          }
        }
      `}</style>
      <main style={{ paddingBottom: showScrollHint ? 80 : undefined }}>
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

          {/* Resume-banner — viser når use held fram frå tidlegare berekning.
              Plassert OVER alle phase-conditionals så han er synleg uansett fase
              (workbench, calculating, calculation_result). Lenke tilbake til
              original-rapport hvis han finst. Klargjer at redigering opprettar
              ein NY berekning (fork-model). */}
          {restoredFrom && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--fg-2, #475569)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span>
                <strong style={{ color: "var(--fg, #1a1a1a)" }}>
                  {pageDisplayLanguage === "en"
                    ? "Continuing from a previous calculation."
                    : WB_LABELS.fortsetterFra[locale]}
                </strong>{" "}
                {pageDisplayLanguage === "en"
                  ? "Changes create a new calculation — the original remains unchanged."
                  : WB_LABELS.endringerOpprett[locale]}
              </span>
              {restoredFrom.documentId && restoredFrom.runId && (
                <a href={`/rapport/${restoredFrom.runId}`} style={{ color: "var(--fg, #1a1a1a)", textDecoration: "underline", whiteSpace: "nowrap" }}>{restoredFrom.documentId} ↗</a>
              )}
            </div>
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
              {/* Første-gongs-guide (#09) — éi-setnings forklaring av kva
                  Workbench er. Synleg only første gong studenten besøker
                  sida, persistert i localStorage. Auto-skjult når dei har
                  fullført ein berekning. */}
              {showFirstTimeGuide && (
                <div
                  role="region"
                  aria-label="Velkomstmelding"
                  style={{
                    marginBottom: 16,
                    padding: "12px 16px",
                    background: "var(--surface-alt, #FAFAFA)",
                    border: "1px solid var(--rule, #E2E8F0)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--fg-2, #475569)",
                  }}
                >
                  <span style={{ flex: 1 }}>{WB_LABELS.forsteGongGuide[locale]}</span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.localStorage.setItem("pilar-onboarded-v1", "true");
                      } catch {
                        // Ignorer — neste mount vil vise guiden igjen
                      }
                      setShowFirstTimeGuide(false);
                    }}
                    aria-label={WB_LABELS.forsteGongDismiss[locale]}
                    style={{
                      flexShrink: 0,
                      background: "none",
                      border: "none",
                      padding: "0 4px",
                      fontSize: 18,
                      lineHeight: 1,
                      color: "var(--fg-muted, #94A3B8)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              <label htmlFor="oppgave" className="uk-label">
                {WB_LABELS.skrivInnOppgave[locale]}
              </label>
              <textarea
                id="oppgave"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={6}
                placeholder={WB_LABELS.placeholderEksempel[locale]}
                className="uk-textarea"
              />

              {/* Fil-opplasting rett under textarea (#06) — labeled knapp + format-hint */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileSelect} style={{ display: "none" }} id="file-upload-input" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={WB_LABELS.lastOppFil[locale]}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--rule, #E2E8F0)",
                    background: "var(--surface, #fff)",
                    color: "var(--fg, #1F2937)",
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.2,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--fg-2, #475569)";
                    e.currentTarget.style.background = "var(--surface-2, #F8FAFC)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--rule, #E2E8F0)";
                    e.currentTarget.style.background = "var(--surface, #fff)";
                  }}
                >
                  {WB_LABELS.lastOppStottefil[locale]}
                </button>
                <span style={{ fontSize: 12, color: "var(--fg-muted, #94A3B8)" }}>
                  {WB_LABELS.filFormatHint[locale]}
                </span>
                {selectedFile && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, background: "var(--surface-alt, #F8FAFC)", border: "1px solid var(--rule, #E2E8F0)", borderRadius: 8 }}>
                    <span aria-hidden="true">📎</span>
                    <span style={{ fontWeight: 500 }}>{selectedFile.name}</span>
                    <span style={{ color: "var(--fg-muted, #94A3B8)" }}>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    <button type="button" onClick={clearFile} aria-label={WB_LABELS.fjernFil[locale]} style={{ marginLeft: 4, padding: "0 6px", fontSize: 16, lineHeight: 1, color: "var(--fg-muted, #94A3B8)", background: "transparent", border: "none", cursor: "pointer" }}>×</button>
                  </div>
                )}
                {/* Eksempel-kollaps-lenke (#07) — synleg når eksempla er kollapsa */}
                {examplesCollapsed && (
                  <button
                    type="button"
                    onClick={() => setExamplesCollapsed(false)}
                    style={{
                      marginLeft: "auto",
                      background: "none",
                      border: "none",
                      padding: "4px 0",
                      fontSize: 13,
                      color: "var(--fg-2, #475569)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {WB_LABELS.seEksempel[locale]}
                  </button>
                )}
              </div>
              {fileError && (
                <p style={{ marginTop: 8, fontSize: 12, color: "var(--warn, #C2410C)" }}>{fileError}</p>
              )}

              {/* === Mangelfull-chips (#03) ===
                  Synleg når Tolkar har funne manglande verdiar. Studenten kan
                  klikke ein chip for å sette inn ein mal i tekstfeltet
                  ("last: [verdi?]") og bli fokusert på textarea-en.
                  Synleg både for MANGELFULL og DELVIS_KLAR. */}
              {result && (result.manglande_verdiar?.length ?? 0) > 0 &&
                result.status !== "avvist" && (
                <MissingChipStrip
                  fields={result.manglande_verdiar}
                  locale={locale}
                  onChipClick={(fieldText) => insertMissingFieldTemplate(fieldText)}
                  labels={WB_LABELS}
                />
              )}

              {/* === AI-disclaimer (#06) — rolig stripe nær input ===
                  Flytta frå header til der studenten faktisk tek faglege
                  avgjerder. Lågmæl visuell intensitet — ein påminning, ikkje
                  ein åtvaring. width: fit-content slik at stripa ikkje
                  oppfattast som ein full-bredde-banner. */}
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 14px",
                  background: "var(--surface-alt, #FAFAFA)",
                  border: "1px solid var(--rule, #E2E8F0)",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  width: "fit-content",
                  fontSize: 12.5,
                  color: "var(--fg-2, #475569)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent, #D97706)",
                    flexShrink: 0,
                  }}
                />
                <strong style={{ fontWeight: 600 }}>
                  {WB_LABELS.aiDisclaimerKort[locale]}
                </strong>
              </div>

              {!examplesCollapsed && (
                <div style={{ marginTop: 20 }}>
                  <div className="uk-eyebrow" style={{ marginBottom: 10 }}>{WB_LABELS.eksempel[locale]}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                    {getExamplePrompts(pageDisplayLanguage, engineeringContext?.standards?.family).map((example, i) => (
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
              )}

              {/* Tolk-knapp åleine, høgre-justert, under eksempla */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button
                  onClick={handleTolk}
                  disabled={(!input.trim() && !selectedFile) || loading}
                  aria-busy={loading}
                  className={`uk-btn uk-btn--primary${loading ? " uk-btn--loading" : ""}`}
                >
                  {loading
                    ? WB_LABELS.tolkarLoading[locale]
                    : hasTolket
                      ? WB_LABELS.tolkPaNytt[locale]
                      : WB_LABELS.tolkOppgava[locale]}
                </button>
              </div>

              {/* === Feil-stripe — gjeld både tolk-feil og berekning-feil === */}
              {error && (
                <StatusStripe status="bad" label={WB_LABELS.feil[locale]} className="mt-8">
                  {error}
                </StatusStripe>
              )}

              {/* TOLKING-PANEL — synleg under streaming OG når komplett. Bruker tolkingView
                  som er enten fullt result eller streaming.partial coerca til AgentResult-shape.
                  tolkar-stream-klassen aktiverer fade-in-animasjon for streamande innhald. */}
              {tolkingView && (
                <div ref={tolkingPanelRef} className="tolkar-stream pilar-block-appear" style={{ scrollMarginTop: "24px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>

                    {/* === Mobil-tabs (#08) — viste only på viewport < 720px ===
                        Segmentert tab-kontroll med count/state-badges.
                        Klikk byter aktiv tab; auto-switch basert på status. */}
                    {isMobile && result && (() => {
                      const nKanReknast = result.kan_reknast_no?.length ?? 0;
                      const nKanIkkje = result.kan_ikkje_reknast?.length ?? 0;
                      const nResultat = nKanReknast + nKanIkkje;
                      const nTolkte = Object.keys(result.tolkte_verdiar || {}).length;
                      const statusBadge = inputStatusLabel(result.status, locale, pageDisplayLanguage);
                      const statusTone = INPUT_STATUS_TONES[result.status] ?? "warn";

                      const tabs: Array<{
                        id: "resultat" | "tolkning" | "status";
                        label: string;
                        badge: string | number;
                        badgeTone?: "ok" | "warn" | "bad";
                      }> = [
                        { id: "resultat", label: WB_LABELS.tabResultat[locale], badge: nResultat },
                        { id: "tolkning", label: WB_LABELS.tabTolkning[locale], badge: nTolkte },
                        { id: "status", label: WB_LABELS.tabStatus[locale], badge: statusBadge, badgeTone: statusTone === "ok" ? "ok" : statusTone === "bad" ? "bad" : "warn" },
                      ];

                      return (
                        <div
                          role="tablist"
                          aria-label="Workbench-seksjonar"
                          style={{
                            display: "flex",
                            gap: 4,
                            padding: 4,
                            background: "var(--surface-alt, #F8FAFC)",
                            border: "1px solid var(--rule, #E2E8F0)",
                            borderRadius: 10,
                          }}
                        >
                          {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                  flex: 1,
                                  padding: "8px 6px",
                                  background: isActive ? "var(--surface, #fff)" : "transparent",
                                  border: "none",
                                  borderRadius: 6,
                                  fontSize: 12.5,
                                  fontWeight: isActive ? 600 : 500,
                                  color: isActive ? "var(--fg, #1F2937)" : "var(--fg-2, #475569)",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 3,
                                  fontFamily: "inherit",
                                  boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : undefined,
                                  transition: "background 0.15s",
                                }}
                              >
                                <span>{tab.label}</span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    background: tab.badgeTone === "ok"
                                      ? "var(--tone-ok-bg, rgba(34, 139, 34, 0.1))"
                                      : tab.badgeTone === "bad"
                                      ? "var(--tone-bad-bg, rgba(194, 65, 12, 0.1))"
                                      : tab.badgeTone === "warn"
                                      ? "var(--tone-warn-bg, rgba(202, 138, 4, 0.1))"
                                      : "var(--surface-2, #F1F5F9)",
                                    color: tab.badgeTone === "ok"
                                      ? "var(--tone-ok-fg, #166534)"
                                      : tab.badgeTone === "bad"
                                      ? "var(--tone-bad-fg, #C2410C)"
                                      : tab.badgeTone === "warn"
                                      ? "var(--tone-warn-fg, #92400E)"
                                      : "var(--fg-2, #475569)",
                                    letterSpacing: typeof tab.badge === "string" ? "0.04em" : 0,
                                  }}
                                >
                                  {tab.badge}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* === 1. Status-banner (#02 + #01) — øvst i ny single-column-layout ===
                        Banner er "primær informasjon" — studenten skal sjå dette FØRST før
                        dei dykker i detaljer. Berre synleg når Tolkar har fullført (result sett).
                        På mobil: gøymd om aktiv tab ikkje er "status". */}
                    <div style={{ display: isMobile && activeTab !== "status" ? "none" : "contents" }}>
                    {result && (
                      <div ref={statusCardRef} className="pilar-block-appear" style={{ scrollMarginTop: 24 }}>
                        <StatusStripe
                          status={INPUT_STATUS_TONES[result.status] ?? "warn"}
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
                                {WB_LABELS.status[locale]}
                                <InfoPopover label={WB_LABELS.inputstatus[locale]}>
                                  <p>{WB_LABELS.inputstatusExplanation[locale]}</p>
                                </InfoPopover>
                              </span>
                              <Badge status={INPUT_STATUS_TONES[result.status] ?? "warn"}>
                                {inputStatusLabel(result.status, locale, pageDisplayLanguage)}
                              </Badge>
                            </div>
                          }
                        >
                          {getBannerDetail(result, locale, WB_LABELS, pageDisplayLanguage)}
                        </StatusStripe>
                        {typeof result.konfidens === "number" && result.konfidens < 0.7 && (
                          <p
                            style={{
                              marginTop: 8,
                              fontSize: "0.875rem",
                              color: "var(--fg-2)",
                              fontStyle: "italic",
                            }}
                          >
                            {WB_LABELS.lavTillit[locale]}
                          </p>
                        )}
                      </div>
                    )}
                    </div>

                    {/* === 2. Hva kan beregnes nå (#01) — løfta opp frå høgre kolonne ===
                        Dette er det studenten faktisk ventar svar på: "kan Pilar løyse mi
                        oppgåve, og kva blir då rekna?". Difor andre i hierarkiet, etter status.
                        På mobil: gøymd om aktiv tab ikkje er "resultat". */}
                    <div style={{ display: isMobile && activeTab !== "resultat" ? "none" : "contents" }}>
                    {((tolkingView.kan_reknast_no?.length ?? 0) > 0 ||
                      (tolkingView.kan_ikkje_reknast?.length ?? 0) > 0) && (
                      <section
                        ref={reknastCardRef}
                        className="uk-card pilar-block-appear"
                        style={{ scrollMarginTop: 24 }}
                      >
                        <div className="uk-card__hd">
                          <div className="uk-card__title">{WB_LABELS.kvaKanReknast[locale]}</div>
                        </div>
                        <div className="uk-card__bd">
                          {tolkingView.kan_reknast_no?.map((item, i) => (
                            <div
                              key={item}
                              className="uk-checkitem uk-checkitem--active pilar-stream-item"
                              style={{ animationDelay: `${i * 60}ms` }}
                            >
                              <span className="uk-checkitem__icon">●</span>
                              <span className="uk-checkitem__label">{item}</span>
                            </div>
                          ))}
                          {tolkingView.kan_ikkje_reknast?.map((item, i) => {
                            const offset = (tolkingView.kan_reknast_no?.length ?? 0) + i;
                            return (
                              <div
                                key={item}
                                className="uk-checkitem uk-checkitem--blocked pilar-stream-item"
                                style={{ animationDelay: `${offset * 60}ms` }}
                              >
                                <span className="uk-checkitem__icon">○</span>
                                <span className="uk-checkitem__label">{item}</span>
                                <span className="uk-checkitem__note">{WB_LABELS.krevMeirInput[locale]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}
                    </div>

                    {/* === 3. Tolkning (#01) — samanfatta + utvidbar ===
                        Tidlegare: full prose + alle tolkede verdiar i venstre kolonne.
                        No: oppsummering alltid synleg, resten bak "Vis full tolkning"-toggle.
                        Under streaming auto-utvidast så studenten ser Tolkar arbeide.
                        IIFE for å samle derived state lokalt.
                        På mobil: gøymd om aktiv tab ikkje er "tolkning". */}
                    <div style={{ display: isMobile && activeTab !== "tolkning" ? "none" : "contents" }}>
                    {(() => {
                      const tolkteCount = Object.keys(tolkingView.tolkte_verdiar || {}).length;
                      const isStreaming = streamingTolkar.phase === "streaming";
                      const showFull = tolkningExpanded || isStreaming;
                      const hasMoreContent =
                        Boolean(tolkingView.berekningstype) ||
                        tolkteCount > 0 ||
                        (tolkingView.manglande_verdiar?.length ?? 0) > 0 ||
                        (tolkingView.antakingar?.length ?? 0) > 0;

                      return (
                        <section className="uk-card pilar-block-appear">
                          <div className="uk-card__hd">
                            <div className="uk-card__title">{WB_LABELS.tolking[locale]}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <Badge status="neutral">{WB_LABELS.tolkarBadge[locale]}</Badge>
                              {isStreaming && (
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
                                  {WB_LABELS.stromer[locale]}
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className="uk-card__bd"
                            style={{ display: "flex", flexDirection: "column", gap: 16 }}
                          >
                            {/* Skeleton-shimmer (animasjon a): synleg første sekund
                                while vi ventar på første delta frå Tolkar. */}
                            {isStreaming && !tolkingView.tolkings_oppsummering && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div className="pilar-skeleton-bar" style={{ width: "92%" }} />
                                <div className="pilar-skeleton-bar" style={{ width: "78%" }} />
                                <div className="pilar-skeleton-bar" style={{ width: "85%" }} />
                              </div>
                            )}

                            {/* Oppsummering — typewriter-effekt via StreamingProse.
                                partial-JSON-parser leverer felt-verdien som heilskap, så
                                vi gradvis avslører teksten på frontend i 20ms-tikk.
                                Blinkande markør (animasjon b) på slutten while typing/streaming. */}
                            {tolkingView.tolkings_oppsummering && (
                              <StreamingProse
                                text={tolkingView.tolkings_oppsummering}
                                isStreaming={isStreaming}
                              />
                            )}

                            {/* Utvidbar innhald: detaljar bak toggle (eller alltid under streaming) */}
                            {showFull && (
                              <>
                                {tolkingView.berekningstype && (
                                  <Row
                                    label={WB_LABELS.berekningstype[locale]}
                                    value={tolkingView.berekningstype}
                                  />
                                )}

                                {tolkteCount > 0 && (
                                  <div>
                                    <div className="uk-eyebrow" style={{ marginBottom: 10 }}>
                                      {WB_LABELS.tolkteVerdiar[locale]}
                                    </div>
                                    <TolkteVerdiarGrid
                                      values={tolkingView.tolkte_verdiar}
                                      locale={locale}
                                      displayLanguage={pageDisplayLanguage}
                                    />
                                  </div>
                                )}

                                {tolkingMotstrid.length > 0 && (
                                  <ListSection
                                    label={
                                      locale === "nn"
                                        ? "⚠ Mogleg motstrid i inndata"
                                        : "⚠ Mulig motstrid i inndata"
                                    }
                                    items={tolkingMotstrid}
                                    tone="warn"
                                  />
                                )}

                                {tolkingView.manglande_verdiar?.length > 0 && (
                                  <ListSection
                                    label={WB_LABELS.manglandeData[locale]}
                                    items={tolkingView.manglande_verdiar}
                                    tone="warn"
                                  />
                                )}

                                {tolkingView.antakingar?.length > 0 && (
                                  <ListSection
                                    label={WB_LABELS.antakingar[locale]}
                                    items={tolkingView.antakingar}
                                  />
                                )}
                              </>
                            )}

                            {/* Toggle — synleg når Tolkar er ferdig OG det finst meir å vise */}
                            {!isStreaming && hasMoreContent && (
                              <button
                                type="button"
                                onClick={() => setTolkningExpanded(!tolkningExpanded)}
                                aria-expanded={tolkningExpanded}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "8px 0",
                                  color: "var(--fg-2)",
                                  fontSize: 13,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  textAlign: "left",
                                  alignSelf: "flex-start",
                                }}
                              >
                                <span aria-hidden style={{ fontSize: 10 }}>
                                  {tolkningExpanded ? "▼" : "▶"}
                                </span>
                                {tolkningExpanded
                                  ? WB_LABELS.skjulFullTolkning[locale]
                                  : `${WB_LABELS.visFullTolkning[locale]} (${tolkteCount})`}
                              </button>
                            )}
                          </div>
                        </section>
                      );
                    })()}
                    </div>

                  </div>

{/* Sekundær CTA — Start berekning. Synleg når Tolkar-panelet har innhold. */}
<section ref={startBerekningRef} className="uk-card" style={{ marginTop: 16 }}>
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
        {WB_LABELS.stemmerTolkinga[locale]}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleCancel} className="uk-btn uk-btn--ghost">
          {WB_LABELS.avbryt[locale]}
        </button>
        <button
          onClick={handleStartCalculation}
          disabled={!canStart}
          className="uk-btn uk-btn--primary"
          title={
            result && (result.manglande_verdiar?.length ?? 0) > 0
              ? result.manglande_verdiar.join(", ")
              : undefined
          }
        >
          {result && (result.manglande_verdiar?.length ?? 0) > 0
            ? WB_LABELS.startMedMangler[locale].replace("{n}", String(result.manglande_verdiar.length))
            : WB_LABELS.startBerekning[locale]}
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
            <StatusStripe status="bad" label={WB_LABELS.feil[locale]} className="mt-8">
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
              onRetry={handleRetryAgent}
              retryCountA={retryCountA}
              retryCountB={retryCountB}
              engineeringContext={engineeringContext}
            />
          )}

          {/* === FASE: CALCULATION_RESULT === */}
          {phase === "calculation_result" && calculationA && (
            <CalculationResultView
              calculationA={calculationA}
              calculationB={calculationB}
              comparison={comparison}
              controllerDecision={controllerDecision}
              result={result}
              currentRunId={currentRunId}
              locale={locale}
              engineeringContext={engineeringContext}
              kontrollorBelowFold={kontrollorBelowFold}
              actionBarVisible={actionBarVisible}
              isMobile={isMobile}
              kontrollorSentinelRef={kontrollorSentinelRef}
              actionBarSentinelRef={actionBarSentinelRef}
              aMellomleddExpanded={aMellomleddExpanded}
              setAMellomleddExpanded={setAMellomleddExpanded}
              kontrollorBExpanded={kontrollorBExpanded}
              setKontrollorBExpanded={setKontrollorBExpanded}
              kontrollorProsaExpanded={kontrollorProsaExpanded}
              setKontrollorProsaExpanded={setKontrollorProsaExpanded}
              selvkontrollExpanded={selvkontrollExpanded}
              setSelvkontrollExpanded={setSelvkontrollExpanded}
              comparisonGeneralExpanded={comparisonGeneralExpanded}
              setComparisonGeneralExpanded={setComparisonGeneralExpanded}
              expandedComparisonRows={expandedComparisonRows}
              setExpandedComparisonRows={setExpandedComparisonRows}
              stegvisViewMode={stegvisViewMode}
              setStegvisViewMode={setStegvisViewMode}
              collapsedSteps={collapsedSteps}
              setCollapsedSteps={setCollapsedSteps}
              handleBackToWorkbench={handleBackToWorkbench}
              saveStateToSession={saveStateToSession}
            />
          )}
        </div>

        {/* Sticky CTA-bar (#05) — synleg når Start beregning-CTA er under
            viewport. Inneheld den faktiske Start beregning-knappen, slik at
            studenten ikkje må scrolle for å handle. Erstattar tidlegare
            flytande "Klar"-pille som only var ein scroll-hint. */}
        {showScrollHint && (
          <div
            className="pilar-block-appear"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "var(--surface, #fff)",
              borderTop: "1px solid var(--rule, #E2E8F0)",
              boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.04)",
              padding: "12px 20px",
              zIndex: 100,
            }}
          >
            <div
              style={{
                maxWidth: 1200,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "var(--fg-2, #475569)",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {WB_LABELS.klarTilStart[locale]}
              </span>
              <button
                onClick={handleStartCalculation}
                disabled={!canStart}
                className="uk-btn uk-btn--primary"
                title={
                  result && (result.manglande_verdiar?.length ?? 0) > 0
                    ? result.manglande_verdiar.join(", ")
                    : undefined
                }
              >
                {result && (result.manglande_verdiar?.length ?? 0) > 0
                  ? WB_LABELS.startMedMangler[locale].replace("{n}", String(result.manglande_verdiar.length))
                  : WB_LABELS.startBerekning[locale]}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
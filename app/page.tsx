"use client";

import { useEffect, useRef, useState } from "react";
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
// Fil-opplasting (chunk 2 dag 14-feature)
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB — Vercel Hobby body limit
const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

const WB_LABELS: Record<string, Record<Locale, string>> = {
  // Resume-banner
  fortsetterFra: { nb: "Fortsetter fra tidligere beregning.", nn: "Held fram frå tidlegare berekning." },
  endringerOpprett: { nb: "Endringer oppretter en ny beregning — originalen forblir uendret.", nn: "Endringar opprettar ein ny berekning — originalen blir uendra." },
  // Input-form
  skrivInnOppgave: { nb: "Skriv inn en konstruksjonsoppgave", nn: "Skriv inn ei konstruksjonsoppgåve" },
  placeholderEksempel: { nb: "For eksempel: Finn maksimalt moment og skjær for en fritt opplagt bjelke med L = 5 m og jevnt fordelt last q = 8 kN/m...", nn: "Til dømes: Finn maksimalt moment og skjær for ein fritt opplagd bjelke med L = 5 m og jamt fordelt last q = 8 kN/m..." },
  // Filopplasting
  lastOppFil: { nb: "Last opp fil", nn: "Last opp fil" },
  filopplasting: { nb: "Filopplasting", nn: "Filopplasting" },
  filopplastingP1: { nb: "Last opp et bilde (JPG, PNG, GIF, WEBP), PDF eller Word-dokument med oppgaven.", nn: "Last opp eit bilete (JPG, PNG, GIF, WEBP), PDF eller Word-dokument med oppgåva." },
  filopplastingP2Pre: { nb: "Maks filstørrelse:", nn: "Maks filstorleik:" },
  filopplastingP2Post: { nb: ". Tolkeren leser filen og henter ut tekst, tall og kontekst.", nn: ". Tolkar les fila og hentar ut tekst, tal og kontekst." },
  fjernFil: { nb: "Fjern fil", nn: "Fjern fil" },
  // Eksempel
  eksempel: { nb: "Eksempel", nn: "Eksempel" },
  // Knappar
  tolkarLoading: { nb: "Tolker...", nn: "Tolkar..." },
  tolkPaNytt: { nb: "Tolk på nytt →", nn: "Tolk på nytt →" },
  tolkOppgava: { nb: "Tolk oppgaven →", nn: "Tolk oppgåva →" },
  feil: { nb: "Feil", nn: "Feil" },
  // Tolking-panel
  tolking: { nb: "Tolkning", nn: "Tolking" },
  tolkarBadge: { nb: "Tolker", nn: "Tolkar" },
  stromer: { nb: "● STREAMER", nn: "● STRØYMER" },
  berekningstype: { nb: "Beregningstype", nn: "Berekningstype" },
  tolkteVerdiar: { nb: "Tolkede verdier", nn: "Tolkte verdiar" },
  manglandeData: { nb: "Manglende data", nn: "Manglande data" },
  antakingar: { nb: "Antakelser", nn: "Antakingar" },
  kvaKanReknast: { nb: "Hva kan beregnes nå", nn: "Kva kan reknast no" },
  krevMeirInput: { nb: "krever mer input", nn: "krev meir input" },
  // Status-card
  status: { nb: "Status", nn: "Status" },
  inputstatus: { nb: "Inputstatus", nn: "Inputstatus" },
  inputstatusExplanation: { nb: "Tolkerens vurdering av hvor klar oppgaven er til å beregnes. 'Klar' = all info på plass. 'Delvis klar' = Tolkeren har gjort rimelige antakelser (synlig ovenfor) som du kan justere før du starter. Andre statuser trenger mer input eller faller utenfor pilot-versjonen.", nn: "Tolkar si vurdering av kor klar oppgåva er til å reknast. 'Klar' = all info på plass. 'Delvis klar' = Tolkar har gjort rimelege antakingar (synleg ovanfor) som du kan justere før du startar. Andre statusar treng meir input eller fell utanfor pilot-versjonen." },
  fagomraade: { nb: "Fagområde", nn: "Fagområde" },
  stottaMVP: { nb: "Støttet i MVP", nn: "Støtta i MVP" },
  ja: { nb: "Ja", nn: "Ja" },
  nei: { nb: "Nei", nn: "Nei" },
  konfidens: { nb: "Konfidens", nn: "Konfidens" },
  konfidensExplanation: { nb: "Tolkerens egenrapporterte sikkerhet på at fortolkningen er riktig (0–1). Ikke det samme som Tillit-skåren på rapportsiden — måler bare én agents tillit til eget arbeid.", nn: "Tolkar si eigenrapporterte sikkerheit på at fortolkinga er rett (0–1). Ikkje det same som Tillit-skåren på rapportsida — målar berre éin agent sin tillit til eige arbeid." },
  // Start-CTA
  stemmerTolkinga: { nb: "Stemmer tolkningen? Da kan du starte beregningen.", nn: "Stemmer tolkinga? Då kan du starte berekninga." },
  avbryt: { nb: "Avbryt", nn: "Avbryt" },
  startBerekning: { nb: "Start beregning →", nn: "Start berekning →" },
  scrollTilStart: { nb: "Scroll til Start beregning", nn: "Scroll til Start berekning" },
  klarTilStart: { nb: "Klar til å starte beregningen", nn: "Klar til å starte berekninga" },
  // Result-fase
  kontrollorAvgjerd: { nb: "Kontrollør — endelig avgjørelse", nn: "Kontrollør — endeleg avgjerd" },
  kontrollor: { nb: "Kontrollør", nn: "Kontrollør" },
  kontrollorPopover1: { nb: "Kontrollør-agenten leser både konstruktører og Sammenligner, og avgjør om resultatet er trygt nok å vise. Erstatter", nn: "Kontrollør-agenten les både konstruktørar og Samanliknar, og avgjer om resultatet er trygt nok å vise. Erstattar" },
  kontrollorPopover2: { nb: "ikke", nn: "ikkje" },
  kontrollorPopover3: { nb: "fagperson-kontroll.", nn: "fagperson-kontroll." },
  sluttkonklusjonUtelaten: { nb: "Sluttkonklusjon utelatt av Kontrolløren.", nn: "Sluttkonklusjon utelaten av Kontrolløren." },
  hallusinasjonarTekst: { nb: "Kontrolløren identifiserte hallusinasjoner i konstruktørenes kortform-konklusjon. Se Resultat-felt og full utregning under for korrekte verdier.", nn: "Kontrolløren identifiserte hallusinasjonar i konstruktørane sin kortform-konklusjon. Sjå Resultat-felt og full utrekning under for korrekte verdiar." },
  kortSvar: { nb: "Kort svar", nn: "Kort svar" },
  resultat: { nb: "Resultat", nn: "Resultat" },
  foresetnaderBrukt: { nb: "Forutsetninger brukt", nn: "Føresetnader brukt" },
  stegvisUtrekning: { nb: "Stegvis utregning", nn: "Stegvis utrekning" },
  kvaErIkkjeRekna: { nb: "Hva er ikke beregnet", nn: "Kva er ikkje rekna" },
  atvaringar: { nb: "Advarsler", nn: "Åtvaringar" },
  // Konfidens-card
  konstruktorAKonfidens: { nb: "Konstruktør A konfidens", nn: "Konstruktør A konfidens" },
  konstruktorBKonfidens: { nb: "Konstruktør B konfidens", nn: "Konstruktør B konfidens" },
  konstruktorKonfidens: { nb: "Konstruktør-konfidens", nn: "Konstruktør-konfidens" },
  konstruktorKonfidensPopover: { nb: "Konstruktørens egenrapporterte sikkerhet på eget svar (high/medium/low). Ikke det samme som Tillit-skåren — måler bare én agents tillit til seg selv.", nn: "Konstruktøren si eigenrapporterte sikkerheit på eige svar (high/medium/low). Ikkje det same som Tillit-skåren — målar berre éin agent sin tillit til seg sjølv." },
  // Konstruktør B-panel
  konstruktorBUavhengig: { nb: "Konstruktør B — uavhengig kontroll", nn: "Konstruktør B — uavhengig kontroll" },
  loysteOppgavaUtan: { nb: "Løste oppgaven uten å se Konstruktør A sitt svar", nn: "Løyste oppgåva utan å sjå Konstruktør A sitt svar" },
  konstruktorBKonklusjon: { nb: "Konstruktør B sin konklusjon", nn: "Konstruktør B sin konklusjon" },
  konstruktorBResultat: { nb: "Konstruktør B sine resultater", nn: "Konstruktør B sine resultat" },
  // Samanliknar
  samanliknarSkilnader: { nb: "Sammenligner — forskjeller funnet", nn: "Samanliknar — skilnader funne" },
  numeriskeSkilnader: { nb: "Numeriske forskjeller", nn: "Numeriske skilnader" },
  metodiskeSkilnader: { nb: "Metodiske forskjeller", nn: "Metodiske skilnader" },
  forskjellarForesetnader: { nb: "Forskjeller i forutsetninger", nn: "Forskjellar i føresetnader" },
  internInkonsistens: { nb: "Intern inkonsistens", nn: "Intern inkonsistens" },
  // Tabell-headers (Felt, Konstruktør A, Konstruktør B, Skilnad, Alvor)
  tabellFelt: { nb: "Felt", nn: "Felt" },
  tabellSkilnad: { nb: "Forskjell", nn: "Skilnad" },
  tabellAlvor: { nb: "Alvor", nn: "Alvor" },
  // Action bar
  resultatetForebels: { nb: "Resultatet er foreløpig og må kontrolleres av fagperson.", nn: "Resultatet er førebels og må kontrollerast av fagperson." },
  tilbake: { nb: "← Tilbake", nn: "← Tilbake" },
  generRapport: { nb: "Generer rapport →", nn: "Generer rapport →" },
};

const PHASE_HEADERS: Record<Locale, Record<Phase, { eyebrow: string; title: string; description: string }>> = {
  nb: {
    workbench: {
      eyebrow: "NY BEREGNING",
      title: "Beskriv oppgaven",
      description: "Skriv inn forespørselen. Tolkeren leser og viser tolkningen her — du kan redigere og tolke på nytt før du starter beregningen.",
    },
    calculating: {
      eyebrow: "REGNER",
      title: "Konstruktørene jobber",
      description: "Dobbel-kontroll med to uavhengige konstruktører, sammenligning og kontrolløravgjørelse.",
    },
    calculation_result: {
      eyebrow: "STEG 3 AV 3 · RESULTAT",
      title: "Beregningsnotat",
      description: "Foreløpig resultat med agentkontroll. Må kontrolleres av fagperson før bruk.",
    },
  },
  nn: {
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
  },
};

// Returnerer ein menneskeleg-lesbar grunn til at "Start berekning" er deaktivert,
// eller null viss berekning kan startast. Status-spesifikk for å unngå
// misvisande "legg til manglar"-melding på t.d. relevant_ikkje_stotta.
const BLOCKED_REASONS: Record<Locale, { avvist: string; relevant_ikkje_stotta: string; uklart: string; no_kalkulator: string }> = {
  nb: {
    avvist: "Inputen er ikke byggfaglig. Beregning kan ikke startes.",
    relevant_ikkje_stotta: "Forespørselen er byggfaglig relevant, men ligger utenfor det MVP-en støtter ennå (typisk brann, dynamikk, seismisk eller geoteknisk dimensjonering). Prøv en annen formulering eller en annen beregningstype.",
    uklart: "Forespørselen er for vag til å tolke trygt. Rediger forespørselen og tolk på nytt med mer konkret informasjon om geometri, last og materiale.",
    no_kalkulator: "Ingen beregning er mulig med oppgitt informasjon. Rediger forespørselen og legg til manglende data.",
  },
  nn: {
    avvist: "Inputen er ikkje byggfagleg. Berekning kan ikkje startast.",
    relevant_ikkje_stotta: "Forespurnaden er byggfagleg relevant, men ligg utanfor det MVP-en støttar enno (typisk brann, dynamikk, seismisk eller geoteknisk dimensjonering). Prøv ei anna formulering eller ein annan berekningstype.",
    uklart: "Forespurnaden er for vag til å tolke trygt. Rediger forespørselen og tolk på nytt med meir konkret informasjon om geometri, last og materiale.",
    no_kalkulator: "Ingen berekning er mogleg med oppgitt informasjon. Rediger forespørselen og legg til manglande data.",
  },
};

function getBlockedReason(result: AgentResult | null, locale: Locale): string | null {
  if (!result) return null;
  const reasons = BLOCKED_REASONS[locale];

  if (result.status === "avvist") return reasons.avvist;
  if (result.status === "relevant_ikkje_stotta") return reasons.relevant_ikkje_stotta;
  if (result.status === "uklart") return reasons.uklart;
  if ((result.kan_reknast_no?.length ?? 0) === 0) return reasons.no_kalkulator;

  return null;
}

export default function Home() {
  const { locale } = useLocale();
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

  // Fil-opplasting (chunk 2 dag 14)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  const [ctaInView, setCtaInView] = useState(false);

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
  //  - ?from_request=X → berre workbench-state (input + tolking). Bruker
  //    klikkar Start berekning for å køyre på nytt.
  //  - ?from_run=X     → FULL state inkl. Mission Control-resultat. Hopper
  //    rett til calculation_result-fasen viss agentar har køyrt.
  // Køyrer berre ein gong.
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
          // Set requestId så handleStartCalculation finn han når brukar
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

        // from_request — berre workbench-state
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
        // Set requestId så handleStartCalculation finn han når brukar
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Last state tilbake frå sessionStorage når brukar kjem tilbake frå /rapport.
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

    // Bygg payload basert på om brukar har valt ei fil
    let payload: Record<string, unknown> | FormData;
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (input.trim()) formData.append("text", input);
      formData.append("locale", locale);
      payload = formData;
    } else {
      payload = { text: input, locale };
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

      const agentBody = { run_id: runId, input_review: result, locale };

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
          locale,
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
          locale,
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

  const pageHeader = PHASE_HEADERS[locale][phase];

  const isBlocked = (key: string): boolean =>
    !!controllerDecision?.blocked_outputs?.includes(key);

  const blockedReason = getBlockedReason(result, locale);
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

          {/* Resume-banner — viser når brukar held fram frå tidlegare berekning.
              Plassert OVER alle phase-conditionals så han er synleg uansett fase
              (workbench, calculating, calculation_result). Lenke tilbake til
              original-rapport hvis han finst. Klargjer at redigering opprettar
              ein NY berekning (fork-model). */}
          {restoredFrom && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--fg-2, #475569)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span>
                <strong style={{ color: "var(--fg, #1a1a1a)" }}>{WB_LABELS.fortsetterFra[locale]}</strong>{" "}
                {WB_LABELS.endringerOpprett[locale]}
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
              <label htmlFor="oppgave" className="uk-label">
                {WB_LABELS.skrivInnOppgave[locale]}
              </label>
              <textarea
                id="oppgave"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={6}
                placeholder={WB_LABELS.placeholderEksempel[locale]}
                className="uk-textarea"
              />

              {/* Fil-opplasting rett under textarea — +-knapp + chip + fileError */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileSelect} style={{ display: "none" }} id="file-upload-input" />
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label={WB_LABELS.lastOppFil[locale]} style={{ width: 42, height: 42, borderRadius: 10, border: "1px solid var(--rule, #E2E8F0)", background: "var(--surface, #fff)", color: "var(--fg-2, #475569)", fontSize: 24, lineHeight: 1, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "border-color 0.15s, background 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--fg-2, #475569)"; e.currentTarget.style.background = "var(--surface-2)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface, #fff)"; }}>+</button>
                <InfoPopover label={WB_LABELS.filopplasting[locale]}><p>{WB_LABELS.filopplastingP1[locale]}</p><p>{WB_LABELS.filopplastingP2Pre[locale]} <strong>4 MB</strong>{WB_LABELS.filopplastingP2Post[locale]}</p></InfoPopover>
                {selectedFile && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, background: "var(--surface-alt, #F8FAFC)", border: "1px solid var(--rule, #E2E8F0)", borderRadius: 8 }}>
                    <span aria-hidden="true">📎</span>
                    <span style={{ fontWeight: 500 }}>{selectedFile.name}</span>
                    <span style={{ color: "var(--fg-muted, #94A3B8)" }}>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    <button type="button" onClick={clearFile} aria-label={WB_LABELS.fjernFil[locale]} style={{ marginLeft: 4, padding: "0 6px", fontSize: 16, lineHeight: 1, color: "var(--fg-muted, #94A3B8)", background: "transparent", border: "none", cursor: "pointer" }}>×</button>
                  </div>
                )}
              </div>
              {fileError && (
                <p style={{ marginTop: 8, fontSize: 12, color: "var(--warn, #C2410C)" }}>{fileError}</p>
              )}

              <div style={{ marginTop: 20 }}>
                <div className="uk-eyebrow" style={{ marginBottom: 10 }}>{WB_LABELS.eksempel[locale]}</div>
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
                <div ref={tolkingPanelRef} className="tolkar-stream" style={{ scrollMarginTop: "24px" }}>
                  <div className="uk-confirm-grid" style={{ marginTop: 32 }}>
                    {/* === Venstre kolonne: forespurnad + tolking === */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <section className="uk-card">
                        <div className="uk-card__hd">
                          <div className="uk-card__title">{WB_LABELS.tolking[locale]}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Badge status="neutral">{WB_LABELS.tolkarBadge[locale]}</Badge>
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
                                {WB_LABELS.stromer[locale]}
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
                            <Row label={WB_LABELS.berekningstype[locale]} value={tolkingView.berekningstype} />
                          )}

                          {Object.keys(tolkingView.tolkte_verdiar || {}).length > 0 && (
                            <div>
                              <div className="uk-eyebrow" style={{ marginBottom: 6 }}>
                                {WB_LABELS.tolkteVerdiar[locale]}
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
                              label={WB_LABELS.manglandeData[locale]}
                              items={tolkingView.manglande_verdiar}
                              tone="warn"
                            />
                          )}

                          {tolkingView.antakingar?.length > 0 && (
                            <ListSection label={WB_LABELS.antakingar[locale]} items={tolkingView.antakingar} />
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
                            <div className="uk-card__title">{WB_LABELS.kvaKanReknast[locale]}</div>
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
                                <span className="uk-checkitem__note">{WB_LABELS.krevMeirInput[locale]}</span>
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
                            <div className="uk-card__title">{WB_LABELS.status[locale]}</div>
                          </div>
                          <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column" }}>
                          <StatusKV label={WB_LABELS.inputstatus[locale]} tone={INPUT_STATUS_TONES[result.status] ?? "warn"} value={inputStatusLabel(result.status, locale)} explanation={WB_LABELS.inputstatusExplanation[locale]} />
                            {result.fagomraade && (
                              <StatusKV label={WB_LABELS.fagomraade[locale]} tone="info" value={result.fagomraade} />
                            )}
                            <StatusKV
                              label={WB_LABELS.stottaMVP[locale]}
                              tone={result.status === "relevant_ikkje_stotta" ? "bad" : "ok"}
                              value={result.status === "relevant_ikkje_stotta" ? WB_LABELS.nei[locale] : WB_LABELS.ja[locale]}
                            />
                            <StatusKV label={WB_LABELS.konfidens[locale]} tone={result.konfidens >= 0.7 ? "ok" : result.konfidens >= 0.4 ? "warn" : "bad"} value={result.konfidens?.toFixed(2) ?? "—"} explanation={WB_LABELS.konfidensExplanation[locale]} />
                          </div>
                        </section>
                      )}
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
        >
          {WB_LABELS.startBerekning[locale]}
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
                        {WB_LABELS.kontrollorAvgjerd[locale]}
                        <InfoPopover label={WB_LABELS.kontrollor[locale]}><p>{WB_LABELS.kontrollorPopover1[locale]} <strong>{WB_LABELS.kontrollorPopover2[locale]}</strong> {WB_LABELS.kontrollorPopover3[locale]}</p></InfoPopover>
                      </span>
                      <Badge status={DECISION_STATUS_TONES[controllerDecision.decision_status]}>{decisionStatusLabel(controllerDecision.decision_status, locale)}</Badge>
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
                      {matchStatusLabel(comparison.match_status, locale)}
                    </div>
                  }
                >
                  {comparison.summary}
                </StatusStripe>
              )}

              {/* Kort svar — eller blokka-varsel */}
              {(isBlocked("short_conclusion_a") || isBlocked("short_conclusion_b")) ? (
                <StatusStripe status="warn">
                  <strong>{WB_LABELS.sluttkonklusjonUtelaten[locale]}</strong>{" "}
                  {WB_LABELS.hallusinasjonarTekst[locale]}
                </StatusStripe>
              ) : (
                <StatusStripe
                  status="ok"
                  header={
                    <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                      {WB_LABELS.kortSvar[locale]}
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
                    <div className="uk-card__title">{WB_LABELS.resultat[locale]}</div>
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
                    <div className="uk-card__title">{WB_LABELS.foresetnaderBrukt[locale]}</div>
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
                    <div className="uk-card__title">{WB_LABELS.stegvisUtrekning[locale]}</div>
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
                      {WB_LABELS.kvaErIkkjeRekna[locale]}
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
                      {WB_LABELS.atvaringar[locale]}
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
                    <span className="uk-eyebrow">{WB_LABELS.konstruktorAKonfidens[locale]}</span>
                      <InfoPopover label={WB_LABELS.konstruktorKonfidens[locale]}><p>{WB_LABELS.konstruktorKonfidensPopover[locale]}</p></InfoPopover>
                      <Badge status={CONFIDENCE_TONES[calculationA.confidence]}>{calculationA.confidence}</Badge>
                    </div>
                    {calculationB && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="uk-eyebrow">{WB_LABELS.konstruktorBKonfidens[locale]}</span>
                        <InfoPopover label={WB_LABELS.konstruktorKonfidens[locale]}><p>{WB_LABELS.konstruktorKonfidensPopover[locale]}</p></InfoPopover>
                        <Badge status={CONFIDENCE_TONES[calculationB.confidence]}>{calculationB.confidence}</Badge>
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
                    <div className="uk-card__title">{WB_LABELS.konstruktorBUavhengig[locale]}</div>
                    <span style={{ fontSize: 11, color: "var(--fg-muted)", fontStyle: "italic" }}>
                      {WB_LABELS.loysteOppgavaUtan[locale]}
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
                          {WB_LABELS.konstruktorBKonklusjon[locale]}
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
                          {WB_LABELS.konstruktorBResultat[locale]}
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
                    <div className="uk-card__title">{WB_LABELS.samanliknarSkilnader[locale]}</div>
                    <Badge status={MATCH_STATUS_TONES[comparison.match_status]}>
                      {matchStatusLabel(comparison.match_status, locale)}
                    </Badge>
                  </div>
                  <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {comparison.numeric_differences?.length > 0 && (
                      <div>
                        <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
                          {WB_LABELS.numeriskeSkilnader[locale]}
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {[WB_LABELS.tabellFelt[locale], "Konstruktør A", "Konstruktør B", WB_LABELS.tabellSkilnad[locale], WB_LABELS.tabellAlvor[locale]].map((h) => (
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
                          {WB_LABELS.metodiskeSkilnader[locale]}
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
                          {WB_LABELS.forskjellarForesetnader[locale]}
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
                          ⚠ {WB_LABELS.internInkonsistens[locale]}
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
                      {WB_LABELS.resultatetForebels[locale]}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setPhase("workbench")} className="uk-btn">
                        {WB_LABELS.tilbake[locale]}
                      </button>
                      {currentRunId && calculationA && calculationB && (
                        <a href={`/rapport/${currentRunId}`} className="uk-btn uk-btn--primary" onClick={saveStateToSession}>
                          {WB_LABELS.generRapport[locale]}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Flytande scroll-hint — viser når Tolkar er ferdig men "Start berekning"-
            CTA-en er under viewport. Klikk for smooth-scroll til CTA. */}
        {showScrollHint && (
          <button type="button" onClick={() => startBerekningRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} className="uk-scroll-hint" aria-label={WB_LABELS.scrollTilStart[locale]}>
            <span>{WB_LABELS.klarTilStart[locale]}</span>
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>↓</span>
          </button>
        )}
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

function StatusKV({ label, tone, value, explanation }: { label: string; tone: Tone; value: string; explanation?: string }) {
  return (
    <div className="uk-status-kv">
      <span>
        {label}
        {explanation && (<InfoPopover label={label}><p>{explanation}</p></InfoPopover>)}
      </span>
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
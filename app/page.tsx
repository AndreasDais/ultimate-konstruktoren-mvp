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
  filopplastingP2Post: { nb: ". Pilar leser filen og henter ut tekst, tall og kontekst.", nn: ". Pilar les fila og hentar ut tekst, tal og kontekst." },
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
  inputstatus: { nb: "Status", nn: "Status" },
  inputstatusExplanation: { nb: "Pilar si vurdering av hvor klar oppgaven er til å beregnes. 'Klar' = all info på plass. 'Delvis klar' = Pilar har gjort rimelige antakelser (synlig ovenfor) som du kan justere før du starter. Andre statuser trenger mer input eller faller utenfor pilot-versjonen.", nn: "Pilar si vurdering av kor klar oppgåva er til å reknast. 'Klar' = all info på plass. 'Delvis klar' = Pilar har gjort rimelege antakingar (synleg ovanfor) som du kan justere før du startar. Andre statusar treng meir input eller fell utanfor pilot-versjonen." },
  fagomraade: { nb: "Fagområde", nn: "Fagområde" },
  // Status-banner (#02) — detail-tekstar per status-tilstand. {n} blir erstatta med antal.
  bannerKlarDetail: { nb: "alle {n} kontroller går", nn: "alle {n} kontrollar går" },
  bannerDelvisDetail: { nb: "{n} element mangler input", nn: "{n} element manglar input" },
  bannerMangelfullDetail: { nb: "{n} felt må fylles før beregning", nn: "{n} felt må fyllast før berekning" },
  bannerIkkjeStottaDetail: { nb: "ikke støttet i pilot-versjonen", nn: "ikkje støtta i pilot-versjonen" },
  bannerAvvistDetail: { nb: "ikke byggfaglig oppgave", nn: "ikkje byggfagleg oppgåve" },
  bannerUklartDetail: { nb: "Pilar trenger mer kontekst", nn: "Pilar treng meir kontekst" },
  lavTillit: { nb: "Lav tillit i tolkningen — sjekk verdiene under før du starter", nn: "Låg tillit i tolkinga — sjekk verdiane under før du startar" },
  // Tolkning-disclosure (#01) — toggle for å vise/skjule full tolkning
  visFullTolkning: { nb: "Vis full tolkning og tolkede verdier", nn: "Vis full tolkning og tolkede verdiar" },
  skjulFullTolkning: { nb: "Skjul full tolkning", nn: "Skjul full tolkning" },
  // Mangelfull-chips (#03) — chip-stripe rett under input
  tolkarTreng: { nb: "Pilar trenger {n} felt til — klikk for å sette inn", nn: "Pilar treng {n} felt til — klikk for å setje inn" },
  tolkarTrengAvvist: { nb: "Pilar avviste oppgaven — se forklaring under", nn: "Pilar avviste oppgåva — sjå forklaring under" },
  startMedMangler: { nb: "Start beregning · {n} antakelser brukt", nn: "Start berekning · {n} antakingar brukte" },
  // Fil-upload + AI-disclaimer (#06)
  lastOppStottefil: { nb: "+ Last opp støttefil", nn: "+ Last opp støttefil" },
  filFormatHint: { nb: "PDF, PNG, DOCX — Pilar ser oppgaven og vedlegget saman.", nn: "PDF, PNG, DOCX — Pilar ser oppgåva og vedlegget saman." },
  aiDisclaimerKort: { nb: "AI-generert · krever faglig kontroll", nn: "AI-generert · krev fagleg kontroll" },
  // Eksempel-kollaps (#07) — etter første Tolk vert eksempla kollapsa til lenke
  seEksempel: { nb: "▸ Se 3 eksempel", nn: "▸ Sjå 3 eksempel" },
  // Første-gongs-guide (#09) — éi-setnings forklaring, dismissable, persistert i localStorage
  forsteGongGuide: {
    nb: "Workbench er steg 1 av 3. Skriv inn hva du vil beregne — Pilar leser og viser deg hva den forstod, så du kan rette opp før beregningen starter.",
    nn: "Workbench er steg 1 av 3. Skriv kva du vil rekne ut — Pilar les og viser kva den forstod, så du kan rette opp før berekninga startar.",
  },
  forsteGongDismiss: { nb: "Skjul", nn: "Skjul" },
  // Mobil-tabs (#08) — vises berre under 720px viewport
  tabResultat: { nb: "Resultat", nn: "Resultat" },
  tabTolkning: { nb: "Tolkning", nn: "Tolkning" },
  tabStatus: { nb: "Status", nn: "Status" },
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
      description: "Skriv inn forespørselen. Pilar leser og viser tolkningen her — du kan redigere og tolke på nytt før du starter beregningen.",
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
      description: "Skriv inn forespørselen. Pilar les og viser tolkinga her — du kan redigere og tolke på nytt før du startar berekninga.",
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
    relevant_ikkje_stotta: "Forespørselen er byggfaglig relevant, men ligger utenfor det Pilar støtter ennå (typisk brann, dynamikk, seismisk eller geoteknisk dimensjonering). Prøv en annen formulering eller en annen beregningstype.",
    uklart: "Forespørselen er for vag til å tolke trygt. Rediger forespørselen og tolk på nytt med mer konkret informasjon om geometri, last og materiale.",
    no_kalkulator: "Ingen beregning er mulig med oppgitt informasjon. Rediger forespørselen og legg til manglende data.",
  },
  nn: {
    avvist: "Inputen er ikkje byggfagleg. Berekning kan ikkje startast.",
    relevant_ikkje_stotta: "Forespurnaden er byggfagleg relevant, men ligg utanfor det Pilar støttar enno (typisk brann, dynamikk, seismisk eller geoteknisk dimensjonering). Prøv ei anna formulering eller ein annan berekningstype.",
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
  // re-kollapse om brukar manuelt utvidar igjen.
  const [examplesCollapsed, setExamplesCollapsed] = useState(false);
  const hasAutoCollapsedRef = useRef(false);

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
const statusCardRef = useRef<HTMLDivElement | null>(null);

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

  // Eksempel-kollaps (#07): når Tolkar gir første gangs resultat, kollaps
  // eksempel-chips. Ref-flagg hindrar at vi re-kollapsar om brukar manuelt
  // utvidar igjen og deretter Tolk-ar på nytt (respekterer brukar-val).
  useEffect(() => {
    if (result !== null && !hasAutoCollapsedRef.current) {
      setExamplesCollapsed(true);
      hasAutoCollapsedRef.current = true;
    }
  }, [result]);

  // Første-gongs-guide (#09): på mount, sjekk om brukar har sett guiden før.
  // Om ikkje, vis han. Vi gjer dette i useEffect (ikkje initial state) for å
  // unngå SSR-mismatch — localStorage er klient-berre.
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

  // Auto-switch tab basert på Tolkar-status (#08):
  // - MANGELFULL → "resultat" så studenten ser kva som kan/ikkje kan
  //   beregnes (sjølv om chips er over tab-en, gir det kontekst)
  // - AVVIST / UKLART → "status" så feilmeldinga er synleg
  // - KLAR / DELVIS_KLAR → "status" som default (men brukar kan bytte)
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
  // resultat. Slik unngår vi spell av tokens når brukar berre vil sjå rapport
  // på nytt, men startar fersk når input/Tolkar-resultat har endra seg.
  const handleBackToWorkbench = () => {
    setRestoredFrom(null);
    setError(null);
    setPhase("workbench");
  };

  // Mangelfull-chips (#03): set inn ein mal-tekst i textarea-en når brukar
  // klikkar på ein chip. Studenten må sjølv erstatte [verdi?] før Tolk køyrer.
  // Vi tek berre "nøkkelen" frå Tolkar sitt manglande-felt (alt før første "(")
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
    // tidlegare sjekk var berre `calculationA && currentRunId`, som førte til
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
      // Begge agentar streamar samtidig. onComplete setter calculationA/B
      // i state — useEffect under Promise.all triggar deretter Sammenligner+
      // Kontrollør-pipeline. Om éin agent feilar, viser MissionControl
      // retry-UI og brukar kan re-prøve den agenten åleine.
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
      // viser MissionControl retry-UI og brukar kan re-prøve. Sammenligner +
      // Kontrollør-pipeline blir trigga av useEffect under når BÅDE
      // calculationA OG calculationB er sett (anten frå original køyring
      // eller etter retry).
      //
      // Om begge feilar samtidig: ingen useEffect-trigger, brukar kan retry
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
  // Når brukar går tilbake til Workbench og klikkar Start beregning UTAN
  // å endre input eller Tolkar-resultat, skal vi hoppe rett til rapport-
  // visning av den eksisterande beregninga i staden for å bruke tokens på
  // ein identisk re-køyring. Sjekkast i handleStartCalculation før init-run.
  const lastCompletedRef = useRef<{
    input: string;
    resultHash: string;
    runId: string;
  } | null>(null);

  // Sammenligner + Kontrollør-pipeline (#2): trigga automatisk når begge
  // konstruktørar har levert resultat. Dette gjer retry-flyten transparent
  // — brukar klikkar "Prøv på nytt" → den agenten re-køyrer → setCalculation
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
        // STEG 2: Samanliknar
        const responseC = await fetch("/api/agent-c", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            run_id: currentRunId,
            agent_a_output: calculationA,
            agent_b_output: calculationB,
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

        // STEG 3: Kontrolløren
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
          }),
        });
        const dataD = await responseD.json();
        if (!responseD.ok) {
          console.error("Kontrollør feila:", dataD.error);
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
  }, [phase, calculationA, calculationB, comparison, currentRunId, result, locale]);

  // Retry-handler (#2): re-køyrer berre den feila agenten utan å røre den
  // andre. Når retry fullfører OG partner er complete, vil useEffect-en
  // over automatisk trigge Sammenligner+Kontrollør-pipeline.
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
    const body = { run_id: currentRunId, input_review: result, locale };
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

  const pageHeader = PHASE_HEADERS[locale][phase];

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
              {/* Første-gongs-guide (#09) — éi-setnings forklaring av kva
                  Workbench er. Synleg berre første gong studenten besøker
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

                    {/* === Mobil-tabs (#08) — viste berre på viewport < 720px ===
                        Segmentert tab-kontroll med count/state-badges.
                        Klikk byter aktiv tab; auto-switch basert på status. */}
                    {isMobile && result && (() => {
                      const nKanReknast = result.kan_reknast_no?.length ?? 0;
                      const nKanIkkje = result.kan_ikkje_reknast?.length ?? 0;
                      const nResultat = nKanReknast + nKanIkkje;
                      const nTolkte = Object.keys(result.tolkte_verdiar || {}).length;
                      const statusBadge = inputStatusLabel(result.status, locale);
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
                                {inputStatusLabel(result.status, locale)}
                              </Badge>
                            </div>
                          }
                        >
                          {getBannerDetail(result, locale)}
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
                                medan vi ventar på første delta frå Tolkar. */}
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
                                Blinkande markør (animasjon b) på slutten medan typing/streaming. */}
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
                                    />
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
                      <button onClick={handleBackToWorkbench} className="uk-btn">
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

        {/* Sticky CTA-bar (#05) — synleg når Start beregning-CTA er under
            viewport. Inneheld den faktiske Start beregning-knappen, slik at
            studenten ikkje må scrolle for å handle. Erstattar tidlegare
            flytande "Klar"-pille som berre var ein scroll-hint. */}
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

// Bygg detail-tekst for status-banneret (#02) basert på Tolkar-resultat.
// Returnerer ein streng som vises i banner-body, t.d.:
//   "Stål · alle 13 kontroller går"
//   "Stål · 2 element mangler input"
//   "6 felt må fylles før beregning"
function getBannerDetail(result: AgentResult, locale: Locale): string {
  const nMangler = result.manglande_verdiar?.length ?? 0;
  const nKanReknast = result.kan_reknast_no?.length ?? 0;
  // Capitaliser fagområde-første-bokstav slik at "stål" → "Stål" i banner.
  // Tolkar emittar lowercase, men i UI vil vi ha proper case.
  const fag = result.fagomraade
    ? result.fagomraade.charAt(0).toUpperCase() + result.fagomraade.slice(1)
    : undefined;
  const parts: string[] = [];
  if (fag) parts.push(fag);

  switch (result.status) {
    case "klar":
      parts.push(WB_LABELS.bannerKlarDetail[locale].replace("{n}", String(nKanReknast)));
      break;
    case "delvis_klar":
      parts.push(WB_LABELS.bannerDelvisDetail[locale].replace("{n}", String(nMangler)));
      break;
    case "mangelfull":
      // Hopp over fag — for mangelfull har vi lite info, tal er hovudsaken
      return WB_LABELS.bannerMangelfullDetail[locale].replace("{n}", String(nMangler));
    case "relevant_ikkje_stotta":
      parts.push(WB_LABELS.bannerIkkjeStottaDetail[locale]);
      break;
    case "avvist":
      return WB_LABELS.bannerAvvistDetail[locale];
    case "uklart":
    case "uklar":
      return WB_LABELS.bannerUklartDetail[locale];
  }

  return parts.join(" · ");
}

// === Tolkede verdiar grid (#04) ===
// Kategoriserer Tolkar sine tolka verdiar etter byggfagleg konsept og
// rendrar dei i grupperte sub-grids i staden for ein flat mono-liste.
// Visuell mål: studenten skal kunne SKANNE for å bekrefte at Tolkar
// forstod rett, i staden for å lese 20 linjer monospace.

type ValueCategory =
  | "profile_material"
  | "geometry"
  | "loads"
  | "load_combinations"
  | "material_props"
  | "section_props"
  | "stability"
  | "serviceability"
  | "other";

const CATEGORY_ORDER: ValueCategory[] = [
  "profile_material",
  "geometry",
  "loads",
  "load_combinations",
  "material_props",
  "section_props",
  "stability",
  "serviceability",
  "other",
];

const CATEGORY_LABELS: Record<ValueCategory, Record<Locale, string>> = {
  profile_material: { nb: "Profil & material", nn: "Profil & material" },
  geometry: { nb: "Geometri & opplegg", nn: "Geometri & opplegg" },
  loads: { nb: "Laster", nn: "Laster" },
  load_combinations: { nb: "Lastkombinasjoner", nn: "Lastkombinasjonar" },
  material_props: { nb: "Materialkonstanter", nn: "Materialkonstantar" },
  section_props: { nb: "Tverrsnittsdata", nn: "Tverrsnittsdata" },
  stability: { nb: "Knekk-parametre", nn: "Knekk-parametrar" },
  serviceability: { nb: "Bruksgrense (SLS)", nn: "Bruksgrense (SLS)" },
  other: { nb: "Andre", nn: "Andre" },
};

// Plasserer ein tolka verdi i ein kategori basert på nøkkel-mønster.
// Rekkjefølga matterar: meir spesifikke mønster må kome før breiare.
// Robust mot både norsk/engelsk variantar og symbol-baserte nøklar.
function categorizeKey(key: string): ValueCategory {
  const k = key.toLowerCase().trim();

  // 1. Profil & material — eksplisitte ordmønster
  if (/^(profil|stålkvalitet|stalkvalitet|betongkvalitet|treklasse|tverrsnittklasse|materiale?|armering|fagomr[aå]de)/.test(k)) {
    return "profile_material";
  }

  // 2. Stabilitet / knekking — spesifikke LTB-symbol (må komme før geometri pga L_LT)
  if (/^(alpha_lt|α_lt|chi_lt|χ_lt|lambda_lt|λ_lt|phi_lt|φ_lt|vippekurve|k_lt|k_w|knekkurve|eulerlast|imperfeksjon)/.test(k)) {
    return "stability";
  }

  // 3. Tverrsnittsdata — treghetsmoment, motstandsmoment, areal
  if (/^(w_pl|w_el|i_y|i_z|i_t|i_w|a_v|a_s|i_min|i_max|s_pl|t_w|t_f|h_w|b_f)/.test(k) || k === "a") {
    return "section_props";
  }

  // 4. Materialkonstantar — fastleik, stivleik, partial-faktorar
  if (/^(f_y|f_c|f_ct|gamma_m|gamma_c|gamma_s|alpha_cc|alpha_e|epsilon)/.test(k) || k === "e" || k === "g") {
    return "material_props";
  }

  // 5. Lastkombinasjonar
  if (/kombinasjon|kombo|psi_|ψ_|gamma_g|gamma_q|γ_g|γ_q/.test(k)) {
    return "load_combinations";
  }

  // 6. Laster
  if (/^(g_|q_|p_|w_k)/.test(k) || /^(last|sn[øo]last|vindlast|nyttelast|egenlast)/.test(k) || /^[gqp]$/.test(k)) {
    return "loads";
  }

  // 7. Bruksgrense
  if (/nedb[oø]ying|w_max|w_lim|w_kar|w_hyppig|w_perm|tillatt_nedb/.test(k)) {
    return "serviceability";
  }

  // 8. Geometri — lengder, dimensjonar, opplegg
  if (/^(l$|l_|h$|b$|d$|h_|b_|d_|span|spennvidde|knekklengde|oppleggs|sideavstiving|geometri|skive)/.test(k)) {
    return "geometry";
  }

  return "other";
}

// Tekniske symbol-namn (med underscore) skal behaldast som-er — det er
// fagleg konvensjon at f_y, g_k, alpha_LT, ULS_kombinasjon skrivast med
// liten første-bokstav. Reint deskriptive ord (bygningstype, oppleggstilhøve)
// får stor første-bokstav for lesbarheit.
function formatKey(key: string): string {
  if (key.includes("_")) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function TolkteVerdiarGrid({
  values,
  locale,
}: {
  values: Record<string, string>;
  locale: Locale;
}) {
  if (!values || Object.keys(values).length === 0) return null;

  // Gruppér etter kategori, behaldande original innsetjings-rekkjefølge per gruppe
  const grouped = new Map<ValueCategory, Array<[string, string]>>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const [k, v] of Object.entries(values)) {
    const cat = categorizeKey(k);
    grouped.get(cat)!.push([k, v]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat)!;
        if (items.length === 0) return null;

        return (
          <div key={cat}>
            <div
              className="uk-eyebrow"
              style={{ marginBottom: 6, fontSize: 10, opacity: 0.75 }}
            >
              {CATEGORY_LABELS[cat][locale]}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(100px, max-content) 1fr",
                gap: "3px 16px",
                fontSize: 12.5,
                alignItems: "baseline",
              }}
            >
              {items.map(([k, v]) => (
                <Fragment key={k}>
                  <span className="uk-mono" style={{ color: "var(--fg-2)" }}>
                    {formatKey(k)}
                  </span>
                  <span className="uk-mono">{v}</span>
                </Fragment>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// MissingChipStrip (#03) — synleg under input når Tolkar har funne
// manglande verdiar. Klikk → mal blir lagt til i textarea via callback.
// Visuell tone: gulaktig "Tolkar treng meir input"-stripe (warn-tone).
// StreamingProse — typewriter-effekt for Tolkar si oppsummering.
// partial-JSON-parser oppdaterer felt-verdien som heilskap når den er
// "complete" i strømmen, så frontend gradvis avslører teksten i tikk
// av ~2 teikn per 20ms (≈100 chars/sec) for å skape "AI skriv"-kjensla.
//
// Når isStreaming = false, viser full tekst med ein gong (catch-up).
// Når tekst-len < displayed.len, antar vi ny stream og resettar.
function StreamingProse({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    // Ny stream eller reset: tekst kortare enn det vi viser
    if (text.length < displayed.length) {
      setDisplayed("");
      return;
    }

    // Initial mount med ferdig-strøm (resume-flyt): vis alt umiddelbart
    // utan typewriter. Sjekk på displayed.length === 0 sikrar at vi berre
    // hopper når komponenten nettopp er mounta — ikkje når strømmen
    // avsluttar mid-typewriter (då skal animasjonen køyre ferdig).
    if (displayed.length === 0 && !isStreaming) {
      setDisplayed(text);
      return;
    }

    // Innhenta: vent på meir frå strømmen (eller idle om strøm ferdig)
    if (displayed.length >= text.length) {
      return;
    }

    // Type-tikk: avslør 1 teikn til. 14ms gir ~71 chars/sec og glatt
    // visuell rørsle (mindre sprell per frame enn 2 teikn). Køyrer
    // uavhengig av isStreaming — typewriter blir aldri kutta mid-skriving.
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, Math.min(displayed.length + 1, text.length)));
    }, 14);
    return () => clearTimeout(timer);
  }, [text, displayed, isStreaming]);

  const isTyping = displayed.length < text.length;
  const showCursor = isStreaming || isTyping;

  return (
    <p
      style={{
        margin: 0,
        color: "var(--fg-2)",
        lineHeight: 1.55,
        fontSize: 13,
      }}
    >
      {displayed}
      {showCursor && <span className="pilar-cursor" aria-hidden />}
    </p>
  );
}

function MissingChipStrip({
  fields,
  locale,
  onChipClick,
}: {
  fields: string[];
  locale: Locale;
  onChipClick: (fieldText: string) => void;
}) {
  if (!fields || fields.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={WB_LABELS.tolkarTreng[locale].replace("{n}", String(fields.length))}
      className="pilar-block-appear"
      style={{
        marginTop: 12,
        padding: "12px 14px",
        background: "var(--tone-warn-bg, rgba(202, 138, 4, 0.06))",
        border: "1px solid var(--tone-warn-border, rgba(202, 138, 4, 0.25))",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: "var(--tone-warn-fg, #92400E)",
          fontWeight: 500,
        }}
      >
        {WB_LABELS.tolkarTreng[locale].replace("{n}", String(fields.length))}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {fields.map((field) => {
          // Vis berre nøkkel-delen før "(...)" som chip-label for kompakthet
          const parenIdx = field.indexOf("(");
          const label = (parenIdx > 0 ? field.slice(0, parenIdx) : field).trim();
          return (
            <button
              key={field}
              type="button"
              onClick={() => onChipClick(field)}
              title={field}
              style={{
                padding: "6px 12px",
                fontSize: 12.5,
                background: "var(--surface, #fff)",
                border: "1px solid var(--tone-warn-border, rgba(202, 138, 4, 0.3))",
                borderRadius: 999,
                cursor: "pointer",
                color: "var(--fg, #1F2937)",
                fontFamily: "var(--font-sans, inherit)",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--tone-warn-bg, rgba(202, 138, 4, 0.1))";
                e.currentTarget.style.borderColor = "var(--tone-warn-fg, #92400E)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface, #fff)";
                e.currentTarget.style.borderColor = "var(--tone-warn-border, rgba(202, 138, 4, 0.3))";
              }}
            >
              + {label}
            </button>
          );
        })}
      </div>
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
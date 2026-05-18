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

// === Visningsprofil (#03) ===
// Smart default-tilstand for Resultat-sida basert på agent-output. Avgjer
// kva blokker som er utvida/kollapsa når studenten landar på sida.
// Pilot-bruk: tre profilar, ingen finkorna gradering — målet er at default
// skal spegle "kva som krev merksemd", ikkje vere lik for alle oppgåver.
type Profile = "trygg" | "standard" | "krev_gjennomgang";

// Reknar ut profil frå Kontrollør sin avgjerd × Sammenligner sin match_status
// × tal-steg × advarsler. Returnerer "standard" som trygg fallback.
function computeProfile(
  controllerDecision: ControllerDecision | null,
  comparison: ComparisonResult | null,
  calculationA: CalculationResult | null,
): Profile {
  // Krev gjennomgang — uakseptabelt risiko-nivå eller usemje mellom A og B
  if (
    comparison?.match_status === "significant_differences" ||
    comparison?.match_status === "critical_disagreement" ||
    controllerDecision?.decision_status === "uncertain" ||
    controllerDecision?.decision_status === "rejected" ||
    controllerDecision?.risk_level === "high"
  ) {
    return "krev_gjennomgang";
  }

  // Trygg — alt går smerteFritt, oppgåva er enkel
  const warningsCount = calculationA?.warnings?.length ?? 0;
  const stepsCount = calculationA?.calculation_steps?.length ?? 0;
  if (
    comparison?.match_status === "match" &&
    warningsCount === 0 &&
    stepsCount <= 4 &&
    controllerDecision?.decision_status === "approved" &&
    controllerDecision?.risk_level !== "medium"
  ) {
    return "trygg";
  }

  // Standard — alt anna (vanlegaste tilfellet)
  return "standard";
}

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
  visMellomledd: { nb: "Vis {n} mellomledd", nn: "Sjå {n} mellomledd" },
  skjulMellomledd: { nb: "Skjul mellomledd", nn: "Skjul mellomledd" },
  foresetnaderBrukt: { nb: "Forutsetninger brukt", nn: "Føresetnader brukt" },
  stegvisUtrekning: { nb: "Stegvis utregning", nn: "Stegvis utrekning" },
  // Stegvis view-toggle (#08)
  stegvisBerreFormel: { nb: "Bare formlene", nn: "Berre formlane" },
  stegvisAlleSteg: { nb: "Alle steg", nn: "Alle steg" },
  stegvisGaaTilSteg: { nb: "Gå til steg", nn: "Gå til steg" },
  kvaErIkkjeRekna: { nb: "Hva er ikke beregnet", nn: "Kva er ikkje rekna" },
  atvaringar: { nb: "Advarsler", nn: "Åtvaringar" },
  // Konfidens-card
  konstruktorAKonfidens: { nb: "Konstruktør A konfidens", nn: "Konstruktør A konfidens" },
  konstruktorBKonfidens: { nb: "Konstruktør B konfidens", nn: "Konstruktør B konfidens" },
  konstruktorKonfidens: { nb: "Konstruktør-konfidens", nn: "Konstruktør-konfidens" },
  konstruktorKonfidensPopover: { nb: "Konstruktørens egenrapporterte sikkerhet på eget svar (high/medium/low). Ikke det samme som Tillit-skåren — måler bare én agents tillit til seg selv.", nn: "Konstruktøren si eigenrapporterte sikkerheit på eige svar (high/medium/low). Ikkje det same som Tillit-skåren — målar berre éin agent sin tillit til seg sjølv." },
  // Per-nivå forklaringar for konfidens-chips (#09)
  konfidensHighA: {
    nb: "Konstruktør A rapporterer HIGH-konfidens: metoden er etablert, alle nødvendige input er gitt, og resultatet er konsistent gjennom utregningen. Egenvurdering — ikke en uavhengig verifikasjon.",
    nn: "Konstruktør A rapporterer HIGH-konfidens: metoden er etablert, alle naudsynte input er gitt, og resultatet er konsistent gjennom utrekninga. Eigenvurdering — ikkje ei uavhengig verifisering.",
  },
  konfidensHighB: {
    nb: "Konstruktør B rapporterer HIGH-konfidens på sin uavhengige løsning. B løste oppgaven uten å se A sitt svar. HIGH her betyr at B er trygg på egen metode — at A og B er enige er en separat sjekk (se verdikt over).",
    nn: "Konstruktør B rapporterer HIGH-konfidens på si uavhengige løysing. B løyste oppgåva utan å sjå A sitt svar. HIGH her tyder at B er trygg på eigen metode — at A og B er samde er ein separat sjekk (sjå verdikt over).",
  },
  konfidensMediumA: {
    nb: "Konstruktør A rapporterer MEDIUM-konfidens: metoden er korrekt, men en eller flere input er antatt eller ekstrapolert. Sjekk forutsetningene før du stoler på resultatet.",
    nn: "Konstruktør A rapporterer MEDIUM-konfidens: metoden er korrekt, men ein eller fleire input er antatt eller ekstrapolert. Sjekk føresetnadene før du stolar på resultatet.",
  },
  konfidensMediumB: {
    nb: "Konstruktør B rapporterer MEDIUM-konfidens: B løste oppgaven, men minst én forutsetning er usikker. Se forutsetningene i Konstruktør B-blokka.",
    nn: "Konstruktør B rapporterer MEDIUM-konfidens: B løyste oppgåva, men minst éin føresetnad er usikker. Sjå føresetnadene i Konstruktør B-blokka.",
  },
  konfidensLowA: {
    nb: "Konstruktør A rapporterer LOW-konfidens: vesentlig usikkerhet i metode eller input. Resultatet bør ikke brukes uten manuell verifikasjon — start gjerne på nytt med mer presise inndata.",
    nn: "Konstruktør A rapporterer LOW-konfidens: vesentleg usikkerheit i metode eller input. Resultatet bør ikkje brukast utan manuell verifisering — start gjerne på nytt med meir presise inndata.",
  },
  konfidensLowB: {
    nb: "Konstruktør B rapporterer LOW-konfidens på egen løsning. B er usikker på metode eller input. Manuell faglig kontroll anbefales sterkt.",
    nn: "Konstruktør B rapporterer LOW-konfidens på eiga løysing. B er usikker på metode eller input. Manuell fagleg kontroll vert sterkt anbefalt.",
  },
  // Konstruktør B-panel
  konstruktorBUavhengig: { nb: "Konstruktør B — uavhengig kontroll", nn: "Konstruktør B — uavhengig kontroll" },
  loysteOppgavaUtan: { nb: "Løste oppgaven uten å se Konstruktør A sitt svar", nn: "Løyste oppgåva utan å sjå Konstruktør A sitt svar" },
  konstruktorBKonklusjon: { nb: "Konstruktør B sin konklusjon", nn: "Konstruktør B sin konklusjon" },
  konstruktorBResultat: { nb: "Konstruktør B sine resultater", nn: "Konstruktør B sine resultat" },
  // Kontrollør-kort (#02) — verdikt-setningar per match_status og toggle-labels
  verdiktMatch: {
    nb: "Konstruktør A og B er fullstendig enige om alle dimensjonerende verdier.",
    nn: "Konstruktør A og B er fullstendig samde om alle dimensjonerande verdiar.",
  },
  verdiktMinor: {
    nb: "Konstruktør A og B har små forskjeller — ingen kritiske avvik.",
    nn: "Konstruktør A og B har små skilnader — ingen kritiske avvik.",
  },
  verdiktSignificant: {
    nb: "Konstruktør A og B har vesentlige avvik på dimensjonerende verdier.",
    nn: "Konstruktør A og B har vesentlege avvik på dimensjonerande verdiar.",
  },
  verdiktCritical: {
    nb: "Konstruktør A og B er ikke enige — manuell gjennomgang trengs.",
    nn: "Konstruktør A og B er ikkje samde — manuell gjennomgang trengst.",
  },
  fagligMerknad: { nb: "Faglig merknad", nn: "Fagleg merknad" },
  // Grupper-overskrifter for fag-chips (delt frå #lettlese5)
  fagligGruppeMetode: { nb: "Metode", nn: "Metode" },
  fagligGruppeAntakelser: { nb: "Antakelser & advarsler", nn: "Antakingar & åtvaringar" },
  lesHeileVurderinga: { nb: "Les hele vurderingen fra Kontrolløren", nn: "Les heile vurderinga frå Kontrolløren" },
  skjulVurderinga: { nb: "Skjul vurderingen", nn: "Skjul vurderinga" },
  krevFagligGjennomgang: { nb: "Krever faglig gjennomgang", nn: "Krev fagleg gjennomgang" },
  // Sjølvkontroll-disclosure (#09) — viser internal_consistency_issues
  sjølvkontrollEtikett: { nb: "Selvkontroll", nn: "Sjølvkontroll" },
  sjølvkontrollIngen: { nb: "Ingen inkonsistenser funnet", nn: "Ingen inkonsistensar funne" },
  sjølvkontrollFunne: { nb: "{n} inkonsistens(er) funnet", nn: "{n} inkonsistens(ar) funne" },
  sjølvkontrollSkjul: { nb: "Skjul detaljer", nn: "Skjul detaljar" },
  // Visningsprofil-indikator (#03) — viser kva default-tilstand sida er i,
  // basert på agent-output. Ikkje klikkbar — kommunikasjon, ikkje kontroll.
  visningProfil: { nb: "Visning", nn: "Visning" },
  profilTrygg: { nb: "Trygg", nn: "Trygg" },
  profilStandard: { nb: "Standard", nn: "Standard" },
  profilKrevGjennomgang: { nb: "Krev gjennomgang", nn: "Krev gjennomgang" },
  profilForklaringTrygg: {
    nb: "Enig kontroll, ingen advarsler — siden viser kort hovedsvar.",
    nn: "Enig kontroll, ingen advarsler — sida viser kort hovudsvar.",
  },
  profilForklaringStandard: {
    nb: "Godkjent med advarsler — detaljer er kollapset, klikk for å utforske.",
    nn: "Godkjent med advarsler — detaljar er kollapsa, klikk for å utforske.",
  },
  profilForklaringKrev: {
    nb: "Vesentlige avvik — avvik-rader og merknader er pre-ekspandert.",
    nn: "Vesentlege avvik — avvik-rader og merknader er pre-ekspandert.",
  },
  // Konstruktør B-disclosure (#04) — éin-linjes summary i kollapsa state
  bUavhengigKontroll: { nb: "Konstruktør B — uavhengig kontroll", nn: "Konstruktør B — uavhengig kontroll" },
  bEnigeMedA: { nb: "ENIGE med A", nn: "ENIGE med A" },
  bMindreSkilnader: { nb: "Mindre forskjeller fra A", nn: "Mindre skilnader frå A" },
  bVesentlegAvvik: { nb: "Vesentlig avvik fra A", nn: "Vesentleg avvik frå A" },
  bKritiskUsemje: { nb: "Kritisk uenighet med A", nn: "Kritisk usemje med A" },
  bKonfidens: { nb: "konfidens", nn: "konfidens" },
  bUtanComparison: { nb: "ingen sammenligning tilgjengelig", nn: "inga samanlikning tilgjengeleg" },
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
  // Sammenligner ekspander-rad (#05)
  samanliknarKvifor: { nb: "Hvorfor:", nn: "Kvifor:" },
  samanliknarAVerdi: { nb: "Konstruktør A", nn: "Konstruktør A" },
  samanliknarBVerdi: { nb: "Konstruktør B", nn: "Konstruktør B" },
  generelleMerknader: { nb: "Generelle merknader fra Sammenligner", nn: "Generelle merknader frå Samanliknar" },
  skjulMerknader: { nb: "Skjul merknader", nn: "Skjul merknader" },
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

// === Dimensjonerande tiles (#01) ===
// Klassifiserer results-keys som "dimensjonerande" (det studenten skal
// verifisere før rapport) vs "mellomledd" (input + delsteg). Tre-stegs
// heuristikk: (1) per-oppgåvetype regex-allowlist, (2) universell
// output-pattern (prefiks/suffiks-konvensjon), (3) input-filter på dei
// første N keys, (4) fallback til dei første 3.
//
// MERK: Backend (Konstruktør A/B) har ikkje primary-flagg per key i
// pilot-skjema. Dette er klient-side heuristikk. Post-pilot bør
// structured_output utvidast med primary_keys: ["M_Ed", "V_Ed"] frå
// konstruktør-promptane så avgjerda flyttast til backend.

// Per-oppgåvetype regex-patterns. Fleire pattern matchar fleire keys, og
// resultatet returnerast i den rekkjefølga keys finst i results-objektet
// (slik at agenten styrer rekkefølga, men patterna styrer kva som passerar).
// MERK: Agentane brukar As_* (ikkje A_s_*) for armering-keys.
const DIMENSJONERANDE_PATTERNS: Record<string, RegExp[]> = {
  // Lastkombinasjonar (EC0) — alle Ed_ULS_* og Ed_SLS_* (kombo, psi0, hyppig, kvasi…)
  lastkombinasjon: [/^Ed_ULS/i, /^Ed_SLS/i, /^ULS_/i, /^SLS_/i],
  // Bjelke-lastverknad — moment og skjær (+ q_Ed som design-last)
  bjelke_lastverknad: [/^M_Ed$/, /^V_Ed$/, /^N_Ed$/, /^q_Ed$/],
  bjelke_moment_skjar: [/^M_Ed$/, /^V_Ed$/, /^N_Ed$/, /^q_Ed$/],
  bjelke: [/^M_Ed$/, /^V_Ed$/, /^N_Ed$/, /^q_Ed$/],
  lastverknad: [/^M_Ed$/, /^V_Ed$/, /^N_Ed$/, /^q_Ed$/],
  // Armering betongbjelke (EC2) — As_req er ferdig-svar, mu_Ed er utility-ratio
  armering_betongbjelke: [
    /^[Aa]_?s_(req|valgt|valt)$/,
    /^[Aa]_?s_(min|max)$/,
    /^mu_Ed$/,
    /^(mu|xi)_lim$/,
    /^M_Rd$/,
  ],
  armering_betong: [
    /^[Aa]_?s_(req|valgt|valt)$/,
    /^[Aa]_?s_(min|max)$/,
    /^mu_Ed$/,
    /^(mu|xi)_lim$/,
    /^M_Rd$/,
  ],
  armering: [
    /^[Aa]_?s_(req|valgt|valt)$/,
    /^[Aa]_?s_(min|max)$/,
    /^mu_Ed$/,
    /^(mu|xi)_lim$/,
    /^M_Rd$/,
  ],
  // Stålkapasitet (EC3)
  stalkapasitet: [/^N_Rd$/, /^M_Rd$/, /^V_Rd$/, /^.+_Rd$/],
  stal_kapasitet: [/^N_Rd$/, /^M_Rd$/, /^V_Rd$/, /^.+_Rd$/],
  kapasitet: [/^N_Rd$/, /^M_Rd$/, /^V_Rd$/, /^.+_Rd$/],
};

// STYRANDE_PATTERNS: keys som matchar desse skal hoistast til posisjon 0
// (= dark/store tile) etter at tile-keys er valde. Rekkefølga her er
// global prioritet på tvers av berekningstypar. Dette løyser problemet at
// agentane ikkje alltid legg det fagleg viktigaste først i results-objektet.
const STYRANDE_PATTERNS: RegExp[] = [
  // Lastkombinasjonar — ULS-styrende/dominerende
  /^Ed_ULS_(styrende|styrande|dominerende|dominerande|kombo)$/i,
  /^ULS_(styrende|styrande|dominerende|dominerande|kombo)$/i,
  // Bjelke — moment er styrande
  /^M_Ed$/,
  /^M_Rd$/,
  // Armering — kravd armering er svaret
  /^[Aa]_?s_req$/,
  /^[Aa]_?s_(valgt|valt)$/,
  // Stålkapasitet — utnyttingsgrad eller motstand
  /^utnytting/i,
  /^N_Rd$/,
  // Generelt: ein Ed_-prefiks kombinasjon (siste utveg)
  /^Ed_ULS/i,
];

// Universell output-pattern: keys som anten startar med output-prefiks
// (Ed_, Rd_, As_, A_s_) eller endar på output-suffiks (_Ed, _Rd, _req, _min …).
// Steg 2 i heuristikken — fangar ny berekningstype som ikkje er i allowlist.
const OUTPUT_PATTERN =
  /^(Ed_|Rd_|[Aa]_?s_|mu_Ed)|_(Ed|Rd|req|min|max|lim|valgt|valt|net|eff|kombo|tot|brukt|krit)$/i;

// Patterns for keys som er åpenbare input/intermediære: einskilde
// geometri-bokstavar (L, b, d, h), karakteristiske laster (G_k, Q_k, q_k),
// partial-faktorar (gamma_*, psi_*), greske faktorar (alpha, beta, xi, eta …),
// materialkonstantar (f_y, f_c, E). Brukast som siste utveg-filter.
const INPUT_PATTERNS: RegExp[] = [
  /^(L|b|d|h|t|s|a|z)([_$]|$)/, // geometri og lever-arm
  /^(G_k|Q_k|q_k|q_d|w_k|p_k|p_d)$/, // karakteristiske/design-laster
  /^(gamma|psi|chi|xi|eta|lambda|alpha|beta|epsilon|nu|mu|zeta|phi|rho|kappa)([_$]|$)/i, // greske faktorar (mu unntak: mu_Ed = output)
  /^(f_y|f_c|f_ct|E_|G_modulus)/, // materialkonstantar
  /^(profil|stalkvalitet|betongkvalitet|treklasse|tverrsnittklasse)/, // profil/material
];

function isInputKey(k: string): boolean {
  // Spesialhandsaming: mu_Ed er output sjølv om mu-prefiks ser ut som input
  if (/^mu_Ed$/i.test(k)) return false;
  return INPUT_PATTERNS.some((p) => p.test(k));
}

// Tile-label-mapping for dei vanlegaste keys — gir kortform-eyebrow
// (UPPERCASE, prikkdelt). Fallback: key.toUpperCase().replace("_", " · ").
// Inkluderer både kortform- (Ed_SLS_kvasi) og langform- (Ed_SLS_kvasi_permanent)
// agent-variantar fordi konstruktørane brukar begge.
const KEY_TILE_LABELS: Record<string, Record<Locale, string>> = {
  // Lastkombinasjonar — ULS (mest styrande)
  Ed_ULS_styrende: { nb: "ULS · STYRENDE", nn: "ULS · STYRANDE" },
  Ed_ULS_styrande: { nb: "ULS · STYRENDE", nn: "ULS · STYRANDE" },
  Ed_ULS_dominerende: { nb: "ULS · DOMINERENDE", nn: "ULS · DOMINERANDE" },
  Ed_ULS_dominerande: { nb: "ULS · DOMINERENDE", nn: "ULS · DOMINERANDE" },
  Ed_ULS_kombo: { nb: "ULS · KOMBINASJON", nn: "ULS · KOMBINASJON" },
  Ed_ULS_psi0: { nb: "ULS · ψ₀-KOMBINASJON", nn: "ULS · ψ₀-KOMBINASJON" },
  ULS_styrende: { nb: "ULS · STYRENDE", nn: "ULS · STYRANDE" },
  ULS_dominerende: { nb: "ULS · DOMINERENDE", nn: "ULS · DOMINERANDE" },
  // Lastkombinasjonar — SLS
  Ed_SLS_karakt: { nb: "SLS · KARAKT.", nn: "SLS · KARAKT." },
  Ed_SLS_karakteristisk: { nb: "SLS · KARAKT.", nn: "SLS · KARAKT." },
  Ed_SLS_hyppig: { nb: "SLS · HYPPIG", nn: "SLS · HYPPIG" },
  Ed_SLS_kvasi: { nb: "SLS · KVASI-PERM.", nn: "SLS · KVASI-PERM." },
  Ed_SLS_kvasi_permanent: { nb: "SLS · KVASI-PERM.", nn: "SLS · KVASI-PERM." },
  // Bjelke-lastverknad
  M_Ed: { nb: "MOMENT · M_Ed", nn: "MOMENT · M_Ed" },
  V_Ed: { nb: "SKJÆR · V_Ed", nn: "SKJÆR · V_Ed" },
  N_Ed: { nb: "AKSIAL · N_Ed", nn: "AKSIAL · N_Ed" },
  q_Ed: { nb: "DESIGN-LAST · q_Ed", nn: "DESIGN-LAST · q_Ed" },
  // Kapasitet
  N_Rd: { nb: "AKSIAL · N_Rd", nn: "AKSIAL · N_Rd" },
  M_Rd: { nb: "MOMENT · M_Rd", nn: "MOMENT · M_Rd" },
  V_Rd: { nb: "SKJÆR · V_Rd", nn: "SKJÆR · V_Rd" },
  // Armering — agentane brukar As_* (ikkje A_s_*)
  As_req: { nb: "ARMERING · KRAV", nn: "ARMERING · KRAV" },
  As_min: { nb: "ARMERING · MIN", nn: "ARMERING · MIN" },
  As_max: { nb: "ARMERING · MAX", nn: "ARMERING · MAX" },
  As_valgt: { nb: "ARMERING · VALGT", nn: "ARMERING · VALD" },
  As_valt: { nb: "ARMERING · VALT", nn: "ARMERING · VALT" },
  // Alternative skrivemåtar (legacy)
  A_s_req: { nb: "ARMERING · KRAV", nn: "ARMERING · KRAV" },
  A_s_min: { nb: "ARMERING · MIN", nn: "ARMERING · MIN" },
  A_s_valgt: { nb: "ARMERING · VALGT", nn: "ARMERING · VALD" },
  // Utnyttingsgrad og grenseverdiar
  mu_Ed: { nb: "μ · UTNYTTING", nn: "μ · UTNYTTING" },
  mu_lim: { nb: "μ · GRENSE", nn: "μ · GRENSE" },
  xi_lim: { nb: "ξ · GRENSE", nn: "ξ · GRENSE" },
  zeta_Ed: { nb: "ζ · UTNYTTING", nn: "ζ · UTNYTTING" },
};

// Per-key fagleg forklaring som vert vist når studenten klikkar på ein tile.
// Skreve som korte 2-3 setnings-forklaringar pedagogisk tilpassa NTNU-studentar
// (byggfag-bachelor/master nivå). Når key ikkje finst i mappinga, vert tile-en
// ikkje klikkbar (cursor default, ingen onClick-handler).
const KEY_TILE_DESCRIPTIONS: Record<string, Record<Locale, string>> = {
  // === Lastkombinasjonar (EC0, NS-EN 1990) ===
  Ed_ULS_styrende: {
    nb: "Dimensjonerende ULS-last i styrende kombinasjon. ULS (Ultimate Limit State) er bruddgrensetilstand — den lastkombinasjonen som gir størst påkjenning og som bæresystemet må motstå med tilstrekkelig sikkerhet. Beregnet etter EC0 ekv. 6.10 eller 6.10a/b.",
    nn: "Dimensjonerande ULS-last i styrande kombinasjon. ULS (Ultimate Limit State) er bruddgrensetilstand — den lastkombinasjonen som gir størst påkjenning og som bæresystemet må motstå med tilstrekkeleg tryggleik. Berekna etter EC0 ekv. 6.10 eller 6.10a/b.",
  },
  Ed_ULS_styrande: {
    nb: "Dimensjonerende ULS-last i styrende kombinasjon. ULS (Ultimate Limit State) er bruddgrensetilstand — den lastkombinasjonen som gir størst påkjenning og som bæresystemet må motstå med tilstrekkelig sikkerhet. Beregnet etter EC0 ekv. 6.10 eller 6.10a/b.",
    nn: "Dimensjonerande ULS-last i styrande kombinasjon. ULS (Ultimate Limit State) er bruddgrensetilstand — den lastkombinasjonen som gir størst påkjenning og som bæresystemet må motstå med tilstrekkeleg tryggleik. Berekna etter EC0 ekv. 6.10 eller 6.10a/b.",
  },
  Ed_ULS_dominerende: {
    nb: "Dimensjonerende ULS-last med dominerende variabel last (kategori-Q med faktor 1,5). Andre variable laster reduseres med ψ₀-faktor. Sammenligning mellom ulike Ed_ULS-kombinasjoner viser hvilken som er styrende.",
    nn: "Dimensjonerande ULS-last med dominerande variabel last (kategori-Q med faktor 1,5). Andre variable laster vert reduserte med ψ₀-faktor. Samanlikning mellom ulike Ed_ULS-kombinasjonar viser kva som er styrande.",
  },
  Ed_ULS_dominerande: {
    nb: "Dimensjonerende ULS-last med dominerende variabel last (kategori-Q med faktor 1,5). Andre variable laster reduseres med ψ₀-faktor. Sammenligning mellom ulike Ed_ULS-kombinasjoner viser hvilken som er styrende.",
    nn: "Dimensjonerande ULS-last med dominerande variabel last (kategori-Q med faktor 1,5). Andre variable laster vert reduserte med ψ₀-faktor. Samanlikning mellom ulike Ed_ULS-kombinasjonar viser kva som er styrande.",
  },
  Ed_ULS_kombo: {
    nb: "Dimensjonerende ULS-kombinasjon etter EC0. Brukes som referanse for sammenligning med alternative kombinasjoner (6.10a/b).",
    nn: "Dimensjonerande ULS-kombinasjon etter EC0. Brukast som referanse for samanlikning med alternative kombinasjonar (6.10a/b).",
  },
  Ed_ULS_psi0: {
    nb: "ULS-kombinasjon der den variable lasten reduseres med ψ₀-faktor (kombinasjonsverdi for samtidighet). Brukes når flere uavhengige variable laster opptrer samtidig, men ikke alle på samme tid.",
    nn: "ULS-kombinasjon der den variable lasten vert redusert med ψ₀-faktor (kombinasjonsverdi for samtidigheit). Brukast når fleire uavhengige variable laster opptrer samtidig, men ikkje alle på same tid.",
  },
  Ed_SLS_karakt: {
    nb: "SLS-karakteristisk kombinasjon (sjeldne, irreversible effekter). Brukes for nedbøyings-grenseverdier som ikke må overskrides — typisk L/250 for total nedbøyning, L/300 for langtid.",
    nn: "SLS-karakteristisk kombinasjon (sjeldne, irreversible effektar). Brukast for nedbøyings-grenseverdiar som ikkje må overskridast — typisk L/250 for total nedbøying, L/300 for langtid.",
  },
  Ed_SLS_karakteristisk: {
    nb: "SLS-karakteristisk kombinasjon (sjeldne, irreversible effekter). Brukes for nedbøyings-grenseverdier som ikke må overskrides — typisk L/250 for total nedbøyning, L/300 for langtid.",
    nn: "SLS-karakteristisk kombinasjon (sjeldne, irreversible effektar). Brukast for nedbøyings-grenseverdiar som ikkje må overskridast — typisk L/250 for total nedbøying, L/300 for langtid.",
  },
  Ed_SLS_hyppig: {
    nb: "SLS-hyppig kombinasjon (reversible effekter som opptrer ofte). Brukes for nedbøyings-vurderinger i daglig drift — komfort og brukbarhet under typiske bruksforhold.",
    nn: "SLS-hyppig kombinasjon (reversible effektar som opptrer ofte). Brukast for nedbøyings-vurderingar i dagleg drift — komfort og brukbarheit under typiske bruksforhold.",
  },
  Ed_SLS_kvasi: {
    nb: "SLS-kvasipermanent kombinasjon (langtids-effekter). Brukes for kryp og langtids-nedbøyning i betong — den lasten konstruksjonen bærer lengst tid. Typisk ψ₂ = 0,3 for kontorbygg.",
    nn: "SLS-kvasipermanent kombinasjon (langtids-effektar). Brukast for kryp og langtids-nedbøying i betong — den lasten konstruksjonen ber lengst tid. Typisk ψ₂ = 0,3 for kontorbygg.",
  },
  Ed_SLS_kvasi_permanent: {
    nb: "SLS-kvasipermanent kombinasjon (langtids-effekter). Brukes for kryp og langtids-nedbøyning i betong — den lasten konstruksjonen bærer lengst tid. Typisk ψ₂ = 0,3 for kontorbygg.",
    nn: "SLS-kvasipermanent kombinasjon (langtids-effektar). Brukast for kryp og langtids-nedbøying i betong — den lasten konstruksjonen ber lengst tid. Typisk ψ₂ = 0,3 for kontorbygg.",
  },
  // === Bjelke-lastverknad ===
  M_Ed: {
    nb: "Dimensjonerende moment i kritisk snitt etter ULS. Skal sammenlignes med kapasiteten M_Rd. For fritt opplagt bjelke med jevnt fordelt last: M_Ed = q_Ed · L²/8.",
    nn: "Dimensjonerande moment i kritisk snitt etter ULS. Skal samanliknast med kapasiteten M_Rd. For fritt opplagd bjelke med jamt fordelt last: M_Ed = q_Ed · L²/8.",
  },
  V_Ed: {
    nb: "Dimensjonerende skjær, typisk ved opplegg. Skal sammenlignes med skjærkapasitet V_Rd. For fritt opplagt bjelke: V_Ed = q_Ed · L/2.",
    nn: "Dimensjonerande skjær, typisk ved opplegg. Skal samanliknast med skjærkapasitet V_Rd. For fritt opplagd bjelke: V_Ed = q_Ed · L/2.",
  },
  N_Ed: {
    nb: "Dimensjonerende aksialkraft (trykk eller strekk). For søyler og strekkstaver. Skal sammenlignes med N_Rd. For trykkstaver inkluderer dette knekkpåvirkning via χ-faktor.",
    nn: "Dimensjonerande aksialkraft (trykk eller strekk). For søyler og strekkstaver. Skal samanliknast med N_Rd. For trykkstaver inkluderer dette knekkpåverknad via χ-faktor.",
  },
  q_Ed: {
    nb: "Dimensjonerende designlast per meter etter at karakteristiske laster er multiplisert med partialfaktorer. Forenklet: q_Ed = γ_G · g_k + γ_Q · q_k (1,35·G + 1,5·Q i ULS).",
    nn: "Dimensjonerande designlast per meter etter at karakteristiske laster er multiplisert med partialfaktorar. Forenkla: q_Ed = γ_G · g_k + γ_Q · q_k (1,35·G + 1,5·Q i ULS).",
  },
  // === Kapasitet ===
  M_Rd: {
    nb: "Momentkapasitet i tverrsnittet. For stål: M_Rd = W_pl · f_y / γ_M0 (plastisk). For betong: avhenger av tverrsnitt, materialkvalitet og armeringsmengde. Krav: M_Rd ≥ M_Ed.",
    nn: "Momentkapasitet i tverrsnittet. For stål: M_Rd = W_pl · f_y / γ_M0 (plastisk). For betong: avhenger av tverrsnitt, materialkvalitet og armeringsmengd. Krav: M_Rd ≥ M_Ed.",
  },
  V_Rd: {
    nb: "Skjærkapasitet i tverrsnittet. For stål: V_Rd = A_v · f_y / (γ_M0 · √3). For betong uten skjærarmering: V_Rd,c etter EC2 §6.2.2. Krav: V_Rd ≥ V_Ed.",
    nn: "Skjærkapasitet i tverrsnittet. For stål: V_Rd = A_v · f_y / (γ_M0 · √3). For betong utan skjærarmering: V_Rd,c etter EC2 §6.2.2. Krav: V_Rd ≥ V_Ed.",
  },
  N_Rd: {
    nb: "Aksialkapasitet i tverrsnittet. For sentrisk trykk: N_Rd = χ · A · f_y / γ_M1 (med knekk-reduksjon χ). For strekk: N_Rd = A · f_y / γ_M0. Krav: N_Rd ≥ N_Ed.",
    nn: "Aksialkapasitet i tverrsnittet. For sentrisk trykk: N_Rd = χ · A · f_y / γ_M1 (med knekk-reduksjon χ). For strekk: N_Rd = A · f_y / γ_M0. Krav: N_Rd ≥ N_Ed.",
  },
  // === Armering (EC2) ===
  As_req: {
    nb: "Nødvendig strekkarmering for å motstå dimensjonerende moment. Beregnet fra momentlikevekt med dimensjonerende materialdata. Skal være ≥ A_s,min og ≤ A_s,max. Velg standardprogram (t.d. 4ø16 = 804 mm²) som dekker dette.",
    nn: "Naudsynt strekkarmering for å motstå dimensjonerande moment. Berekna frå momentlikevekt med dimensjonerande materialdata. Skal vere ≥ A_s,min og ≤ A_s,max. Vel standardprogram (t.d. 4ø16 = 804 mm²) som dekker dette.",
  },
  A_s_req: {
    nb: "Nødvendig strekkarmering for å motstå dimensjonerende moment. Beregnet fra momentlikevekt med dimensjonerende materialdata. Skal være ≥ A_s,min og ≤ A_s,max. Velg standardprogram (t.d. 4ø16 = 804 mm²) som dekker dette.",
    nn: "Naudsynt strekkarmering for å motstå dimensjonerande moment. Berekna frå momentlikevekt med dimensjonerande materialdata. Skal vere ≥ A_s,min og ≤ A_s,max. Vel standardprogram (t.d. 4ø16 = 804 mm²) som dekker dette.",
  },
  As_min: {
    nb: "Minimumsarmering etter EC2 §9.2.1.1: A_s,min = max(0,26 · f_ctm/f_yk · b_t · d, 0,0013 · b_t · d). Sikrer duktil oppførsel ved rissdanning og hindrer sprø brudd.",
    nn: "Minimumsarmering etter EC2 §9.2.1.1: A_s,min = max(0,26 · f_ctm/f_yk · b_t · d, 0,0013 · b_t · d). Sikrar duktil oppførsel ved rissdanning og hindrar sprøtt brudd.",
  },
  A_s_min: {
    nb: "Minimumsarmering etter EC2 §9.2.1.1: A_s,min = max(0,26 · f_ctm/f_yk · b_t · d, 0,0013 · b_t · d). Sikrer duktil oppførsel ved rissdanning og hindrer sprø brudd.",
    nn: "Minimumsarmering etter EC2 §9.2.1.1: A_s,min = max(0,26 · f_ctm/f_yk · b_t · d, 0,0013 · b_t · d). Sikrar duktil oppførsel ved rissdanning og hindrar sprøtt brudd.",
  },
  As_max: {
    nb: "Maksimumsarmering etter EC2 §9.2.1.1: A_s,max = 0,04 · A_c. Hindrer at tverrsnittet blir over-armert — over denne grensen er det fare for sprø trykkbrudd i betongen før stålet flytter seg plastisk.",
    nn: "Maksimumsarmering etter EC2 §9.2.1.1: A_s,max = 0,04 · A_c. Hindrar at tverrsnittet blir over-armert — over denne grensa er det fare for sprøtt trykkbrudd i betongen før stålet flyttar seg plastisk.",
  },
  As_valgt: {
    nb: "Faktisk valgt armeringsmengde basert på standardprogram. Skal være ≥ A_s,req og innenfor [A_s,min, A_s,max]. Velg et helt antall stenger med kjente diametre (ø10, ø12, ø16, ø20, ø25, ø32).",
    nn: "Faktisk vald armeringsmengd basert på standardprogram. Skal vere ≥ A_s,req og innanfor [A_s,min, A_s,max]. Vel eit heilt tal stenger med kjende diametrar (ø10, ø12, ø16, ø20, ø25, ø32).",
  },
  As_valt: {
    nb: "Faktisk valgt armeringsmengde basert på standardprogram. Skal være ≥ A_s,req og innenfor [A_s,min, A_s,max]. Velg et helt antall stenger med kjente diametre (ø10, ø12, ø16, ø20, ø25, ø32).",
    nn: "Faktisk vald armeringsmengd basert på standardprogram. Skal vere ≥ A_s,req og innanfor [A_s,min, A_s,max]. Vel eit heilt tal stenger med kjende diametrar (ø10, ø12, ø16, ø20, ø25, ø32).",
  },
  A_s_valgt: {
    nb: "Faktisk valgt armeringsmengde basert på standardprogram. Skal være ≥ A_s,req og innenfor [A_s,min, A_s,max]. Velg et helt antall stenger med kjente diametre (ø10, ø12, ø16, ø20, ø25, ø32).",
    nn: "Faktisk vald armeringsmengd basert på standardprogram. Skal vere ≥ A_s,req og innanfor [A_s,min, A_s,max]. Vel eit heilt tal stenger med kjende diametrar (ø10, ø12, ø16, ø20, ø25, ø32).",
  },
  // === Utnytting og grenseverdiar ===
  mu_Ed: {
    nb: "Relativt moment μ_Ed = M_Ed / (b · d² · f_cd). Dimensjonsløs parameter brukt i armeringsdesign — bestemmer om bjelken er underarmert (μ_Ed < μ_lim) eller om du trenger trykkarmering. Lavere er bedre fra utnyttings-perspektiv.",
    nn: "Relativt moment μ_Ed = M_Ed / (b · d² · f_cd). Dimensjonslaus parameter brukt i armeringsdesign — avgjer om bjelken er underarmert (μ_Ed < μ_lim) eller om du treng trykkarmering. Lågare er betre frå utnyttings-perspektiv.",
  },
  mu_lim: {
    nb: "Grensen for μ_Ed der enkel-armert tverrsnitt (kun strekkarmering) er tilstrekkelig. Avhenger av betong- og stålkvalitet. Over μ_lim må du legge til trykkarmering eller øke tverrsnittsdimensjoner.",
    nn: "Grensa for μ_Ed der enkelt-armert tverrsnitt (berre strekkarmering) er tilstrekkeleg. Avhenger av betong- og stålkvalitet. Over μ_lim må du legge til trykkarmering eller auke tverrsnittsdimensjonar.",
  },
  xi_lim: {
    nb: "Grensen for relativ trykksone-høyde ξ = x/d, der x er nøytralaksens dybde. Sikrer duktilitetskrav etter EC2 §5.6.3 (vanligvis ξ_lim ≈ 0,45–0,5). Lavere ξ gir mer duktil oppførsel og varsel før brudd.",
    nn: "Grensa for relativ trykksone-høgd ξ = x/d, der x er nøytralaksens djupne. Sikrar duktilitetskrav etter EC2 §5.6.3 (vanlegvis ξ_lim ≈ 0,45–0,5). Lågare ξ gir meir duktil oppførsel og varsel før brudd.",
  },
  zeta_Ed: {
    nb: "Dimensjonerende utnyttingsgrad — forholdet mellom dimensjonerende påkjenning og kapasitet. Verdier < 1,0 indikerer at tverrsnittet har tilstrekkelig kapasitet. Lavere er bedre, men for lav verdi (< 0,5) kan indikere overdesign.",
    nn: "Dimensjonerande utnyttingsgrad — forholdet mellom dimensjonerande påkjenning og kapasitet. Verdiar < 1,0 indikerer at tverrsnittet har tilstrekkeleg kapasitet. Lågare er betre, men for låg verdi (< 0,5) kan indikere overdesign.",
  },
};

// Hoistar key som matchar STYRANDE_PATTERNS til posisjon 0. Brukast etter
// at tile-keys er valde for å sikre at det fagleg viktigaste (= det
// studenten skal stole på) er den mørke styrande tilen. Stoppar ved
// første match (i agentens rekkefølge) for å vere deterministisk.
function hoistStyrande(keys: string[]): string[] {
  const styrandeIdx = keys.findIndex((k) =>
    STYRANDE_PATTERNS.some((p) => p.test(k)),
  );
  if (styrandeIdx <= 0) return keys; // allereie først, eller ingen match
  return [keys[styrandeIdx], ...keys.slice(0, styrandeIdx), ...keys.slice(styrandeIdx + 1)];
}

// Fjerner keys som har same verdi som ein tidlegare key. Sikkerheits-net
// mot agent-redundans (t.d. Ed_ULS_styrende og Ed_ULS_dominerende med
// identisk tal). Behaldar første førekomst i rekkjefølga.
function dedupeByValue(keys: string[], results: Record<string, string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const v = (results[k] ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(k);
  }
  return out;
}

// === Kontrollør-kort helpers (#02) ===

// Eitt-linjers verdikt frå comparison.match_status. Når comparison manglar
// (Samanliknar feila), fallbackar kallaren til getFirstSentence på
// controllerDecision.user_message.
function getVerdiktForMatchStatus(
  matchStatus: "match" | "minor_differences" | "significant_differences" | "critical_disagreement",
  locale: Locale,
): string {
  if (matchStatus === "match") return WB_LABELS.verdiktMatch[locale];
  if (matchStatus === "minor_differences") return WB_LABELS.verdiktMinor[locale];
  if (matchStatus === "significant_differences") return WB_LABELS.verdiktSignificant[locale];
  return WB_LABELS.verdiktCritical[locale];
}

// Hentar første setning frå ein prosa-blokk. Splittar på første ., !, ?.
// Fallback: første 140 teikn om ingen setningsavslutning finst.
function getFirstSentence(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  const m = trimmed.match(/^[^.!?]+[.!?]/);
  return m ? m[0].trim() : trimmed.slice(0, 140);
}

// Strukturen for chips frontend genererer frå strukturert agent-output.
// Backend leverer ikkje chips direkte i pilot-skjema — vi byggjer dei
// klient-side frå method_differences, assumption_differences, warnings
// og manual_review_required-flagget.
type KontrollorChip = {
  text: string;     // Kort overskrift som vises i pillen når kollapsa
  body?: string;    // Lang forklaring som vises som prosa når utvida
  tone: "info" | "warn" | "neutral";
  prefix?: string;  // visuell prefix t.d. "+", "⚠", "✓"
};

// Splitt rå chip-tekst på første kolon. Det som står før blir til overskrift
// (synleg når kollapsa), det som står etter blir til prosa-body (synleg når
// utvida). Om ingen kolon finst, eller om kolonen kjem for seint i strengen
// (>80 teikn — sannsynlegvis ikkje ein faktisk overskrift), behaldast heile
// som body og overskrifta vert ein truncate av starten.
function splitChipText(raw: string): { text: string; body?: string } {
  const s = raw.trim();
  if (!s) return { text: "" };
  // Sjå etter ": " (kolon + mellomrom — typisk for "Tittel: forklaring").
  // Tillat opp til 80 teikn for tittel-delen.
  const colonIdx = s.indexOf(": ");
  if (colonIdx > 0 && colonIdx <= 80) {
    const title = s.slice(0, colonIdx).trim();
    const body = s.slice(colonIdx + 2).trim();
    if (title && body) return { text: title, body };
  }
  // Ingen brukbar kolon. Truncate til kort overskrift, behald heile som body.
  if (s.length > 70) {
    return { text: s.slice(0, 69) + "…", body: s };
  }
  return { text: s };
}

function buildKontrollorChips(
  comparison: ComparisonResult | null,
  calculationA: CalculationResult | null,
  calculationB: CalculationResult | null,
  decision: ControllerDecision | null,
  locale: Locale,
  maxChars: number = 60,
): KontrollorChip[] {
  const chips: KontrollorChip[] = [];

  // 0) Konfidens-chips (#09) — agent-metadata først i chip-rada.
  // Tone-mapping: high → info (grøn), medium → warn, low → warn.
  // Per-nivå tooltip (klikk for å utvide) forklarer kva konfidens-verdien tyder.
  const confidenceTone = (c: "high" | "medium" | "low"): "info" | "warn" | "neutral" => {
    if (c === "high") return "info";
    return "warn"; // medium og low begge warn-tona
  };
  const confidenceTooltip = (
    agent: "A" | "B",
    c: "high" | "medium" | "low",
  ): string => {
    if (agent === "A") {
      if (c === "high") return WB_LABELS.konfidensHighA[locale];
      if (c === "medium") return WB_LABELS.konfidensMediumA[locale];
      return WB_LABELS.konfidensLowA[locale];
    }
    if (c === "high") return WB_LABELS.konfidensHighB[locale];
    if (c === "medium") return WB_LABELS.konfidensMediumB[locale];
    return WB_LABELS.konfidensLowB[locale];
  };
  if (calculationA?.confidence) {
    chips.push({
      text: `A · ${calculationA.confidence.toUpperCase()}`,
      body: confidenceTooltip("A", calculationA.confidence),
      tone: confidenceTone(calculationA.confidence),
    });
  }
  if (calculationB?.confidence) {
    chips.push({
      text: `B · ${calculationB.confidence.toUpperCase()}`,
      body: confidenceTooltip("B", calculationB.confidence),
      tone: confidenceTone(calculationB.confidence),
    });
  }

  // 1) Method differences → info-chip med tittel + body splitta på kolon
  if (comparison?.method_differences?.length) {
    for (const md of comparison.method_differences) {
      const split = splitChipText(md);
      if (!split.text) continue;
      chips.push({
        ...split,
        tone: "info",
        prefix: "+",
      });
    }
  }

  // 2) Assumption differences → warn-chip med tittel + body
  if (comparison?.assumption_differences?.length) {
    for (const ad of comparison.assumption_differences) {
      const split = splitChipText(ad);
      if (!split.text) continue;
      chips.push({
        ...split,
        tone: "warn",
        prefix: "⚠",
      });
    }
  }

  // 3) Warnings frå begge konstruktørar → warn-chip
  // Dedupe på trim+lowercase for å fange "Bør verifiserast" / "bør verifiserast".
  const seenWarnings = new Set<string>();
  const allWarnings = [...(calculationA?.warnings ?? []), ...(calculationB?.warnings ?? [])];
  for (const w of allWarnings) {
    const t = w.trim();
    if (!t) continue;
    const norm = t.toLowerCase().replace(/\s+/g, " ");
    if (seenWarnings.has(norm)) continue;
    seenWarnings.add(norm);
    const split = splitChipText(w);
    if (!split.text) continue;
    chips.push({
      ...split,
      tone: "warn",
      prefix: "⚠",
    });
  }

  // 4) Manual review required → neutral-chip
  if (decision?.manual_review_required) {
    chips.push({
      text: WB_LABELS.krevFagligGjennomgang[locale],
      body: decision.controller_notes || undefined,
      tone: "neutral",
    });
  }

  return chips;
}

// Avgjer kva for keys som skal visast som tiles. Returnerer 0-5 keys i
// den rekkjefølga dei finst i results-objektet (agenten styrer rekkefølga),
// med STYRANDE_PATTERNS-match hoista til posisjon 0 og verdi-duplikatar
// fjerna. Tom liste betyr "ingen tiles" → kallaren fallbackar til prosa-svar.
function getDimensjonerandeKeys(
  results: Record<string, string> | null | undefined,
  calculationType: string | null,
): string[] {
  const allKeys = Object.keys(results || {});
  if (allKeys.length === 0) return [];
  const resultsObj = results || {};

  let candidates: string[] = [];

  // Steg 1: Per-oppgåvetype patterns (mest spesifikk)
  if (calculationType && DIMENSJONERANDE_PATTERNS[calculationType]) {
    const patterns = DIMENSJONERANDE_PATTERNS[calculationType];
    candidates = allKeys.filter((k) => patterns.some((p) => p.test(k)));
  }

  // Steg 2: Universell output-pattern — fangar Ed_*/Rd_*/As_* og *_Ed/*_Rd/*_req
  if (candidates.length === 0) {
    candidates = allKeys.filter((k) => OUTPUT_PATTERN.test(k));
  }

  // Steg 3: Filter ut åpenbare inputs frå dei første N keys
  if (candidates.length === 0) {
    candidates = allKeys.filter((k) => !isInputKey(k)).slice(0, 4);
  }

  // Steg 4: Last resort — første 3 keys (ingen heuristikk traff)
  if (candidates.length === 0) {
    candidates = allKeys.slice(0, 3);
  }

  // Etterhandsaming: hoist styrande + dedupe verdi-duplikatar + cap på 5
  return dedupeByValue(hoistStyrande(candidates), resultsObj).slice(0, 5);
}

// Hentar tile-label for ein key. Bruker KEY_TILE_LABELS-mapping om mogleg,
// elles UPPERCASE-konvertering med "_" → " · ".
function tileLabel(key: string, locale: Locale): string {
  const mapped = KEY_TILE_LABELS[key]?.[locale];
  if (mapped) return mapped;
  return key.toUpperCase().replace(/_/g, " · ");
}

// Splittar verdistreng i tal og eining for tile-typografi. Robust mot
// "10,58 kN/m²", "25,0 kNm", "0,8", "1,5 × 10^-3", "≈ 4,5 kN".
// Når regex ikkje matchar (uvanleg format), returnerer heile strengen som tal
// utan eining — fungerer framleis, berre utan visuell hierarki.
function splitNumberUnit(value: string): { number: string; unit: string } {
  const trimmed = (value ?? "").toString().trim();
  // Forventa form: leiande tal (med komma/punktum/x10^n) + valfri eining
  const match = trimmed.match(
    /^([≈~<>≥≤]?\s*-?[\d.,]+(?:\s*[×x·]\s*10\^?-?\d+)?)\s*(.*)$/,
  );
  if (match) {
    return { number: match[1].trim(), unit: match[2].trim() };
  }
  return { number: trimmed, unit: "" };
}

// Hent dei "kompakte" linjene frå step.text for "Berre formlane"-mode (#08).
// Backend-prompt ber Konstruktør A om text som ein blanding av:
//   • prosa-linje(r) som forklarer steget
//   • formel-linje med symbol (t.d. "MEd = qEd · L² / 8")
//   • innsetting-linjer med verdiar (t.d. "MEd = 30,00 · 49 / 8")
//   • resultat-linje (t.d. "MEd = 183,75 kNm")
//
// Heuristikk for "berre formlane":
//   1. Plukk første linje med "=" som inneheld bokstav-symbol på venstre side
//      (symbolsk formel, ikkje rein tal-innsetting).
//   2. Pluss siste linje med "=" (resultatet) — om den er ulik formelen.
//   3. Returner som array av strenger; tom array betyr "ingen formel funnen".
function extractFormulaLines(text: string): string[] {
  if (!text) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Linje med "=" og bokstav-symbol før =
  const isSymbolicFormula = (l: string) => /^[^=]*[a-zA-Zα-ωΑ-Ω][^=]*=/.test(l);
  // Linje med "=" og mest tal etter (sluttresultatet typisk)
  const hasEquals = (l: string) => l.includes("=");

  const formula = lines.find(isSymbolicFormula);
  const lastEq = [...lines].reverse().find(hasEquals);

  const out: string[] = [];
  if (formula) out.push(formula);
  if (lastEq && lastEq !== formula) out.push(lastEq);
  // Om ingen formel funne men det er ein "="-linje, vis den
  if (out.length === 0 && lastEq) out.push(lastEq);
  return out;
}

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

  // Mellomledd-disclosure (#06): Resultat-tabellen splittast i to —
  // dimensjonerande verdiar (alltid synleg, fag-typografi) + mellomledd
  // (kollapsa under "Vis X mellomledd"). Default false: studenten ser
  // svaret først, mellomledd er eitt klikk unna for sporbarheit.
  const [aMellomleddExpanded, setAMellomleddExpanded] = useState(false);

  // Kontrollør-vurdering-toggle (#02): Lang prosa frå Kontrolløren er
  // kollapsa bak "Les heile vurderinga ▸". Default false så studenten
  // ser status + verdikt + chips først, prosa er eitt klikk unna.
  const [kontrollorProsaExpanded, setKontrollorProsaExpanded] = useState(false);

  // Sjølvkontroll-disclosure (#09): Intern inkonsistens-blokka flytta inn
  // i Kontrollør-kortet. State er null = follow-auto (utvida om issues finst,
  // kollapsa elles). Etter brukar-overstyring: true/false.
  const [selvkontrollExpanded, setSelvkontrollExpanded] = useState<boolean | null>(null);

  // Konstruktør B-disclosure (#04): Heile B-blokka kollapsast til ein-linjes
  // disclosure med summary (ENIGE/AVVIK + konfidens). State er null = follow-
  // auto: utvida ved significant_differences/critical_disagreement, kollapsa
  // elles. Etter brukar-overstyring: true/false.
  const [kontrollorBExpanded, setKontrollorBExpanded] = useState<boolean | null>(null);

  // Sammenligner-rad-disclosure (#05): kvar rad i numerisk-tabellen kan
  // utvidast for å vise "Kvifor"-detaljar (likely_cause + A/B-verdiar).
  // Multiple rader kan vere utvida samtidig — Set<index>.
  const [expandedComparisonRows, setExpandedComparisonRows] = useState<Set<number>>(
    new Set(),
  );
  // Generelle merknader nedst i Sammenligner (#05) — method_differences +
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

  // Visningsprofil → default-state (#03). Ved profil-endring setter vi
  // default for blokker som ikkje har eigen "null = auto"-state. Sida si
  // visning følgjer alltid agent-output — ingen brukar-overstyring (det er
  // designval: indikatoren skal kommunisere kvifor sida ser ut som den gjer).
  useEffect(() => {
    if (phase !== "calculation_result") return;
    const profile = computeProfile(controllerDecision, comparison, calculationA);
    const krev = profile === "krev_gjennomgang";

    // Generelle merknader: utvida ved krev_gjennomgang, kollapsa elles
    setComparisonGeneralExpanded(krev);

    // Sammenligner-rader: ved krev_gjennomgang, auto-utvid rader med
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
  // Kontrollør-kortet men ikkje nådd Action bar nedst. Sentinel-divs vert
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
  // sentinel-divs: éin under Kontrollør-kortet, éin over Action bar.
  // - Kontrollør-sentinel ute av view (top) → studenten har scrolla forbi
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

        /* === Hover-feedback for klikkbare element (#anim-06) ===
           Signaliserer at element er klikkbart ved å lette løfte og forsterke
           skugge på hover. Tiles og chips bruker subtilt ulik intensitet —
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

        /* Hover på chips — berre når stagger er ferdig (--visible aktivert).
           Litt scale + lyft for å vise at pille-formen er klikkbar.
           Transition på --visible-klassen sikrar at hover-endringen får
           smooth easing utan å konflikte med stagger-animasjonen (animation
           er ferdig før hover skjer). */
        .pilar-chip-stagger.pilar-chip-stagger--visible {
          transition:
            transform 0.18s cubic-bezier(0.2, 0.9, 0.25, 1),
            box-shadow 0.18s ease,
            border-radius 0.15s ease,
            padding 0.15s ease;
        }
        .pilar-chip-stagger.pilar-chip-stagger--visible:hover:not(:disabled) {
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
          {phase === "calculation_result" && calculationA && (() => {
            // Visningsprofil (#03) — auto-rekna basert på agent-output.
            // Bestemmer default-tilstand for B-blokka, generelle merknader
            // og avvik-rader. Indikator-pille viser kva tilstand sida er i,
            // men er ikkje klikkbar (kommunikasjon, ikkje kontroll).
            const effectiveProfile: Profile = computeProfile(controllerDecision, comparison, calculationA);
            const isKrevGjennomgang = effectiveProfile === "krev_gjennomgang";

            // Per-profil styling for indikator-chip
            const profileChipStyle: Record<Profile, { bg: string; color: string; label: string; forklaring: string }> = {
              trygg: {
                bg: "rgba(79, 139, 110, 0.12)",
                color: "#3F6B55",
                label: WB_LABELS.profilTrygg[locale],
                forklaring: WB_LABELS.profilForklaringTrygg[locale],
              },
              standard: {
                bg: "var(--surface-2)",
                color: "var(--fg)",
                label: WB_LABELS.profilStandard[locale],
                forklaring: WB_LABELS.profilForklaringStandard[locale],
              },
              krev_gjennomgang: {
                bg: "var(--warn-bg, rgba(180, 130, 30, 0.12))",
                color: "var(--warn, #B47A1E)",
                label: WB_LABELS.profilKrevGjennomgang[locale],
                forklaring: WB_LABELS.profilForklaringKrev[locale],
              },
            };
            const profStyle = profileChipStyle[effectiveProfile];

            return (
            <>
              {/* Profil-indikator (#03) — statisk visning av kva tilstand
                  sida er i. Ikkje klikkbar; viser kvifor sida ser ut som
                  den gjer for denne oppgåva. */}
              <section style={{ marginTop: 0, marginBottom: 12 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                  role="status"
                  aria-label={`${WB_LABELS.visningProfil[locale]}: ${profStyle.label}`}
                >
                  <span
                    className="uk-eyebrow"
                    style={{
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {WB_LABELS.visningProfil[locale]}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      background: profStyle.bg,
                      color: profStyle.color,
                      textTransform: "uppercase",
                    }}
                  >
                    {profStyle.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                    {profStyle.forklaring}
                  </span>
                </div>
              </section>

              {/* Kontrolløren si avgjerd — primær banner */}
              {/* Kontrollør-kort (#02) — fire-sleng struktur:
                  (a) Status-badge + eyebrow
                  (b) Eitt-linjers verdikt frå comparison.match_status
                  (c) Fag-flagg-chips frå method/assumption_differences + warnings
                  (d) Lang prosa frå controllerDecision.user_message bak toggle
                  Beheld StatusStripe-shell for venstre-border + bakgrunn-tone. */}
              {controllerDecision && (() => {
                const chips = buildKontrollorChips(
                  comparison,
                  calculationA,
                  calculationB,
                  controllerDecision,
                  locale,
                );
                const verdikt = comparison
                  ? getVerdiktForMatchStatus(comparison.match_status, locale)
                  : getFirstSentence(controllerDecision.user_message);
                return (
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
                          marginBottom: 10,
                        }}
                      >
                        <span className="uk-eyebrow" style={{ color: "inherit" }}>
                          {WB_LABELS.kontrollorAvgjerd[locale]}
                          <InfoPopover label={WB_LABELS.kontrollor[locale]}><p>{WB_LABELS.kontrollorPopover1[locale]} <strong>{WB_LABELS.kontrollorPopover2[locale]}</strong> {WB_LABELS.kontrollorPopover3[locale]}</p></InfoPopover>
                        </span>
                        <span className="pilar-breathe">
                          <Badge status={DECISION_STATUS_TONES[controllerDecision.decision_status]}>
                            <span className="pilar-puls-dot" aria-hidden="true" />
                            {decisionStatusLabel(controllerDecision.decision_status, locale)}
                          </Badge>
                        </span>
                      </div>
                    }
                  >
                    {/* (b) Eitt-linjers verdikt — fag-leseleg sammendrag */}
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, fontWeight: 500, color: "var(--fg)" }}>
                      {verdikt}
                    </p>

                    {/* (c) Konfidens-chips + Fag-flagg-chips
                        Konfidens står i eiga rad over fag-flagga slik at
                        utviding av eit fag-flagg ikkje strekker konfidens-
                        chipane på same flex-line. Beggje brukar align-items
                        flex-start på containerane som ekstra safe-guard. */}
                    {chips.length > 0 && (() => {
                      // Skil konfidens-chips (dei to første om dei kjem frå
                      // calculationA/B.confidence — sjå buildKontrollorChips)
                      // frå fag-flagg-chips. Konfidens-chips har tekst i
                      // form "A · HIGH" / "B · HIGH".
                      const isConfidenceChip = (c: KontrollorChip) =>
                        /^[AB] · (HIGH|MEDIUM|LOW)$/.test(c.text);
                      const konfidensChips = chips.filter(isConfidenceChip);
                      const fagChips = chips.filter((c) => !isConfidenceChip(c));

                      return (
                        <div style={{ marginTop: 12 }}>
                          <div
                            className="uk-eyebrow"
                            style={{
                              marginBottom: 6,
                              fontSize: 10,
                              color: "var(--fg-muted)",
                            }}
                          >
                            {WB_LABELS.fagligMerknad[locale]}
                          </div>

                          {/* Konfidens-chips — eiga rad */}
                          {konfidensChips.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                alignItems: "flex-start",
                                marginBottom: fagChips.length > 0 ? 8 : 0,
                              }}
                            >
                              {konfidensChips.map((chip, i) => (
                                <KontrollorChipPill
                                  key={`konf-${i}`}
                                  chip={chip}
                                  index={i}
                                />
                              ))}
                            </div>
                          )}

                          {/* Fag-flagg-chips delt i to grupper (#lettlese5):
                              - "Metode": info-chips med prefix "+", dvs.
                                method_differences frå Samanliknar
                              - "Antakelser & advarsler": warn + neutral chips
                                med prefix "⚠", dvs. assumption_differences,
                                warnings og manual_review
                              Tidlegare var alle i ein lang liste — den kunne
                              bli 10-15 chips lang og uoversikteleg. Grupperinga
                              gir studenten ein skanne-friendly struktur. */}
                          {fagChips.length > 0 && (() => {
                            const methodChips = fagChips.filter((c) => c.tone === "info");
                            const warnChips = fagChips.filter((c) => c.tone !== "info");
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 14,
                                }}
                              >
                                {methodChips.length > 0 && (
                                  <div>
                                    <div
                                      className="uk-eyebrow"
                                      style={{
                                        fontSize: 10,
                                        color: "var(--fg-muted)",
                                        marginBottom: 6,
                                      }}
                                    >
                                      {WB_LABELS.fagligGruppeMetode[locale]}
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "stretch",
                                        gap: 6,
                                      }}
                                    >
                                      {methodChips.map((chip, i) => (
                                        <KontrollorChipPill
                                          key={`metode-${i}`}
                                          chip={chip}
                                          index={konfidensChips.length + i}
                                          enableAura
                                          fullWidth
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {warnChips.length > 0 && (
                                  <div>
                                    <div
                                      className="uk-eyebrow"
                                      style={{
                                        fontSize: 10,
                                        color: "var(--fg-muted)",
                                        marginBottom: 6,
                                      }}
                                    >
                                      {WB_LABELS.fagligGruppeAntakelser[locale]}
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "stretch",
                                        gap: 6,
                                      }}
                                    >
                                      {warnChips.map((chip, i) => (
                                        <KontrollorChipPill
                                          key={`warn-${i}`}
                                          chip={chip}
                                          index={konfidensChips.length + methodChips.length + i}
                                          enableAura
                                          fullWidth
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}

                    {/* (d) Sjølvkontroll-disclosure (#09) — viser
                        internal_consistency_issues frå Sammenligner.
                        Default: kollapsa når 0 funne, auto-utvida med raud
                        kant når >0. Brukar kan toggle manuelt. */}
                    {comparison && (() => {
                      const issuesA = comparison.internal_consistency_issues?.agent_a ?? [];
                      const issuesB = comparison.internal_consistency_issues?.agent_b ?? [];
                      const totalIssues = issuesA.length + issuesB.length;
                      // null = default kollapsa. Brukar må klikke for å opne.
                      // Tidligare auto-opna ved >0 issues, men brukar har bedt
                      // om å sjølv kontrollere når det vises.
                      const isExpanded =
                        selvkontrollExpanded === null
                          ? false
                          : selvkontrollExpanded;
                      const hasCritical =
                        [...issuesA, ...issuesB].some(
                          (i) => i.severity === "high" || i.severity === "critical",
                        );
                      const labelText =
                        totalIssues === 0
                          ? WB_LABELS.sjølvkontrollIngen[locale]
                          : WB_LABELS.sjølvkontrollFunne[locale].replace(
                              "{n}",
                              String(totalIssues),
                            );

                      return (
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => setSelvkontrollExpanded(!isExpanded)}
                            aria-expanded={isExpanded}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "4px 0",
                              color: totalIssues > 0 ? "var(--warn)" : "var(--fg-2)",
                              fontSize: 13,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              textAlign: "left",
                              fontFamily: "inherit",
                              fontWeight: totalIssues > 0 ? 600 : 400,
                            }}
                          >
                            <span
                              className={`pilar-chevron${isExpanded ? " pilar-chevron--open" : ""}`}
                              style={{
                                color: "var(--fg-muted)",
                                fontSize: 11,
                              }}
                            >
                              ▸
                            </span>
                            <span>
                              {WB_LABELS.sjølvkontrollEtikett[locale]}: {labelText}
                            </span>
                          </button>
                          {isExpanded && totalIssues > 0 && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: "10px 12px",
                                background: "var(--warn-bg)",
                                border: "1px solid var(--warn-border)",
                                borderLeft: `3px solid ${hasCritical ? "var(--bad, #c04848)" : "var(--warn)"}`,
                                borderRadius: "var(--r-sm)",
                              }}
                            >
                              {issuesA.length > 0 && (
                                <div style={{ marginBottom: issuesB.length > 0 ? 10 : 0 }}>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "var(--fg)",
                                      marginBottom: 4,
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    Konstruktør A
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      padding: 0,
                                      listStyle: "none",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 8,
                                    }}
                                  >
                                    {issuesA.map((issue, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 12,
                                          fontSize: 13.5,
                                          color: "var(--fg-2)",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            flexShrink: 0,
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--warn)",
                                            marginTop: 8,
                                          }}
                                        />
                                        <span style={{ minWidth: 0 }}>
                                          {issue.issue}{" "}
                                          <Badge status={SEVERITY_TONES[issue.severity]}>{issue.severity}</Badge>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {issuesB.length > 0 && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "var(--fg)",
                                      marginBottom: 4,
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    Konstruktør B
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      padding: 0,
                                      listStyle: "none",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 8,
                                    }}
                                  >
                                    {issuesB.map((issue, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 12,
                                          fontSize: 13.5,
                                          color: "var(--fg-2)",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            flexShrink: 0,
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--warn)",
                                            marginTop: 8,
                                          }}
                                        />
                                        <span style={{ minWidth: 0 }}>
                                          {issue.issue}{" "}
                                          <Badge status={SEVERITY_TONES[issue.severity]}>{issue.severity}</Badge>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* (e) Les heile vurderinga ▸ — kollapsa lang prosa.
                        Vis berre om user_message er meir enn éi setning
                        (elles er verdikt-linja + chips alt brukar treng). */}
                    {controllerDecision.user_message &&
                      controllerDecision.user_message.trim() !== verdikt.trim() && (
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            onClick={() => setKontrollorProsaExpanded(!kontrollorProsaExpanded)}
                            aria-expanded={kontrollorProsaExpanded}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "4px 0",
                              color: "var(--fg-2)",
                              fontSize: 13,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              textAlign: "left",
                              fontFamily: "inherit",
                            }}
                          >
                            <span
                              className={`pilar-chevron${kontrollorProsaExpanded ? " pilar-chevron--open" : ""}`}
                              style={{ color: "var(--fg-muted)", fontSize: 11 }}
                            >
                              ▸
                            </span>
                            <span>
                              {kontrollorProsaExpanded
                                ? WB_LABELS.skjulVurderinga[locale]
                                : WB_LABELS.lesHeileVurderinga[locale]}
                            </span>
                          </button>
                          {kontrollorProsaExpanded && (
                            <div
                              style={{
                                margin: "10px 0 0",
                                padding: "14px 16px",
                                background: "rgba(0, 0, 0, 0.025)",
                                borderLeft: "3px solid var(--border)",
                                borderRadius: 4,
                                fontSize: 14,
                                lineHeight: 1.7,
                                color: "var(--fg-2)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                              }}
                            >
                              {/* Splitt prosaen i setningar (punktum/utropsteikn
                                  + space + stor bokstav) for å gje lufti
                                  paragraf-pattern. Konstruktør-namn vert markert
                                  fed slik at lesaren kan skanne kven som gjorde
                                  kva. Same regex som chip-body i KontrollorChipPill. */}
                              {controllerDecision.user_message
                                .split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])/)
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .map((sentence, i) => {
                                  const m = sentence.match(
                                    /^(Konstruktør [AB]s?|Begge konstruktørar?|Begge tilnærminger?|Resultatet|Beregningen)/
                                  );
                                  return (
                                    <p key={i} style={{ margin: 0 }}>
                                      {m ? (
                                        <>
                                          <strong style={{ fontWeight: 600, color: "var(--fg)" }}>
                                            {m[0]}
                                          </strong>
                                          {sentence.slice(m[0].length)}
                                        </>
                                      ) : (
                                        sentence
                                      )}
                                    </p>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}
                  </StatusStripe>
                );
              })()}

              {/* Sentinel for sticky decision-bar (#07) — IntersectionObserver
                  detekterer når denne er ute av view (= studenten har scrolla
                  forbi Kontrollør-kortet) og viser sticky-baren då. */}
              <div ref={kontrollorSentinelRef} aria-hidden="true" style={{ height: 1 }} />

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

              {/* Kort svar — eller blokka-varsel — eller dimensjonerande tiles (#01) */}
              {(() => {
                const shortConclusionBlocked =
                  isBlocked("short_conclusion_a") || isBlocked("short_conclusion_b");
                const resultsAvailable =
                  !isBlocked("results_a") &&
                  Object.keys(calculationA.results || {}).length > 0;
                const tilesKeys = resultsAvailable
                  ? getDimensjonerandeKeys(
                      calculationA.results,
                      result?.berekningstype ?? null,
                    )
                  : [];
                const tilesShown = tilesKeys.length > 0;

                return (
                  <>
                    {/* Warn-stripe når Kontrolløren har blokka sluttkonklusjon.
                        Tiles vises framleis under viss results er OK — studenten
                        treng eit svar å skanne sjølv om prosa er blokka. */}
                    {shortConclusionBlocked && (
                      <StatusStripe status="warn" className={tilesShown ? "mb-4" : undefined}>
                        <strong>{WB_LABELS.sluttkonklusjonUtelaten[locale]}</strong>{" "}
                        {WB_LABELS.hallusinasjonarTekst[locale]}
                      </StatusStripe>
                    )}

                    {/* Dimensjonerande tiles — primær avlevering av svaret (#01).
                        Erstattar "Kort svar"-prosa når results er tilgjengelege. */}
                    {tilesShown && (
                      <DimensjonerandeTiles
                        results={calculationA.results}
                        calculationType={result?.berekningstype ?? null}
                        locale={locale}
                      />
                    )}

                    {/* Prosa-fallback når tiles ikkje kan visast (ingen results,
                        eller alle results-keys er blokka). */}
                    {!shortConclusionBlocked && !tilesShown && (
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
                  </>
                );
              })()}

              {/* Resultat-objekt — splittast i Dimensjonerande + Mellomledd (#06).
                  Dimensjonerande rader: same keys som tiles i #01, men med
                  fag-typografi (15px tal, høgrejustert eining) for studenten
                  som vil verifisere. Mellomledd: alle andre keys, kollapsa
                  bak ein "Vis X mellomledd ▸"-toggle. */}
              {!isBlocked("results_a") && Object.keys(calculationA.results || {}).length > 0 && (() => {
                const allEntries = Object.entries(calculationA.results);
                const dimensjonerandeKeys = getDimensjonerandeKeys(
                  calculationA.results,
                  result?.berekningstype ?? null,
                );
                const dimensjonerandeSet = new Set(dimensjonerandeKeys);
                const dimensjonerandeEntries = dimensjonerandeKeys
                  .map((k) => [k, calculationA.results[k]] as [string, string])
                  .filter(([, v]) => v !== undefined);
                const mellomleddEntries = allEntries.filter(([k]) => !dimensjonerandeSet.has(k));
                const mellomleddCount = mellomleddEntries.length;

                return (
                  <section className="uk-card" style={{ marginTop: 16 }}>
                    <div className="uk-card__hd">
                      <div className="uk-card__title">{WB_LABELS.resultat[locale]}</div>
                    </div>
                    <div className="uk-card__bd">
                      {/* Dimensjonerande verdiar — fag-typografi, alltid synleg */}
                      {dimensjonerandeEntries.map(([k, v], i) => {
                        const { number, unit } = splitNumberUnit(v);
                        return (
                          <div
                            key={k}
                            className="uk-kv"
                            style={{
                              borderTop: i === 0 ? "none" : undefined,
                              padding: "10px 0",
                            }}
                          >
                            <span className="uk-kv__k uk-mono">{renderMathKey(k)}</span>
                            <span
                              className="uk-kv__v"
                              style={{
                                display: "flex",
                                alignItems: "baseline",
                                justifyContent: "flex-end",
                                gap: 6,
                              }}
                            >
                              <span
                                className="uk-mono"
                                style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}
                              >
                                {number}
                              </span>
                              {unit && (
                                <span
                                  className="uk-mono"
                                  style={{ fontSize: 12, color: "var(--fg-muted)" }}
                                >
                                  {unit}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {/* Mellomledd-disclosure — kollapsa rader for sporbarheit */}
                      {mellomleddCount > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAMellomleddExpanded(!aMellomleddExpanded)}
                            aria-expanded={aMellomleddExpanded}
                            style={{
                              background: "none",
                              border: "none",
                              borderTop: "1px solid var(--border)",
                              marginTop: dimensjonerandeEntries.length > 0 ? 6 : 0,
                              padding: "12px 0 6px",
                              width: "100%",
                              color: "var(--fg-2)",
                              fontSize: 13,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              textAlign: "left",
                              fontFamily: "inherit",
                            }}
                          >
                            <span
                              className={`pilar-chevron${aMellomleddExpanded ? " pilar-chevron--open" : ""}`}
                              style={{ color: "var(--fg-muted)", fontSize: 11 }}
                            >
                              ▸
                            </span>
                            <span>
                              {aMellomleddExpanded
                                ? WB_LABELS.skjulMellomledd[locale]
                                : WB_LABELS.visMellomledd[locale].replace(
                                    "{n}",
                                    String(mellomleddCount),
                                  )}
                            </span>
                          </button>
                          {aMellomleddExpanded && (
                            <div
                              style={{
                                borderTop: "1px solid var(--border)",
                                marginTop: 2,
                                paddingTop: 4,
                              }}
                            >
                              {mellomleddEntries.map(([k, v], i) => (
                                <div
                                  key={k}
                                  className="uk-kv"
                                  style={{ borderTop: i === 0 ? "none" : undefined }}
                                >
                                  <span className="uk-kv__k uk-mono">{renderMathKey(k)}</span>
                                  <span className="uk-kv__v uk-mono" style={{ fontWeight: 600 }}>
                                    {v}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Fallback: viss ingen dimensjonerande kunne plukkast ut
                          (sjeldan edge case), vis flat tabell som før. */}
                      {dimensjonerandeEntries.length === 0 && mellomleddCount === 0 && (
                        <div style={{ color: "var(--fg-muted)", fontSize: 13, padding: "8px 0" }}>
                          —
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

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
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {calculationA.assumptions.map((a, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            gap: 12,
                            fontSize: 13.5,
                            color: "var(--fg-2)",
                            lineHeight: 1.55,
                            paddingLeft: 0,
                          }}
                        >
                          {/* Eigen bullet i staden for default list-marker
                              for å gje tydelegare visuelt anker per item. */}
                          <span
                            aria-hidden="true"
                            style={{
                              flexShrink: 0,
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "var(--fg-muted)",
                              marginTop: 8,
                            }}
                          />
                          <span style={{ minWidth: 0 }}>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Stegvis utrekning (#08) — view-toggle + anker-chips +
                  per-steg-kollaps. Tre modus for tre flytar:
                  - "minimal" + alle utvida: skim formel-uttrykk (rask check)
                  - "full" + alle utvida: full innsetting + prosa (djup gjennomgang)
                  - kollaps per steg: hoppe direkte til avvikande verdi (forskjell-vurdering) */}
              {!isBlocked("calculation_steps_a") && calculationA.calculation_steps?.length > 0 && (() => {
                const steps = calculationA.calculation_steps;
                const toggleStepCollapse = (i: number) => {
                  setCollapsedSteps((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  });
                };

                return (
                  <section className="uk-card" style={{ marginTop: 16 }}>
                    <div className="uk-card__hd" style={{ flexWrap: "wrap", gap: 12 }}>
                      <div className="uk-card__title">{WB_LABELS.stegvisUtrekning[locale]}</div>
                      {/* View-toggle (#08) */}
                      <div
                        role="radiogroup"
                        aria-label={WB_LABELS.stegvisUtrekning[locale]}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: 999,
                          padding: 2,
                          marginLeft: "auto",
                        }}
                      >
                        {([
                          { id: "minimal" as const, label: WB_LABELS.stegvisBerreFormel[locale] },
                          { id: "full" as const, label: WB_LABELS.stegvisAlleSteg[locale] },
                        ]).map((m) => {
                          const isActive = stegvisViewMode === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              onClick={() => setStegvisViewMode(m.id)}
                              style={{
                                appearance: "none",
                                font: "inherit",
                                fontSize: 11,
                                fontWeight: isActive ? 600 : 400,
                                padding: "3px 10px",
                                background: isActive ? "var(--fg)" : "transparent",
                                color: isActive ? "var(--surface)" : "var(--fg-2)",
                                border: "none",
                                borderRadius: 999,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: "background 0.15s ease, color 0.15s ease",
                              }}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="uk-card__bd">
                      {/* MERK: Anker-chips er fjerna etter brukar-feedback —
                          dei gav for mykje UI-støy i Stegvis-blokka. Per-steg-
                          kollaps (klikk på tittel) gir nok navigasjon, og
                          "Bare formlene"-toggle er primær view-styring. */}

                      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {steps.map((step, i) => {
                          const isCollapsed = collapsedSteps.has(i);
                          const formulaLines = extractFormulaLines(step.text);
                          return (
                            <li
                              key={i}
                              id={`stegvis-step-${i}`}
                              style={{
                                display: "flex",
                                gap: 14,
                                paddingTop: i === 0 ? 0 : 18,
                                scrollMarginTop: "calc(var(--header-height, 64px) + 12px)",
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
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Klikkbar tittel-rad — toggle per-steg-kollaps */}
                                <button
                                  type="button"
                                  onClick={() => toggleStepCollapse(i)}
                                  aria-expanded={!isCollapsed}
                                  style={{
                                    appearance: "none",
                                    font: "inherit",
                                    textAlign: "left",
                                    width: "100%",
                                    background: "none",
                                    border: "none",
                                    padding: "2px 0 4px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    color: "var(--fg)",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  <span
                                    className={`pilar-chevron${!isCollapsed ? " pilar-chevron--open" : ""}`}
                                    style={{
                                      color: "var(--fg-muted)",
                                      fontSize: 11,
                                      flexShrink: 0,
                                    }}
                                  >
                                    ▸
                                  </span>
                                  <h4
                                    style={{
                                      margin: 0,
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: "var(--fg)",
                                    }}
                                  >
                                    {step.title}
                                  </h4>
                                </button>

                                {/* Innhald — varierer med view-mode + collaps */}
                                {!isCollapsed && (
                                  <>
                                    {stegvisViewMode === "minimal" && formulaLines.length > 0 ? (
                                      // Minimal: berre formel-linjer i mono
                                      <pre
                                        style={{
                                          margin: 0,
                                          fontFamily: "var(--font-mono, monospace)",
                                          fontSize: 13,
                                          color: "var(--fg)",
                                          whiteSpace: "pre-wrap",
                                          lineHeight: 1.6,
                                        }}
                                      >
                                        {formulaLines.join("\n")}
                                      </pre>
                                    ) : (
                                      // Full: heile text (innsetting + prosa)
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
                                    )}
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </section>
                );
              })()}

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
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {calculationA.limitations.map((l, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            gap: 12,
                            fontSize: 13.5,
                            color: "var(--fg-2)",
                            lineHeight: 1.55,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              flexShrink: 0,
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: "var(--fg-muted)",
                              marginTop: 8,
                            }}
                          />
                          <span style={{ minWidth: 0 }}>{l}</span>
                        </li>
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
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {calculationA.warnings.map((w, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: 12,
                          fontSize: 13.5,
                          color: "var(--fg-2)",
                          lineHeight: 1.55,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            flexShrink: 0,
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "var(--warn)",
                            marginTop: 8,
                          }}
                        />
                        <span style={{ minWidth: 0 }}>{w}</span>
                      </li>
                    ))}
                  </ul>
                </StatusStripe>
              )}

              {/* Konstruktør B-resultat (#04) — disclosure-pattern.
                  Default kollapsa når A og B er enige (vanlegaste tilfelle),
                  auto-utvida ved significant_differences / critical_disagreement.
                  Brukar kan toggle manuelt; kontrollorBExpanded null = auto,
                  true/false = manuell overstyring. */}
              {calculationB && (() => {
                // Avgjer kollapsa/utvida-tilstand. Auto-utvida ved
                // "krev_gjennomgang"-profilen (#03), elles kollapsa.
                const matchStatus = comparison?.match_status;
                const autoExpand = isKrevGjennomgang;
                const isExpanded =
                  kontrollorBExpanded === null ? autoExpand : kontrollorBExpanded;

                // Summary-tekst i kollapsa state
                const summaryLabel = (() => {
                  if (!matchStatus) return WB_LABELS.bUtanComparison[locale];
                  if (matchStatus === "match") return WB_LABELS.bEnigeMedA[locale];
                  if (matchStatus === "minor_differences") return WB_LABELS.bMindreSkilnader[locale];
                  if (matchStatus === "significant_differences") return WB_LABELS.bVesentlegAvvik[locale];
                  return WB_LABELS.bKritiskUsemje[locale];
                })();
                const summaryTone = MATCH_STATUS_TONES[matchStatus ?? "match"];

                return (
                  <section
                    className="uk-card"
                    style={{
                      marginTop: 16,
                      background: "var(--surface-2)",
                    }}
                  >
                    {/* Disclosure-header (alltid synleg, klikkbar) */}
                    <button
                      type="button"
                      onClick={() => setKontrollorBExpanded(!isExpanded)}
                      aria-expanded={isExpanded}
                      style={{
                        // Reset
                        appearance: "none",
                        font: "inherit",
                        textAlign: "left",
                        // Layout
                        width: "100%",
                        background: "none",
                        border: "none",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        cursor: "pointer",
                        color: "var(--fg)",
                      }}
                    >
                      <span
                        className={`pilar-chevron${isExpanded ? " pilar-chevron--open" : ""}`}
                        style={{ color: "var(--fg-muted)", fontSize: 11 }}
                      >
                        ▸
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {WB_LABELS.bUavhengigKontroll[locale]}
                      </span>
                      <span style={{ color: "var(--fg-muted)" }}>·</span>
                      <Badge status={summaryTone}>{summaryLabel}</Badge>
                      {calculationB.confidence && (
                        <>
                          <span style={{ color: "var(--fg-muted)" }}>·</span>
                          <span style={{ fontSize: 12, color: "var(--fg-2)" }}>
                            {WB_LABELS.bKonfidens[locale]}{" "}
                            <span className="uk-mono" style={{ fontWeight: 600 }}>
                              {calculationB.confidence.toUpperCase()}
                            </span>
                          </span>
                        </>
                      )}
                    </button>

                    {/* Innhald (kort + tabell) — berre synleg når utvida */}
                    {isExpanded && (
                      <div
                        className="uk-card__bd"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          paddingTop: 4,
                        }}
                      >
                        {/* B-eyebrow-undertittel — gir kontekst til disclosure-headeren */}
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--fg-muted)",
                            fontStyle: "italic",
                            marginBottom: 4,
                          }}
                        >
                          {WB_LABELS.loysteOppgavaUtan[locale]}
                        </span>

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
                                <span className="uk-kv__k uk-mono">{renderMathKey(k)}</span>
                                <span className="uk-kv__v uk-mono" style={{ fontWeight: 600 }}>
                                  {v}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })()}

              {/* Comparison details — Samanliknar (#05).
                  Éin tabell med ekspander-rader. Per-felt-prosa (likely_cause)
                  flytta inn som "Kvifor"-detalj i rad-ekspansjon. Method- og
                  assumption-differences kollapsa som "Generelle merknader"
                  nedst — dei er ikkje per-rad-bundne. */}
              {comparison && (() => {
                const numericDiffs = comparison.numeric_differences ?? [];
                const methodDiffs = comparison.method_differences ?? [];
                const assumptionDiffs = comparison.assumption_differences ?? [];
                const hasNumeric = numericDiffs.length > 0;
                const hasGeneral = methodDiffs.length > 0 || assumptionDiffs.length > 0;

                if (!hasNumeric && !hasGeneral) return null;

                const toggleRow = (i: number) => {
                  setExpandedComparisonRows((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  });
                };

                return (
                  <section className="uk-card" style={{ marginTop: 16 }}>
                    <div className="uk-card__hd">
                      <div className="uk-card__title">{WB_LABELS.samanliknarSkilnader[locale]}</div>
                      <Badge status={MATCH_STATUS_TONES[comparison.match_status]}>
                        {matchStatusLabel(comparison.match_status, locale)}
                      </Badge>
                    </div>
                    <div className="uk-card__bd" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {hasNumeric && (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {/* Chevron-kolonne (24px) + dei fire info-kolonnene */}
                                <th style={{ width: 24, padding: "8px 0" }} aria-hidden="true" />
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
                              {numericDiffs.map((diff, i) => {
                                const isOpen = expandedComparisonRows.has(i);
                                const isClickable = !!diff.likely_cause?.trim();
                                return (
                                  <Fragment key={i}>
                                    <tr
                                      onClick={isClickable ? () => toggleRow(i) : undefined}
                                      onKeyDown={
                                        isClickable
                                          ? (e) => {
                                              if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                toggleRow(i);
                                              }
                                            }
                                          : undefined
                                      }
                                      tabIndex={isClickable ? 0 : undefined}
                                      role={isClickable ? "button" : undefined}
                                      aria-expanded={isClickable ? isOpen : undefined}
                                      style={{
                                        borderBottom: isOpen
                                          ? "none"
                                          : "1px solid var(--border)",
                                        cursor: isClickable ? "pointer" : "default",
                                      }}
                                    >
                                      <td style={{ padding: "8px 0", color: "var(--fg-muted)", fontSize: 11 }}>
                                        {isClickable && (
                                          <span
                                            className={`pilar-chevron${isOpen ? " pilar-chevron--open" : ""}`}
                                          >
                                            ▸
                                          </span>
                                        )}
                                      </td>
                                      <td className="uk-mono" style={{ padding: "8px 10px 8px 0", color: "var(--fg-2)" }}>
                                        {renderMathKey(diff.field)}
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
                                    {isOpen && isClickable && (
                                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td />
                                        <td colSpan={5} style={{ padding: "0 0 12px" }}>
                                          <div
                                            style={{
                                              background: "var(--surface-2)",
                                              borderRadius: "var(--r-sm)",
                                              padding: "10px 12px",
                                              fontSize: 13,
                                              lineHeight: 1.55,
                                              color: "var(--fg-2)",
                                            }}
                                          >
                                            <div style={{ marginBottom: 6 }}>
                                              <span style={{ fontWeight: 600, color: "var(--fg)" }}>
                                                {WB_LABELS.samanliknarKvifor[locale]}
                                              </span>{" "}
                                              {diff.likely_cause}
                                            </div>
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: 16,
                                                flexWrap: "wrap",
                                                fontSize: 12,
                                                color: "var(--fg-muted)",
                                                marginTop: 6,
                                                paddingTop: 6,
                                                borderTop: "1px dashed var(--border)",
                                              }}
                                            >
                                              <span>
                                                {WB_LABELS.samanliknarAVerdi[locale]}:{" "}
                                                <span className="uk-mono" style={{ color: "var(--fg-2)", fontWeight: 500 }}>
                                                  {diff.agent_a_value}
                                                </span>
                                              </span>
                                              <span>
                                                {WB_LABELS.samanliknarBVerdi[locale]}:{" "}
                                                <span className="uk-mono" style={{ color: "var(--fg-2)", fontWeight: 500 }}>
                                                  {diff.agent_b_value}
                                                </span>
                                              </span>
                                              <span>
                                                {WB_LABELS.tabellSkilnad[locale]}:{" "}
                                                <span className="uk-mono" style={{ color: "var(--fg-2)", fontWeight: 500 }}>
                                                  {diff.percent_diff?.toFixed(1)}%
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Generelle merknader frå Samanliknar (#05) — method +
                          assumption differences som ikkje knytt til ein rad.
                          Disclosure, kollapsa default. */}
                      {hasGeneral && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setComparisonGeneralExpanded(!comparisonGeneralExpanded)}
                            aria-expanded={comparisonGeneralExpanded}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "4px 0",
                              color: "var(--fg-2)",
                              fontSize: 13,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              textAlign: "left",
                              fontFamily: "inherit",
                            }}
                          >
                            <span
                              className={`pilar-chevron${comparisonGeneralExpanded ? " pilar-chevron--open" : ""}`}
                              style={{ color: "var(--fg-muted)", fontSize: 11 }}
                            >
                              ▸
                            </span>
                            <span>
                              {comparisonGeneralExpanded
                                ? WB_LABELS.skjulMerknader[locale]
                                : `${WB_LABELS.generelleMerknader[locale]} (${methodDiffs.length + assumptionDiffs.length})`}
                            </span>
                          </button>
                          {comparisonGeneralExpanded && (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
                              {methodDiffs.length > 0 && (
                                <div>
                                  <div className="uk-eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>
                                    {WB_LABELS.metodiskeSkilnader[locale]}
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      padding: 0,
                                      listStyle: "none",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 10,
                                    }}
                                  >
                                    {methodDiffs.map((m, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 12,
                                          fontSize: 13.5,
                                          color: "var(--fg-2)",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            flexShrink: 0,
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--fg-muted)",
                                            marginTop: 8,
                                          }}
                                        />
                                        <span style={{ minWidth: 0 }}>{m}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {assumptionDiffs.length > 0 && (
                                <div>
                                  <div className="uk-eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>
                                    {WB_LABELS.forskjellarForesetnader[locale]}
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      padding: 0,
                                      listStyle: "none",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 10,
                                    }}
                                  >
                                    {assumptionDiffs.map((a, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 12,
                                          fontSize: 13.5,
                                          color: "var(--fg-2)",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <span
                                          aria-hidden="true"
                                          style={{
                                            flexShrink: 0,
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: "var(--fg-muted)",
                                            marginTop: 8,
                                          }}
                                        />
                                        <span style={{ minWidth: 0 }}>{a}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* MERK: Intern inkonsistens-blokka er flytta inn i
                          Kontrollør-kortet som sjølvkontroll-disclosure (#09).
                          Sjå JSX inni controllerDecision-blokka over. */}
                    </div>
                  </section>
                );
              })()}

              {/* Sentinel for sticky decision-bar (#07) — når denne er i
                  view, betyr det Action bar er synleg og sticky-baren skjules. */}
              <div ref={actionBarSentinelRef} aria-hidden="true" style={{ height: 1 }} />

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
            );
          })()}
        </div>

        {/* Sticky decision-bar (#07) — kompakt status-/action-bar synleg
            når studenten har scrolla forbi Kontrollør-kortet men ikkje nådd
            Action bar nedst. Inneheld status-badge, profil-pille, styrande
            dimensjonerande verdi og Generer rapport-knappen, slik at
            studenten ikkje treng scrolle tilbake for å bekrefte status og
            handle. Mobile: erstattes med FAB-aktig knapp (kun "Generer
            rapport"-knapp nede til høgre, kompakt). */}
        {phase === "calculation_result" &&
          controllerDecision &&
          kontrollorBelowFold &&
          !actionBarVisible &&
          (() => {
            // Finn styrande dimensjonerande verdi for kompakt visning
            const dimKeys = calculationA
              ? getDimensjonerandeKeys(
                  calculationA.results,
                  result?.berekningstype ?? null,
                )
              : [];
            const styrendeKey = dimKeys[0];
            const styrendeValue = styrendeKey ? calculationA?.results?.[styrendeKey] : null;

            // Mobile: kun ein FAB nede til høgre med Generer rapport
            if (isMobile) {
              return (
                <div
                  style={{
                    position: "fixed",
                    bottom: 16,
                    right: 16,
                    zIndex: 90,
                  }}
                >
                  {currentRunId && calculationA && calculationB && (
                    <a
                      href={`/rapport/${currentRunId}`}
                      onClick={saveStateToSession}
                      className="uk-btn uk-btn--primary"
                      style={{
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.18)",
                        padding: "10px 18px",
                        fontSize: 14,
                      }}
                    >
                      {WB_LABELS.generRapport[locale]}
                    </a>
                  )}
                </div>
              );
            }

            // Desktop: full 40 px-høg sticky-bar med status, profil, verdi, knapp
            return (
              <div
                style={{
                  position: "fixed",
                  // Plassert under navbaren (.uk-header). Bruker CSS-variabel
                  // med 64px fallback (matchar headerens padding 18px top/bot +
                  // ~28px innhald = ~64px). Kan overstyrast i tokens.css om
                  // header-høgda endrast.
                  top: "var(--header-height, 64px)",
                  left: 0,
                  right: 0,
                  background: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  borderBottom: "1px solid var(--border)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  padding: "8px 20px",
                  // z-index lågare enn navbarens 50, slik at navbaren ligg på topp
                  zIndex: 40,
                  animation: "mc-fade-in 0.18s ease-out",
                }}
              >
                <div
                  style={{
                    maxWidth: 1200,
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "nowrap",
                    minHeight: 24,
                  }}
                >
                  {/* Status-badge (decision_status) */}
                  <Badge status={DECISION_STATUS_TONES[controllerDecision.decision_status]}>
                    {decisionStatusLabel(controllerDecision.decision_status, locale)}
                  </Badge>

                  {/* Styrande dimensjonerande verdi (om tilgjengeleg) */}
                  {styrendeKey && styrendeValue && (
                    <>
                      <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>·</span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "baseline",
                          gap: 4,
                          fontSize: 13,
                          color: "var(--fg)",
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        <span
                          className="uk-eyebrow"
                          style={{
                            fontSize: 10,
                            color: "var(--fg-muted)",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {tileLabel(styrendeKey, locale)}
                        </span>
                        <span className="uk-mono" style={{ fontWeight: 600, fontSize: 14 }}>
                          {styrendeValue}
                        </span>
                      </span>
                    </>
                  )}

                  {/* Spacer */}
                  <span style={{ flex: 1, minWidth: 0 }} />

                  {/* Generer rapport-knapp */}
                  {currentRunId && calculationA && calculationB && (
                    <a
                      href={`/rapport/${currentRunId}`}
                      onClick={saveStateToSession}
                      className="uk-btn uk-btn--primary"
                      style={{ padding: "6px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                    >
                      {WB_LABELS.generRapport[locale]}
                    </a>
                  )}
                </div>
              </div>
            );
          })()}

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

// === Matte-rendering av results-keys (#06b) ===
// Konverterer snake_case-keys til JSX med Greek-symbol + subscript-tags,
// slik at "M_Ed" rendrast som M med Ed som senka tekst, og "gamma_G" som
// γ_G. Brukast i Resultat-tabellen for å gi fag-typografi i staden for
// rå snake_case som ser ut som kode.
//
// Avgrensingar (pilot):
// - Skiljer ikkje mellom "E_d" (E med d-subscript) og "Ed" (samansett namn) —
//   stoler på agentens underscore-plassering. Ed_ULS treff "Ed" som hovudsymbol.
// - Subscript med fleire delar slåast saman med komma: psi_0_kategori_B →
//   ψ med "0,kategori,B" som subscript.
const GREEK_LETTERS: Record<string, string> = {
  // Små bokstavar — det vanlegaste i konstruksjonsfag
  alpha: "α", beta: "β", gamma: "γ", delta: "δ",
  epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", omicron: "ο", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ",
  phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  // Store bokstavar (sjeldnare, men fagleg t.d. Φ, Δ, Σ)
  Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ",
  Epsilon: "Ε", Zeta: "Ζ", Eta: "Η", Theta: "Θ",
  Lambda: "Λ", Mu: "Μ", Nu: "Ν", Xi: "Ξ",
  Pi: "Π", Rho: "Ρ", Sigma: "Σ", Tau: "Τ",
  Phi: "Φ", Chi: "Χ", Psi: "Ψ", Omega: "Ω",
};

function renderMathKey(key: string): React.ReactNode {
  const parts = key.split("_");
  if (parts.length === 0 || !parts[0]) return key;

  // Første del: Greek-symbol om matchande, elles ordet uendra
  const head = GREEK_LETTERS[parts[0]] ?? parts[0];

  // Ingen underscore → berre hovudsymbol
  if (parts.length === 1) return head;

  // Resten: subscript, komma-separert om fleire delar
  const subscript = parts.slice(1).join(",");
  return (
    <>
      {head}
      <sub style={{ fontSize: "0.72em", verticalAlign: "sub", marginLeft: "0.5px" }}>
        {subscript}
      </sub>
    </>
  );
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
                    {renderMathKey(k)}
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

// === KontrollorChipPill (#02) ===
// Kompakt chip for fag-flagg i Kontrollør-kortet. Klikk på chip utvidar
// han inline til å vise full tekst (multi-linje, wrappa). Klikk igjen
// kollapsar tilbake til truncert form. Multiple chips kan vere utvida
// samtidig — kvar chip styrer sin eigen state.
//
// Designval: Inline-utviding i staden for popover gjer at studenten kan
// samanlikne fleire faglege merknader side om side utan å miste kontekst.
// Pille-radius vert redusert til 8px ved utviding for å handtere multi-
// linje pent (full pill-radius ser rart ut når innhaldet wrappar).
function KontrollorChipPill({
  chip,
  index = 0,
  enableAura = false,
  fullWidth = false,
}: {
  chip: KontrollorChip;
  index?: number;
  enableAura?: boolean;
  /** True når chipen er del av ein vertikal liste — strekker til full bredde.
   *  False (default) gir pille-form som passer innhaldet (brukt for korte
   *  konfidens-chips i wrap-rad). */
  fullWidth?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // hasAppeared (#anim-02): triggrar stagger-animasjonen først når chipen
  // er minst 10% synleg i viewporten. Brukar sin auga er på Kontrollør-
  // kortet øvst først, så animasjonen må vente til dei faktisk ser raden.
  const [hasAppeared, setHasAppeared] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hasAppeared) return;
    const el = buttonRef.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setHasAppeared(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAppeared(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasAppeared]);

  const toneStyles: Record<"info" | "warn" | "neutral", { bg: string; border: string; color: string }> = {
    info: {
      bg: "rgba(79, 139, 110, 0.06)", // grøn-tona som matchar uk-badge--ok
      border: "rgba(79, 139, 110, 0.4)",
      color: "var(--fg)",
    },
    warn: {
      bg: "var(--surface-2)",
      border: "var(--border)",
      color: "var(--fg-2)",
    },
    neutral: {
      bg: "var(--surface)",
      border: "var(--border)",
      color: "var(--fg-2)",
    },
  };
  const s = toneStyles[chip.tone];
  // Chip er klikkbar berre om det finst meir tekst å vise — dvs. body
  // eksisterer og er forskjellig frå den synlege chip-teksten.
  const isExpandable =
    !!chip.body && chip.body.trim() !== chip.text.trim();

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => isExpandable && setExpanded(!expanded)}
      aria-expanded={isExpandable ? expanded : undefined}
      disabled={!isExpandable}
      className={[
        "pilar-chip-stagger",
        hasAppeared ? "pilar-chip-stagger--visible" : "",
        enableAura && isExpandable && !expanded && hasAppeared ? "pilar-chip-aura" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        display: fullWidth ? "flex" : "inline-flex",
        alignItems: "flex-start", // top-align for multi-linje
        gap: 5,
        // Padding: kompakt for pille (konfidens), litt meir for full-bredde
        // fag-chips (gir luft når dei står som vertikal liste).
        padding: expanded
          ? "10px 14px 12px"
          : fullWidth
            ? "6px 12px"
            : "4px 10px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        // borderRadius: pille (999) for kompakte konfidens-chips, rounded-
        // rect (8) for full-bredde fag-chips og for alle utvida chips.
        borderRadius: expanded || fullWidth ? 8 : 999,
        fontSize: expanded ? 13 : fullWidth ? 12.5 : 12,
        color: s.color,
        lineHeight: expanded ? 1.6 : 1.5,
        whiteSpace: expanded ? "normal" : "nowrap",
        overflow: expanded ? "visible" : "hidden",
        textOverflow: expanded ? "clip" : "ellipsis",
        cursor: isExpandable ? "pointer" : "default",
        fontFamily: "inherit",
        textAlign: "left",
        // Full bredde berre når fullWidth-prop er sett (vertikal liste).
        // maxWidth begrenser utvida prosa-blokk til ~720px for lesbarheit.
        width: fullWidth ? "100%" : undefined,
        maxWidth: expanded
          ? "min(100%, 720px)"
          : fullWidth
            ? "100%"
            : undefined,
        // transition: flytta til CSS (.pilar-chip-stagger--visible) slik at
        // hover sin transform/box-shadow får same smooth easing utan å bli
        // overskriven av inline-style.
        // Stagger-forsinking: 80ms per chip-index. Klampes til 800ms max
        // for store chip-lister. Køyrer berre når --visible-klassen er sett.
        animationDelay: `${Math.min(index * 80, 800)}ms`,
        // Aura-bølge nedover: kvar chip startar sin aura-puls litt etter
        // forrige, slik at pulsen renner frå topp til bunn av lista.
        // 250ms per chip-posisjon, klampes til 4s max. Pilar-aura sin
        // animation-delay les denne custom property'n.
        ["--aura-delay" as string]: `${1.5 + Math.min(index * 0.25, 4)}s`,
      }}
    >
      {chip.prefix && (
        <span
          style={{
            fontWeight: 600,
            opacity: 0.85,
            flexShrink: 0,
            lineHeight: 1.5,
            // Når utvida, hold prefix-en oppe på linje med overskrifta
            marginTop: expanded ? 1 : 0,
          }}
        >
          {chip.prefix}
        </span>
      )}
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: expanded ? 8 : 0 }}>
        {/* Overskrift — alltid synleg. Når utvida, fed for å vise det er ein
            tittel; når kollapsa, normal vekt. */}
        <span
          style={{
            fontWeight: expanded ? 600 : 400,
            color: expanded ? "var(--fg)" : s.color,
          }}
        >
          {chip.text}
        </span>
        {/* Body — berre når utvida. Prosa-tekst splitta i avsnitt på
            setningsgrenser (punktum + space + stor bokstav) for å gjere
            lange forklaringar lettare å skanne. Konstruktør-namn vert markert
            fed slik at lesaren raskt kan sjå kva som gjeld kva agent. */}
        {expanded && chip.body && (
          <span
            style={{
              color: "var(--fg-2)",
              fontWeight: 400,
              fontSize: 13,
              lineHeight: 1.65,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {chip.body
              // Splitt på setningsgrenser: punktum/utropsteikn/spørsmålsteikn
              // etterfølgt av whitespace + stor bokstav. Lookbehind/lookahead
              // sikrar at vi ikkje splittar inne i forkortingar eller tal.
              .split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])/)
              .map((sentence) => sentence.trim())
              .filter(Boolean)
              .map((sentence, i) => (
                <span key={i}>
                  {/* Detekter konstruktør-prefix og marker fed for skanning */}
                  {(() => {
                    const m = sentence.match(/^(Konstruktør [AB]s?|Begge konstruktørar?|Begge tilnærminger?)/);
                    if (!m) return sentence;
                    return (
                      <>
                        <strong style={{ fontWeight: 600, color: "var(--fg)" }}>
                          {m[0]}
                        </strong>
                        {sentence.slice(m[0].length)}
                      </>
                    );
                  })()}
                </span>
              ))}
          </span>
        )}
      </span>
    </button>
  );
}

// === CountUp (#anim-01) ===
// Tellast opp frå 0 til endeverdi over 1100ms med ease-out cubic. Animasjonen
// triggrast når tile-en KJEM I VIEW (via IntersectionObserver), ikkje ved
// mount. Det er fordi tiles ofte er nedanfor fold ved første mount —
// brukaren si auga er på Kontrollør-kortet på toppen først, og når dei
// scrollar ned skal count-up fortsatt skje. Køyrer berre ein gong per tile-
// instans. Respekterer prefers-reduced-motion.
//
// Format-bevaring: same antall desimalar og same skiljeteikn (norsk komma)
// som original-verdien.
function CountUp({
  numberStr,
  durationMs = 1100,
}: {
  numberStr: string;
  durationMs?: number;
}) {
  // Parse: "5120" → { value: 5120, decimals: 0, separator: "" }
  //        "10,58" → { value: 10.58, decimals: 2, separator: "," }
  const parsed = (() => {
    const cleaned = numberStr.replace(/[≈~<>≥≤]/g, "").replace(/\s/g, "").trim();
    const usesComma = cleaned.includes(",");
    const normalized = usesComma ? cleaned.replace(",", ".") : cleaned;
    const value = parseFloat(normalized);
    if (!isFinite(value)) return null;
    const decimalsMatch = cleaned.match(/[.,](\d+)$/);
    const decimals = decimalsMatch ? decimalsMatch[1].length : 0;
    return { value, decimals, separator: usesComma ? "," : "." };
  })();

  // Start på 0 — første render viser "0", deretter animerer vi opp.
  const [current, setCurrent] = useState<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!parsed) return;

    // Reduced-motion: hopp direkte til endeverdi, ingen animasjon
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCurrent(parsed.value);
      return;
    }

    const element = spanRef.current;
    if (!element) {
      // Fallback om ref ikkje sat enno — sett endeverdi direkte
      setCurrent(parsed.value);
      return;
    }

    let hasStarted = false;
    let raf: number | null = null;

    const startAnimation = () => {
      if (hasStarted) return;
      hasStarted = true;
      const target = parsed.value;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / durationMs, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        setCurrent(target * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // Trigge når tile er minst 20% synleg
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (raf !== null) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!parsed) return <>{numberStr}</>;

  // Format: behaldar separator + antall desimalar
  const formatted = current
    .toFixed(parsed.decimals)
    .replace(".", parsed.separator);
  return (
    <span ref={spanRef} style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatted}
    </span>
  );
}

// === DimensjonerandeTile (#01b) ===
// Ein enkelt klikkbar tile. Klikk utvidar tile-en inline til å vise
// fagleg forklaring av kva verdien tyder (frå KEY_TILE_DESCRIPTIONS).
// Tile utan registrert beskrivelse er ikkje klikkbar — cursor default,
// ingen onClick-handler. Multiple tiles kan vere utvida samtidig.
function DimensjonerandeTile({
  k,
  value,
  isStyrande,
  span,
  locale,
}: {
  k: string;
  value: string;
  isStyrande: boolean;
  span: number;
  locale: Locale;
}) {
  const [expanded, setExpanded] = useState(false);
  const { number, unit } = splitNumberUnit(value);
  const description = KEY_TILE_DESCRIPTIONS[k]?.[locale];
  const isClickable = !!description;

  return (
    <button
      type="button"
      onClick={isClickable ? () => setExpanded(!expanded) : undefined}
      aria-expanded={isClickable ? expanded : undefined}
      className={
        isClickable
          ? `pilar-tile-clickable${isStyrande ? " pilar-tile-dark" : ""}`
          : undefined
      }
      style={{
        // Reset browser button-defaults
        appearance: "none",
        font: "inherit",
        textAlign: "left",
        // Layout
        padding: expanded ? "13px 14px 14px" : "13px 14px 12px",
        borderRadius: "var(--r-sm)",
        background: isStyrande ? "var(--fg)" : "var(--surface)",
        color: isStyrande ? "var(--surface)" : "var(--fg)",
        border: isStyrande ? "1px solid transparent" : "1px solid var(--border)",
        gridColumn: `span ${span}`,
        minWidth: 0, // tillet grid-cella å krympe utan å sprenge wrap
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: isClickable ? "pointer" : "default",
        // transition er flytta til .pilar-tile-clickable-klassen så hover
        // sin transform/box-shadow får same easing-kurve som padding-overgangen
      }}
    >
      <div
        className="uk-eyebrow"
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          color: isStyrande ? "var(--surface)" : "var(--fg-muted)",
          opacity: isStyrande ? 0.7 : 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={k}
      >
        {tileLabel(k, locale)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 5,
          flexWrap: "nowrap",
          minWidth: 0,
          lineHeight: 1,
        }}
      >
        <span
          className="uk-mono"
          style={{
            fontSize: isStyrande ? 26 : 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
          }}
        >
          <CountUp numberStr={number} />
        </span>
        {unit && (
          <span
            className="uk-mono"
            style={{
              fontSize: 11,
              opacity: 0.7,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {expanded && description && (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 12,
            lineHeight: 1.55,
            color: isStyrande ? "var(--surface)" : "var(--fg-2)",
            opacity: isStyrande ? 0.85 : 1,
            whiteSpace: "normal",
            fontFamily: "inherit",
          }}
        >
          {description}
        </p>
      )}
    </button>
  );
}

// === DimensjonerandeTiles (#01) ===
// Layout matchar Claude Design sin mock: 4-kol grid med dynamiske spans:
//   1 tile  → spenner heile rada (full breidde)
//   2 tiles → 2+2 (50/50)
//   3 tiles → styrande 2 + 1 + 1 (matchar mock-rad 1)
//   4 tiles → styrande 2 + 1 + 1 / 4 (4. tile på eiga full-breidde rad,
//             som KVASI-PERMANENT i mock'en)
//   5 tiles → 2+1+1 / 2+2 (rad 2 jamt fordelt)
//   6+ tiles → vert standard 2+1+1+1+1+1 (wrap-fri)
//
// Styrande tile (første i lista) har mørk bakgrunn, dei andre lyse.
// align-items: start på grid hindrar at andre tiles strekker seg når
// éin tile vert utvida med fagleg forklaring (#01b).
//
// På smale viewports (mobile) reduserar minmax(0, 1fr) tiles til lågare
// pikselbredde — innhaldet held seg lesbart fordi font-storleik er kompakt.
function DimensjonerandeTiles({
  results,
  calculationType,
  locale,
}: {
  results: Record<string, string>;
  calculationType: string | null;
  locale: Locale;
}) {
  const keys = getDimensjonerandeKeys(results, calculationType);
  if (keys.length === 0) return null;

  // Bereknar grid-span for kvar tile basert på totalt antall.
  const spanForIndex = (i: number, total: number): number => {
    if (total === 1) return 4; // full breidde
    if (total === 2) return 2; // 2+2
    if (total === 3) return i === 0 ? 2 : 1; // 2+1+1
    if (total === 4) {
      if (i === 0) return 2; // styrande
      if (i === 3) return 4; // KVASI-aktig — full rad 2
      return 1; // dei to mellomste
    }
    if (total === 5) {
      if (i === 0) return 2; // styrande
      if (i <= 2) return 1; // rad 1: 2+1+1
      return 2; // rad 2: 2+2
    }
    // 6+ tiles: styrande span 2, resten span 1, wrap naturleg
    return i === 0 ? 2 : 1;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 10,
        marginTop: 0,
        marginBottom: 4,
        alignItems: "start", // hindrar stretch når éin tile utvidast
      }}
    >
      {keys.map((k, i) => (
        <DimensjonerandeTile
          key={k}
          k={k}
          value={results[k] ?? ""}
          isStyrande={i === 0}
          span={spanForIndex(i, keys.length)}
          locale={locale}
        />
      ))}
    </div>
  );
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
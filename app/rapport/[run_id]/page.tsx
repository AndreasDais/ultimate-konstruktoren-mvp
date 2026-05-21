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
import { PageStripe } from "./_components/PageStripe";
import { ChapterHeading } from "./_components/ChapterHeading";
import { ForebelStripe } from "./_components/ForebelStripe";
import { FormulaStack } from "./_components/FormulaStack";
import { OrdlisteFlyt } from "./_components/OrdlisteFlyt";
import {
  getDimensjonerandeKeys,
  isInputKey,
  isBruksgrenseKey,
  splitNumberUnit,
  isSetningResult,
} from "@/lib/result/tile-heuristics";
import { renderMathKey } from "@/lib/result/formula-extract";
import {
  lookupMarginalia,
  scanTextForCatalogKeys,
  type MarginaliaEntry,
} from "@/lib/marginalia-katalog";

/**
 * Avgjer om eit berekningssteg er eit KONTROLL-/konsistens-steg heller enn
 * eit reelt utrekningssteg.
 *
 * Konstruktørane avsluttar ofte med eit steg som ikkje reknar ut noko nytt,
 * men som verifiserer at tidlegare resultat heng saman — likevektssjekk,
 * kryssjekk via alternativ metode, eller relasjon mellom kombinasjonar.
 * Slike steg fortener eit anna visuelt uttrykk enn "STEG NN" (dei er ikkje
 * ein del av den progressive utrekninga — dei er ein sluttkontroll).
 *
 * Heuristikk: tittel inneheld eit kontroll-nøkkelord. Bevisst konservativ —
 * vi vil heller misse eit kontroll-steg enn å feilmerke eit reelt steg.
 */
function isControlStep(title: string): boolean {
  if (!title) return false;
  return /\b(kontroll|kryss-?sjekk|kryss-?kontroll|verifikasjon|verifiser|konsistens|likevekt|sjekk|oppsummering)\b/i.test(
    title,
  );
}

/**
 * Normaliserer ein variabel-key til ein samanliknbar kanonisk form.
 *
 * Brukast til å matche keys på tvers av kjelder som kan formatere ulikt:
 *   - Konstruktør A: "Ed_ULS_ugunstig_permanent"
 *   - Konstruktør B: "E_d_ULS_ugunstig" eller "Ed,ULS,ugunstig,permanent"
 *   - Agent C field: "E_d,ULS (ugunstig)"
 *
 * Strategi: lowercase, fjern alle ikkje-alfanumeriske teikn. Resultatet er
 * ein "fingerprint" som er robust mot underscore/komma/parentes/mellomrom-
 * variasjon. Aggressivt, men variabel-keys i konstruksjonsfag er korte og
 * kollisjonsrisikoen er låg.
 */
function normalizeKeyForMatch(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Normaliserer ein talverdi-streng for numerisk samanlikning.
 *
 * Handsamar:
 *   - Norsk desimal-komma: "6,0" → "6.0"
 *   - Trailing-nullar: "6.000" → "6", "7.50" → "7.5"
 *   - Eining-suffiks: "10,58 kN/m²" → "10.58" (einingar strippast vekk)
 *   - Whitespace
 *
 * Returnerer null om strengen ikkje inneheld eit parsebart tal.
 * Brukast til å avgjere om to verdiar er numerisk like trass i format-skilnad.
 */
function normalizeNumeric(raw: string): number | null {
  if (!raw) return null;
  // Plukk første tal-aktige token: siffer, komma, punktum, minus
  const m = raw.replace(/\s/g, "").match(/-?[\d.,]+/);
  if (!m) return null;
  // Norsk konvensjon: komma er desimal. Fjern tusenskilje-punktum først er
  // risikabelt (kan vere desimal), men i konstruksjonsfag-output er komma
  // alltid desimal og punktum sjeldan brukt — vi konverterer komma→punktum.
  const num = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

/**
 * Normalisert limitations-entry for § 03.2 ("Hva er ikke beregnet").
 *
 * Tre felt:
 *   - subject: KVA som ikkje er rekna (kort substantiv-frase)
 *   - reason: KVIFOR det ikkje er rekna (kan vere null)
 *   - key: variabel-key for renderMathKey, om ein lar seg utleie
 *
 * Datakjelder:
 *   - Pilot: limitations er `string[]`. Strengane følgjer ofte mønsteret
 *     "<subject> er ikke beregnet — <reason>" — vi parsar det ut.
 *   - Post-5a: limitations blir `{ key, reason }[]` — strukturert direkte.
 */
type LimitationEntry = {
  subject: string;
  reason: string | null;
  key: string | null;
};

/**
 * Forsøker å splitte ein limitation-streng i subject + reason.
 *
 * Mønster (i prioritert rekkjefølgje):
 *   1. "<subject> er ikke beregnet — <reason>"  (em-dash separator)
 *   2. "<subject> er ikkje rekna — <reason>"    (nynorsk variant)
 *   3. "<subject> — <reason>"                   (rein em-dash-splitt)
 *   4. "<subject>: <reason>"                    (kolon-splitt)
 *   5. ingen separator → heile strengen er subject, reason = null
 *
 * "er ikke beregnet"/"er ikkje rekna"-frasen blir fjerna frå subject sidan
 * band-headeren ("IKKJE DEKKA AV DENNE RAPPORTEN") allereie kommuniserer det.
 */
function parseLimitationString(raw: string): { subject: string; reason: string | null } {
  const text = raw.trim();
  if (!text) return { subject: "", reason: null };

  // Splitt på em-dash (—) eller " - " (mellomrom-bindestrek-mellomrom).
  // Vanleg bindestrek utan mellomrom blir IKKJE splitta (kan vere i ord).
  const dashMatch = text.match(/^(.*?)\s+[—–]\s+(.*)$/) ??
    text.match(/^(.*?)\s+-\s+(.*)$/);
  if (dashMatch) {
    return {
      subject: cleanLimitationSubject(dashMatch[1]),
      reason: dashMatch[2].trim() || null,
    };
  }

  // Kolon-splitt — men berre om kolon ikkje er del av eit tal/forhold
  const colonMatch = text.match(/^([^:]+):\s+(.+)$/);
  if (colonMatch) {
    return {
      subject: cleanLimitationSubject(colonMatch[1]),
      reason: colonMatch[2].trim() || null,
    };
  }

  // Ingen separator
  return { subject: cleanLimitationSubject(text), reason: null };
}

/**
 * Fjernar "er ikke beregnet"/"er ikkje rekna"-frasen frå ein subject-streng.
 * Band-headeren kommuniserer allereie at dette er ikkje-rekna; å gjenta det
 * på kvar rad er støy.
 */
function cleanLimitationSubject(s: string): string {
  return s
    .trim()
    .replace(/\s+er\s+ikk?j?e\s+(beregnet|rekna|berekna)\s*$/i, "")
    .trim();
}

function normalizeLimitations(
  raw: unknown[] | null | undefined,
): LimitationEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((item): LimitationEntry => {
    if (typeof item === "string") {
      // Pilot-format: parse "<subject> er ikke beregnet — <reason>"
      const { subject, reason } = parseLimitationString(item);
      return { subject, reason, key: null };
    }
    if (item && typeof item === "object") {
      // Post-5a-format: { key, reason } strukturert
      const obj = item as Record<string, unknown>;
      const k = typeof obj.key === "string" ? obj.key : null;
      const r = typeof obj.reason === "string" ? obj.reason : "";
      // subject kan vere eksplisitt felt, elles fall til key
      const subj =
        typeof obj.subject === "string" && obj.subject.trim()
          ? obj.subject.trim()
          : k ?? "";
      return { subject: subj, reason: r || null, key: k };
    }
    return { subject: String(item ?? ""), reason: null, key: null };
  });
}

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
  // Fase 2 — § 01 + § 02 (B-redesign)
  forespurselLabel: { nb: "FORESPØRSEL", nn: "FORESPØRSEL" },
  bandDimensjonerande: { nb: "DIMENSJONERENDE", nn: "DIMENSJONERANDE" },
  bandBruksgrense: { nb: "BRUKSGRENSE", nn: "BRUKSGRENSE" },
  bandInputGeometri: { nb: "INPUT OG GEOMETRI", nn: "INPUT OG GEOMETRI" },
  sub21Forutsetninger: { nb: "02.1 — FORUTSETNINGER", nn: "02.1 — FØRESETNADER" },
  sub22Resultat: { nb: "02.2 — RESULTAT", nn: "02.2 — RESULTAT" },
  sub23Stegvis: { nb: "02.3 — STEGVIS UTREGNING", nn: "02.3 — STEGVIS UTREKNING" },
  stegPrefix: { nb: "STEG", nn: "STEG" },
  stegKontroll: { nb: "KONTROLL", nn: "KONTROLL" },
  chapter01Title: { nb: "Sammendrag", nn: "Samandrag" },
  chapter02Title: { nb: "Beregning", nn: "Berekning" },
  // Fase 3 — § 03 + § 04 (B-redesign)
  chapter03Title: { nb: "Vurdering", nn: "Vurdering" },
  chapter04Title: { nb: "Kontroll", nn: "Kontroll" },
  sub31FagleVurdering: { nb: "03.1 — FAGLIG VURDERING", nn: "03.1 — FAGLEG VURDERING" },
  sub32IkkjeBerekna: { nb: "03.2 — HVA ER IKKE BEREGNET", nn: "03.2 — KVA ER IKKJE REKNA" },
  sub33Advarsler: { nb: "03.3 — ADVARSLER", nn: "03.3 — ÅTVARINGAR" },
  sub41Konstruktorkontroll: { nb: "04.1 — KONSTRUKTØRKONTROLL", nn: "04.1 — KONSTRUKTØRKONTROLL" },
  sub42KontrollorAvgjerd: { nb: "04.2 — KONTROLLØRENS AVGJØRELSE", nn: "04.2 — KONTROLLØR SI AVGJERD" },
  sub43Konklusjon: { nb: "04.3 — KONKLUSJON", nn: "04.3 — KONKLUSJON" },
  bandIkkjeDekka: { nb: "IKKE DEKKET AV DENNE RAPPORTEN", nn: "IKKJE DEKKA AV DENNE RAPPORTEN" },
  advarselLabel: { nb: "ADVARSEL", nn: "ÅTVARING" },
  avgjerdLabel: { nb: "AVGJØRELSE", nn: "AVGJERD" },
  signKontrollertCaption: { nb: "Navn · stilling · foretak", nn: "Namn · stilling · føretak" },
  signSignaturCaption: { nb: "Manuell signering", nn: "Manuell signering" },
  signDatoCaption: { nb: "DD.MM.ÅÅÅÅ", nn: "DD.MM.ÅÅÅÅ" },
  // Fase 4 — Marginalia
  marginaliaTitle: { nb: "ORDLISTE", nn: "ORDLISTE" },
  // P3 — Konstruktørkontroll-berikning (§ 04.1)
  kontrollSammeResultatKort: {
    nb: "Begge kom frem til numerisk identiske verdier, vist i tabellen under.",
    nn: "Begge kom fram til numerisk identiske verdiar, vist i tabellen under.",
  },
  kontrollMedAvvikKort: {
    nb: "Tabellen under viser sammenligningen rad-for-rad. Avvik er markert.",
    nn: "Tabellen under viser samanlikninga rad-for-rad. Avvik er markerte.",
  },
  kontrollFallback: {
    nb: "De kom frem til samme resultat.",
    nn: "Dei kom fram til same resultat.",
  },
  verifikasjonKolStorleik: { nb: "Størrelse", nn: "Storleik" },
  verifikasjonKolKonstruktorA: { nb: "Konstruktør A", nn: "Konstruktør A" },
  verifikasjonKolKonstruktorB: { nb: "Konstruktør B", nn: "Konstruktør B" },
  verifikasjonKolSamsvar: { nb: "Samsvar", nn: "Samsvar" },
  verifikasjonManglar: { nb: "—", nn: "—" },
  verifikasjonAvvikKort: { nb: "Avvik", nn: "Avvik" },
  verifikasjonSamsvarAria: { nb: "Samsvar mellom konstruktørene", nn: "Samsvar mellom konstruktørane" },
  verifikasjonAvvikAria: { nb: "Avvik mellom konstruktørene", nn: "Avvik mellom konstruktørane" },
  verifikasjonUkjentAria: { nb: "Verdi ikke tilgjengelig fra Konstruktør B", nn: "Verdi ikkje tilgjengeleg frå Konstruktør B" },
  // Forside-tabular metadata (Fase 1, B-redesign — utan kolon)
  forsideMetaDokumentID: { nb: "Dokument-ID", nn: "Dokument-ID" },
  forsideMetaBrukar: { nb: "Bruker", nn: "Brukar" },
  forsideMetaDato: { nb: "Dato", nn: "Dato" },
  forsideMetaStatus: { nb: "Status", nn: "Status" },
  forsideMetaVersjon: { nb: "Versjon", nn: "Versjon" },
  forsideFallbackTittel: { nb: "Beregningsnotat", nn: "Berekningsnotat" },
  forsideTillitOverskrift: { nb: "Tillit", nn: "Tillit" },
  forsideAITekst: { nb: "AI-generert dokument", nn: "AI-generert dokument" },
  disclaimerKort: {
    nb: "Innholdet skal kun brukes som støtte, læringshjelp eller foreløpig teknisk vurdering. Ikke erstatning for kontroll av kvalifisert fagperson.",
    nn: "Innhaldet skal berre brukast som støtte, læringshjelp eller førebels teknisk vurdering. Ikkje ein erstatning for kontroll av kvalifisert fagperson.",
  },
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
    limitations?: unknown[];
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

/**
 * Talavvik mellom Konstruktør A og B for eit gjeve felt, frå Samanliknar
 * (Agent C). field-namnet er Agent C sitt fritekst-namn og matchar ikkje
 * nødvendigvis A/B sine result-keys ein-til-ein — krev fuzzy matching.
 */
type NumericDifference = {
  field: string;
  agent_a_value: string;
  agent_b_value: string;
  percent_diff: number;
  severity: "low" | "medium" | "high" | "critical";
  likely_cause: string;
};

type Comparison = {
  match_status: string;
  comparison_data: unknown;
  // numeric_differences kan ligge anten direkte på objektet eller nøsta i
  // comparison_data — handsamast defensivt i derived-logikken under.
  numeric_differences?: NumericDifference[];
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

  // === Forside-data (Fase 1, B-redesign) ===
  // report_title + report_subtitle kjem frå Tolkar-agenten via inputReview.parsed_data
  // (avtalt avgjerd 1a). Foreløpig kan dei mangle — fall tilbake til "Berekningsnotat".
  const parsedData = data.inputReview?.parsed_data as
    | Record<string, unknown>
    | null
    | undefined;
  const reportTitle =
    typeof parsedData?.report_title === "string" && parsedData.report_title.trim()
      ? (parsedData.report_title as string)
      : RP_LABELS.forsideFallbackTittel[locale];
  const reportSubtitle =
    typeof parsedData?.report_subtitle === "string" && parsedData.report_subtitle.trim()
      ? (parsedData.report_subtitle as string)
      : null;

  // Brukar-felt (avgjerd 3 valfri) — pilot har ikkje auth-profilar, så
  // alltid null fram til vi har data. Conditional render under.
  const userDisplay: string | null = null;

  // Status-badge variant for forsida. Mappar decision_status → CSS-suffix.
  const STATUS_BADGE_VARIANT: Record<string, "ok" | "gold" | "warn" | "bad"> = {
    approved: "ok",
    approved_with_warnings: "gold",
    uncertain: "warn",
    rejected: "bad",
  };
  const statusBadgeVariant =
    STATUS_BADGE_VARIANT[data.controllerDecision?.decision_status ?? ""] ?? "gold";

  // P3 — Statusspesifikk kort verdict-tekst for § 04.2.
  // Forsida vis full controller.user_message som tillit-prose; verdict-boksen
  // i § 04.2 dupliserte same prosa ord-for-ord. P3-fiks: bruk ein kort,
  // statusspesifikk "avgjerd"-utsegn i staden, lik ein stempel-tekst.
  // Held forsida som tillit-narrativ, verdict-box som beslutning.
  const VERDICT_SHORT: Record<string, Record<Locale, string>> = {
    approved: {
      nb: "Beregningen er godkjent for visning. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering.",
      nn: "Berekninga er godkjend for visning. Føreset manuell verifisering av ansvarleg fagperson før bruk i prosjektering.",
    },
    approved_with_warnings: {
      nb: "Beregningen er foreløpig godkjent med advarsler. Skal verifiseres av ansvarlig fagperson før bruk i prosjektering.",
      nn: "Berekninga er førebels godkjend med åtvaringar. Skal verifiserast av ansvarleg fagperson før bruk i prosjektering.",
    },
    uncertain: {
      nb: "Konklusjonen er usikker. Beregningen skal granskes manuelt før den brukes til noe formål.",
      nn: "Konklusjonen er usikker. Berekninga skal granskast manuelt før ho blir brukt til noko formål.",
    },
    rejected: {
      nb: "Beregningen er avvist. Skal ikke brukes uten omfattende manuell verifikasjon.",
      nn: "Berekninga er avvist. Skal ikkje brukast utan omfattande manuell verifisering.",
    },
  };
  const verdictShortText =
    VERDICT_SHORT[data.controllerDecision?.decision_status ?? ""]?.[locale] ??
    VERDICT_SHORT.approved_with_warnings[locale];

  // === Resultat-tabell (Fase 2, § 02.2) ===
  // Splittar results i DIMENSJONERANDE + INPUT OG GEOMETRI via tile-heuristics.
  // calculationType les frå parsedData om det finst (Tolkar produserer dette
  // i parsed_data.calculation_type); fall til null = universell pattern-fallback.
  const calculationType =
    typeof parsedData?.calculation_type === "string"
      ? (parsedData.calculation_type as string)
      : null;
  // R2 — Filtrer vekk kontroll-/setning-keys FØR band-bygging. Agenten
  // legg av og til verdikt-setningar ("As,req ≥ As,min — OK") inn i
  // results; dei sprenger tal-kolonnane i resultat- og verifikasjons-
  // tabellen, og den reelle måleverdien finst som regel under ein eigen
  // numerisk key.
  const rawResultsObj = primary.structured_output.results ?? {};
  const resultsObj: Record<string, string> = Object.fromEntries(
    Object.entries(rawResultsObj).filter(
      ([k, v]) => typeof v === "string" && !isSetningResult(k, v),
    ),
  );
  const allDimKeys = getDimensjonerandeKeys(resultsObj, calculationType);
  // P1: Splitt allDimKeys i true-ULS-dim og SLS-bruksgrense. Lastkombinasjon-
  // pattern matchar både Ed_ULS_* og Ed_SLS_*, så vi får begge i allDimKeys —
  // men dei skal stå i ulike band fordi SLS er bruksgrensetilstand, ikkje
  // dimensjonerande på same måte som ULS. Klassifisering på band-nivå er
  // fagleg nødvendig for at studentar ikkje skal lære feil terminologi.
  const dimKeys = allDimKeys.filter((k) => !isBruksgrenseKey(k));
  const bruksgrenseKeys = allDimKeys.filter((k) => isBruksgrenseKey(k));
  const dimAndBruksgrenseSet = new Set([...dimKeys, ...bruksgrenseKeys]);
  const inputKeys = Object.keys(resultsObj).filter(
    (k) => !dimAndBruksgrenseSet.has(k) && isInputKey(k),
  );
  // "Restkeys": ikkje dim, ikkje bruksgrense, ikkje åpenbart input — gå med
  // i input-banda som "geometri/anna" rader for å unngå tap av data.
  const otherKeys = Object.keys(resultsObj).filter(
    (k) => !dimAndBruksgrenseSet.has(k) && !isInputKey(k),
  );
  const allInputBandKeys = [...inputKeys, ...otherKeys];

  // === § 03.2 Limitations (Fase 3) ===
  // Normaliser til { key, reason }[] uavhengig av input-format. Pilot-data er
  // string[], post-avgjerd-5a blir det { key, reason }[].
  const limitations = normalizeLimitations(
    primary.structured_output.limitations,
  );

  // === § 02 Marginalia (Fase 4) ===
  // Plukk unike result-keys, slå opp i marginalia-katalogen, filtrer vekk
  // ukjende (eller ord som "L" som ikkje gjev fagleg verdi).
  // Brukar Set for dedup — kan bli duplikatar viss agent har same key i
  // dimKeys og otherKeys (sjeldan, men forsvar mot dårleg input).
  //
  // Rekkefølgje: behaldar opphavleg agent-order — dim-keys først, så input/anna.
  // Bevisst val: marginalia speglar kvar key dukkar opp første gong, slik at
  // det blir lett å scanne lista mot tabellen ved sida av.
  // === § 02 Marginalia (Fase 4 + P2-utvida + P2-finpuss) ===
  // Plukk unike result-keys + scan all prosa for variabel-referansar.
  // P2-mål: kvar variabel som studenten ser i rapport-prosa eller tabellar
  // SKAL finnast i marginalia om han er i katalogen.
  //
  // Fire kjelder, i prioritert rekkjefølgje (først-sett vinn på dedup):
  //   1. dimKeys (DIMENSJONERANDE-band)
  //   2. bruksgrenseKeys (BRUKSGRENSE-band)
  //   3. allInputBandKeys (INPUT OG GEOMETRI-band)
  //   4. variable referert i ALL prosa (executive_summary, assumptions,
  //      technical_assessment, conclusion, warnings)
  //
  // To-lags dedup:
  //   - `seenMarginaliaKeys` på rå-key (psi_1 vs psi_2 er ulike)
  //   - `seenCatalogEntries` på katalog-entry-object-referanse
  //     (psi_1_kategori_B og psi_1 mappar til SAME object i katalogen, så
  //     skal berre vises éin gong — vi behaldar den med mest spesifikk
  //     subscript, dvs. den frå result-keys som kjem først).
  type MarginaliaItem = { key: string; entry: MarginaliaEntry };
  const seenMarginaliaKeys = new Set<string>();
  const seenCatalogEntries = new Set<MarginaliaEntry>();
  const marginaliaEntries: MarginaliaItem[] = [];

  // Step 1-3: result-keys frå dei tre banda
  for (const k of [...dimKeys, ...bruksgrenseKeys, ...allInputBandKeys]) {
    if (seenMarginaliaKeys.has(k)) continue;
    seenMarginaliaKeys.add(k);
    const entry = lookupMarginalia(k);
    if (entry && !seenCatalogEntries.has(entry)) {
      marginaliaEntries.push({ key: k, entry });
      seenCatalogEntries.add(entry);
    }
  }

  // Step 4: scan ALL prosa for ekstra variabel-referansar
  // (gamma_G, psi_0, G_k, ULS, SLS osb.) som ikkje er result-keys men som
  // studenten støyter på i rapport-tekst. Inkluderer executive_summary,
  // assumptions, technical_assessment, conclusion og warnings — heile
  // sjølve rapport-prosaen.
  const scanCorpusParts: string[] = [];
  if (typeof data.report.executive_summary === "string") {
    scanCorpusParts.push(data.report.executive_summary);
  }
  if (Array.isArray(primary.structured_output.assumptions)) {
    scanCorpusParts.push(...primary.structured_output.assumptions);
  }
  if (typeof data.report.technical_assessment === "string") {
    scanCorpusParts.push(data.report.technical_assessment);
  }
  if (typeof data.report.conclusion === "string") {
    scanCorpusParts.push(data.report.conclusion);
  }
  if (Array.isArray(primary.structured_output.warnings)) {
    scanCorpusParts.push(...primary.structured_output.warnings);
  }
  const scanCorpus = scanCorpusParts.join(" ");

  if (scanCorpus) {
    const textKeys = scanTextForCatalogKeys(scanCorpus);
    for (const k of textKeys) {
      if (seenMarginaliaKeys.has(k)) continue;
      seenMarginaliaKeys.add(k);
      const entry = lookupMarginalia(k);
      // Catalog-entry-dedup: berre ta med text-scan-keys som ikkje
      // allereie er dekt av ein result-key (eller tidlegare text-scan).
      if (entry && !seenCatalogEntries.has(entry)) {
        marginaliaEntries.push({ key: k, entry });
        seenCatalogEntries.add(entry);
      }
    }
  }

  const hasMarginalia = marginaliaEntries.length > 0;

  // P3 — § 04.1 Konstruktørkontroll: verifikasjonstabell.
  // Byggjer rader med Storleik | Konstruktør A | Konstruktør B | Samsvar.
  //
  // Utfordring: A og B kan bruke ulike key-namn for same storleik
  // (Ed_ULS_ugunstig vs E_d_ULS_ugunstig). Vi byggjer difor ein
  // normalisert lookup-tabell over B sine results og fuzzy-matchar.
  //
  // Samsvar-dom: Agent C (Samanliknar) er den faglege autoriteten på
  // A-vs-B. numeric_differences[] listar felt der C fann avvik. Ein key
  // som IKKJE er i numeric_differences er i samsvar etter C si vurdering.
  // Som backup samanliknar vi numerisk (normalizeNumeric) for å fange
  // format-skilnad ("6,0" vs "6,000").
  type VerifikasjonRow = {
    key: string;
    valueA: string;
    valueB: string | null;
    /** "match" | "avvik" | "ukjent" — driven av Agent C + numerisk backup */
    samsvar: "match" | "avvik" | "ukjent";
    /** Avviks-prosent frå Agent C, om tilgjengeleg */
    avvikPct?: number;
  };

  // Bygg normalisert lookup over Konstruktør B sine results
  const agentBResults = data.agentB.structured_output.results ?? {};
  const agentBNormalized = new Map<string, string>();
  for (const [k, v] of Object.entries(agentBResults)) {
    if (typeof v === "string") {
      agentBNormalized.set(normalizeKeyForMatch(k), v);
    }
  }

  // Bygg normalisert lookup over Agent C sine numeric_differences.
  // numeric_differences kan ligge direkte på comparison-objektet eller
  // vere nøsta inni comparison_data — vi prøver begge.
  const rawComparisonData = data.comparison?.comparison_data;
  const nestedNumericDiffs =
    rawComparisonData &&
    typeof rawComparisonData === "object" &&
    Array.isArray((rawComparisonData as Record<string, unknown>).numeric_differences)
      ? ((rawComparisonData as Record<string, unknown>)
          .numeric_differences as NumericDifference[])
      : null;
  const numericDiffs: NumericDifference[] = Array.isArray(
    data.comparison?.numeric_differences,
  )
    ? data.comparison!.numeric_differences!
    : (nestedNumericDiffs ?? []);
  const diffByNormalizedField = new Map<string, NumericDifference>();
  for (const d of numericDiffs) {
    if (d.field) diffByNormalizedField.set(normalizeKeyForMatch(d.field), d);
  }

  const verifikasjonRows: VerifikasjonRow[] = [];
  for (const k of [...dimKeys, ...bruksgrenseKeys]) {
    const valueA = resultsObj[k];
    if (!valueA || typeof valueA !== "string") continue;

    const normKey = normalizeKeyForMatch(k);
    const diff = diffByNormalizedField.get(normKey);

    // B-verdi: når Agent C har eit avvik for keyen, har han ALLEREIE
    // para A og B i numeric_differences — bruk hans agent_b_value. Det
    // er meir påliteleg enn å fuzzy-matche B sine rå results på nytt;
    // den matchen feilar når B brukar ein annan key (slik som for
    // ξ_lim). Reins ein eventuell leiande "=" frå agent-verdien.
    const diffValueB =
      diff?.agent_b_value?.replace(/^\s*=\s*/, "").trim() || null;
    const valueB = diffValueB ?? agentBNormalized.get(normKey) ?? null;

    // R3 — inga B-verdi nokon stad → ikkje ein reell kryss-sjekk; hopp
    // over rada (eit avvik-% skal aldri visast mot ei tom B-celle).
    // MERK: rader der A og B er UEINIGE skal IKKJE filtrerast bort —
    // eit reelt avvik (t.d. 27,1 % på ξ_lim, der A reknar frå
    // tøyningskompatibilitet og B brukar praktisk B500NC-verdi) er
    // sjølve poenget med konstruktørkontrollen og skal stå synleg.
    if (valueB === null) continue;

    let samsvar: VerifikasjonRow["samsvar"];
    let avvikPct: number | undefined;

    if (diff) {
      // Agent C fann eit avvik. "low" severity reknast som samsvar
      // (typisk avrunding), alt over som ekte avvik.
      avvikPct = diff.percent_diff;
      samsvar = diff.severity === "low" ? "match" : "avvik";
    } else {
      // Ikkje noko Agent C-avvik, men B har ein verdi — samanlikn
      // sjølv. Toleranse 0,5 % matchar Agent C si "low"-grense.
      const numA = normalizeNumeric(valueA);
      const numB = normalizeNumeric(valueB);
      if (numA !== null && numB !== null) {
        const rel =
          numA === 0
            ? Math.abs(numB)
            : Math.abs(numA - numB) / Math.abs(numA);
        samsvar = rel <= 0.005 ? "match" : "avvik";
      } else {
        samsvar = valueA.trim() === valueB.trim() ? "match" : "avvik";
      }
    }

    verifikasjonRows.push({ key: k, valueA, valueB, samsvar, avvikPct });
  }
  const hasVerifikasjon = verifikasjonRows.length > 0;
  const hasAvvik = verifikasjonRows.some((r) => r.samsvar === "avvik");

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
              FORSIDE — Retning B (Konsulent-notat). PageStripe topp,
              serif-tittel + italic underrubrikk, tabular metadata,
              tillit-blokk, kort disclaimer. Ingen eigen TOC-entry;
              scroll-spy behandlar den som del av Samandrag.
              ============================================================ */}
          <section
            className="rapport-section rapport-forside"
            id="forside"
            data-toc-id="samandrag"
          >
            <PageStripe
              documentId={data.report.document_id}
              date={reportDate}
              locale={locale}
            />

            <header className="rapport-forside__head">
              <h1 className="rapport-forside__title">{reportTitle}</h1>
              {reportSubtitle && (
                <p className="rapport-forside__subtitle">{reportSubtitle}</p>
              )}
            </header>

            <dl className="rapport-forside__meta">
              <div className="rapport-forside__meta-row">
                <dt>{RP_LABELS.forsideMetaDokumentID[locale]}</dt>
                <dd className="uk-mono">{data.report.document_id}</dd>
              </div>
              {userDisplay && (
                <div className="rapport-forside__meta-row">
                  <dt>{RP_LABELS.forsideMetaBrukar[locale]}</dt>
                  <dd>{userDisplay}</dd>
                </div>
              )}
              <div className="rapport-forside__meta-row">
                <dt>{RP_LABELS.forsideMetaDato[locale]}</dt>
                <dd>{reportDate}</dd>
              </div>
              <div className="rapport-forside__meta-row">
                <dt>{RP_LABELS.forsideMetaStatus[locale]}</dt>
                <dd>
                  <span
                    className={`rapport-forside__status-badge rapport-forside__status-badge--${statusBadgeVariant}`}
                  >
                    {decisionLabel}
                  </span>
                </dd>
              </div>
              <div className="rapport-forside__meta-row">
                <dt>{RP_LABELS.forsideMetaVersjon[locale]}</dt>
                <dd className="uk-mono">{formatPromptVersion(data.report.prompt_version)}</dd>
              </div>
            </dl>

            <div className="rapport-forside__trust">
              <div className="rapport-forside__trust-gauge">
                <TillitGauge
                  score={data.report.tillit_score}
                  breakdown={data.report.tillit_breakdown}
                />
              </div>
              {data.controllerDecision?.user_message && (
                <div className="rapport-forside__trust-prose">
                  <p>{data.controllerDecision.user_message}</p>
                </div>
              )}
            </div>

            <aside className="rapport-forside__disclaimer" role="note">
              <div className="rapport-forside__disclaimer-label">
                <span>{RP_LABELS.viktigMerknad[locale]}</span>
                <span className="rapport-forside__disclaimer-sep" aria-hidden="true">·</span>
                <span>{RP_LABELS.forsideAITekst[locale]}</span>
              </div>
              <p className="rapport-forside__disclaimer-body">
                {RP_LABELS.disclaimerKort[locale]}
              </p>
            </aside>
          </section>

          {/* ============================================================
              § 01 SAMANDRAG — executive_summary + Forespørsel-blokk
              Retning B: ChapterHeading + prosa + tan/cream-blokk for input.
              ============================================================ */}
          <section
            className="rapport-section rapport-section--group"
            id="samandrag"
            data-toc-id="samandrag"
          >
            <ChapterHeading
              num="01"
              title={RP_LABELS.chapter01Title[locale]}
              first
            />

            <p className="rapport-prose">{data.report.executive_summary}</p>

            <div id="forespurnad" className="rapport-forespurnad-block">
              <div className="rapport-forespurnad-block__label">
                {RP_LABELS.forespurselLabel[locale]}
              </div>
              <pre className="rapport-forespurnad-block__text">
                {data.run.request.raw_text}
              </pre>
            </div>
          </section>

          {/* ============================================================
              § 02 BEREKNING — 02.1 Forutsetninger, 02.2 Resultat (med
              DIMENSJONERANDE/INPUT-band), 02.3 Stegvis utregning.
              Retning B: chapter-heading + sub-eyebrows + band-tabell.
              Input-tolking-blokken er fjerna (avgjerd 2a) — Tolkar-status
              er framleis synleg i Kontrollstatus-panelet.
              ============================================================ */}
          {hasBerekningContent && (
            <section
              className="rapport-section rapport-section--group"
              id="berekning"
              data-toc-id="berekning"
            >
              <ChapterHeading num="02" title={RP_LABELS.chapter02Title[locale]} />

              <div className="rapport-berekning-content">
              {/* ORDLISTE — print-trygg notasjon-blokk øvst i § 02.
                  Synleg i PDF/Word-eksport. Den flytande OrdlisteFlyt
                  er ein rein skjerm-snarveg til same liste. */}
              {hasMarginalia && (
                <div
                  className="rapport-ordliste"
                  role="group"
                  aria-label={RP_LABELS.marginaliaTitle[locale]}
                >
                  <div className="rapport-ordliste__title">
                    {RP_LABELS.marginaliaTitle[locale]}
                  </div>
                  <dl className="rapport-ordliste__list">
                    {marginaliaEntries.map(({ key, entry }) => (
                      <div key={key} className="rapport-ordliste-item">
                        <dt className="rapport-ordliste-item__key">
                          {renderMathKey(key)}
                        </dt>
                        <dd className="rapport-ordliste-item__desc">
                          {entry.description}
                          {entry.unit && (
                            <span className="rapport-ordliste-item__unit">
                              {" "}({entry.unit})
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* 02.1 — Forutsetninger (numerert .01 .02 .03) */}
              {primary.structured_output.assumptions &&
                primary.structured_output.assumptions.length > 0 && (
                  <div id="foresetnader" className="rapport-subchapter">
                    <div className="rapport-subchapter__eyebrow">
                      {RP_LABELS.sub21Forutsetninger[locale]}
                    </div>
                    <ol className="rapport-numbered-list">
                      {primary.structured_output.assumptions.map((a, i) => (
                        <li key={i} className="rapport-numbered-list__item">
                          <span className="rapport-numbered-list__num">
                            .{(i + 1).toString().padStart(2, "0")}
                          </span>
                          <span className="rapport-numbered-list__text">{a}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

              {/* 02.2 — Resultat (DIM-band + BRUKSGRENSE-band + INPUT-band).
                  P1: SLS-keys splittast ut i eige band — semantisk korrekt
                  skille mellom bruddgrensetilstand og bruksgrensetilstand. */}
              {primary.structured_output.results &&
                !isBlocked("results_a") &&
                Object.keys(primary.structured_output.results).length > 0 && (
                  <div id="resultat" className="rapport-subchapter">
                    <div className="rapport-subchapter__eyebrow">
                      {RP_LABELS.sub22Resultat[locale]}
                    </div>
                    <table className="rapport-results-table">
                      <tbody>
                        {dimKeys.length > 0 && (
                          <>
                            <tr className="rapport-results-table__band rapport-results-table__band--dim">
                              <td
                                colSpan={2}
                                className="rapport-results-table__band-cell"
                              >
                                {RP_LABELS.bandDimensjonerande[locale]}
                              </td>
                            </tr>
                            {dimKeys.map((k) => {
                              const { number, unit } = splitNumberUnit(
                                resultsObj[k] ?? "",
                              );
                              return (
                                <tr
                                  key={k}
                                  className="rapport-results-table__row rapport-results-table__row--dim"
                                >
                                  <td className="rapport-results-table__key">
                                    {renderMathKey(k)}
                                  </td>
                                  <td className="rapport-results-table__value">
                                    <span className="rapport-results-table__num">
                                      {number}
                                    </span>
                                    {unit && (
                                      <span className="rapport-results-table__unit">
                                        {" "}
                                        {unit}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                        {bruksgrenseKeys.length > 0 && (
                          <>
                            <tr className="rapport-results-table__band rapport-results-table__band--bruksgrense">
                              <td
                                colSpan={2}
                                className="rapport-results-table__band-cell"
                              >
                                {RP_LABELS.bandBruksgrense[locale]}
                              </td>
                            </tr>
                            {bruksgrenseKeys.map((k) => {
                              const { number, unit } = splitNumberUnit(
                                resultsObj[k] ?? "",
                              );
                              return (
                                <tr
                                  key={k}
                                  className="rapport-results-table__row rapport-results-table__row--bruksgrense"
                                >
                                  <td className="rapport-results-table__key">
                                    {renderMathKey(k)}
                                  </td>
                                  <td className="rapport-results-table__value">
                                    <span className="rapport-results-table__num">
                                      {number}
                                    </span>
                                    {unit && (
                                      <span className="rapport-results-table__unit">
                                        {" "}
                                        {unit}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                        {allInputBandKeys.length > 0 && (
                          <>
                            <tr className="rapport-results-table__band rapport-results-table__band--input">
                              <td
                                colSpan={2}
                                className="rapport-results-table__band-cell"
                              >
                                {RP_LABELS.bandInputGeometri[locale]}
                              </td>
                            </tr>
                            {allInputBandKeys.map((k) => {
                              const { number, unit } = splitNumberUnit(
                                resultsObj[k] ?? "",
                              );
                              return (
                                <tr
                                  key={k}
                                  className="rapport-results-table__row"
                                >
                                  <td className="rapport-results-table__key">
                                    {renderMathKey(k)}
                                  </td>
                                  <td className="rapport-results-table__value">
                                    <span className="rapport-results-table__num">
                                      {number}
                                    </span>
                                    {unit && (
                                      <span className="rapport-results-table__unit">
                                        {" "}
                                        {unit}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* 02.3 — Stegvis utregning */}
              {primary.structured_output.calculation_steps &&
                primary.structured_output.calculation_steps.length > 0 &&
                !isBlocked("calculation_steps_a") && (
                  <div id="utrekning" className="rapport-subchapter">
                    <div className="rapport-subchapter__eyebrow">
                      {RP_LABELS.sub23Stegvis[locale]}
                    </div>
                    <div className="rapport-step-list">
                      {primary.structured_output.calculation_steps.map(
                        (step, i) => {
                          // Kontroll-/konsistens-steg får eige visuelt
                          // uttrykk: "KONTROLL"-label i staden for "STEG NN",
                          // og ein modifier-klasse for subtil styling.
                          const isControl = isControlStep(step.title);
                          return (
                          <div
                            key={i}
                            className={
                              "rapport-step-row" +
                              (isControl ? " rapport-step-row--kontroll" : "")
                            }
                          >
                            <div className="rapport-step-row__num">
                              {isControl ? (
                                RP_LABELS.stegKontroll[locale]
                              ) : (
                                <>
                                  {RP_LABELS.stegPrefix[locale]}{" "}
                                  {(i + 1).toString().padStart(2, "0")}
                                </>
                              )}
                            </div>
                            <div className="rapport-step-row__body">
                              <h4 className="rapport-step-row__title">
                                {step.title}
                              </h4>
                              {step.latex_formula ? (
                                <>
                                  <FormulaStack
                                    latex={step.latex_formula}
                                    fallbackText={step.text}
                                  />
                                  <details className="rapport-step-row__details">
                                    <summary>
                                      {RP_LABELS.visProsaUtrekning[locale]}
                                    </summary>
                                    <pre className="rapport-step-row__text">
                                      {step.text}
                                    </pre>
                                  </details>
                                </>
                              ) : (
                                <pre className="rapport-step-row__text">
                                  {step.text}
                                </pre>
                              )}
                            </div>
                          </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              </div>{/* /.rapport-berekning-content */}
            </section>
          )}

          {/* ============================================================
              § 03 VURDERING — fagleg vurdering, ikkje rekna, advarsler.
              Retning B: ChapterHeading + sub-eyebrows + ikkje-rekna-tabell
              med band-header + advarsel-stripes.
              ============================================================ */}
          {hasVurderingContent && (
            <section
              className="rapport-section rapport-section--group"
              id="vurdering"
              data-toc-id="vurdering"
            >
              <ChapterHeading num="03" title={RP_LABELS.chapter03Title[locale]} />

              {/* 03.1 Faglig vurdering */}
              {data.report.technical_assessment && (
                <div id="fagleg-vurdering" className="rapport-subchapter">
                  <div className="rapport-subchapter__eyebrow">
                    {RP_LABELS.sub31FagleVurdering[locale]}
                  </div>
                  <p className="rapport-prose">
                    {data.report.technical_assessment}
                  </p>
                </div>
              )}

              {/* 03.2 Hva er ikke beregnet — tabell med IKKJE DEKKA-band.
                  Kvar rad har subject (kva) + reason (kvifor). Subject
                  parsast frå string-format limitations (pilot) eller frå
                  key/subject-felt (post-5a). renderMathKey brukast på
                  subject berre når den ser ut som ein variabel-key
                  (har underscore og ingen mellomrom). */}
              {limitations.length > 0 && (
                <div id="ikkje-rekna" className="rapport-subchapter">
                  <div className="rapport-subchapter__eyebrow">
                    {RP_LABELS.sub32IkkjeBerekna[locale]}
                  </div>
                  <table className="rapport-ikkje-rekna-table">
                    <tbody>
                      <tr className="rapport-ikkje-rekna-table__band">
                        <td
                          colSpan={2}
                          className="rapport-ikkje-rekna-table__band-cell"
                        >
                          {RP_LABELS.bandIkkjeDekka[locale]}
                        </td>
                      </tr>
                      {limitations.map((lim, i) => {
                        // subject kan vere ein variabel-key (M_pl_Rd) eller
                        // ein prosa-frase ("Lastkombinasjon med fleire ...").
                        // Heuristikk: behandl som key om den har underscore
                        // og ingen mellomrom — då rendrar vi med renderMathKey
                        // og hentar marginalia-beskriving.
                        const looksLikeKey =
                          !!lim.key ||
                          (/_/.test(lim.subject) && !/\s/.test(lim.subject));
                        const keyForLookup = lim.key ?? lim.subject;
                        const marg = looksLikeKey
                          ? lookupMarginalia(keyForLookup)
                          : null;
                        return (
                          <tr
                            key={i}
                            className="rapport-ikkje-rekna-table__row"
                          >
                            <td className="rapport-ikkje-rekna-table__subject">
                              {looksLikeKey ? (
                                <>
                                  <span className="rapport-ikkje-rekna-table__key">
                                    {renderMathKey(keyForLookup)}
                                  </span>
                                  {marg?.description && (
                                    <span className="rapport-ikkje-rekna-table__desc">
                                      {" "}· {marg.description}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="rapport-ikkje-rekna-table__subject-text">
                                  {lim.subject}
                                </span>
                              )}
                            </td>
                            <td className="rapport-ikkje-rekna-table__reason-cell">
                              {lim.reason ? (
                                <span className="rapport-ikkje-rekna-table__reason">
                                  {lim.reason}
                                </span>
                              ) : (
                                <span className="rapport-ikkje-rekna-table__reason-empty">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 03.3 Advarsler — warn-stripe per item */}
              {primary.structured_output.warnings &&
                primary.structured_output.warnings.length > 0 && (
                  <div id="atvaringar" className="rapport-subchapter">
                    <div className="rapport-subchapter__eyebrow">
                      {RP_LABELS.sub33Advarsler[locale]}
                    </div>
                    <div className="rapport-advarsel-list">
                      {primary.structured_output.warnings.map((w, i) => (
                        <div key={i} className="rapport-advarsel-stripe">
                          <div className="rapport-advarsel-stripe__label">
                            <span aria-hidden="true">⚠</span>
                            <span>{RP_LABELS.advarselLabel[locale]}</span>
                          </div>
                          <p className="rapport-advarsel-stripe__body">{w}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </section>
          )}

          {/* ============================================================
              § 04 KONTROLL — konstruktørkontroll, kontrollørens avgjørelse,
              konklusjon, ForebelStripe, signatur-grid.
              ============================================================ */}
          <section
            className="rapport-section rapport-section--group"
            id="kontroll"
            data-toc-id="kontroll"
          >
            <ChapterHeading num="04" title={RP_LABELS.chapter04Title[locale]} />

            {/* 04.1 Konstruktørkontroll — kort prosa + verifikasjonstabell.
                Tabellen viser A-verdi, B-verdi (fuzzy-matcha frå B sine
                results sjølv om key-namna skil seg), og samsvar-dom driven
                av Agent C (Samanliknar) sine numeric_differences med
                numerisk backup-samanlikning. Lèt studenten kryssjekke
                den uavhengige dobbeltberekninga rad-for-rad. */}
            <div id="agentkontroll" className="rapport-subchapter">
              <div className="rapport-subchapter__eyebrow">
                {RP_LABELS.sub41Konstruktorkontroll[locale]}
              </div>
              <p className="rapport-prose">
                {RP_LABELS.berekningaLoyst[locale]}
                {hasVerifikasjon ? (
                  <>
                    {" "}
                    {hasAvvik
                      ? RP_LABELS.kontrollMedAvvikKort[locale]
                      : RP_LABELS.kontrollSammeResultatKort[locale]}
                  </>
                ) : (
                  <>
                    {" "}
                    {RP_LABELS.kontrollFallback[locale]}
                    {matchPhraseText && <>{" "}{matchPhraseText}</>}
                  </>
                )}
              </p>

              {hasVerifikasjon && (
                <table className="rapport-verifikasjon-table">
                  <thead>
                    <tr>
                      <th className="rapport-verifikasjon-table__head-key">
                        {RP_LABELS.verifikasjonKolStorleik[locale]}
                      </th>
                      <th className="rapport-verifikasjon-table__head-val">
                        {RP_LABELS.verifikasjonKolKonstruktorA[locale]}
                      </th>
                      <th className="rapport-verifikasjon-table__head-val">
                        {RP_LABELS.verifikasjonKolKonstruktorB[locale]}
                      </th>
                      <th className="rapport-verifikasjon-table__head-match">
                        {RP_LABELS.verifikasjonKolSamsvar[locale]}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifikasjonRows.map((row) => (
                      <tr
                        key={row.key}
                        className="rapport-verifikasjon-table__row"
                      >
                        <td className="rapport-verifikasjon-table__key">
                          {renderMathKey(row.key)}
                        </td>
                        <td className="rapport-verifikasjon-table__val">
                          {row.valueA}
                        </td>
                        <td className="rapport-verifikasjon-table__val">
                          {row.valueB ?? (
                            <span className="rapport-verifikasjon-table__missing">
                              {RP_LABELS.verifikasjonManglar[locale]}
                            </span>
                          )}
                        </td>
                        <td className="rapport-verifikasjon-table__match">
                          {row.samsvar === "match" && (
                            <span
                              className="rapport-verifikasjon-table__check"
                              aria-label={RP_LABELS.verifikasjonSamsvarAria[locale]}
                            >
                              ✓
                            </span>
                          )}
                          {row.samsvar === "avvik" && (
                            <span
                              className="rapport-verifikasjon-table__avvik"
                              aria-label={RP_LABELS.verifikasjonAvvikAria[locale]}
                            >
                              {typeof row.avvikPct === "number"
                                ? `${row.avvikPct.toLocaleString(
                                    locale === "nn" ? "nn-NO" : "nb-NO",
                                    { maximumFractionDigits: 1 },
                                  )} %`
                                : RP_LABELS.verifikasjonAvvikKort[locale]}
                            </span>
                          )}
                          {row.samsvar === "ukjent" && (
                            <span
                              className="rapport-verifikasjon-table__nomatch"
                              aria-label={RP_LABELS.verifikasjonUkjentAria[locale]}
                            >
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 04.2 Kontrollørens avgjørelse — verdict-box med mørk header
                + statusspesifikk gold/ok/warn/bad badge + KORT verdict-tekst.
                P3-fiks: erstattar full controller.user_message (som vart
                duplisert med forside-prosa) med ein statusspesifikk avgjerd-
                utsegn. Held forsida som tillit-narrativ, verdict-box som
                beslutnings-stempel. */}
            {data.controllerDecision && (
              <div id="kontrollor-avgjerd" className="rapport-subchapter">
                <div className="rapport-subchapter__eyebrow">
                  {RP_LABELS.sub42KontrollorAvgjerd[locale]}
                </div>
                <div className="rapport-verdict-box">
                  <div className="rapport-verdict-box__header">
                    <span className="rapport-verdict-box__label">
                      {RP_LABELS.avgjerdLabel[locale]}
                    </span>
                    <span
                      className={`rapport-verdict-box__badge rapport-verdict-box__badge--${statusBadgeVariant}`}
                    >
                      {decisionLabel}
                    </span>
                  </div>
                  <div className="rapport-verdict-box__body">
                    <p>{verdictShortText}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 04.3 Konklusjon */}
            <div id="konklusjon" className="rapport-subchapter">
              <div className="rapport-subchapter__eyebrow">
                {RP_LABELS.sub43Konklusjon[locale]}
              </div>
              <p className="rapport-prose">{data.report.conclusion}</p>
            </div>

            {/* Foreløpig-stripe — DNA-element før signatur. */}
            <ForebelStripe locale={locale} />

            {/* Manuell signatur — 3 kolonner med stiplet linje + caption */}
            <div className="rapport-signatur-grid">
              <div className="rapport-signatur-grid__field">
                <span className="rapport-signatur-grid__label">
                  {RP_LABELS.kontrollertAv[locale]}
                </span>
                <span className="rapport-signatur-grid__line" />
                <span className="rapport-signatur-grid__caption">
                  {RP_LABELS.signKontrollertCaption[locale]}
                </span>
              </div>
              <div className="rapport-signatur-grid__field">
                <span className="rapport-signatur-grid__label">
                  {RP_LABELS.signatur[locale]}
                </span>
                <span className="rapport-signatur-grid__line" />
                <span className="rapport-signatur-grid__caption">
                  {RP_LABELS.signSignaturCaption[locale]}
                </span>
              </div>
              <div className="rapport-signatur-grid__field">
                <span className="rapport-signatur-grid__label">
                  {RP_LABELS.footerDato[locale]}
                </span>
                <span className="rapport-signatur-grid__line" />
                <span className="rapport-signatur-grid__caption">
                  {RP_LABELS.signDatoCaption[locale]}
                </span>
              </div>
            </div>
          </section>

          {/* Pilar-footer — brand + meta + URL + QR. Behaldt frå før med
              same struktur, berre uten den frittliggande "forebels"-stripa
              (no rendra som ForebelStripe inni § 04 over signaturen). */}
          <footer className="rapport-footer">
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
          {/* ORDLISTE — opnar ordliste-panelet. Skjerm-snarveg:
              sidebaren er .no-print. Notasjon-blokka øvst i § 02
              er den print-trygge kanoniske visninga. */}
          {hasMarginalia && (
            <OrdlisteFlyt
              entries={marginaliaEntries}
              title={RP_LABELS.marginaliaTitle[locale]}
            />
          )}
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
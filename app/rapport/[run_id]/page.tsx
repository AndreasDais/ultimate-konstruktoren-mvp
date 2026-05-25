"use client";

import { useEffect, useState } from "react";
import { polishEnglishGeneratedText, sprint335PolishEnglishText } from "@/lib/international/display";
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
import { buildReportModel } from "@/lib/report/build-report-model";
import { buildLocalizedLabelProxyForLanguage, inferReportDisplayLanguage } from "@/lib/international/display";
import { validateReportModel } from "@/lib/report/validate-report-model";
import { cleanReportText, displayResultLabel, limitText } from "@/lib/report/normalize-report-model";
import {
  lookupMarginalia,
  scanTextForCatalogKeys,
  type MarginaliaEntry,
} from "@/lib/marginalia-katalog";

/**
 * Avgjer om eit berekningssteg er eit KONTROLL-/konsistens-steg heller enn
 * eit reelt utrekningssteg.
 *
 * Engineerane avsluttar ofte med eit steg som ikkje reknar ut noko nytt,
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
 *   - Engineer A: "Ed_ULS_ugunstig_permanent"
 *   - Engineer B: "E_d_ULS_ugunstig" eller "Ed,ULS,ugunstig,permanent"
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
  const text = cleanReportText(raw);
  if (!text) return { subject: "", reason: null };

  // Splitt på em-dash (—) eller " - " (mellomrom-bindestrek-mellomrom).
  // Vanleg bindestrek utan mellomrom blir IKKJE splitta (kan vere i ord).
  const dashMatch = text.match(/^(.*?)\s+[—–]\s+(.*)$/) ??
    text.match(/^(.*?)\s+-\s+(.*)$/);
  if (dashMatch) {
    return {
      subject: cleanLimitationSubject(dashMatch[1]),
      reason: cleanReportText(dashMatch[2]) || null,
    };
  }

  // Kolon-splitt — men only om kolon ikkje er del av eit tal/forhold
  const colonMatch = text.match(/^([^:]+):\s+(.+)$/);
  if (colonMatch) {
    return {
      subject: cleanLimitationSubject(colonMatch[1]),
      reason: cleanReportText(colonMatch[2]) || null,
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
  return cleanReportText(s)
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
      const k = typeof obj.key === "string" ? cleanReportText(obj.key) : null;
      const r = typeof obj.reason === "string" ? cleanReportText(obj.reason) : "";
      // subject kan vere eksplisitt felt, elles fall til key
      const subj =
        typeof obj.subject === "string" && cleanReportText(obj.subject)
          ? cleanReportText(obj.subject)
          : k ?? "";
      return { subject: subj, reason: r || null, key: k };
    }
    return { subject: cleanReportText(String(item ?? "")), reason: null, key: null };
  });
}

function coverStatusSummary(decisionStatus: string | undefined, locale: Locale): string {
  const summaries: Record<string, Record<Locale, string>> = {
    approved: {
      nb: "Beregningen er foreløpig godkjent. Resultatet skal kontrolleres av ansvarlig fagperson før bruk.",
      nn: "Berekninga er førebels godkjend. Resultatet skal kontrollerast av ansvarleg fagperson før bruk.",
    },
    approved_with_warnings: {
      nb: "The calculation is preliminarily approved with warnings. The reservations must be resolved before use in design work.",
      nn: "Berekninga er førebels godkjend med åtvaringar. Atterhalda må avklarast før prosjekteringsbruk.",
    },
    uncertain: {
      nb: "Beregningen er usikker. Avvik og inngangsverdier må avklares før resultatet kan brukes videre.",
      nn: "Berekninga er usikker. Avvik og inngangsverdiar må avklarast før resultatet kan brukast vidare.",
    },
    rejected: {
      nb: "Beregningen er avvist. Resultatet skal ikke brukes uten omfattende manuell verifikasjon.",
      nn: "Berekninga er avvist. Resultatet skal ikkje brukast utan omfattande manuell verifisering.",
    },
  };
  return summaries[decisionStatus ?? ""]?.[locale] ?? "";
}

const BASE_RP_LABELS: Record<string, Record<Locale, string>> = {
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
  berekningsnotat: { nb: "Calculation note", nn: "Berekningsnotat" },
  dokumentID: { nb: "Dokument-ID:", nn: "Dokument-ID:" },
  forsideDato: { nb: "Dato:", nn: "Dato:" },
  forsideStatus: { nb: "Status:", nn: "Status:" },
  forsideRapportVersjon: { nb: "Rapport-versjon:", nn: "Rapport-versjon:" },
  viktigMerknad: { nb: "VIKTIG MERKNAD", nn: "VIKTIG MERKNAD" },
  // Fase 2 — § 01 + § 02 (B-redesign)
  forespurselLabel: { nb: "FORESPØRSEL", nn: "FORESPØRSEL" },
  bandDiwhilejonerande: { nb: "DIMENSJONERENDE", nn: "DIMENSJONERANDE" },
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
  // P3 — Engineerkontroll-berikning (§ 04.1)
  kontrollSammeResultatKort: {
    nb: "Begge kom frem til numerisk identiske verdier, vist i tabellen under.",
    nn: "Begge kom fram til numerisk identiske verdiar, vist i tabellen under.",
  },
  kontrollMedAvvikKort: {
    nb: "Tabellen under viser sammenligningen rad-for-rad. Avvik er markert.",
    nn: "Tabellen under viser samanlikninga rad-for-rad. Avvik er markerte.",
  },
  kontrollFallback: {
    nb: "They reached the same result.",
    nn: "Dei kom fram til same resultat.",
  },
  verifikasjonKolStorleik: { nb: "Størrelse", nn: "Storleik" },
  verifikasjonKolKonstruktorA: { nb: "Engineer A", nn: "Engineer A" },
  verifikasjonKolKonstruktorB: { nb: "Engineer B", nn: "Engineer B" },
  verifikasjonKolSamsvar: { nb: "Samsvar", nn: "Samsvar" },
  verifikasjonManglar: { nb: "—", nn: "—" },
  verifikasjonAvvikKort: { nb: "Avvik", nn: "Avvik" },
  verifikasjonSamsvarAria: { nb: "Samsvar mellom konstruktørene", nn: "Samsvar mellom konstruktørane" },
  verifikasjonAvvikAria: { nb: "Avvik mellom konstruktørene", nn: "Avvik mellom konstruktørane" },
  verifikasjonUkjentAria: { nb: "Verdi ikke tilgjengelig fra Engineer B", nn: "Verdi ikkje tilgjengeleg frå Engineer B" },
  // Forside-tabular metadata (Fase 1, B-redesign — utan kolon)
  forsideMetaDokumentID: { nb: "Dokument-ID", nn: "Dokument-ID" },
  forsideMetaBrukar: { nb: "Bruker", nn: "Brukar" },
  forsideMetaDato: { nb: "Dato", nn: "Dato" },
  forsideMetaStatus: { nb: "Status", nn: "Status" },
  forsideMetaVersjon: { nb: "Versjon", nn: "Versjon" },
  forsideFallbackTittel: { nb: "Calculation note", nn: "Berekningsnotat" },
  forsideTillitOverskrift: { nb: "Tillit", nn: "Tillit" },
  forsideAITekst: { nb: "AI-generert dokument", nn: "AI-generert dokument" },
  qrAccessTitle: { nb: "Skann for nettversjon", nn: "Skann for nettversjon" },
  qrAccessText: {
    nb: "Åpner rapporten på nett med kontrollstatus, pipeline og delbar lenke for medstudenter eller kollegaer.",
    nn: "Opnar rapporten på nett med kontrollstatus, pipeline og delbar lenkje for medstudentar eller kollegaer.",
  },
  qrAccessUrlLabel: { nb: "Rapportlenke", nn: "Rapportlenkje" },
  qrAccessPipeline: { nb: "Nettversjon + pipeline", nn: "Nettversjon + pipeline" },
  coverKeyResults: { nb: "Nøkkelresultater", nn: "Nøkkelresultat" },
  disclaimerKort: {
    nb: "Innholdet skal kun brukes som støtte, læringshjelp eller foreløpig teknisk vurdering. Ikke erstatning for kontroll av kvalifisert fagperson.",
    nn: "Innhaldet skal only brukast som støtte, læringshjelp eller førebels teknisk vurdering. Ikkje ein erstatning for kontroll av kvalifisert fagperson.",
  },
  disclaimer: { nb: "Dette dokumentet er generert av et AI-basert beregnings- og dokumentasjonsverktøy. Innholdet skal kun brukes som støtte, læringshjelp eller foreløpig teknisk vurdering. Dokumentet er ikke en erstatning for kontroll utført av kvalifisert fagperson, ansvarlig prosjekterende eller godkjent foretak. Alle beregninger, assumptioner, standardreferanser, materialdata og konklusjoner må kontrolleres av en kompetent byggingeniør før de blir brukt i reelle prosjekter, byggesøknader, produksjon eller utføring.", nn: "Dette dokumentet er generert av eit AI-basert bereknings- og dokumentasjonsverktøy. Innhaldet skal only brukast som støtte, læringshjelp eller førebels teknisk vurdering. Dokumentet er ikkje ein erstatning for kontroll utført av kvalifisert fagperson, ansvarleg prosjekterande eller godkjent føretak. Alle berekningar, assumptioner, standardreferansar, materialdata og konklusjonar må kontrollerast av ein kompetent byggingeniør før dei blir brukte i reelle prosjekt, byggesøknader, produksjon eller utføring." },
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
  konstruktorkontrollH3: { nb: "Engineerkontroll", nn: "Engineerkontroll" },
  berekningaLoyst: { nb: "Beregningen er løst uavhengig av to AI-engineers (Engineer A and Engineer B).", nn: "Berekninga er løyst uavhengig av to AI-engineers (Engineer A and Engineer B)." },
  kontrollorAvgjerd: { nb: "Controllerens avgjørelse:", nn: "Controlleren si avgjerd:" },
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
  statusKonstruktorA: { nb: "Engineer A", nn: "Engineer A" },
  statusKonstruktorB: { nb: "Engineer B", nn: "Engineer B" },
  statusKonstruktorExplanation: { nb: "Engineerens egenrapporterte sikkerhet på eget svar (high/medium/low). Måler only én agents tillit til seg selv, ikke den samlede rapporten.", nn: "Engineeren si eigenrapporterte sikkerheit på eige svar (high/medium/low). Målar only éin agent sin tillit til seg sjølv, ikkje den samla rapporten." },
  statusSamanlikning: { nb: "Sammenligning", nn: "Samanlikning" },
  statusSamanlikningExplanation: { nb: "Comparator-agenten sjekker om Engineer A and Engineer B kom frem til samme svar. 'Enige' = ingen avvik; 'Stor avvik' eller 'Kritisk' krever nærmere ettersyn.", nn: "Comparator-agenten sjekkar om Engineer A and Engineer B kom fram til same svar. 'Einige' = ingen avvik; 'Stor avvik' eller 'Kritisk' krev nærare ettersyn." },
  statusKontrollor: { nb: "Controller", nn: "Controller" },
  statusKontrollorExplanation: { nb: "Controller-agenten leser både engineers og Comparator, og avgjør om resultatet er trygt nok å vise. Erstatter ikke fagperson-kontroll.", nn: "Controller-agenten les både engineers og Comparator, og avgjer om resultatet er trygt nok å vise. Erstattar ikkje fagperson-kontroll." },
  statusFagperson: { nb: "Fagperson", nn: "Fagperson" },
  ikkjeKontrollert: { nb: "Ikke kontrollert", nn: "Ikkje kontrollert" },
  statusFagpersonExplanation: { nb: "Sjekker om en kvalifisert byggingeniør har signert rapporten. I pilot-versjonen er dette alltid 'Ikke kontrollert' — du må selv få en fagperson til å gjennomgå før bruk i reelle prosjekter.", nn: "Sjekkar om ein kvalifisert byggingeniør har signert rapporten. I pilot-versjonen er dette alltid 'Ikkje kontrollert' — du må sjølv få ein fagperson til å gjennomgå før bruk i reelle prosjekt." },
};


import { QRCodeSVG } from "qrcode.react";
import { TillitGauge } from "@/app/components/TillitGauge";
import type { TillitBreakdown } from "@/lib/tillit-score";
import { InfoPopover } from "@/app/components/InfoPopover";

function sprint339FinalNorwegianResidueText(value: string): string {
  return String(value ?? "")
    .replace(/FORELØPIG GODKJENT/g, "PRELIMINARILY APPROVED")
    .replace(/MINDRE FORSKJELLER/g, "MINOR DIFFERENCES")
    .replace(/BEGGE KONSTRUKTØRER ER ENIGE/g, "BOTH ENGINEERS AGREE")
    .replace(/ØVRIG/g, "OTHER")
    .replace(/GOD/g, "GOOD")
    .replace(/Beregningen er godkjent for visning. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering./g, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/De kom frem til samme resultat./g, "They reached the same result.")
    .replace(/Engineer A and B er fullstendig enige om alle dimensjonerende verdier./g, "Engineer A and Engineer B fully agree on all design values.")
    .replace(/Engineer A og B har minor differences/g, "Engineer A and Engineer B have minor differences")
    .replace(/Engineer B reports HIGH confidence på sin uavhengige løsning./g, "Engineer B reports HIGH confidence in its independent solution.")
    .replace(/HIGH her betyr at B er trygg på egen metode — at A and B er enige er en separat sjekk (se verdikt over)./g, "HIGH means that Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check (see verdict above).")
    .replace(/Self-assessment — ikke en uavhengig verifikasjon./g, "Self-assessment — not an independent verification.")
    .replace(/Engineer A og Engineer B/g, "Engineer A and Engineer B")
    .replace(/Engineer A og B/g, "Engineer A and Engineer B")
    .replace(/A og B/g, "Engineer A and Engineer B")
    .replace(/er fullstendig enige/g, "fully agree")
    .replace(/dimensjonerende verdier/g, "design values")
    .replace(/på sin uavhengige løsning/g, "in its independent solution")
    .replace(/HIGH her betyr/g, "HIGH means")
    .replace(/egen metode/g, "its own method")
    .replace(/se verdikt over/g, "see verdict above")
    .replace(/same grunnleggjande metode/g, "the same basic method")
    .replace(/brukar/g, "use")
    .replace(/bruker/g, "use")
    .replace(/medan/g, "while")
    .replace(/berre/g, "only")
    .replace(/hovudformelen/g, "the main formula")
    .replace(/utrekningsrute/g, "calculation route")
    .replace(/ein alternativ/g, "an alternative")
    .replace(/som ein intern kryssjekk/g, "as an internal cross-check")
    .replace(/Dette er ei forskjell i presentasjonsform, ikkje i metode./g, "This is a presentation difference, not a methodological difference.")
    .replace(/lastfaktorane/g, "load factors")
    .replace(/som eigne resultatfelt/g, "as separate result fields")
    .replace(/tekstbeskrivinga/g, "the text description")
    .replace(/Innhaldet er likeverdig men strukturen er ulik./g, "The content is equivalent, but the structure differs.")
    .replace(/Begge konstruktørar/g, "Both engineers")
    .replace(/Begge konstruktører/g, "Both engineers")
    .replace(/konstruktørar/g, "engineers")
    .replace(/konstruktører/g, "engineers")
    .replace(/Konstruktør A/g, "Engineer A")
    .replace(/Konstruktør B/g, "Engineer B")
    .replace(/Konstruktør/g, "Engineer")
    .replace(/Cb-antaginga/g, "The Cb assumption")
    .replace(/antaginga/g, "assumption")
    .replace(/føresetnad/g, "assumption")
    .replace(/føresetnader/g, "assumptions")
    .replace(/sjølve/g, "itself")
    .replace(/Ingen forskjell/g, "No difference")
    .replace(/ingen forskjell/g, "no difference")
    .replace(/mellomledd/g, "intermediate value");
}


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
 * Talavvik mellom Engineer A and Engineer B for eit gjeve felt, frå Comparator
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
  // Etter konsolidering ser observer only på dei 4 outer-sections.
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

  // Rapport-URL for QR-kode / nettversjon.
  // VIKTIG: PDF-print kan starte før useEffect har rukke å setje state.
  // Derfor har vi både ein klient-initializer og ein relativ fallback, slik at
  // QR-/pipeline-kortet aldri forsvinn frå eksporten.
  const [rapportUrl, setRapportUrl] = useState(() =>
    typeof window === "undefined" ? "" : `${window.location.origin}/rapport/${runId}`,
  );
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRapportUrl(`${window.location.origin}/rapport/${runId}`);
    }
  }, [runId]);

  // Tving alle <details>-element til å vere opne under print.
  // CSS aleine klarar ikkje overstyre user-agent sin closed-state.
  // MÅ ligge FØR early-returns under for å respektere Rules of Hooks.
  useEffect(() => {
    const openAll = () => {
      document.querySelectorAll("details").forEach((d) => {
        d.open = true;
      });
      document.documentElement.dataset.pilarExport = "pdf";
    };
    const cleanup = () => {
      delete document.documentElement.dataset.pilarExport;
    };
    window.addEventListener("beforeprint", openAll);
    window.addEventListener("afterprint", cleanup);
    return () => {
      window.removeEventListener("beforeprint", openAll);
      window.removeEventListener("afterprint", cleanup);
    };
  }, []);

  const handlePdfPrint = () => {
    document.querySelectorAll("details").forEach((d) => {
      d.open = true;
    });
    document.documentElement.dataset.pilarExport = "pdf";
    window.requestAnimationFrame(() => window.print());
  };

  if (error) {
    return (
      <div className="rapport-loading">
        <h1>{BASE_RP_LABELS.feilVedGenerering[locale]}</h1>
        <p>{error}</p>
        <button onClick={() => router.push("/")} className="uk-btn">
          {BASE_RP_LABELS.tilbakeStart[locale]}
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

  const reportDisplayLanguage = inferReportDisplayLanguage({
    locale,
    text: [data.run.request.raw_text, data.report.executive_summary, data.report.technical_assessment, data.report.conclusion].join("\n"),
  });
  const reportDate = reportDisplayLanguage === "en"
    ? new Date(data.report.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : formatDate(data.report.created_at, locale);
  const reportPromptVersion = reportDisplayLanguage === "en"
    ? formatPromptVersion(data.report.prompt_version).replace(/\bRapportør\b/g, "Reporter")
    : formatPromptVersion(data.report.prompt_version);
  const polishReportText = (value: string) => reportDisplayLanguage === "en" ? sprint335PolishEnglishText(value) : value;
  const maybeEnglish = (value: string) => reportDisplayLanguage === "en" ? polishEnglishGeneratedText(value) : value;

  const RP_LABELS = buildLocalizedLabelProxyForLanguage(BASE_RP_LABELS, locale, reportDisplayLanguage, {
    samandrag: "Summary",
    berekningTOC: "Calculation",
    vurdering: "Assessment",
    kontroll: "Review",
    tilbake: "← Back",
    innhald: "Contents",
    metadata: "Metadata",
    metaDato: "Date",
    metaVersjon: "Version",
    berekningsnotat: "Calculation note",
    dokumentID: "Document ID:",
    forsideDato: "Date:",
    forsideStatus: "Status:",
    forsideRapportVersjon: "Report version:",
    viktigMerknad: "IMPORTANT NOTE",
    forespurselLabel: "REQUEST",
    bandDiwhilejonerande: "DEMAND / DESIGN VALUES",
    bandBruksgrense: "SERVICEABILITY",
    bandInputGeometri: "INPUT AND GEOMETRY",
    sub21Forutsetninger: "02.1 — ASSUMPTIONS",
    sub22Resultat: "02.2 — RESULTS",
    sub23Stegvis: "02.3 — STEP-BY-STEP CALCULATION",
    stegPrefix: "STEP",
    stegKontroll: "CHECK",
    chapter01Title: "Summary",
    chapter02Title: "Calculation",
    chapter03Title: "Assessment",
    chapter04Title: "Review",
    sub31FagleVurdering: "03.1 — ENGINEERING ASSESSMENT",
    sub32IkkjeBerekna: "03.2 — WHAT IS NOT CALCULATED",
    sub33Advarsler: "03.3 — WARNINGS",
    sub41Konstruktorkontroll: "04.1 — ENGINEER COMPARISON",
    sub42KontrollorAvgjerd: "04.2 — CONTROLLER DECISION",
    sub43Konklusjon: "04.3 — CONCLUSION",
    bandIkkjeDekka: "NOT COVERED BY THIS REPORT",
    advarselLabel: "WARNING",
    avgjerdLabel: "DECISION",
    signKontrollertCaption: "Name · title · company",
    signSignaturCaption: "Manual signature",
    signDatoCaption: "MM/DD/YYYY",
    kontrollSammeResultatKort: "Both engineers reached numerically identical values, shown in the table below.",
    kontrollMedAvvikKort: "The table below compares the independent results row by row. Differences are marked.",
    kontrollFallback: "They reached the same result.",
    verifikasjonKolStorleik: "Quantity",
    verifikasjonKolKonstruktorA: "Engineer A",
    verifikasjonKolKonstruktorB: "Engineer B",
    verifikasjonKolSamsvar: "Match",
    verifikasjonSamsvarAria: "Match between the engineers",
    verifikasjonAvvikAria: "Difference between the engineers",
    verifikasjonUkjentAria: "Value unavailable from Engineer B",
    forsideMetaDato: "Date",
    forsideMetaStatus: "Status",
    forsideMetaVersjon: "Version",
    forsideFallbackTittel: "Calculation note",
    forsideAITekst: "AI-generated document",
    qrAccessTitle: "Scan for web version",
    qrAccessText: "Opens the report online with control status, pipeline trace and shareable link for classmates or colleagues.",
    qrAccessUrlLabel: "Report link",
    qrAccessPipeline: "Web version + pipeline",
    coverKeyResults: "Key results",
    disclaimerKort: "The content is support, learning aid or preliminary technical assessment only. It does not replace review by a qualified professional.",
    samandragH2: "Summary",
    forespurnadH3: "Request",
    berekningH2: "Calculation",
    inputTolkingH3: "Input interpretation",
    statusPrefix: "Status:",
    foresetnaderH3: "Assumptions",
    resultatH3: "Results",
    stegvisUtrekningH3: "Step-by-step calculation",
    visProsaUtrekning: "Show prose calculation",
    vurderingH2: "Assessment",
    fagleVurderingH3: "Engineering assessment",
    kvaErIkkjeReknaH3: "What is not calculated",
    atvaringarH3: "Warnings",
    kontrollH2: "Review",
    konstruktorkontrollH3: "Engineer comparison",
    berekningaLoyst: "The calculation was solved independently by two AI engineers (Engineer A and Engineer B).",
    kontrollorAvgjerd: "Controller decision:",
    konklusjonH3: "Conclusion",
    forebelsBerekning: "Preliminary calculation — must be checked by a qualified professional before use in design work.",
    kontrollertAv: "Reviewed by",
    signatur: "Signature",
    footerDato: "Date",
    generert: "Generated",
    handlingar: "Actions",
    lastNedPDF: "Download PDF",
    lastNedWord: "Download Word",
    lagNyBerekning: "Create new calculation from this →",
    saMissionControl: "See Mission Control →",
    sendTilbakemelding: "Send feedback",
    kontrollstatus: "Control status",
    statusInputTolking: "Input interpretation",
    statusInputExplanation: "The interpreter’s assessment of how ready the task was for calculation. ‘Ready’ means the required information is present; other statuses mean the interpreter used reasonable assumptions or identified missing information.",
    statusKonstruktorExplanation: "The independent engineer’s self-assessed confidence in its own calculation method and result. This is not a professional verification.",
    statusSamanlikningExplanation: "The comparator’s assessment of agreement between Engineer A and Engineer B. Differences may be numerical, methodological, or due to assumptions.",
    statusKontrollorExplanation: "The controller’s final AI decision for whether the result may be shown, shown with warnings, blocked, or sent back for more input.",
    statusFagpersonExplanation: "Shows whether a qualified structural engineer has reviewed and signed the report. In the pilot version this is normally not reviewed; a qualified professional must verify the report before real design use.",
    statusKonstruktorA: "Engineer A",
    statusKonstruktorB: "Engineer B",
    statusSamanlikning: "Comparison",
    statusKontrollor: "Controller",
    statusFagperson: "Professional reviewer",
    ikkjeKontrollert: "Not reviewed",
  });

  const decisionLabel = reportDisplayLanguage === "en"
    ? (({
        approved: "Preliminarily approved",
        approved_with_warnings: "Approved with warnings",
        uncertain: "Uncertain",
        rejected: "Rejected — requires review",
        needs_more_input: "Needs more input",
      } as Record<string, string>)[data.controllerDecision?.decision_status ?? ""] ?? RP_LABELS.ukjent[locale])
    : decisionStatusLabel(data.controllerDecision?.decision_status ?? "", locale) ??
      RP_LABELS.ukjent[locale];
  const matchPhraseText =
    matchPhrase(data.comparison?.match_status ?? "", locale) ?? "";

  const wordUrl = `/api/rapport/${runId}/word`;
  const wordFilename = `${data.report.document_id}.docx`;
  const calculationSheetUrl = `/rapport/${runId}/beregning`;
  const calculationSheetLabel = reportDisplayLanguage === "en" ? "Calculation sheet" : locale === "nn" ? "Vis kun berekningar" : "Vis kun beregninger";
  const stableRapportUrl = rapportUrl || `/rapport/${runId}`;
  const reportModel = buildReportModel(data as Parameters<typeof buildReportModel>[0], { locale, reportUrl: stableRapportUrl });
  const reportModelValidation = validateReportModel(reportModel);

  // Sprint 6: bruk ReportModel som kjelde for dei delane som er mest
  // såronly i PDF/Word: resultat- og kontrolltabellar. Dette gir stabile,
  // normaliserte labels (E_d,dim, ψ_0,q, γ_G,6.10a) i staden for rå
  // agent-keys/renderMathKey-output som kan bryte i print.
  const reportDimRows = reportModel.calculation.resultRows.filter(
    (row) => row.category === "diwhilejonerande",
  );
  const reportInputRows = reportModel.calculation.resultRows.filter(
    (row) => row.category === "input",
  );
  const reportOtherRows = reportModel.calculation.resultRows.filter(
    (row) => row.category !== "diwhilejonerande" && row.category !== "input",
  );
  const reportControlRows = reportModel.control.comparisonRows.slice(0, 8);
  const hasReportControlRows = reportControlRows.length > 0;
  const reportControlHasAvvik = reportControlRows.some((row) => !row.match);

  // Sprint 9: forsida skal vere roleg og ikkje bere heile
  // kontrollørprosaen. Den fulle vurderinga ligg i § 04.2 og i
  // nettversjonen/pipeline. På forsida viser vi only ei kort
  // leveranseoppsummering. Dette hindrar tekstklipping i PDF, særleg
  // ved usikker/blokkert rapport.
  const coverControllerMessage = reportDisplayLanguage === "en"
    ? limitText(
        sprint335PolishEnglishText(
          reportModel.control.controllerText ||
            data.controllerDecision?.user_message ||
            (decisionLabel ? "The calculation is " + decisionLabel.toLowerCase() + ". It must be checked by a qualified professional before use in design work." : "")
        ),
        230,
      )
    : coverStatusSummary(data.controllerDecision?.decision_status, locale) ||
      limitText(reportModel.control.controllerText || data.controllerDecision?.user_message || "", 230);

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
  const inputLabel = reportDisplayLanguage === "en" ? (({ klar: "Ready", delvis_klar: "Partly ready", mangelfull: "Incomplete", avvist: "Rejected", uklar: "Unclear", uklart: "Unclear", relevant_ikkje_stotta: "Not supported" } as Record<string, string>)[inputStatus] ?? inputStatusLabel(inputStatus, locale)) : inputStatusLabel(inputStatus, locale);

  const agentAConf = primary.structured_output.confidence ?? "";
  const agentATone: Tone = CONFIDENCE_TONES[agentAConf] ?? "neutral";

  const agentBConf = data.agentB.structured_output.confidence ?? "";
  const agentBTone: Tone = CONFIDENCE_TONES[agentBConf] ?? "neutral";

  const matchStatus = data.comparison?.match_status ?? "";
  const matchTone: Tone = MATCH_STATUS_TONES[matchStatus] ?? "neutral";
  const matchLabel = reportDisplayLanguage === "en" ? (({ match: "Match", minor_differences: "Minor differences", significant_differences: "Significant differences", critical_disagreement: "Critical disagreement" } as Record<string, string>)[matchStatus] ?? matchStatusShort(matchStatus, locale)) : matchStatusShort(matchStatus, locale);

  const decisionStatus = data.controllerDecision?.decision_status ?? "";
  const controllerTone: Tone =
    DECISION_STATUS_TONES[decisionStatus] ?? "neutral";
  const controllerShort = reportDisplayLanguage === "en" ? (({ approved: "Approved", approved_with_warnings: "Warnings", uncertain: "Uncertain", rejected: "Rejected", needs_more_input: "Needs input" } as Record<string, string>)[decisionStatus] ?? decisionStatusShort(decisionStatus, locale)) : decisionStatusShort(decisionStatus, locale);

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

  // === Forside-data ===
  // Tittel og undertittel kjem no frå ReportModel, slik at web, PDF og Word
  // use same rapportkontrakt. ReportModel les report_title/report_subtitle
  // frå Tolkar når dei finst, og byggjer fagleg fallback frå calculation_type
  // og resultata når eldre run manglar desse felta.
  const parsedData = data.inputReview?.parsed_data as
    | Record<string, unknown>
    | null
    | undefined;
  const reportTitle = reportModel.cover.title || RP_LABELS.forsideFallbackTittel[locale];
  const reportSubtitle = reportModel.cover.subtitle || null;

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
      nb: "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.",
      nn: "Berekninga er godkjend for visning. Føreset manuell verifisering av ansvarleg fagperson før bruk i prosjektering.",
    },
    approved_with_warnings: {
      nb: "The calculation is preliminarily approved with warnings and must be verified by a qualified professional before use in design work.",
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
  const resultsObj = Object.fromEntries(
    Object.entries(rawResultsObj).filter(
      ([k, v]) => typeof v === "string" && !isSetningResult(k, v),
    ),
  ) as Record<string, string>;
  const allDimKeys = getDimensjonerandeKeys(resultsObj, calculationType);
  // P1: Splitt allDimKeys i true-ULS-dim og SLS-bruksgrense. Lastkombinasjon-
  // pattern matchar både Ed_ULS_* og Ed_SLS_*, så vi får begge i allDimKeys —
  // men dei skal stå i ulike band fordi SLS er bruksgrensetilstand, ikkje
  // diwhilejonerande på same måte som ULS. Klassifisering på band-nivå er
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
  //     skal only vises éin gong — vi behaldar den med mest spesifikk
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
  // itself rapport-prosaen.
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
      // Catalog-entry-dedup: only ta med text-scan-keys som ikkje
      // allereie er dekt av ein result-key (eller tidlegare text-scan).
      if (entry && !seenCatalogEntries.has(entry)) {
        marginaliaEntries.push({ key: k, entry });
        seenCatalogEntries.add(entry);
      }
    }
  }

  const hasMarginalia = marginaliaEntries.length > 0;

  const marginaliaTitle =
    reportDisplayLanguage === "en" ? "GLOSSARY" : RP_LABELS.marginaliaTitle[locale];

  const englishMarginaliaOverrides: Record<string, MarginaliaEntry> = {
    D: { description: "dead load", unit: "kip/ft" },
    L: { description: "span length", unit: "ft" },
    L_eff: { description: "effective span length", unit: "ft" },
    Lb: { description: "unbraced length", unit: "ft" },
    w: { description: "distributed load or deflection depending on context", unit: "kip/ft or in" },
    w_max: { description: "maximum deflection", unit: "in" },
    w_lim: { description: "allowable deflection", unit: "in" },
    M: { description: "bending moment", unit: "kip-ft" },
    V: { description: "shear force", unit: "kips" },
    Mu: { description: "factored bending moment", unit: "kip-ft" },
    Vu: { description: "factored shear force", unit: "kips" },
    M_u: { description: "factored bending moment", unit: "kip-ft" },
    V_u: { description: "factored shear force", unit: "kips" },
    wu: { description: "factored distributed load", unit: "kip/ft" },
    w_u: { description: "factored distributed load", unit: "kip/ft" },
    Fy: { description: "yield stress", unit: "ksi" },
    fy: { description: "yield stress", unit: "ksi" },
    f_y: { description: "yield stress", unit: "ksi" },
    Fu: { description: "tensile strength", unit: "ksi" },
    f_u: { description: "tensile strength", unit: "ksi" },
    E: { description: "modulus of elasticity", unit: "ksi" },
    eta_M: { description: "flexural utilization ratio" },
    eta_V: { description: "shear utilization ratio" },
  };

  const marginaliaEntriesForDisplay = marginaliaEntries.map(({ key, entry }) => {
    if (reportDisplayLanguage !== "en") return { key, entry };

    const compactKey = key.replace(/[{}\\]/g, "").replace(/_/g, "");
    const override =
      englishMarginaliaOverrides[key] ??
      englishMarginaliaOverrides[compactKey];

    if (override) return { key, entry: { ...entry, ...override } };

    return {
      key,
      entry: {
        ...entry,
        description: entry.description
          .replace(/spennvidde/gi, "span length")
          .replace(/nedbøying|nedb├©ying/gi, "deflection")
          .replace(/bøyemoment|b├©yemoment/gi, "bending moment")
          .replace(/skjærkraft|skj├ªrkraft/gi, "shear force")
          .replace(/fordelt last/gi, "distributed load"),
        unit:
          entry.unit === "m" ? "ft" :
          entry.unit === "mm" ? "in" :
          entry.unit === "kN" ? "kips" :
          entry.unit === "kNm" ? "kip-ft" :
          entry.unit === "kN/m" ? "kip/ft" :
          entry.unit,
      },
    };
  });


  // P3 — § 04.1 Engineerkontroll: verifikasjonstabell.
  // Byggjer rader med Storleik | Engineer A | Engineer B | Samsvar.
  //
  // Utfordring: Engineer A and Engineer B kan bruke ulike key-namn for same storleik
  // (Ed_ULS_ugunstig vs E_d_ULS_ugunstig). Vi byggjer difor ein
  // normalisert lookup-tabell over B sine results og fuzzy-matchar.
  //
  // Samsvar-dom: Agent C (Comparator) er den faglege autoriteten på
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

  // Bygg normalisert lookup over Engineer B sine results
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
    // para Engineer A and Engineer B i numeric_differences — bruk hans agent_b_value. Det
    // er meir påliteleg enn å fuzzy-matche B sine rå results på nytt;
    // den matchen feilar når B use ein annan key (slik som for
    // ξ_lim). Reins ein eventuell leiande "=" frå agent-verdien.
    const diffValueB =
      diff?.agent_b_value?.replace(/^\s*=\s*/, "").trim() || null;
    const valueB = diffValueB ?? agentBNormalized.get(normKey) ?? null;

    // R3 — inga B-verdi nokon stad → ikkje ein reell kryss-sjekk; hopp
    // over rada (eit avvik-% skal aldri visast mot ei tom B-celle).
    // MERK: rader der Engineer A and Engineer B er UEINIGE skal IKKJE filtrerast bort —
    // eit reelt avvik (t.d. 27,1 % på ξ_lim, der A reknar frå
    // tøyningskompatibilitet og B use praktisk B500NC-verdi) er
    // itself poenget med konstruktørkontrollen og skal stå synleg.
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
  const coverResultKeys = [...dimKeys, ...bruksgrenseKeys].slice(0, 4);

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
          <span className="uk-mono">{reportPromptVersion}</span>
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
              displayLanguage={reportDisplayLanguage}
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
                <dd className="uk-mono">{reportPromptVersion}</dd>
              </div>
            </dl>

            {stableRapportUrl && (
              <aside className="rapport-access-card" aria-label={reportModel.cover.qrLabel}>
                <div className="rapport-access-card__body">
                  <div className="rapport-access-card__eyebrow">
                    {RP_LABELS.qrAccessPipeline[locale]}
                  </div>
                  <h2 className="rapport-access-card__title">
                    {reportModel.cover.qrLabel}
                  </h2>
                  <p className="rapport-access-card__text">
                    {reportModel.cover.qrDescription}
                  </p>
                  <div className="rapport-access-card__url-label">
                    {RP_LABELS.qrAccessUrlLabel[locale]}
                  </div>
                  <div className="rapport-access-card__url uk-mono">
                    {stableRapportUrl}
                  </div>
                </div>
                <div className="rapport-access-card__qr" aria-hidden="true">
                  <QRCodeSVG
                    value={stableRapportUrl}
                    size={118}
                    level="M"
                    marginSize={1}
                  />
                </div>
              </aside>
            )}

            {reportModel.keyResults.length > 0 && (
              <div className="rapport-cover-results" aria-label={RP_LABELS.coverKeyResults[locale]}>
                <div className="rapport-cover-results__label">
                  {RP_LABELS.coverKeyResults[locale]}
                </div>
                <div className="rapport-cover-results__grid">
                  {reportModel.keyResults.slice(0, 4).map((result) => (
                    <div key={`${result.label}-${result.raw}`} className="rapport-cover-results__item">
                      <div className="rapport-cover-results__key uk-mono">{result.label}</div>
                      <div className="rapport-cover-results__value">
                        <span>{result.value || result.raw || "-"}</span>
                        {result.unit && <small>{result.unit}</small>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!reportModelValidation.ok && (
              <aside className="rapport-model-warning no-print" role="note">
                Rapportmodellen manglar nokre felt. PDF/Word use fallback-verdiar.
              </aside>
            )}

            <div className="rapport-forside__trust">
              <div className="rapport-forside__trust-gauge">
                <TillitGauge
                  score={data.report.tillit_score}
                  breakdown={data.report.tillit_breakdown}
                  displayLanguage={reportDisplayLanguage}
                />
              </div>
              {coverControllerMessage && (
                <div className="rapport-forside__trust-prose">
                  <p>{coverControllerMessage}</p>
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

            <p className="rapport-prose">{reportModel.summary.text}</p>

            <div id="forespurnad" className="rapport-forespurnad-block">
              <div className="rapport-forespurnad-block__label">
                {RP_LABELS.forespurselLabel[locale]}
              </div>
              <pre className="rapport-forespurnad-block__text">
                {reportModel.summary.request}
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
                  aria-label={marginaliaTitle}
                >
                  <div className="rapport-ordliste__title">
                    {marginaliaTitle}
                  </div>
                  <dl className="rapport-ordliste__list">
                    {marginaliaEntriesForDisplay.map(({ key, entry }) => (
                      <div key={key} className="rapport-ordliste-item">
                        <dt className="rapport-ordliste-item__key">
                          {displayResultLabel(key)}
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
              {reportModel.interpretation.assumptions.length > 0 && (
                <div id="foresetnader" className="rapport-subchapter">
                  <div className="rapport-subchapter__eyebrow">
                    {RP_LABELS.sub21Forutsetninger[locale]}
                  </div>
                  <ol className="rapport-numbered-list">
                    {reportModel.interpretation.assumptions.map((a, i) => (
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
                        {reportDimRows.length > 0 && (
                          <>
                            <tr className="rapport-results-table__band rapport-results-table__band--dim">
                              <td colSpan={2} className="rapport-results-table__band-cell">
                                {RP_LABELS.bandDiwhilejonerande[locale]}
                              </td>
                            </tr>
                            {reportDimRows.map((row) => (
                              <tr key={`dim-${row.label}`} className="rapport-results-table__row rapport-results-table__row--dim">
                                <td className="rapport-results-table__key rapport-results-table__key--plain uk-mono">
                                  {row.label}
                                </td>
                                <td className="rapport-results-table__value">
                                  <span className="rapport-results-table__num">
                                    {row.value || row.raw || "-"}
                                  </span>
                                  {row.unit && (
                                    <span className="rapport-results-table__unit">
                                      {" "}{row.unit}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                        {reportInputRows.length > 0 && (
                          <>
                            <tr className="rapport-results-table__band rapport-results-table__band--input">
                              <td colSpan={2} className="rapport-results-table__band-cell">
                                {RP_LABELS.bandInputGeometri[locale]}
                              </td>
                            </tr>
                            {reportInputRows.map((row) => (
                              <tr key={`input-${row.label}`} className="rapport-results-table__row">
                                <td className="rapport-results-table__key rapport-results-table__key--plain uk-mono">
                                  {row.label}
                                </td>
                                <td className="rapport-results-table__value">
                                  <span className="rapport-results-table__num">
                                    {row.value || row.raw || "-"}
                                  </span>
                                  {row.unit && (
                                    <span className="rapport-results-table__unit">
                                      {" "}{row.unit}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                        {reportOtherRows.length > 0 && (
                          <>
                            <tr className="rapport-results-table__band rapport-results-table__band--input">
                              <td colSpan={2} className="rapport-results-table__band-cell">
                                {locale === "nn" ? "ANNA" : "OTHER"}
                              </td>
                            </tr>
                            {reportOtherRows.map((row) => (
                              <tr key={`other-${row.label}`} className="rapport-results-table__row">
                                <td className="rapport-results-table__key rapport-results-table__key--plain uk-mono">
                                  {row.label}
                                </td>
                                <td className="rapport-results-table__value">
                                  <span className="rapport-results-table__num">
                                    {row.value || row.raw || "-"}
                                  </span>
                                  {row.unit && (
                                    <span className="rapport-results-table__unit">
                                      {" "}{row.unit}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* 02.3 — Stegvis utregning */}
              {reportModel.calculation.steps.length > 0 &&
                !isBlocked("calculation_steps_a") && (
                  <div id="utrekning" className="rapport-subchapter">
                    <div className="rapport-subchapter__eyebrow">
                      {RP_LABELS.sub23Stegvis[locale]}
                    </div>
                    <div className="rapport-step-list">
                      {reportModel.calculation.steps.map(
                        (step, i) => {
                          // Kontroll-/konsistens-steg får eige visuelt
                          // uttrykk: "KONTROLL"-label i staden for "STEG NN",
                          // og ein modifier-klasse for subtil styling.
                          const isControl = step.isControlStep;
                          const formulaText = step.formulas.join("\n");
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
                              {formulaText ? (
                                <>
                                  <div className="rapport-step-row__formula-screen">
                                    <FormulaStack
                                      latex={formulaText}
                                      fallbackText={step.prose}
                                    />
                                  </div>
                                  <pre className="rapport-step-row__text rapport-step-row__text--print">
                                    {step.prose}
                                  </pre>
                                  <details className="rapport-step-row__details">
                                    <summary>
                                      {RP_LABELS.visProsaUtrekning[locale]}
                                    </summary>
                                    <pre className="rapport-step-row__text">
                                      {step.prose}
                                    </pre>
                                  </details>
                                </>
                              ) : (
                                <pre className="rapport-step-row__text">
                                  {step.prose}
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
              {reportModel.assessment.professionalAssessment && (
                <div id="fagleg-vurdering" className="rapport-subchapter">
                  <div className="rapport-subchapter__eyebrow">
                    {RP_LABELS.sub31FagleVurdering[locale]}
                  </div>
                  <p className="rapport-prose">
                    {reportModel.assessment.professionalAssessment}
                  </p>
                </div>
              )}

              {/* 03.2 Hva er ikke beregnet — tabell med IKKJE DEKKA-band.
                  Kvar rad har subject (kva) + reason (kvifor). Subject
                  parsast frå string-format limitations (pilot) eller frå
                  key/subject-felt (post-5a). renderMathKey brukast på
                  subject only når den ser ut som ein variabel-key
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
                                    {displayResultLabel(keyForLookup)}
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
              {reportModel.assessment.warnings.length > 0 && (
                <div id="atvaringar" className="rapport-subchapter">
                  <div className="rapport-subchapter__eyebrow">
                    {RP_LABELS.sub33Advarsler[locale]}
                  </div>
                  <div className="rapport-advarsel-list">
                    {reportModel.assessment.warnings.map((w, i) => (
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

            {/* 04.1 Engineerkontroll — kort prosa + verifikasjonstabell.
                Tabellen viser A-verdi, B-verdi (fuzzy-matcha frå B sine
                results sjølv om key-namna skil seg), og samsvar-dom driven
                av Agent C (Comparator) sine numeric_differences med
                numerisk backup-samanlikning. Lèt studenten kryssjekke
                den uavhengige dobbeltberekninga rad-for-rad. */}
            <div id="agentkontroll" className="rapport-subchapter">
              <div className="rapport-subchapter__eyebrow">
                {RP_LABELS.sub41Konstruktorkontroll[locale]}
              </div>
              <p className="rapport-prose">
                {RP_LABELS.berekningaLoyst[locale]}
                {hasReportControlRows ? (
                  <>
                    {" "}
                    {reportControlHasAvvik
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

              {hasReportControlRows && (
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
                    {reportControlRows.map((row) => (
                      <tr
                        key={row.label}
                        className="rapport-verifikasjon-table__row"
                      >
                        <td className="rapport-verifikasjon-table__key rapport-verifikasjon-table__key--plain uk-mono">
                          {row.label}
                        </td>
                        <td className="rapport-verifikasjon-table__val">
                          {row.constructorA}
                        </td>
                        <td className="rapport-verifikasjon-table__val">
                          {row.constructorB || (
                            <span className="rapport-verifikasjon-table__missing">
                              {RP_LABELS.verifikasjonManglar[locale]}
                            </span>
                          )}
                        </td>
                        <td className="rapport-verifikasjon-table__match">
                          {row.match ? (
                            <span
                              className="rapport-verifikasjon-table__check"
                              aria-label={RP_LABELS.verifikasjonSamsvarAria[locale]}
                            >
                              ✓
                            </span>
                          ) : (
                            <span
                              className="rapport-verifikasjon-table__nomatch"
                              aria-label={RP_LABELS.verifikasjonUkjentAria[locale]}
                            >
                              –
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 04.2 Controllerens avgjørelse — verdict-box med mørk header
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
              <p className="rapport-prose">{reportModel.conclusion}</p>
            </div>

            {/* Foreløpig-stripe — DNA-element før signatur. */}
            <ForebelStripe locale={locale} displayLanguage={reportDisplayLanguage} />

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
              same struktur, only uten den frittliggande "forebels"-stripa
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
                  <span className="uk-mono">{reportPromptVersion}</span>
                </div>
                {stableRapportUrl && (
                  <div className="rapport-footer__url uk-mono">{stableRapportUrl}</div>
                )}
              </div>
              {stableRapportUrl && (
                <div className="rapport-footer__qr" aria-label={reportModel.cover.qrLabel}>
                  <QRCodeSVG
                    value={stableRapportUrl}
                    size={88}
                    level="M"
                    marginSize={1}
                  />
                  <span className="rapport-footer__qr-label">{reportModel.cover.qrLabel}</span>
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
            onClick={handlePdfPrint}
            className="uk-btn uk-btn--primary"
          >
            {RP_LABELS.lastNedPDF[locale]}
          </button>
          <a href={wordUrl} className="uk-btn" download={wordFilename}>
            {RP_LABELS.lastNedWord[locale]}
          </a>
          <a href={calculationSheetUrl} className="uk-btn">
            {calculationSheetLabel}
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
              sideonlyn er .no-print. Notasjon-blokka øvst i § 02
              er den print-trygge kanoniske visninga. */}
          {hasMarginalia && (
            <OrdlisteFlyt
              entries={marginaliaEntriesForDisplay}
              title={marginaliaTitle}
              displayLanguage={reportDisplayLanguage}
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
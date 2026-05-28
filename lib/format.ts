// app/lib/format.ts
//
// Label-maps og format-helpers for Pilar — bokmål er default, nynorsk via toggle.
//
// EXTENSIBILITY: For å legge til eit nytt språk (t.d. "en"):
//   1. Legg til i SUPPORTED_LOCALES i lib/locale.ts
//   2. Legg til ein "en"-seksjon i kvar *_BY_LOCALE-map nedanfor
//   3. Backward-compat exports og helpers handterar resten automatisk.

import {
  type Locale,
  DEFAULT_LOCALE,
  localizedLookup,
} from "./locale";

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

// ═══ MATCH-STATUS (Comparator) ════════════════════════════
// Verifisert mot comparisons.match_status i Supabase.

const MATCH_STATUS_LABELS_BY_LOCALE: Record<Locale, Record<string, string>> = {
  nb: {
    match: "Begge konstruktørene er enige",
    minor_differences: "Mindre forskjeller",
    significant_differences: "Betydelige forskjeller",
    critical_disagreement: "Kritisk uenighet",
  },
  nn: {
    match: "Begge konstruktørane er einige",
    minor_differences: "Mindre forskjellar",
    significant_differences: "Betydelege forskjellar",
    critical_disagreement: "Kritisk uenigheit",
  },
};

const MATCH_STATUS_SHORT_BY_LOCALE: Record<Locale, Record<string, string>> = {
  nb: {
    match: "Enige",
    minor_differences: "Mindre avvik",
    significant_differences: "Stort avvik",
    critical_disagreement: "Kritisk",
  },
  nn: {
    match: "Einige",
    minor_differences: "Mindre avvik",
    significant_differences: "Stor avvik",
    critical_disagreement: "Kritisk",
  },
};

const MATCH_PHRASES_BY_LOCALE: Record<Locale, Record<string, string>> = {
  nb: {
    match: " They reached the same result.",
    minor_differences:
      " Det er små forskjeller mellom svarene, hovedsakelig avrunding.",
    significant_differences:
      " Det er betydelige forskjeller mellom svarene — se Controllerens vurdering nedenfor.",
    critical_disagreement: " Det er kritiske forskjeller mellom svarene.",
  },
  nn: {
    match: " Dei kom fram til same resultat.",
    minor_differences:
      " Det er små forskjellar mellom svara, hovudsakleg avrunding.",
    significant_differences:
      " Det er betydelege forskjellar mellom svara — sjå Controlleren si vurdering nedanfor.",
    critical_disagreement: " Det er kritiske forskjellar mellom svara.",
  },
};

// Tones er språknøytrale (fargar/severity)
export const MATCH_STATUS_TONES: Record<string, Tone> = {
  match: "ok",
  minor_differences: "info",
  significant_differences: "warn",
  critical_disagreement: "bad",
};

// Helper-funksjonar (foretrekkast i ny kode)
const MATCH_STATUS_LABELS_EN: Record<string, string> = {
  match: "Both engineers agree",
  minor_differences: "Minor differences",
  significant_differences: "Significant differences",
  critical_disagreement: "Critical disagreement",
};
export function matchStatusLabel(
  key: string,
  language: Locale | "en" = DEFAULT_LOCALE,
): string {
  if (language === "en") return MATCH_STATUS_LABELS_EN[key] ?? key;
  return localizedLookup(MATCH_STATUS_LABELS_BY_LOCALE, key, language);
}
export function matchStatusShort(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return localizedLookup(MATCH_STATUS_SHORT_BY_LOCALE, key, locale);
}
export function matchPhrase(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return localizedLookup(MATCH_PHRASES_BY_LOCALE, key, locale);
}

// Backward-compat exports — returnerer bokmål (DEFAULT_LOCALE).
// Eksisterande kode som `MATCH_STATUS_LABELS[status]` får bokmål-strenger
// utan refaktor. Komponentar bør migrerast til helper-funksjonane over tid.
export const MATCH_STATUS_LABELS = MATCH_STATUS_LABELS_BY_LOCALE[DEFAULT_LOCALE];
export const MATCH_STATUS_SHORT = MATCH_STATUS_SHORT_BY_LOCALE[DEFAULT_LOCALE];
export const MATCH_PHRASES = MATCH_PHRASES_BY_LOCALE[DEFAULT_LOCALE];

// ═══ DECISION-STATUS (Controller) ══════════════════════════
// Verifisert mot controller_decisions.decision_status i Supabase.

const DECISION_STATUS_LABELS_BY_LOCALE: Record<Locale, Record<string, string>> = {
  nb: {
    approved: "Foreløpig godkjent",
    approved_with_warnings: "Godkjent med advarsler",
    uncertain: "Usikker",
    rejected: "Avvist — må kontrolleres",
    needs_more_input: "Trenger mer informasjon",
  },
  nn: {
    approved: "Førebels godkjent",
    approved_with_warnings: "Godkjent med åtvaringar",
    uncertain: "Usikker",
    rejected: "Avvist — må kontrollerast",
    needs_more_input: "Treng meir informasjon",
  },
};

const DECISION_STATUS_SHORT_BY_LOCALE: Record<Locale, Record<string, string>> = {
  nb: {
    approved: "Godkjent",
    approved_with_warnings: "Med advarsel",
    uncertain: "Usikker",
    rejected: "Avvist",
    needs_more_input: "Mangler input",
  },
  nn: {
    approved: "Godkjent",
    approved_with_warnings: "Med åtvaring",
    uncertain: "Usikker",
    rejected: "Avvist",
    needs_more_input: "Manglar input",
  },
};

export const DECISION_STATUS_TONES: Record<string, Tone> = {
  approved: "ok",
  approved_with_warnings: "info",
  uncertain: "warn",
  rejected: "bad",
  needs_more_input: "warn",
};

const DECISION_STATUS_LABELS_EN: Record<string, string> = {
  approved: "Preliminarily approved",
  approved_with_warnings: "Approved with warnings",
  uncertain: "Uncertain",
  rejected: "Rejected — review required",
  needs_more_input: "Needs more information",
};
export function decisionStatusLabel(
  key: string,
  language: Locale | "en" = DEFAULT_LOCALE,
): string {
  if (language === "en") return DECISION_STATUS_LABELS_EN[key] ?? key;
  return localizedLookup(DECISION_STATUS_LABELS_BY_LOCALE, key, language);
}
export function decisionStatusShort(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return localizedLookup(DECISION_STATUS_SHORT_BY_LOCALE, key, locale);
}

export const DECISION_STATUS_LABELS = DECISION_STATUS_LABELS_BY_LOCALE[DEFAULT_LOCALE];
export const DECISION_STATUS_SHORT = DECISION_STATUS_SHORT_BY_LOCALE[DEFAULT_LOCALE];

// ═══ CONFIDENCE ════════════════════════════════════════════

const CONFIDENCE_LABELS_BY_LOCALE: Record<Locale, Record<string, string>> = {
  nb: {
    high: "Høy",
    medium: "Middels",
    low: "Lav",
  },
  nn: {
    high: "Høg",
    medium: "Middels",
    low: "Låg",
  },
};

export const CONFIDENCE_TONES: Record<string, Tone> = {
  high: "ok",
  medium: "warn",
  low: "bad",
};

export function confidenceLabel(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return localizedLookup(CONFIDENCE_LABELS_BY_LOCALE, key, locale);
}

export const CONFIDENCE_LABELS = CONFIDENCE_LABELS_BY_LOCALE[DEFAULT_LOCALE];

// ═══ SEVERITY (Feilrapport + Comparator) ═══════════════════
// error_reports.severity_user har 3 nivå (low/medium/high) — verifisert.
// consistency_issues og numeric_differences har 4 nivå med critical.

const SEVERITY_LABELS_BY_LOCALE: Record<Locale, Record<string, string>> = {
  nb: {
    low: "Lav",
    medium: "Middels",
    high: "Høy",
    critical: "Kritisk",
  },
  nn: {
    low: "Låg",
    medium: "Middels",
    high: "Høg",
    critical: "Kritisk",
  },
};

export const SEVERITY_TONES: Record<string, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warn",
  critical: "bad",
};

export function severityLabel(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return localizedLookup(SEVERITY_LABELS_BY_LOCALE, key, locale);
}

export const SEVERITY_LABELS = SEVERITY_LABELS_BY_LOCALE[DEFAULT_LOCALE];

// ═══ INPUT-TOLKAR-STATUS ═══════════════════════════════════

const INPUT_STATUS_LABELS_BY_LOCALE: Record<"nb" | "nn" | "en", Record<string, string>> = {
  nb: {
    klar: "Klar",
    delvis_klar: "Delvis klar",
    mangelfull: "Mangelfull",
    avvist: "Avvist",
    relevant_ikkje_stotta: "Ikke støttet",
    uklar: "Uklar",
    uklart: "Uklar",
  },
  nn: {
    klar: "Klar",
    delvis_klar: "Delvis klar",
    mangelfull: "Mangelfull",
    avvist: "Avvist",
    relevant_ikkje_stotta: "Ikkje støtta",
    uklar: "Uklar",
    uklart: "Uklar",
  },
  en: {
    klar: "Ready",
    delvis_klar: "Partly ready",
    mangelfull: "Incomplete",
    avvist: "Rejected",
    relevant_ikkje_stotta: "Not supported",
    uklar: "Unclear",
    uklart: "Unclear",
  },
};

export const INPUT_STATUS_TONES: Record<string, Tone> = {
  klar: "ok",
  delvis_klar: "info",
  mangelfull: "warn",
  avvist: "bad",
  relevant_ikkje_stotta: "warn",
  uklar: "warn",
  uklart: "warn",
};

export function inputStatusLabel(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
  language?: "nb" | "nn" | "en",
): string {
  const langKey = language ?? locale;
  return (
    INPUT_STATUS_LABELS_BY_LOCALE[langKey]?.[key] ??
    INPUT_STATUS_LABELS_BY_LOCALE[locale]?.[key] ??
    key
  );
}

export const INPUT_STATUS_LABELS = INPUT_STATUS_LABELS_BY_LOCALE[DEFAULT_LOCALE];

// ═══ DATO ═══════════════════════════════════════════════════
// Eksplisitt månadsoppslag — ikkje avhengig av Intl/ICU-data.
// MONTHS støttar allereie fleire språk; helpers tek Locale-parameter.

const MONTHS = {
  nb: [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember",
  ],
  nn: [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember",
  ],
} as const;

export const formatDate = (
  iso: string | Date,
  locale: Locale = DEFAULT_LOCALE
): string => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = MONTHS[locale][d.getMonth()];
  const year = d.getFullYear();
  return `${day}. ${month} ${year}`;
};

export const formatDateShort = (
  iso: string | Date,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _locale: Locale = DEFAULT_LOCALE
): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
};

/**
 * Formaterer prompt_version frå DB til usevennleg namn.
 * agent_e_v0.3 → Rapportør v0.3.
 * Andre format passerer uendra som fallback.
 *
 * Språknøytral — "Rapportør" er stadnamn for rolla, ikkje ein term som
 * varierer mellom bokmål/nynorsk.
 */
export function formatPromptVersion(version: string | null | undefined): string {
  if (!version) return "ukjent";
  const match = version.match(/^agent_e_(v\d+\.\d+)$/);
  if (match) return `Rapportør ${match[1]}`;
  return version;
}

// ═══ FALLBACK ───────────────────────────────────────────────
// For statusverdiar som dukkar opp i framtida utan å vere mappa.

export const humanize = (raw: string): string =>
  raw.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

// Re-export Locale-typen for kjøpevennleg import frå format.ts.
export type { Locale } from "./locale";
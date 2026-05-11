// app/lib/format.ts

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

// ═══ MATCH-STATUS (Samanliknar) ════════════════════════════
// Verifisert mot comparisons.match_status i Supabase.

export const MATCH_STATUS_LABELS: Record<string, string> = {
  match: "Begge konstruktørar er einige",
  minor_differences: "Mindre forskjellar",
  significant_differences: "Betydelege forskjellar",
  critical_disagreement: "Kritisk uenigheit",
};

export const MATCH_STATUS_SHORT: Record<string, string> = {
  match: "Einige",
  minor_differences: "Mindre avvik",
  significant_differences: "Stor avvik",
  critical_disagreement: "Kritisk",
};

export const MATCH_STATUS_TONES: Record<string, Tone> = {
  match: "ok",
  minor_differences: "info",
  significant_differences: "warn",
  critical_disagreement: "bad",
};

export const MATCH_PHRASES: Record<string, string> = {
  match: " Dei kom fram til same resultat.",
  minor_differences:
    " Det er små forskjellar mellom svara, hovudsakleg avrunding.",
  significant_differences:
    " Det er betydelege forskjellar mellom svara — sjå Kontrolløren si vurdering nedanfor.",
  critical_disagreement: " Det er kritiske forskjellar mellom svara.",
};

// ═══ DECISION-STATUS (Kontrollør) ══════════════════════════
// Verifisert mot controller_decisions.decision_status i Supabase.

export const DECISION_STATUS_LABELS: Record<string, string> = {
  approved: "Førebels godkjent",
  approved_with_warnings: "Godkjent med åtvaringar",
  uncertain: "Usikker",
  rejected: "Avvist — må kontrollerast",
  needs_more_input: "Treng meir informasjon",
};

export const DECISION_STATUS_SHORT: Record<string, string> = {
  approved: "Godkjent",
  approved_with_warnings: "Med åtvaring",
  uncertain: "Usikker",
  rejected: "Avvist",
  needs_more_input: "Manglar input",
};

export const DECISION_STATUS_TONES: Record<string, Tone> = {
  approved: "ok",
  approved_with_warnings: "info",
  uncertain: "warn",
  rejected: "bad",
  needs_more_input: "warn",
};

// ═══ CONFIDENCE ════════════════════════════════════════════

export const CONFIDENCE_LABELS: Record<string, string> = {
  high: "Høg",
  medium: "Middels",
  low: "Låg",
};

export const CONFIDENCE_TONES: Record<string, Tone> = {
  high: "ok",
  medium: "warn",
  low: "bad",
};

// ═══ SEVERITY (Feilrapport + Samanliknar) ═══════════════════
// error_reports.severity_user har 3 nivå (low/medium/high) — verifisert.
// consistency_issues og numeric_differences har 4 nivå med critical.

export const SEVERITY_LABELS: Record<string, string> = {
    low: "Låg",
    medium: "Middels",
    high: "Høg",
    critical: "Kritisk",
  };
  
  export const SEVERITY_TONES: Record<string, Tone> = {
    low: "neutral",
    medium: "info",
    high: "warn",
    critical: "bad",
  };

// ═══ INPUT-TOLKAR-STATUS ═══════════════════════════════════

export const INPUT_STATUS_LABELS: Record<string, string> = {
  klar: "Klar",
  delvis_klar: "Delvis klar",
  mangelfull: "Mangelfull",
  avvist: "Avvist",
  relevant_ikkje_stotta: "Ikkje støtta",
  uklar: "Uklar",
  uklart: "Uklar",
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

// ═══ DATO ═══════════════════════════════════════════════════
// Eksplisitt månadsoppslag — ikkje avhengig av Intl/ICU-data,
// klar for fleire språk når v0.5 kjem.

const MONTHS = {
  nn: [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember",
  ],
  nb: [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
} as const;

export type DateLocale = keyof typeof MONTHS;

export const formatDate = (
  iso: string | Date,
  locale: DateLocale = "nn"
): string => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = MONTHS[locale][d.getMonth()];
  const year = d.getFullYear();
  return locale === "en"
    ? `${month} ${day}, ${year}`
    : `${day}. ${month} ${year}`;
};

export const formatDateShort = (
  iso: string | Date,
  locale: DateLocale = "nn"
): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return locale === "en"
    ? `${mm}/${dd}/${d.getFullYear()}`
    : `${dd}.${mm}.${d.getFullYear()}`;
};

// ═══ FALLBACK ───────────────────────────────────────────────
// For statusverdiar som dukkar opp i framtida utan å vere mappa.

export const humanize = (raw: string): string =>
  raw.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
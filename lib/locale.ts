// app/lib/locale.ts
// Locale-handsaming for Pilar — bokmål er default, nynorsk via toggle.
//
// EXTENSIBILITY:
// For å legge til eit nytt språk (t.d. "en"):
//   1. Legg til i SUPPORTED_LOCALES under
//   2. Legg til ein entry i DIRECTIVE_HEADERS + DIRECTIVE_FOOTERS
//   3. Legg til labels i format.ts (eitt nytt seksjon per Record<Locale, ...>)
// Helper-funksjonar finn automatisk riktig språk via lookup.

export const SUPPORTED_LOCALES = ["nb", "nn"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "nb";
export const LOCALE_STORAGE_KEY = "pilar-locale";
export const LOCALE_COOKIE_NAME = "pilar-locale";

export function isLocale(s: string | null | undefined): s is Locale {
  return typeof s === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(s);
}

export function coerceLocale(s: string | null | undefined): Locale {
  return isLocale(s) ? s : DEFAULT_LOCALE;
}

// ═══ SANDWICH-WRAPPER FOR AGENT-PROMPTAR ════════════════════
// Direktiv ligg både i toppen (set kontekst) og i botnen (siste
// påminning før modellen begynner å generere). Robust mot drift
// over lengre samtalar.

const DIRECTIVE_HEADERS: Record<Locale, string> = {
  nb: `SVARSPRÅK: BOKMÅL
Hele svaret ditt skal være på bokmål. Bruk ikke nynorsk i prosa, sammendrag,
forutsetninger, advarsler eller andre tekstfelt. JSON-nøkler holdes på det som
er spesifisert i schema. Tekniske termer (MEd, fcd, kNm, σ, EC2 osv.) er
språknøytrale og endres ikke.

---

`,
  nn: `SVARSPRÅK: NYNORSK
Heile svaret ditt skal vere på nynorsk. Bruk ikkje bokmål i prosa, samandrag,
føresetnader, åtvaringar eller andre tekstfelt. JSON-nøklar held seg på det som
er spesifisert i schema. Tekniske termar (MEd, fcd, kNm, σ, EC2 osv.) er
språknøytrale og endrast ikkje.

---

`,
};

const DIRECTIVE_FOOTERS: Record<Locale, string> = {
  nb: `

---

PÅMINNELSE OM SVARSPRÅK: Hele svaret skal være på BOKMÅL. Ikke nynorsk.
Tekniske termer (MEd, fcd osv.) er språknøytrale og endres ikke.`,
  nn: `

---

PÅMINNING OM SVARSPRÅK: Heile svaret skal vere på NYNORSK. Ikkje bokmål.
Tekniske termar (MEd, fcd osv.) er språknøytrale og endrast ikkje.`,
};

export function localeDirectiveHeader(locale: Locale): string {
  return DIRECTIVE_HEADERS[locale] ?? DIRECTIVE_HEADERS[DEFAULT_LOCALE];
}

export function localeDirectiveFooter(locale: Locale): string {
  return DIRECTIVE_FOOTERS[locale] ?? DIRECTIVE_FOOTERS[DEFAULT_LOCALE];
}

/**
 * Wrappar ein system-prompt med locale-direktiv i topp + botn.
 * Bruk i kvar agent-route: `system: wrapPromptWithLocale(SYSTEM_PROMPT, locale)`
 */
export function wrapPromptWithLocale(prompt: string, locale: Locale): string {
  return localeDirectiveHeader(locale) + prompt + localeDirectiveFooter(locale);
}

// ═══ CLIENT-SIDE HELPER ═════════════════════════════════════
// For ikkje-React-kontekst (f.eks. fetch-helpers utan useLocale-hook).
// Returnerer DEFAULT_LOCALE under SSR.

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    return coerceLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

// ═══ GENERIC LOOKUP-HELPER ══════════════════════════════════
// Brukast av format.ts og andre stadar som har label-maps.
// Fallback-kjede: locale → DEFAULT_LOCALE → rå nøkkel.

export function localizedLookup<T extends string>(
  map: Record<Locale, Record<string, T>>,
  key: string,
  locale: Locale
): T | string {
  return map[locale]?.[key] ?? map[DEFAULT_LOCALE]?.[key] ?? key;
}


// ═══ SERVER-SIDE COOKIE HELPER ════════════════════════════════
// Bruk i server-komponentar (async function) for å lese aktiv
// locale frå cookie. Klient-side bruker useLocale() i staden.
//
// Døme:
//   import { cookies } from "next/headers";
//   import { getLocaleFromCookies } from "@/lib/locale";
//   const locale = getLocaleFromCookies(await cookies());

type CookieStore = { get: (name: string) => { value: string } | undefined };

export function getLocaleFromCookies(cookieStore: CookieStore): Locale {
  return coerceLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}
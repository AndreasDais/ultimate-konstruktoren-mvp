"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  type Locale,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  coerceLocale,
} from "./locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * Wrappar appen og deler aktiv locale med alle barn.
 * Lever rett inni <body> i app/layout.tsx.
 *
 * Initial verdi er DEFAULT_LOCALE ("nb") for SSR-konsistens.
 * useEffect synkar mot localStorage etter hydration.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      setLocaleState(coerceLocale(stored));
      // Migration: om cookie manglar men localStorage har verdi (use har
      // toggla før cookie-feature kom inn), synk cookie så server-SSR får
      // riktig språk neste navigasjon.
      const hasCookie = document.cookie
        .split("; ")
        .some((c) => c.startsWith("pilar-locale="));
      if (stored && !hasCookie) {
        document.cookie = `pilar-locale=${coerceLocale(stored)}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {
      // localStorage kan vere blokkert (privacy-modus); behald default
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      // Skriv òg som cookie så server-komponentar (t.d. /mine, /vilkar)
      // kan rendere riktig språk på SSR.
      document.cookie = `pilar-locale=${next}; path=/; max-age=31536000; samesite=lax`;
      // Oppdater <html lang> for tilgjengelegheit + skjermlesarar
      document.documentElement.lang = next;
    } catch {
      // ignore — om localStorage feilar held vi only React-state
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook for alle klient-komponentar som treng locale.
 *
 *   const { locale, setLocale } = useLocale();
 *   return <p>{locale === "nb" ? "Hei" : "Hei"}</p>;
 */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
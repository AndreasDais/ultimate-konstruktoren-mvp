"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { InfoPopover } from "./InfoPopover";
import ThemeToggle from "./ThemeToggle";
import { useLocale } from "@/lib/locale-context";

export type HeaderUiMode = "no" | "intl";

type Props = {
  /** Vis AI-disclaimer-chipen. Standard: true. Set false på admin-sider. */
  showAIChip?: boolean;
  /** Vis nn|nb-toggle. Standard: true. Gøymast automatisk i intl-modus. */
  showLocaleToggle?: boolean;
  /**
   * UI-modus: "no" (nb/nn) eller "intl" (engelsk chrome). Server-passa via
   * layout.tsx basert på pilar-ui-mode cookie. Default "no".
   */
  uiMode?: HeaderUiMode;
};

const AI_DISCLAIMER_TEXTS = {
  nb:
    "Dette er en tidlig testversjon. Innholdet er AI-generert og må " +
    "kontrolleres av kvalifisert fagperson før bruk i reelle prosjekt.",
  nn:
    "Dette er ein tidleg testversjon. Innhaldet er AI-generert og må " +
    "kontrollerast av kvalifisert fagperson før bruk i reelle prosjekt.",
  en:
    "This is an early test version. Content is AI-generated and must be " +
    "reviewed by a qualified engineer before use in real projects.",
};

const AI_CHIP_LABELS = {
  nb: "AI-generert · krever faglig kontroll",
  nn: "AI-generert · krev fagleg kontroll",
  en: "AI-generated · requires professional review",
};

const AI_CHIP_POPOVER_LABELS = {
  nb: "AI-generert innhold",
  nn: "AI-generert innhald",
  en: "AI-generated content",
};

const LOCALE_TOGGLE_LABEL = {
  nb: "Målform",
  nn: "Målform",
  en: "Language",
};

const NB_TOOLTIPS = {
  nb: "Bokmål",
  nn: "Bokmål",
  en: "Bokmål",
};

const NN_TOOLTIPS = {
  nb: "Nynorsk",
  nn: "Nynorsk",
  en: "Nynorsk",
};

const SETTINGS_TOOLTIPS = {
  nb: " — åpne innstillinger",
  nn: " — opne innstillingar",
  en: " — open settings",
};

const MINE_LABELS = {
  nb: "Mine",
  nn: "Mine",
  en: "Runs",
};

const LOGOUT_LABELS = {
  nb: "Logg ut",
  nn: "Logg ut",
  en: "Sign out",
};

const LOGIN_LABELS = {
  nb: "Logg inn",
  nn: "Logg inn",
  en: "Sign in",
};

const BRAND_ARIA = {
  nb: "Pilar — til forsiden",
  nn: "Pilar — til framsida",
  en: "Pilar — to homepage",
};

const BRAND_TAGLINE = {
  nb: "AI-KONSTRUKSJONSASSISTENT",
  nn: "AI-KONSTRUKSJONSASSISTENT",
  en: "AI STRUCTURAL ASSISTANT",
};

export default function Header({
  showAIChip = true,
  showLocaleToggle = true,
  uiMode = "no",
}: Props) {
  const { locale, setLocale } = useLocale();

  const pick = <T,>(map: { nb: T; nn: T; en: T }): T =>
    uiMode === "intl" ? map.en : map[locale];

  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    // Hard navigering med vilje — clearer all React-state etter logout
    window.location.href = "/";
  }

  const localeToggleVisible = showLocaleToggle && uiMode === "no";

  return (
    <header className="uk-header">
      <Link
        href="/"
        className="uk-header__brand"
        aria-label={pick(BRAND_ARIA)}
      >
        <span className="uk-header__logo" aria-hidden="true">
          <span className="uk-header__logo-bar" />
          <span className="uk-header__logo-bar" />
        </span>
        <span className="uk-header__brand-text">
          <span className="uk-header__wordmark">Pilar</span>
          <span className="uk-header__tagline">{pick(BRAND_TAGLINE)}</span>
        </span>
      </Link>

      <div className="uk-header__spacer" />

      {showAIChip && (
        <div className="uk-header__ai-chip">
          <span className="uk-header__ai-chip-dot" aria-hidden="true" />
          <span>{pick(AI_CHIP_LABELS)}</span>
          <InfoPopover label={pick(AI_CHIP_POPOVER_LABELS)}>
            <p>{pick(AI_DISCLAIMER_TEXTS)}</p>
          </InfoPopover>
        </div>
      )}

      <ThemeToggle />

      {localeToggleVisible && (
        <div
          className="uk-header__locale"
          role="group"
          aria-label={pick(LOCALE_TOGGLE_LABEL)}
        >
          <button
            type="button"
            onClick={() => setLocale("nb")}
            className={`uk-header__locale-btn ${
              locale === "nb" ? "uk-header__locale-btn--active" : ""
            }`}
            aria-pressed={locale === "nb"}
            title={pick(NB_TOOLTIPS)}
          >
            nb
          </button>
          <button
            type="button"
            onClick={() => setLocale("nn")}
            className={`uk-header__locale-btn ${
              locale === "nn" ? "uk-header__locale-btn--active" : ""
            }`}
            aria-pressed={locale === "nn"}
            title={pick(NN_TOOLTIPS)}
          >
            nn
          </button>
        </div>
      )}

      <div className="uk-header__auth">
        {!authLoaded ? null : user ? (
          <>
            <Link href="/mine" className="uk-header__authlink">
              {pick(MINE_LABELS)}
            </Link>
            <Link
              href="/innstillingar"
              className="uk-header__authlink uk-header__authlink--truncate"
              title={`${user.email ?? ""}${pick(SETTINGS_TOOLTIPS)}`}
            >
              {user.email}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="uk-btn uk-btn--sm uk-btn--ghost"
            >
              {pick(LOGOUT_LABELS)}
            </button>
          </>
        ) : (
          <Link href="/login" className="uk-btn uk-btn--sm">
            {pick(LOGIN_LABELS)}
          </Link>
        )}
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { InfoPopover } from "./InfoPopover";
import ThemeToggle from "./ThemeToggle";
import { useLocale } from "@/lib/locale-context";

type Props = {
  /** Vis AI-disclaimer-chipen. Standard: true. Set false på admin-sider. */
  showAIChip?: boolean;
  /** Vis nn|nb-toggle. Standard: true. */
  showLocaleToggle?: boolean;
};

const AI_DISCLAIMER_TEXTS = {
  nb:
    "Dette er en tidlig testversjon. Innholdet er AI-generert og må " +
    "kontrolleres av kvalifisert fagperson før bruk i reelle prosjekt.",
  nn:
    "Dette er ein tidleg testversjon. Innhaldet er AI-generert og må " +
    "kontrollerast av kvalifisert fagperson før bruk i reelle prosjekt.",
};

const AI_CHIP_LABELS = {
  nb: "AI-generert · krever faglig kontroll",
  nn: "AI-generert · krev fagleg kontroll",
};

const AI_CHIP_POPOVER_LABELS = {
  nb: "AI-generert innhold",
  nn: "AI-generert innhald",
};

const LOCALE_TOGGLE_LABEL = {
  nb: "Målform",
  nn: "Målform",
};

const NB_TOOLTIPS = {
  nb: "Bokmål",
  nn: "Bokmål",
};

const NN_TOOLTIPS = {
  nb: "Nynorsk",
  nn: "Nynorsk",
};

const SETTINGS_TOOLTIPS = {
  nb: " — åpne innstillinger",
  nn: " — opne innstillingar",
};

const MINE_LABELS = {
  nb: "Mine",
  nn: "Mine",
};

const LOGOUT_LABELS = {
  nb: "Logg ut",
  nn: "Logg ut",
};

const LOGIN_LABELS = {
  nb: "Logg inn",
  nn: "Logg inn",
};

const BRAND_ARIA = {
  nb: "Pilar — til forsiden",
  nn: "Pilar — til framsida",
};

export default function Header({
  showAIChip = true,
  showLocaleToggle = true,
}: Props) {
  const { locale, setLocale } = useLocale();

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

  return (
    <header className="uk-header">
      <Link
        href="/"
        className="uk-header__brand"
        aria-label={BRAND_ARIA[locale]}
      >
        <span className="uk-header__logo" aria-hidden="true">
          <span className="uk-header__logo-bar" />
          <span className="uk-header__logo-bar" />
        </span>
        <span className="uk-header__brand-text">
          <span className="uk-header__wordmark">Pilar</span>
          <span className="uk-header__tagline">AI-KONSTRUKSJONSASSISTENT</span>
        </span>
      </Link>

      <div className="uk-header__spacer" />

      {showAIChip && (
        <div className="uk-header__ai-chip">
          <span className="uk-header__ai-chip-dot" aria-hidden="true" />
          <span>{AI_CHIP_LABELS[locale]}</span>
          <InfoPopover label={AI_CHIP_POPOVER_LABELS[locale]}>
            <p>{AI_DISCLAIMER_TEXTS[locale]}</p>
          </InfoPopover>
        </div>
      )}

      <ThemeToggle />

      {showLocaleToggle && (
        <div
          className="uk-header__locale"
          role="group"
          aria-label={LOCALE_TOGGLE_LABEL[locale]}
        >
          <button
            type="button"
            onClick={() => setLocale("nb")}
            className={`uk-header__locale-btn ${
              locale === "nb" ? "uk-header__locale-btn--active" : ""
            }`}
            aria-pressed={locale === "nb"}
            title={NB_TOOLTIPS[locale]}
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
            title={NN_TOOLTIPS[locale]}
          >
            nn
          </button>
        </div>
      )}

      <div className="uk-header__auth">
        {!authLoaded ? null : user ? (
          <>
            <Link href="/mine" className="uk-header__authlink">
              {MINE_LABELS[locale]}
            </Link>
            <Link
              href="/innstillingar"
              className="uk-header__authlink uk-header__authlink--truncate"
              title={`${user.email ?? ""}${SETTINGS_TOOLTIPS[locale]}`}
            >
              {user.email}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="uk-btn uk-btn--sm uk-btn--ghost"
            >
              {LOGOUT_LABELS[locale]}
            </button>
          </>
        ) : (
          <Link href="/login" className="uk-btn uk-btn--sm">
            {LOGIN_LABELS[locale]}
          </Link>
        )}
      </div>
    </header>
  );
}
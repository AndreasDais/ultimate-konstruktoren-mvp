"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { InfoPopover } from "./InfoPopover";
import ThemeToggle from "./ThemeToggle";

type Props = {
  /** Vis AI-disclaimer-chipen. Standard: true. Set false på admin-sider. */
  showAIChip?: boolean;
  /** Vis nn|nb-toggle. Standard: true. */
  showLocaleToggle?: boolean;
};

const AI_DISCLAIMER_TEXT =
  "Dette er ein tidleg testversjon. Innhaldet er AI-generert og må " +
  "kontrollerast av kvalifisert fagperson før bruk i reelle prosjekt.";

export default function Header({
  showAIChip = true,
  showLocaleToggle = true,
}: Props) {
  const [locale, setLocale] = useState<"nn" | "nb">("nn");
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
      <Link href="/" className="uk-header__brand" aria-label="Pilar — til framsida">
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
          <span>AI-generert · krev fagleg kontroll</span>
          <InfoPopover label="AI-generert innhald"><p>{AI_DISCLAIMER_TEXT}</p></InfoPopover>
        </div>
      )}

      <ThemeToggle />

      {showLocaleToggle && (
        <div className="uk-header__locale" role="group" aria-label="Målform">
          <button
            type="button"
            onClick={() => setLocale("nn")}
            className={`uk-header__locale-btn ${
              locale === "nn" ? "uk-header__locale-btn--active" : ""
            }`}
            aria-pressed={locale === "nn"}
          >
            nn
          </button>
          <button
            type="button"
            onClick={() => setLocale("nb")}
            className={`uk-header__locale-btn ${
              locale === "nb" ? "uk-header__locale-btn--active" : ""
            }`}
            aria-pressed={locale === "nb"}
            title="Bokmål kjem i v0.2"
          >
            nb
          </button>
        </div>
      )}

      <div className="uk-header__auth">
        {!authLoaded ? null : user ? (
          <>
            <Link href="/mine" className="uk-header__authlink">
              Mine
            </Link>
            <Link
              href="/innstillingar"
              className="uk-header__authlink uk-header__authlink--truncate"
              title={`${user.email ?? ""} — opne innstillingar`}
            >
              {user.email}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="uk-btn uk-btn--sm uk-btn--ghost"
            >
              Logg ut
            </button>
          </>
        ) : (
          <Link href="/login" className="uk-btn uk-btn--sm">
            Logg inn
          </Link>
        )}
      </div>
    </header>
  );
}
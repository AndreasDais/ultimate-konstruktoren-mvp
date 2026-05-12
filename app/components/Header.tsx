"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

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
    window.location.href = "/";
  }

  return (
    <header className="uk-header">
      <a href="/" className="uk-header__brand" aria-label="Pilar — til framsida">
        <span className="uk-header__logo" aria-hidden="true">
          <span className="uk-header__logo-bar" />
          <span className="uk-header__logo-bar" />
        </span>
        <span className="uk-header__brand-text">
          <span className="uk-header__wordmark">Pilar</span>
          <span className="uk-header__tagline">AI-KONSTRUKSJONSASSISTENT</span>
        </span>
      </a>

      <div className="uk-header__spacer" />

      {showAIChip && (
        <button
          type="button"
          className="uk-header__ai-chip"
          title={AI_DISCLAIMER_TEXT}
          aria-label={AI_DISCLAIMER_TEXT}
        >
          <span className="uk-header__ai-chip-dot" aria-hidden="true" />
          <span>AI-generert · krev fagleg kontroll</span>
          <span className="uk-header__ai-chip-arrow" aria-hidden="true">→</span>
        </button>
      )}

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

      <div className="ml-3 flex items-center gap-2 text-sm">
      {!authLoaded ? null : user ? (
          <>
            <a href="/mine" className="text-neutral-700 hover:text-neutral-900 hover:underline px-1">
              Mine
            </a>
            <a href="/innstillingar" className="text-neutral-700 max-w-[180px] truncate hover:text-neutral-900 hover:underline" title={`${user.email ?? ""} — opne innstillingar`}>
              {user.email}
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Logg ut
            </button>
          </>
        ) : (
          <a href="/login" className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            Logg inn
          </a>
        )}
      </div>
    </header>
  );
}
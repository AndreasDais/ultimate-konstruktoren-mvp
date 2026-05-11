"use client";

import { useState } from "react";

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
    </header>
  );
}
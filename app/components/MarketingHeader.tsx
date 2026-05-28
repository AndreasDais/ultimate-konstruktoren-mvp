"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Lang = "nb" | "nn" | "en";

const LOGIN_LABEL: Record<Lang, string> = {
  nb: "Logg inn",
  nn: "Logg inn",
  en: "Log in",
};

const TAGLINE: Record<Lang, string> = {
  nb: "AI-KONSTRUKSJONSASSISTENT",
  nn: "AI-KONSTRUKSJONSASSISTENT",
  en: "AI STRUCTURAL ASSISTANT",
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export default function MarketingHeader({ lang }: { lang: Lang }) {
  const router = useRouter();

  function chooseLanguage(next: Lang) {
    if (next === lang) return;
    if (next === "en") {
      document.cookie = `pilar-ui-mode=intl; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    } else {
      document.cookie = `pilar-ui-mode=no; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      document.cookie = `pilar-locale=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    }
    router.refresh();
  }

  return (
    <header className="heim-header">
      <Link href="/heim" className="heim-header__brand" aria-label="Pilar">
        <span className="heim-header__logo" aria-hidden="true">
          <span className="heim-header__logo-bar" />
          <span className="heim-header__logo-bar" />
        </span>
        <span className="heim-header__brand-text">
          <span className="heim-header__wordmark">Pilar</span>
          <span className="heim-header__tagline">{TAGLINE[lang]}</span>
        </span>
      </Link>

      <div className="heim-header__spacer" />

      <div className="heim-header__lang" role="group" aria-label="Spraak / Language">
        {(["nb", "nn", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => chooseLanguage(l)}
            className={`heim-header__lang-btn${l === lang ? " heim-header__lang-btn--active" : ""}`}
            aria-pressed={l === lang}
          >
            {l === "en" ? "EN" : l}
          </button>
        ))}
      </div>

      <Link href="/login" className="uk-btn uk-btn--sm">
        {LOGIN_LABEL[lang]}
      </Link>
    </header>
  );
}

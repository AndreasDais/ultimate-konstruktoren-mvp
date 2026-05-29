"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

type Lang = "nb" | "en";

const TAGLINE: Record<Lang, string> = {
  nb: "AI-konstruksjonsassistent",
  en: "AI Structural Assistant",
};

const LOGIN: Record<Lang, string> = {
  nb: "Logg inn",
  en: "Log in",
};

/**
 * Marknads-header for landingssida (/heim). Reint marknadsføring:
 * brand + tema-veljar + Logg inn. Ingen språk-toggle — språk veljast
 * via region-modalen (éin variant per side). Tema-kontrollen er Pilar
 * sin eksisterande ThemeToggle (3 palettar), ikkje designet sin 2-stega.
 * Klassenamna matchar .lp-scopa CSS i heim.css.
 */
export default function MarketingHeader({ lang }: { lang: Lang }) {
  return (
    <header className="header">
      <div className="header__inner">
        <Link href="/heim" className="brand" aria-label="Pilar">
          <span className="brand__mark" aria-hidden="true">
            <i />
            <i />
          </span>
          <span className="brand__text">
            <span className="brand__name">Pilar</span>
            <span className="brand__tag">{TAGLINE[lang]}</span>
          </span>
        </Link>
        <div className="header__right">
          <ThemeToggle uiMode={lang === "en" ? "intl" : "no"} />
          <Link href="/login" className="btn">
            {LOGIN[lang]}
          </Link>
        </div>
      </div>
    </header>
  );
}

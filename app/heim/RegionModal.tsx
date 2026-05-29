"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Lang = "nb" | "en";

const COPY: Record<Lang, {
  title: string;
  body: string;
  norway: string;
  other: string;
}> = {
  nb: {
    title: "Hvor jobber du?",
    body: "Vi tilpasser språk og standarder. Du kan endre dette når som helst.",
    norway: "Norge",
    other: "Annet område",
  },
  en: {
    title: "Where do you work?",
    body: "We tailor language and standards. You can change this any time.",
    norway: "Norway",
    other: "Other region",
  },
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Første-besøk region-pop-up. Viser berre når pilar-ui-mode-cookie
 * manglar (styrt av page.tsx). Valet set cookien heile appen les:
 *   Noreg        → pilar-ui-mode=no   (nynorsk landing)
 *   Anna område  → pilar-ui-mode=intl (engelsk landing)
 * router.refresh() re-rendrar server-komponenten i rett språk.
 * Faktisk ingeniør-region/standard veljast framleis på /international.
 */
export function RegionModal({ lang }: { lang: Lang }) {
  const router = useRouter();
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const t = COPY[lang];

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => firstBtnRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        choose("no"); // trygg default: norsk
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(region: "no" | "intl") {
    document.cookie = `pilar-ui-mode=${region}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="region-modal-backdrop" role="presentation">
      <div
        className="region-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-modal-title"
      >
        <h2 id="region-modal-title" className="region-modal__title">{t.title}</h2>
        <p className="region-modal__body">{t.body}</p>
        <div className="region-modal__actions">
          <button
            ref={firstBtnRef}
            type="button"
            className="btn btn--primary"
            onClick={() => choose("no")}
          >
            {t.norway}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => choose("intl")}>
            {t.other}
          </button>
        </div>
      </div>
    </div>
  );
}

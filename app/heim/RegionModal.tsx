"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Lang = "nb" | "en";

const COPY = {
  title: "Where are you based?",
  body: "Choose the market so PILAR can show the right entry point.",
  norway: "Norway",
  other: "Outside Norway",
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function RegionModal({ lang }: { lang: Lang }) {
  const router = useRouter();
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  void lang;

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => firstBtnRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        choose("no");
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
        <h2 id="region-modal-title" className="region-modal__title">{COPY.title}</h2>
        <p className="region-modal__body">{COPY.body}</p>
        <div className="region-modal__actions">
          <button
            ref={firstBtnRef}
            type="button"
            className="btn btn--primary"
            onClick={() => choose("no")}
          >
            {COPY.norway}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => choose("intl")}>
            {COPY.other}
          </button>
        </div>
      </div>
    </div>
  );
}

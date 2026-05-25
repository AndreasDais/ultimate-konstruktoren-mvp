"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { renderMathKey } from "@/lib/result/formula-extract";
import type { MarginaliaEntry } from "@/lib/marginalia-katalog";

/**
 * OrdlisteFlyt — skjerm-snarveg til ordlista/notasjonen.
 *
 * Trigger-knappen er rendra inline i høgre sidebar (under Fagperson-rada);
 * han arvar .uk-btn. Klikk opnar eit panel som følgjer scroll
 * (position: fixed) og lèt seg lukke med X eller Escape.
 *
 * Panelet er portalt til document.body (same mønster som InfoPopover/
 * ThemeToggle): fixed-elementet blir då ikkje fanga av ein transformert
 * eller overflow-klippa forelder. Knappen sjølv ligg i .no-print-sideonlyn
 * og er difor allereie ute av eksport; panelet får eksplisitt @media print.
 *
 * Den print-trygge kanoniske visninga er .rapport-ordliste-blokka øvst i
 * § 02 — denne komponenten er rein skjerm-bonus.
 *
 * Ikkje modal: rapporten under skal vere fri å scrolle og klikke while
 * panelet står ope. Difor INGEN body-scroll-lock, INGEN focus-trap og
 * inga lukking på klikk-utanfor — only X-knapp og Escape.
 */

type OrdlisteItem = { key: string; entry: MarginaliaEntry };

type Props = {
  /** Same datakjelde som notasjon-blokka øvst i § 02. */
  entries: OrdlisteItem[];
  /** Tittel på panelet — same label som blokka ("ORDLISTE"). */
  title: string;
  displayLanguage?: "nb" | "nn" | "en";
};

export function OrdlisteFlyt({ entries, title, displayLanguage }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Hindrar at fokus-effekten stel fokus ved første render.
  const everOpened = useRef(false);

  // Portal krev document — vent til etter mount (SSR-trygt).
  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape lukkar panelet.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Flytt fokus inn i panelet ved opning; attende til knappen ved lukking.
  useEffect(() => {
    if (open) {
      everOpened.current = true;
      closeRef.current?.focus();
    } else if (everOpened.current) {
      triggerRef.current?.focus();
    }
  }, [open]);

  if (entries.length === 0) return null;

  const lower = title.toLowerCase();
  const isEnglish = displayLanguage === "en";
  const triggerLabel = isEnglish ? "Glossary" : "Ordliste";
  const closeLabel = isEnglish ? "Close glossary" : `Lukk ${lower}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="uk-btn rapport-ordliste-trigger"
        aria-expanded={open}
        aria-controls="rapport-ordliste-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="rapport-ordliste-trigger__glyph" aria-hidden="true">
          &#8801;
        </span>
        {triggerLabel}
      </button>

      {mounted &&
        open &&
        createPortal(
          <aside
            id="rapport-ordliste-panel"
            className="rapport-ordliste-panel"
            role="dialog"
            aria-label={title}
          >
            <div className="rapport-ordliste-panel__head">
              <span className="rapport-ordliste-panel__title">{title}</span>
              <button
                ref={closeRef}
                type="button"
                className="rapport-ordliste-panel__close"
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
              >
                &#215;
              </button>
            </div>
            <dl className="rapport-ordliste-panel__body">
              {entries.map(({ key, entry }) => (
                <div key={key} className="rapport-ordliste-item">
                  <dt className="rapport-ordliste-item__key">
                    {renderMathKey(key)}
                  </dt>
                  <dd className="rapport-ordliste-item__desc">
                    {entry.description}
                    {entry.unit && (
                      <span className="rapport-ordliste-item__unit">
                        {" "}({entry.unit})
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>,
          document.body,
        )}
    </>
  );
}
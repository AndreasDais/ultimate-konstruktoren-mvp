"use client";

/**
 * InfoPopover (dag 15 — Funn 1 + 3)
 *
 * Generisk forklarings-popover for små tag/badge/score-element.
 * Klikk på (i)-ikonet for å vise innhaldet. Lukkar på outside-click,
 * ESC eller ved klikk på annan popover. Posisjonen flippar automatisk
 * hvis han ville klippe viewport.
 *
 * v2-endring: Popover render no via React Portal til document.body med
 * position: fixed. Det gjer at han ALDRI blir klipt av parent-containerar
 * med overflow: hidden/auto (t.d. rapport-sidebar). Posisjonen oppdaterast
 * ved scroll og resize for å halde seg festa til trigger.
 *
 * Trigger er <span role="button"> i staden for <button>, slik at
 * komponenten kan nestast inne i <a> (Link) og <button> (collapse-toggle)
 * utan å bryte HTML-spec for interaktive element.
 *
 * Bruk:
 *   <InfoPopover label="Tillit">
 *     <p>Tillit-skåren måler AI-pipeline si interne semje...</p>
 *   </InfoPopover>
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./info-popover.css";

type Props = {
  /** Kort tittel som vises øvst i popoveren */
  label: string;
  /** Forklarings-innhald (kan vere prose, lister, etc) */
  children: ReactNode;
  /** Aria-label for ikonet — default "Forklaring for {label}" */
  ariaLabel?: string;
  /** Ekstra css-klasse på trigger-knappen */
  className?: string;
};

type Position = {
  top: number;
  left: number;
  maxWidth: number;
};

const POPOVER_MAX_WIDTH = 280;
const VIEWPORT_PADDING = 12;
const GAP = 8;

export function InfoPopover({ label, children, ariaLabel, className }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // === Berekn posisjon basert på trigger og viewport ===
  useEffect(() => {
    if (!open) return;

    function update() {
      if (!triggerRef.current) return;

      const trigger = triggerRef.current.getBoundingClientRect();
      const viewport = { w: window.innerWidth, h: window.innerHeight };

      // Estimert høgde før popover er rendra. Etter render har vi reell høgde.
      const popoverHeight = popoverRef.current?.offsetHeight ?? 120;

      // Vertikal: flippe til over hvis ikkje plass under
      const spaceBelow = viewport.h - trigger.bottom;
      const spaceAbove = trigger.top;
      const top =
        spaceBelow < popoverHeight + GAP && spaceAbove > spaceBelow
          ? trigger.top - popoverHeight - GAP
          : trigger.bottom + GAP;

      // Horisontal: align venstre-kant med trigger; flytte inn viss klipp
      let left = trigger.left;
      const maxWidth = Math.min(
        POPOVER_MAX_WIDTH,
        viewport.w - 2 * VIEWPORT_PADDING
      );

      if (left + maxWidth > viewport.w - VIEWPORT_PADDING) {
        // Align høgre-kant med trigger sin høgre-kant
        left = trigger.right - maxWidth;
      }
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
      }

      setPosition({ top, left, maxWidth });
    }

    // Initial posisjon (basert på estimert høgde)
    update();
    // Re-berekn neste frame når popover har faktisk høgde
    const raf = requestAnimationFrame(update);

    // Hald popover festa til trigger ved scroll/resize
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // === Lukk på outside-click ===
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // === Lukk på ESC ===
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // === Lukk andre popovers når denne opnast ===
  useEffect(() => {
    if (!open) return;
    function onOtherOpen(e: Event) {
      if ((e as CustomEvent).detail !== triggerRef.current) {
        setOpen(false);
      }
    }
    document.addEventListener("info-popover-open", onOtherOpen);
    return () =>
      document.removeEventListener("info-popover-open", onOtherOpen);
  }, [open]);

  function doToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      document.dispatchEvent(
        new CustomEvent("info-popover-open", { detail: triggerRef.current })
      );
    } else {
      setPosition(null);
    }
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    doToggle();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      doToggle();
    }
  }

  // === Popover-innhald (rendrast via Portal) ===
  const popoverNode =
    open && position ? (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={`Forklaring for ${label}`}
        className="info-popover"
        style={{
          top: position.top,
          left: position.left,
          maxWidth: position.maxWidth,
        }}
      >
        <div className="info-popover-label">{label}</div>
        <div className="info-popover-content">{children}</div>
      </div>
    ) : null;

  return (
    <span className={`info-popover-wrap${className ? ` ${className}` : ""}`}>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="info-popover-trigger"
        aria-label={ariaLabel || `Forklaring for ${label}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        i
      </span>
      {popoverNode && typeof document !== "undefined"
        ? createPortal(popoverNode, document.body)
        : null}
    </span>
  );
}
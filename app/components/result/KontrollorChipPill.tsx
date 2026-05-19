"use client";

/**
 * KontrollorChipPill (#02) — kompakt chip for fag-flagg i Kontrollør-kortet.
 *
 * Klikk på chip utvidar han inline til å vise full tekst (multi-linje,
 * wrappa). Klikk igjen kollapsar tilbake til truncert form. Multiple
 * chips kan vere utvida samtidig — kvar chip styrer sin eigen state.
 *
 * Designval: Inline-utviding i staden for popover gjer at studenten kan
 * samanlikne fleire faglege merknader side om side utan å miste kontekst.
 * Pille-radius vert redusert til 8px ved utviding for å handtere multi-
 * linje pent (full pill-radius ser rart ut når innhaldet wrappar).
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 3.
 */

import { useEffect, useRef, useState } from "react";
import type { KontrollorChip } from "@/lib/result/types";

// Pille-radius vert redusert til 8px ved utviding for å handtere multi-
// linje pent (full pill-radius ser rart ut når innhaldet wrappar).
export function KontrollorChipPill({
  chip,
  index = 0,
  enableAura = false,
  fullWidth = false,
}: {
  chip: KontrollorChip;
  index?: number;
  enableAura?: boolean;
  /** True når chipen er del av ein vertikal liste — strekker til full bredde.
   *  False (default) gir pille-form som passer innhaldet (brukt for korte
   *  konfidens-chips i wrap-rad). */
  fullWidth?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // hasAppeared (#anim-02): triggrar stagger-animasjonen først når chipen
  // er minst 10% synleg i viewporten. Brukar sin auga er på Kontrollør-
  // kortet øvst først, så animasjonen må vente til dei faktisk ser raden.
  const [hasAppeared, setHasAppeared] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hasAppeared) return;
    const el = buttonRef.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setHasAppeared(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAppeared(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasAppeared]);

  const toneStyles: Record<"info" | "warn" | "neutral", { bg: string; border: string; color: string }> = {
    info: {
      bg: "rgba(79, 139, 110, 0.06)", // grøn-tona som matchar uk-badge--ok
      border: "rgba(79, 139, 110, 0.4)",
      color: "var(--fg)",
    },
    warn: {
      bg: "var(--surface-2)",
      border: "var(--border)",
      color: "var(--fg-2)",
    },
    neutral: {
      bg: "var(--surface)",
      border: "var(--border)",
      color: "var(--fg-2)",
    },
  };
  const s = toneStyles[chip.tone];
  // Chip er klikkbar berre om det finst meir tekst å vise — dvs. body
  // eksisterer og er forskjellig frå den synlege chip-teksten.
  const isExpandable =
    !!chip.body && chip.body.trim() !== chip.text.trim();

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => isExpandable && setExpanded(!expanded)}
      aria-expanded={isExpandable ? expanded : undefined}
      disabled={!isExpandable}
      className={[
        "pilar-chip-stagger",
        hasAppeared ? "pilar-chip-stagger--visible" : "",
        enableAura && isExpandable && !expanded && hasAppeared ? "pilar-chip-aura" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        display: fullWidth ? "flex" : "inline-flex",
        alignItems: "flex-start", // top-align for multi-linje
        gap: 5,
        // Padding: kompakt for pille (konfidens), litt meir for full-bredde
        // fag-chips (gir luft når dei står som vertikal liste).
        padding: expanded
          ? "10px 14px 12px"
          : fullWidth
            ? "6px 12px"
            : "4px 10px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        // borderRadius: pille (999) for kompakte konfidens-chips, rounded-
        // rect (8) for full-bredde fag-chips og for alle utvida chips.
        borderRadius: expanded || fullWidth ? 8 : 999,
        fontSize: expanded ? 13 : fullWidth ? 12.5 : 12,
        color: s.color,
        lineHeight: expanded ? 1.6 : 1.5,
        whiteSpace: expanded ? "normal" : "nowrap",
        overflow: expanded ? "visible" : "hidden",
        textOverflow: expanded ? "clip" : "ellipsis",
        cursor: isExpandable ? "pointer" : "default",
        fontFamily: "inherit",
        textAlign: "left",
        // Full bredde berre når fullWidth-prop er sett (vertikal liste).
        // maxWidth begrenser utvida prosa-blokk til ~720px for lesbarheit.
        width: fullWidth ? "100%" : undefined,
        maxWidth: expanded
          ? "min(100%, 720px)"
          : fullWidth
            ? "100%"
            : undefined,
        // transition: flytta til CSS (.pilar-chip-stagger--visible) slik at
        // hover sin transform/box-shadow får same smooth easing utan å bli
        // overskriven av inline-style.
        // Stagger-forsinking: 80ms per chip-index. Klampes til 800ms max
        // for store chip-lister. Køyrer berre når --visible-klassen er sett.
        animationDelay: `${Math.min(index * 80, 800)}ms`,
        // Aura-bølge nedover: kvar chip startar sin aura-puls litt etter
        // forrige, slik at pulsen renner frå topp til bunn av lista.
        // 250ms per chip-posisjon, klampes til 4s max. Pilar-aura sin
        // animation-delay les denne custom property'n.
        ["--aura-delay" as string]: `${1.5 + Math.min(index * 0.25, 4)}s`,
      }}
    >
      {chip.prefix && (
        <span
          style={{
            fontWeight: 600,
            opacity: 0.85,
            flexShrink: 0,
            lineHeight: 1.5,
            // Når utvida, hold prefix-en oppe på linje med overskrifta
            marginTop: expanded ? 1 : 0,
          }}
        >
          {chip.prefix}
        </span>
      )}
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: expanded ? 8 : 0 }}>
        {/* Overskrift — alltid synleg. Når utvida, fed for å vise det er ein
            tittel; når kollapsa, normal vekt. */}
        <span
          style={{
            fontWeight: expanded ? 600 : 400,
            color: expanded ? "var(--fg)" : s.color,
          }}
        >
          {chip.text}
        </span>
        {/* Body — berre når utvida. Prosa-tekst splitta i avsnitt på
            setningsgrenser (punktum + space + stor bokstav) for å gjere
            lange forklaringar lettare å skanne. Konstruktør-namn vert markert
            fed slik at lesaren raskt kan sjå kva som gjeld kva agent. */}
        {expanded && chip.body && (
          <span
            style={{
              color: "var(--fg-2)",
              fontWeight: 400,
              fontSize: 13,
              lineHeight: 1.65,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {chip.body
              // Splitt på setningsgrenser: punktum/utropsteikn/spørsmålsteikn
              // etterfølgt av whitespace + stor bokstav. Lookbehind/lookahead
              // sikrar at vi ikkje splittar inne i forkortingar eller tal.
              .split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])/)
              .map((sentence) => sentence.trim())
              .filter(Boolean)
              .map((sentence, i) => (
                <span key={i}>
                  {/* Detekter konstruktør-prefix og marker fed for skanning */}
                  {(() => {
                    const m = sentence.match(/^(Konstruktør [AB]s?|Begge konstruktørar?|Begge tilnærminger?)/);
                    if (!m) return sentence;
                    return (
                      <>
                        <strong style={{ fontWeight: 600, color: "var(--fg)" }}>
                          {m[0]}
                        </strong>
                        {sentence.slice(m[0].length)}
                      </>
                    );
                  })()}
                </span>
              ))}
          </span>
        )}
      </span>
    </button>
  );
}
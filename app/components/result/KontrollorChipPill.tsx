"use client";

/**
 * KontrollorChipPill — card-row for fag-flagg i Controller-kortet.
 *
 * REDESIGN (post-launch polish):
 * - Pille-form bytta til konsistent card-row med colored left border.
 *   Tone er no kommunisert via 3px farga border-left (info=grøn,
 *   warn=raud-orange, neutral=grå), ikkje via full bakgrunns-tint.
 * - Eksplisitt chevron til høgre signaliserer expand/collapse.
 * - Aura-pulsen (CSS-keyframe pilar-chip-aura-kf) er fjerna — han
 *   var den primære kjelda til "buggy"-kjensla.
 * - Stagger-entrance behaldt, men raskare (40ms × index, max 320ms).
 * - Hover er subtil border-color shift i staden for translateY/scale,
 *   slik at layout er stabilt under interaksjon.
 *
 * Innhald-API uendra: chip.text / chip.body / chip.prefix / chip.tone.
 */

import { useEffect, useRef, useState } from "react";
import type { KontrollorChip } from "@/lib/result/types";

type ToneStyle = {
  borderLeft: string;
  bg: string;
  border: string;
  prefixColor: string;
};

const TONE_STYLES: Record<"info" | "warn" | "neutral", ToneStyle> = {
  info: {
    borderLeft: "rgba(79, 139, 110, 0.85)", // grøn — same familie som ok-badge
    bg: "rgba(79, 139, 110, 0.04)",
    border: "rgba(79, 139, 110, 0.18)",
    prefixColor: "rgb(79, 139, 110)",
  },
  warn: {
    borderLeft: "rgba(184, 138, 60, 0.85)", // amber — varsel
    bg: "rgba(184, 138, 60, 0.05)",
    border: "rgba(184, 138, 60, 0.22)",
    prefixColor: "rgb(184, 138, 60)",
  },
  neutral: {
    borderLeft: "var(--border-strong, rgba(0,0,0,0.25))",
    bg: "var(--surface, transparent)",
    border: "var(--border, rgba(0,0,0,0.12))",
    prefixColor: "var(--fg-muted)",
  },
};

export function KontrollorChipPill({
  chip,
  index = 0,
  enableAura: _enableAura = false, // deprecated — held for backward-compat
  fullWidth = false,
}: {
  chip: KontrollorChip;
  index?: number;
  /** @deprecated aura-pulsen er fjerna i redesign. Param held for API-stabilitet. */
  enableAura?: boolean;
  fullWidth?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
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

  const s = TONE_STYLES[chip.tone];
  const isExpandable =
    !!chip.body && chip.body.trim() !== chip.text.trim();

  // Stagger-delay raskare enn før (var 80ms × max 800ms — for langsamt).
  // No 40ms × index, klampes til 320ms (8 chips).
  const staggerDelayMs = Math.min(index * 40, 320);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => isExpandable && setExpanded(!expanded)}
      aria-expanded={isExpandable ? expanded : undefined}
      disabled={!isExpandable}
      className={[
        "pilar-chip-stagger",
        "pilar-kontrollor-row",
        hasAppeared ? "pilar-chip-stagger--visible" : "",
        expanded ? "pilar-kontrollor-row--expanded" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        // Layout: full bredde card-row med chevron til høgre.
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: fullWidth ? "100%" : "auto",
        // Padding skalerer mildt med expand — meir luft når body vist.
        padding: expanded ? "10px 12px 12px" : "8px 12px",
        // Visuell ramme: tynn rundt + 3px farga venstre.
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.borderLeft}`,
        borderRadius: 6,
        // Typografi
        fontSize: expanded ? 13 : fullWidth ? 13 : 12,
        color: "var(--fg)",
        lineHeight: expanded ? 1.6 : 1.5,
        textAlign: "left",
        fontFamily: "inherit",
        cursor: isExpandable ? "pointer" : "default",
        // maxWidth: lesbarheits-grense for prosa når utvida.
        maxWidth: expanded ? "min(100%, 720px)" : "100%",
        // Stagger-animasjon (definert i app/page.tsx inline CSS):
        // .pilar-chip-stagger er usynleg som default, .--visible spelar
        // av pilar-stagger-in keyframe. Vi controllar berre delay her.
        animationDelay: `${staggerDelayMs}ms`,
      }}
    >
      {/* Innhalds-kolonne — tek alt tilgjengeleg plass. */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: expanded ? 8 : 0,
        }}
      >
        {/* Tittel-rad med valfri prefix-tag (t.d. "+" eller "⚠"). */}
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            minWidth: 0,
          }}
        >
          {chip.prefix && (
            <span
              style={{
                fontWeight: 600,
                color: s.prefixColor,
                flexShrink: 0,
                fontSize: 11,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                opacity: 0.95,
              }}
            >
              {chip.prefix}
            </span>
          )}
          <span
            style={{
              fontWeight: expanded ? 600 : 500,
              color: expanded ? "var(--fg)" : "var(--fg)",
              whiteSpace: expanded ? "normal" : "nowrap",
              overflow: expanded ? "visible" : "hidden",
              textOverflow: expanded ? "clip" : "ellipsis",
              flex: 1,
              minWidth: 0,
            }}
          >
            {chip.text}
          </span>
        </span>

        {/* Body — vist berre når utvida. Setningsbasert avsnitt-splitting
            for skanning, Engineer-namn fed for kjapp visuell parsing. */}
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
              // Tynn separator over body for visuell hierarki.
              paddingTop: 10,
              borderTop: `1px solid ${s.border}`,
            }}
          >
            {chip.body
              .split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])/)
              .map((sentence) => sentence.trim())
              .filter(Boolean)
              .map((sentence, i) => (
                <span key={i}>
                  {(() => {
                    const m = sentence.match(/^(Engineer [AB]s?|Both engineers?|Begge tilnærminger?)/);
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

      {/* Chevron — vist berre om chipen er expandable. Roterer 90° når
          opna (animasjon styrt av .pilar-chevron i global CSS). */}
      {isExpandable && (
        <span
          aria-hidden="true"
          className={`pilar-chevron${expanded ? " pilar-chevron--open" : ""}`}
          style={{
            color: "var(--fg-muted)",
            fontSize: 11,
            lineHeight: 1.5,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          ▸
        </span>
      )}
    </button>
  );
}

"use client";

/**
 * DimensjonerandeTile (#01b) — ein enkelt klikkbar tile med fagleg
 * forklaring.
 *
 * Klikk utvidar tile-en inline til å vise fagleg forklaring av kva
 * verdien tyder (frå KEY_TILE_DESCRIPTIONS). Tile utan registrert
 * beskrivelse er ikkje klikkbar — cursor default, ingen onClick-handler.
 * Multiple tiles kan vere utvida samtidig.
 *
 * DimensjonerandeTiles (#01) — wrapper som rendrar 0-5 tiles i eit
 * 4-kolonne grid med dynamisk spans (styrande tile får span 2).
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 3.
 */

import { useState } from "react";
import type { Locale } from "@/lib/locale";
import { renderMathKey } from "@/lib/result/formula-extract";
import {
  KEY_TILE_DESCRIPTIONS,
  getDimensjonerandeKeys,
  tileLabel,
  splitNumberUnit,
} from "@/lib/result/tile-heuristics";
import { CountUp } from "./CountUp";

export function DimensjonerandeTile({
  k,
  value,
  isStyrande,
  span,
  locale,
}: {
  k: string;
  value: string;
  isStyrande: boolean;
  span: number;
  locale: Locale;
}) {
  const [expanded, setExpanded] = useState(false);
  const { number, unit } = splitNumberUnit(value);
  const description = KEY_TILE_DESCRIPTIONS[k]?.[locale];
  const isClickable = !!description;

  return (
    <button
      type="button"
      onClick={isClickable ? () => setExpanded(!expanded) : undefined}
      aria-expanded={isClickable ? expanded : undefined}
      className={
        isClickable
          ? `pilar-tile-clickable${isStyrande ? " pilar-tile-dark" : ""}`
          : undefined
      }
      style={{
        // Reset browser button-defaults
        appearance: "none",
        font: "inherit",
        textAlign: "left",
        // Layout
        padding: expanded ? "13px 14px 14px" : "13px 14px 12px",
        borderRadius: "var(--r-sm)",
        background: isStyrande ? "var(--fg)" : "var(--surface)",
        color: isStyrande ? "var(--surface)" : "var(--fg)",
        border: isStyrande ? "1px solid transparent" : "1px solid var(--border)",
        gridColumn: `span ${span}`,
        minWidth: 0, // tillet grid-cella å krympe utan å sprenge wrap
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: isClickable ? "pointer" : "default",
        // transition er flytta til .pilar-tile-clickable-klassen så hover
        // sin transform/box-shadow får same easing-kurve som padding-overgangen
      }}
    >
      <div
        className="uk-eyebrow"
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          color: isStyrande ? "var(--surface)" : "var(--fg-muted)",
          opacity: isStyrande ? 0.7 : 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={k}
      >
        {tileLabel(k, locale)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 5,
          flexWrap: "nowrap",
          minWidth: 0,
          lineHeight: 1,
        }}
      >
        <span
          className="uk-mono"
          style={{
            fontSize: isStyrande ? 26 : 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
          }}
        >
          <CountUp numberStr={number} />
        </span>
        {unit && (
          <span
            className="uk-mono"
            style={{
              fontSize: 11,
              opacity: 0.7,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {expanded && description && (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 12,
            lineHeight: 1.55,
            color: isStyrande ? "var(--surface)" : "var(--fg-2)",
            opacity: isStyrande ? 0.85 : 1,
            whiteSpace: "normal",
            fontFamily: "inherit",
          }}
        >
          {description}
        </p>
      )}
    </button>
  );
}

// === DimensjonerandeTiles (#01) ===
// Layout matchar Claude Design sin mock: 4-kol grid med dynamiske spans:
//   1 tile  → spenner heile rada (full breidde)
//   2 tiles → 2+2 (50/50)
//   3 tiles → styrande 2 + 1 + 1 (matchar mock-rad 1)
//   4 tiles → styrande 2 + 1 + 1 / 4 (4. tile på eiga full-breidde rad,
//             som KVASI-PERMANENT i mock'en)
//   5 tiles → 2+1+1 / 2+2 (rad 2 jamt fordelt)
//   6+ tiles → vert standard 2+1+1+1+1+1 (wrap-fri)
//
// Styrande tile (første i lista) har mørk bakgrunn, dei andre lyse.
// align-items: start på grid hindrar at andre tiles strekker seg når
// éin tile vert utvida med fagleg forklaring (#01b).
//
// På smale viewports (mobile) reduserar minmax(0, 1fr) tiles til lågare
// pikselbredde — innhaldet held seg lesbart fordi font-storleik er kompakt.
export function DimensjonerandeTiles({
  results,
  calculationType,
  locale,
  resultRoles,
}: {
  results: Record<string, string>;
  calculationType: string | null;
  locale: Locale;
  resultRoles?: Record<string, string> | null;
}) {
  const keys = getDimensjonerandeKeys(results, calculationType, resultRoles);
  if (keys.length === 0) return null;

  // Bereknar grid-span for kvar tile basert på totalt antall.
  const spanForIndex = (i: number, total: number): number => {
    if (total === 1) return 4; // full breidde
    if (total === 2) return 2; // 2+2
    if (total === 3) return i === 0 ? 2 : 1; // 2+1+1
    if (total === 4) {
      if (i === 0) return 2; // styrande
      if (i === 3) return 4; // KVASI-aktig — full rad 2
      return 1; // dei to mellomste
    }
    if (total === 5) {
      if (i === 0) return 2; // styrande
      if (i <= 2) return 1; // rad 1: 2+1+1
      return 2; // rad 2: 2+2
    }
    // 6+ tiles: styrande span 2, resten span 1, wrap naturleg
    return i === 0 ? 2 : 1;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 10,
        marginTop: 0,
        marginBottom: 4,
        alignItems: "start", // hindrar stretch når éin tile utvidast
      }}
    >
      {keys.map((k, i) => (
        <DimensjonerandeTile
          key={k}
          k={k}
          value={results[k] ?? ""}
          isStyrande={i === 0}
          span={spanForIndex(i, keys.length)}
          locale={locale}
        />
      ))}
    </div>
  );
}
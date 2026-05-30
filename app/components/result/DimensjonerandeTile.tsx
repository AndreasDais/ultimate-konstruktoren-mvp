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
import type { PilarDisplayLanguage } from "@/lib/international/display";
import { renderMathKey } from "@/lib/result/formula-extract";
import {
  getDimensjonerandeKeys,
  tileLabel,
  tileDescription,
  splitNumberUnit,
} from "@/lib/result/tile-heuristics";
import { CountUp } from "./CountUp";

// Klient-side session-cache for lazy /api/explain-forklaringar (udekte nøklar),
// keya på runId:key så same nøkkel ikkje hentar to gonger i same økt.
const explainClientCache = new Map<string, string>();

// Lazy-forklaring UI-tekst (loading + nettverksfeil). Sjølve forklaringa og
// degrade-meldinga ved route-feil kjem lokalisert frå /api/explain-responsen.
const EXPLAIN_UI_TEXT: Record<
  PilarDisplayLanguage,
  { loading: string; failed: string; unavailable: string }
> = {
  nb: {
    loading: "Forklarer …",
    failed: "Kunne ikke hente forklaring akkurat nå. La en fagperson vurdere verdien.",
    unavailable: "Forklaring er ikke tilgjengelig her.",
  },
  nn: {
    loading: "Forklarer …",
    failed: "Klarte ikkje hente forklaring akkurat no. La ein fagperson vurdere verdien.",
    unavailable: "Forklaring er ikkje tilgjengeleg her.",
  },
  en: {
    loading: "Explaining …",
    failed: "Could not load an explanation right now. Have a qualified professional review the value.",
    unavailable: "No explanation available here.",
  },
};

export function DimensjonerandeTile({
  k,
  value,
  isStyrande,
  span,
  displayLanguage,
  runId,
}: {
  k: string;
  value: string;
  isStyrande: boolean;
  span: number;
  displayLanguage: PilarDisplayLanguage;
  runId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const { number, unit } = splitNumberUnit(value);
  const description = tileDescription(k, displayLanguage);

  // Katalog-dekt nøkkel → instant forklaring utan fetch (treng ikkje runId).
  // Udekt nøkkel → lazy /api/explain på klikk, men BERRE når ekte runId finst,
  // så server-cache (run_id:key) ikkje gir stale forklaring på tvers av
  // berekningar. Utan runId: mild degrade, ingen fetch.
  const covered = !!description;
  const canFetch = !covered && !!runId;

  async function loadExplanation() {
    if (!runId) return;
    const cacheKey = `${runId}:${k}`;
    const hit = explainClientCache.get(cacheKey);
    if (hit !== undefined) {
      setFetched(hit);
      return;
    }
    if (fetched !== null || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId, key: k, value, displayLanguage }),
      });
      const data = (await res.json()) as { explanation?: unknown };
      const explanation =
        typeof data.explanation === "string" ? data.explanation.trim() : "";
      if (explanation) {
        explainClientCache.set(cacheKey, explanation);
        setFetched(explanation);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    const next = !expanded;
    setExpanded(next);
    if (next && canFetch) {
      void loadExplanation();
    }
  }

  // Utvida-tekst: katalog → description (instant, treng ikkje runId).
  // Udekt utan runId → "utilgjengeleg" (ingen fetch). Udekt med runId →
  // loading/fetched/failed.
  const expandedBody = covered
    ? description
    : !runId
      ? EXPLAIN_UI_TEXT[displayLanguage].unavailable
      : loading
        ? EXPLAIN_UI_TEXT[displayLanguage].loading
        : fetched !== null
          ? fetched
          : failed
            ? EXPLAIN_UI_TEXT[displayLanguage].failed
            : EXPLAIN_UI_TEXT[displayLanguage].loading;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={expanded}
      aria-busy={loading || undefined}
      className={`pilar-tile-clickable${isStyrande ? " pilar-tile-dark" : ""}`}
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
        cursor: "pointer",
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
        {tileLabel(k, displayLanguage)}
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
      {expanded && (
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
          {expandedBody}
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
  displayLanguage,
  resultRoles,
  runId,
}: {
  results: Record<string, string>;
  calculationType: string | null;
  displayLanguage: PilarDisplayLanguage;
  resultRoles?: Record<string, string> | null;
  runId?: string | null;
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
          displayLanguage={displayLanguage}
          runId={runId}
        />
      ))}
    </div>
  );
}
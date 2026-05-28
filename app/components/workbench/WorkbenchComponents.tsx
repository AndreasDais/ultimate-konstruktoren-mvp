"use client";

/**
 * Samla bunke med små UI-komponentar for Workbench-fasen.
 *
 * - Row: éin-linjes nøkkel-verdi-rad
 * - ListSection: bullet-liste med eyebrow-tittel
 * - TolkteVerdiarGrid: kategori-gruppert grid for Tolkar-tolka verdiar
 * - StreamingProse: prosa-tekst med streaming-cursor
 * - MissingChipStrip: chip-strip for manglande verdiar
 * - StatusKV: nøkkel-verdi-rad med tone-badge
 * - StepIndicator: 3-stegs progresjon-indikator
 *
 * Samla i éin fil sidan dei er små, brukast saman.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 6.
 */

import { Fragment, useEffect, useState } from "react";
import type { Locale } from "@/lib/locale";
import type { Tone } from "@/lib/format";
import type { Phase, ValueCategory } from "@/lib/workbench/types";
import { WB_LABELS as BASE_WB_LABELS } from "@/lib/result/labels";
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  categorizeKey,
  formatKey,
} from "@/lib/workbench/categorize";
import { renderMathKey } from "@/lib/result/formula-extract";
import { Badge } from "@/app/components/Badge";
import { InfoPopover } from "@/app/components/InfoPopover";

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
      <span style={{ color: "var(--fg-muted)", width: 128, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--fg)" }}>{value}</span>
    </div>
  );
}

export function ListSection({
  label,
  items,
  tone = "default",
}: {
  label: string;
  items: string[];
  tone?: "default" | "warn";
}) {
  return (
    <div>
      <div className="uk-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          fontSize: 13,
          color: tone === "warn" ? "var(--warn)" : "var(--fg-2)",
          lineHeight: 1.6,
        }}
      >
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// Bygg detail-tekst for status-banneret (#02) basert på Tolkar-resultat.
// Returnerer ein streng som vises i banner-body, t.d.:
//   "Stål · alle 13 kontroller går"
//   "Stål · 2 element mangler input"
//   "6 felt må fylles før beregning"
export function TolkteVerdiarGrid({
  values,
  locale,
  displayLanguage,
}: {
  values: Record<string, string>;
  locale: Locale;
  /**
   * Når sett til "en" viser kategori-etikettar engelsk. Default følger locale.
   * Drevet av engineering-context, ikkje ui-mode cookie — same som resten
   * av workbench-laget.
   */
  displayLanguage?: "nb" | "nn" | "en";
}) {
  const langKey = displayLanguage ?? locale;
  if (!values || Object.keys(values).length === 0) return null;

  // Gruppér etter kategori, behaldande original innsetjings-rekkjefølge per gruppe
  const grouped = new Map<ValueCategory, Array<[string, string]>>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const [k, v] of Object.entries(values)) {
    const cat = categorizeKey(k);
    grouped.get(cat)!.push([k, v]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat)!;
        if (items.length === 0) return null;

        return (
          <div key={cat}>
            <div
              className="uk-eyebrow"
              style={{ marginBottom: 6, fontSize: 10, opacity: 0.75 }}
            >
              {CATEGORY_LABELS[cat][langKey]}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(100px, max-content) 1fr",
                gap: "3px 16px",
                fontSize: 12.5,
                alignItems: "baseline",
              }}
            >
              {items.map(([k, v]) => (
                <Fragment key={k}>
                  <span className="uk-mono" style={{ color: "var(--fg-2)" }}>
                    {renderMathKey(k)}
                  </span>
                  <span className="uk-mono">{v}</span>
                </Fragment>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// MissingChipStrip (#03) — synleg under input når Tolkar har funne
// manglande verdiar. Klikk → mal blir lagt til i textarea via callback.
// Visuell tone: gulaktig "Tolkar treng meir input"-stripe (warn-tone).
// StreamingProse — typewriter-effekt for Tolkar si oppsummering.
// partial-JSON-parser oppdaterer felt-verdien som heilskap når den er
// "complete" i strømmen, så frontend gradvis avslører teksten i tikk
// av ~2 teikn per 20ms (≈100 chars/sec) for å skape "AI skriv"-kjensla.
//
// Når isStreaming = false, viser full tekst med ein gong (catch-up).
// Når tekst-len < displayed.len, antar vi ny stream og resettar.
export function StreamingProse({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    // Ny stream eller reset: tekst kortare enn det vi viser
    if (text.length < displayed.length) {
      setDisplayed("");
      return;
    }

    // Initial mount med ferdig-strøm (resume-flyt): vis alt umiddelbart
    // utan typewriter. Sjekk på displayed.length === 0 sikrar at vi only
    // hopper når komponenten nettopp er mounta — ikkje når strømmen
    // avsluttar mid-typewriter (då skal animasjonen køyre ferdig).
    if (displayed.length === 0 && !isStreaming) {
      setDisplayed(text);
      return;
    }

    // Innhenta: vent på meir frå strømmen (eller idle om strøm ferdig)
    if (displayed.length >= text.length) {
      return;
    }

    // Type-tikk: avslør 1 teikn til. 14ms gir ~71 chars/sec og glatt
    // visuell rørsle (mindre sprell per frame enn 2 teikn). Køyrer
    // uavhengig av isStreaming — typewriter blir aldri kutta mid-skriving.
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, Math.min(displayed.length + 1, text.length)));
    }, 14);
    return () => clearTimeout(timer);
  }, [text, displayed, isStreaming]);

  const isTyping = displayed.length < text.length;
  const showCursor = isStreaming || isTyping;

  return (
    <p
      style={{
        margin: 0,
        color: "var(--fg-2)",
        lineHeight: 1.55,
        fontSize: 13,
      }}
    >
      {displayed}
      {showCursor && <span className="pilar-cursor" aria-hidden />}
    </p>
  );
}

export function MissingChipStrip({
  fields,
  locale,
  onChipClick,
  labels = BASE_WB_LABELS,
}: {
  fields: string[];
  locale: Locale;
  onChipClick: (fieldText: string) => void;
  /** Proxied WB_LABELS frå page.tsx — gir engelsk variant i intl-modus. */
  labels?: typeof BASE_WB_LABELS;
}) {
  if (!fields || fields.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={labels.tolkarTreng[locale].replace("{n}", String(fields.length))}
      className="pilar-block-appear"
      style={{
        marginTop: 12,
        padding: "12px 14px",
        background: "var(--tone-warn-bg, rgba(202, 138, 4, 0.06))",
        border: "1px solid var(--tone-warn-border, rgba(202, 138, 4, 0.25))",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: "var(--tone-warn-fg, #92400E)",
          fontWeight: 500,
        }}
      >
        {labels.tolkarTreng[locale].replace("{n}", String(fields.length))}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {fields.map((field) => {
          // Vis only nøkkel-delen før "(...)" som chip-label for kompakthet
          const parenIdx = field.indexOf("(");
          const label = (parenIdx > 0 ? field.slice(0, parenIdx) : field).trim();
          return (
            <button
              key={field}
              type="button"
              onClick={() => onChipClick(field)}
              title={field}
              style={{
                padding: "6px 12px",
                fontSize: 12.5,
                background: "var(--surface, #fff)",
                border: "1px solid var(--tone-warn-border, rgba(202, 138, 4, 0.3))",
                borderRadius: 999,
                cursor: "pointer",
                color: "var(--fg, #1F2937)",
                fontFamily: "var(--font-sans, inherit)",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--tone-warn-bg, rgba(202, 138, 4, 0.1))";
                e.currentTarget.style.borderColor = "var(--tone-warn-fg, #92400E)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface, #fff)";
                e.currentTarget.style.borderColor = "var(--tone-warn-border, rgba(202, 138, 4, 0.3))";
              }}
            >
              + {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatusKV({ label, tone, value, explanation }: { label: string; tone: Tone; value: string; explanation?: string }) {
  return (
    <div className="uk-status-kv">
      <span>
        {label}
        {explanation && (<InfoPopover label={label}><p>{explanation}</p></InfoPopover>)}
      </span>
      <Badge status={tone}>{value}</Badge>
    </div>
  );
}

export function StepIndicator({ phase }: { phase: Phase }) {
  // Tre steg per visjon-dokument: Workbench → Mission Control → Rapport.
  // Workbench omfattar både input og Tolkar-resultat (slått saman i dag 4).
  // Mission Control er reknar-fasen. Rapport er calculation_result + /rapport.
  const current = phase === "workbench" ? 1 : phase === "calculating" ? 2 : 3;
  const steps = [
    { num: 1, label: "Workbench" },
    { num: 2, label: "Mission Control" },
    { num: 3, label: "Rapport" },
  ];
  return (
    <div className="uk-steps">
      {steps.map((step, i) => {
        const state =
          step.num < current ? "done" : step.num === current ? "active" : "todo";
        return (
          <span key={step.num} style={{ display: "inline-flex", alignItems: "center" }}>
            <span className={`uk-steps__item uk-steps__item--${state}`}>
              <span className="uk-steps__num">{state === "done" ? "✓" : step.num}</span>
              <span>{step.label}</span>
            </span>
            {i < steps.length - 1 && <span className="uk-steps__sep">→</span>}
          </span>
        );
      })}
    </div>
  );
}
"use client";

import type { PilarDisplayLanguage } from "@/lib/international/display";
import { tileLabel, splitNumberUnit } from "@/lib/result/tile-heuristics";

/**
 * CapacityScreening — preliminary EC3 cross-section capacity screening.
 *
 * Shows the moment (η_M) and/or shear (η_V) screening ratios next to the
 * demand and plastic resistance they derive from. Strictly preliminary:
 * NOT a full capacity check; a neutral ratio shown with no verdict colour, and
 * kept visually separate from the AI-pipeline Tillit gauge. Each pair renders
 * only when its full triple is present; the component renders nothing when no
 * complete pair exists.
 *
 * Wording is fixed and carries no final-verdict terminology.
 */

// Capacity/utilization keys surfaced here. Callers filter these out of the
// generic tiles/rows so they do not render twice. M_Ed / V_Ed are NOT included
// — they remain ordinary key results and are only echoed here as context.
export const EC3_SCREENING_KEYS = new Set([
  "Mpl_Rd",
  "M_pl_Rd",
  "Vpl_Rd",
  "V_pl_Rd",
  "eta_M",
  "eta_V",
]);

const SCREENING_TEXT: Record<
  PilarDisplayLanguage,
  { header: string; disclaimer: string }
> = {
  nb: {
    header: "Kapasitets-screening (foreløpig)",
    disclaimer:
      "Foreløpig EC3-tverrsnittsscreening — ikke en fullstendig kapasitetskontroll. Krever faglig kontroll.",
  },
  nn: {
    header: "Kapasitets-screening (førebels)",
    disclaimer:
      "Førebels EC3-tverrsnittsscreening — ikkje ein fullstendig kapasitetskontroll. Krev fagleg kontroll.",
  },
  en: {
    header: "Capacity screening (preliminary)",
    disclaimer:
      "Preliminary EC3 cross-section screening — not a full capacity check. Requires professional review.",
  },
};

type Pair = { etaKey: string; demandKey: string; capacityKeys: string[] };

// The deterministic patch may surface the capacity under either spelling
// (helper "Mpl_Rd" or the agent's "M_pl_Rd") — resolve whichever is present.
const PAIRS: Pair[] = [
  { etaKey: "eta_M", demandKey: "M_Ed", capacityKeys: ["Mpl_Rd", "M_pl_Rd"] },
  { etaKey: "eta_V", demandKey: "V_Ed", capacityKeys: ["Vpl_Rd", "V_pl_Rd"] },
];

function resolveCapacity(
  results: Record<string, string>,
  keys: string[],
): { key: string; value: string } | null {
  for (const k of keys) {
    const v = results[k];
    if (typeof v === "string" && v.trim().length > 0) return { key: k, value: v };
  }
  return null;
}

function present(v: string | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// Ratio -> bar fill %. Neutral only; caps at 100% but the number is always
// shown in full, so η ≥ 1 is never hidden or coloured as a failure.
function ratioPct(value: string): number {
  const n = parseFloat(value.replace(",", ".").replace(/[^0-9.eE+-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n * 100));
}

export function CapacityScreening({
  results,
  displayLanguage,
}: {
  results: Record<string, string>;
  displayLanguage: PilarDisplayLanguage;
}) {
  const t = SCREENING_TEXT[displayLanguage];

  const visible = PAIRS.filter(
    (p) =>
      present(results[p.etaKey]) &&
      present(results[p.demandKey]) &&
      resolveCapacity(results, p.capacityKeys) !== null,
  );

  if (visible.length === 0) return null;

  return (
    <section className="uk-card" style={{ marginTop: 16 }} aria-label={t.header}>
      <div className="uk-card__hd">
        <div className="uk-card__title">{t.header}</div>
      </div>
      <div className="uk-card__bd">
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--fg-muted)",
          }}
        >
          {t.disclaimer}
        </p>
        {visible.map((p) => {
          const eta = results[p.etaKey];
          const cap = resolveCapacity(results, p.capacityKeys)!;
          const demand = splitNumberUnit(results[p.demandKey]);
          const capacity = splitNumberUnit(cap.value);
          const pct = ratioPct(eta);
          return (
            <div
              key={p.etaKey}
              style={{ padding: "12px 0 4px", borderTop: "1px solid var(--border)" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span
                  className="uk-eyebrow"
                  style={{ fontSize: 10, color: "var(--fg-muted)" }}
                >
                  {tileLabel(p.etaKey, displayLanguage)}
                </span>
                <span
                  className="uk-mono"
                  style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}
                >
                  {eta}
                </span>
              </div>
              {/* Neutral ratio bar — single muted tone, no verdict colour. */}
              <div
                aria-hidden="true"
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: "var(--border)",
                  marginTop: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: "var(--fg-muted)",
                  }}
                />
              </div>
              {/* Demand / plastic resistance the ratio derives from. */}
              <div
                className="uk-mono"
                style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 6 }}
              >
                {p.demandKey} {demand.number}
                {demand.unit ? ` ${demand.unit}` : ""}
                {"  ·  "}
                {cap.key} {capacity.number}
                {capacity.unit ? ` ${capacity.unit}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

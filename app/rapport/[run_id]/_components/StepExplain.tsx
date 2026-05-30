"use client";

import { useState } from "react";
import type { PilarDisplayLanguage } from "@/lib/international/display";

/**
 * StepExplain — liten "forklar dette steget"-kontroll for eit berekningssteg.
 *
 * Lazy: hentar BERRE ved klikk. Bruker ekte run_id (frå rapport-ruta) og
 * cachar per runId:stepKey så same steg ikkje hentar to gonger i same økt.
 * Steg er ikkje katalog-dekte, så /api/explain går til LLM-vegen (eller
 * degrade ved feil). Utan runId: mild "utilgjengeleg"-tekst, ingen fetch.
 * Sjølve forklaringa kjem lokalisert frå /api/explain-responsen, som òg
 * fjernar godkjent/approved/verifisert-ordlyd.
 */

const stepExplainCache = new Map<string, string>();

const STEP_EXPLAIN_TEXT: Record<
  PilarDisplayLanguage,
  { button: string; hide: string; loading: string; failed: string; unavailable: string }
> = {
  nb: {
    button: "Forklar dette steget",
    hide: "Skjul forklaring",
    loading: "Forklarer …",
    failed: "Kunne ikke hente forklaring akkurat nå. La en fagperson vurdere steget.",
    unavailable: "Forklaring er ikke tilgjengelig her.",
  },
  nn: {
    button: "Forklar dette steget",
    hide: "Skjul forklaring",
    loading: "Forklarer …",
    failed: "Klarte ikkje hente forklaring akkurat no. La ein fagperson vurdere steget.",
    unavailable: "Forklaring er ikkje tilgjengeleg her.",
  },
  en: {
    button: "Explain this step",
    hide: "Hide explanation",
    loading: "Explaining …",
    failed: "Could not load an explanation right now. Have a qualified professional review the step.",
    unavailable: "No explanation available here.",
  },
};

export function StepExplain({
  runId,
  stepKey,
  stepLabel,
  stepContext,
  displayLanguage,
}: {
  runId: string | null;
  stepKey: string;
  stepLabel: string;
  stepContext: string;
  displayLanguage: PilarDisplayLanguage;
}) {
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const t = STEP_EXPLAIN_TEXT[displayLanguage];
  const canFetch = !!runId;

  async function loadExplanation() {
    if (!runId) return;
    const cacheKey = `${runId}:${stepKey}`;
    const hit = stepExplainCache.get(cacheKey);
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
        body: JSON.stringify({
          run_id: runId,
          key: stepKey,
          value: stepLabel,
          context: stepContext,
          displayLanguage,
        }),
      });
      const data = (await res.json()) as { explanation?: unknown };
      const explanation =
        typeof data.explanation === "string" ? data.explanation.trim() : "";
      if (explanation) {
        stepExplainCache.set(cacheKey, explanation);
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
    const next = !open;
    setOpen(next);
    if (next && canFetch) {
      void loadExplanation();
    }
  }

  // Utan runId → utilgjengeleg (ingen fetch). Med runId → loading/fetched/failed.
  const body = !runId
    ? t.unavailable
    : loading
      ? t.loading
      : fetched !== null
        ? fetched
        : failed
          ? t.failed
          : t.loading;

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        aria-busy={loading || undefined}
        style={{
          appearance: "none",
          background: "none",
          border: "none",
          padding: 0,
          font: "inherit",
          fontSize: 12,
          color: "var(--fg-2)",
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: 2,
        }}
      >
        {open ? t.hide : t.button}
      </button>
      {open && (
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--fg-2)",
            maxWidth: "62ch",
            whiteSpace: "normal",
          }}
        >
          {body}
        </p>
      )}
    </div>
  );
}

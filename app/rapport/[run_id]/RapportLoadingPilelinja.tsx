"use client";

/**
 * RapportLoadingPilelinja — engaging loading-state for rapport-sida med
 * faktisk streaming frå Agent E (Rapportør).
 *
 * Komponenten driv heile fetch-flowen sjølv. Foreldre rendrar oss og passar
 * inn `onComplete`/`onError`-callbacks for å vite når data er klar.
 *
 * 4 ærlege steg, driven av SSE-events:
 *
 *   1. "Sender forespurnad"      mount → thinking_start  (DB-fetch + setup)
 *   2. "Vurderer kontrollør-tone" thinking_start → text_start  (Claude tenker)
 *   3. "Skriv rapport-prosa"     text_start → complete  (text streamast inn)
 *   4. "Lastar inn og formaterer" complete → unmount  (parse + insert + navig)
 *
 * Levande element:
 * - Steg 3 viser den faktiske streama prosaen i sanntid med blinkande cursor
 * - Felt-label endrar seg per JSON-felt (Samandrag / Fagleg vurdering /
 *   Konklusjon) slik at use ser kva del Claude skriv
 * - Progress-bar baserer seg på akkumulert text-lengd i steg 3
 *
 * Cache-hit: `cached`-event kjem først, så `complete` umiddelbart. Vi hoppar
 * rett til steg 4 og er ute på ~1s.
 *
 * Tilgjengelegheit: role="status", aria-live="polite", reduced-motion-fallback.
 */

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/locale";
import { streamAgent } from "@/lib/stream-agent";
import type { EngineeringContext } from "@/lib/engineering-context";
import { loadEngineeringContextFromStorage } from "@/lib/engineering-context/client";
import { isInternationalEnglishContext } from "@/lib/international/display";

type LangKey = "nb" | "nn" | "en";

// Forventa text-output frå Rapportør (3 prosa-felt). Brukast for å rekne
// progresjon-prosent i steg 3. Realistisk: 1500-3000 teikn samanlagt.
const EXPECTED_TEXT_LENGTH = 2500;

// Maks lengd på live-preview før vi truncate frå venstre med ellipsis.
const PREVIEW_MAX_CHARS = 90;

const LABELS = {
  nb: {
    eyebrow: "PILAR · RAPPORT-PIPELINE",
    title: "Genererer rapport",
    stepsLabel: "Steg",
    of: "av",
    progressLabel: "FREMDRIFT",
    firstTimeHint: "Kan ta 10–30 sekunder første gang rapporten genereres.",
    cachedHint: "Henter rapport fra cache…",
    almostDone: "Snart ferdig…",
    step1: "Sender forespørsel",
    step2: "Vurderer kontrollør-tone",
    step3: "Skriver rapport-prosa",
    step4: "Laster inn og formaterer",
  },
  nn: {
    eyebrow: "PILAR · RAPPORT-PIPELINE",
    title: "Genererer rapport",
    stepsLabel: "Steg",
    of: "av",
    progressLabel: "FRAMDRIFT",
    firstTimeHint: "Kan ta 10–30 sekund første gong rapporten genererast.",
    cachedHint: "Hentar rapport frå cache…",
    almostDone: "Snart ferdig…",
    step1: "Sender forespurnad",
    step2: "Vurderer kontrollør-tone",
    step3: "Skriv rapport-prosa",
    step4: "Lastar inn og formaterer",
  },
  en: {
    eyebrow: "PILAR · REPORT PIPELINE",
    title: "Generating report",
    stepsLabel: "Step",
    of: "of",
    progressLabel: "PROGRESS",
    firstTimeHint: "Can take 10–30 seconds the first time the report is generated.",
    cachedHint: "Retrieving report from cache…",
    almostDone: "Almost done…",
    step1: "Sending request",
    step2: "Evaluating controller tone",
    step3: "Writing report prose",
    step4: "Loading and formatting",
  },
} as const;

// Felt-labels per språk. Brukast i live-preview for å vise kva del av
// rapporten Claude skriv akkurat no.
const FIELD_LABELS: Record<string, Record<LangKey, string>> = {
  executive_summary: { nb: "Sammendrag", nn: "Samandrag", en: "Summary" },
  technical_assessment: {
    nb: "Faglig vurdering",
    nn: "Fagleg vurdering",
    en: "Engineering assessment",
  },
  conclusion: { nb: "Konklusjon", nn: "Konklusjon", en: "Conclusion" },
};

type Phase = "sending" | "thinking" | "writing" | "finalizing";
type StepIndex = 1 | 2 | 3 | 4;

const PHASE_TO_STEP: Record<Phase, StepIndex> = {
  sending: 1,
  thinking: 2,
  writing: 3,
  finalizing: 4,
};

/**
 * Trekk ut den siste field-key + value frå streamande JSON. Handterer
 * både lukka strenger ({"key": "verdi"}) og open strenger ({"key": "verd).
 *
 * Returnerer null om ingen felt har starta streame enno.
 *
 * Implementasjon: regex-basert. Finn alle "key": "value"-par, returnerer
 * den siste. Verdien kan vere open (manglar avsluttande "). Unescape
 * standard JSON-escapes for visning.
 */
function extractCurrentField(
  json: string,
): { field: string; value: string } | null {
  // Match key + verdi. Verdien kan ha escape-sequences (\\", \\n) og
  // kan vere open (mangle avsluttande ").
  const matches = [...json.matchAll(/"(\w+)":\s*"((?:[^"\\]|\\.)*)/g)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  const field = last[1];
  // Unescape vanlege JSON-escapes for visning
  const value = (last[2] || "")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { field, value };
}

type RapportLoadingPilelinjaProps = {
  runId: string;
  locale: Locale;
  onComplete: (data: Record<string, unknown>) => void;
  onError: (message: string) => void;
};

export function RapportLoadingPilelinja({
  runId,
  locale,
  onComplete,
  onError,
}: RapportLoadingPilelinjaProps) {
  const [phase, setPhase] = useState<Phase>("sending");
  const [accumulatedLength, setAccumulatedLength] = useState(0);
  const [currentPreview, setCurrentPreview] = useState<{
    field: string;
    value: string;
  } | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [engineeringContext, setEngineeringContext] = useState<EngineeringContext | null>(null);
  const [engineeringContextLoaded, setEngineeringContextLoaded] = useState(false);
  // Engineering-context i localStorage avgjer engelsk modus. Pre-mount er
  // contexten null, så vi viser locale-default (norsk) først — same flicker-
  // mønster som resten av workbench-laget.
  const langKey: LangKey = isInternationalEnglishContext(engineeringContext)
    ? "en"
    : locale;
  const L = LABELS[langKey];

  // Bruk ref for callbacks slik at streamAgent ikkje må re-startast ved
  // foreldre-re-render. Vi bind nyaste callback inn ved kvar call.
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    setEngineeringContext(loadEngineeringContextFromStorage());
    setEngineeringContextLoaded(true);
  }, []);

  // Start streaming på mount. Bruk AbortController for å avbryte om use
  // navigerer vekk før responsen er klar.
  useEffect(() => {
    if (!engineeringContextLoaded) return;

    const abortController = new AbortController();

    streamAgent(
      "/api/agent-e",
      { run_id: runId, locale, engineering_context: engineeringContext },
      {
        onCached: () => {
          setIsCached(true);
          setPhase("finalizing");
        },
        onThinkingStart: () => setPhase("thinking"),
        onTextStart: () => setPhase("writing"),
        onDelta: (_delta, accumulated) => {
          setAccumulatedLength(accumulated.length);
          // Pluck ut nuvarande felt + verdi for live-preview. Sjeldan
          // returnerer null (only i første få teikn før første field-key).
          const preview = extractCurrentField(accumulated);
          if (preview && preview.value.length > 0) {
            setCurrentPreview(preview);
          }
        },
        onComplete: (data) => {
          setPhase("finalizing");
          // Liten delay slik at use ser steg 4 vise seg kort
          // før navigering. Føles meir kontrollert enn brå hopp.
          setTimeout(() => {
            onCompleteRef.current(data);
          }, 400);
        },
        onError: (message) => {
          onErrorRef.current(message);
        },
      },
      abortController.signal,
    );

    return () => abortController.abort();
  }, [runId, locale, engineeringContext, engineeringContextLoaded]);

  const activeStep = PHASE_TO_STEP[phase];

  // Progress-prosent: ulik logikk per fase
  //   - sending:     5%
  //   - thinking:    30%
  //   - writing:     40-95%  (basert på akkumulert text-lengd)
  //   - finalizing:  100%
  let progressPercent = 0;
  if (phase === "sending") {
    progressPercent = 5;
  } else if (phase === "thinking") {
    progressPercent = 30;
  } else if (phase === "writing") {
    const writingRatio = Math.min(1, accumulatedLength / EXPECTED_TEXT_LENGTH);
    progressPercent = 40 + writingRatio * 55;
  } else if (phase === "finalizing") {
    progressPercent = 100;
  }

  const steps: Array<{ index: StepIndex; label: string }> = [
    { index: 1, label: L.step1 },
    { index: 2, label: L.step2 },
    { index: 3, label: L.step3 },
    { index: 4, label: L.step4 },
  ];

  const showAlmostDone = phase === "finalizing" && !isCached;

  // Live-preview-tekst: trunkert frå venstre om for lang
  const previewValue = currentPreview?.value ?? "";
  const truncatedPreview =
    previewValue.length > PREVIEW_MAX_CHARS
      ? "…" + previewValue.slice(-PREVIEW_MAX_CHARS)
      : previewValue;
  const previewFieldLabel = currentPreview
    ? FIELD_LABELS[currentPreview.field]?.[langKey] ?? currentPreview.field
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${L.title}. ${L.stepsLabel} ${activeStep} ${L.of} 4: ${steps[activeStep - 1].label}`}
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <style>{`
        @keyframes pilelinja-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.4);
            opacity: 0.7;
          }
        }
        @keyframes pilelinja-sweep {
          0% { transform: translateX(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes pilelinja-step-fadein {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Blinkande terminal-cursor på enden av live-preview */
        @keyframes pilelinja-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .pilelinja-dot-active {
          animation: pilelinja-pulse 1.6s ease-in-out infinite;
        }
        .pilelinja-sweep-line {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          overflow: hidden;
          pointer-events: none;
        }
        .pilelinja-sweep-line::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 40%;
          background: linear-gradient(
            90deg,
            transparent,
            var(--accent, #b89767),
            transparent
          );
          animation: pilelinja-sweep 2.4s ease-in-out infinite;
        }
        .pilelinja-step-active {
          animation: pilelinja-step-fadein 0.4s ease-out;
        }
        .pilelinja-cursor {
          display: inline-block;
          margin-left: 1px;
          font-weight: 400;
          color: var(--fg);
          animation: pilelinja-cursor-blink 1s step-end infinite;
        }
        /* Live-preview-blokk: fast høgd for å unngå layout-shift */
        .pilelinja-preview {
          height: 1.5em;
          overflow: hidden;
          white-space: nowrap;
          font-size: 12.5px;
          line-height: 1.4;
          color: var(--fg-muted);
          margin-top: 4px;
          font-family: var(--font-mono, monospace);
        }
        .pilelinja-preview-field {
          color: var(--fg-subtle, var(--fg-muted));
          font-weight: 500;
        }
        .pilelinja-preview-value {
          color: var(--fg-muted);
          font-style: normal;
        }

        @media (prefers-reduced-motion: reduce) {
          .pilelinja-dot-active,
          .pilelinja-sweep-line::after,
          .pilelinja-step-active,
          .pilelinja-cursor {
            animation: none !important;
          }
          .pilelinja-dot-active {
            opacity: 0.8;
          }
          .pilelinja-cursor {
            opacity: 0.5;
          }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {/* === HEADER === */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--fg-muted)",
              marginBottom: 8,
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {L.eyebrow}
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "var(--fg)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {L.title}
          </h1>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "var(--fg-muted)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {isCached ? (
              L.cachedHint
            ) : showAlmostDone ? (
              L.almostDone
            ) : (
              <>
                {L.stepsLabel} {activeStep} {L.of} 4
              </>
            )}
          </div>
        </div>

        {/* === PROGRESS-BAR === */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 6,
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "var(--fg-subtle, var(--fg-muted))",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            <span>{L.progressLabel}</span>
            <span>{Math.round(progressPercent)} %</span>
          </div>
          <div
            style={{
              width: "100%",
              height: 2,
              background: "var(--border, rgba(0,0,0,0.08))",
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "var(--fg)",
                transition: "width 0.4s ease-out",
              }}
            />
          </div>
        </div>

        {/* === STEP-LISTE === */}
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {steps.map((step) => {
            const isDone = step.index < activeStep;
            const isActive = step.index === activeStep;
            const isPending = step.index > activeStep;
            // Live-preview vises only under aktiv writing-step
            const showPreview =
              isActive && phase === "writing" && currentPreview;

            return (
              <li
                key={step.index}
                className={isActive ? "pilelinja-step-active" : undefined}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "14px 4px",
                  borderTop:
                    step.index === 1
                      ? "1px solid var(--border, rgba(0,0,0,0.08))"
                      : "none",
                  borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
                  opacity: isPending ? 0.4 : 1,
                  transition: "opacity 0.4s ease-out",
                }}
              >
                {/* Sirkel-indikator */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: isPending
                      ? "1.5px solid var(--border-strong, rgba(0,0,0,0.2))"
                      : "1.5px solid var(--fg)",
                    background: isDone ? "var(--fg)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.3s ease-out",
                    position: "relative",
                    marginTop: 2,
                  }}
                >
                  {isDone && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 6.5L5 9L9.5 3.5"
                        stroke="var(--bg, white)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isActive && (
                    <div
                      className="pilelinja-dot-active"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--fg)",
                      }}
                    />
                  )}
                </div>

                {/* Label + live-preview */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 14,
                      color: isPending ? "var(--fg-muted)" : "var(--fg)",
                      fontWeight: isActive ? 500 : 400,
                      display: "block",
                    }}
                  >
                    {step.label}
                  </span>

                  {showPreview && (
                    <div className="pilelinja-preview">
                      {previewFieldLabel && (
                        <>
                          <span className="pilelinja-preview-field">
                            {previewFieldLabel}
                          </span>
                          <span
                            style={{
                              color: "var(--fg-subtle, var(--fg-muted))",
                              margin: "0 6px",
                            }}
                          >
                            ·
                          </span>
                        </>
                      )}
                      <span className="pilelinja-preview-value">
                        {truncatedPreview}
                      </span>
                      <span className="pilelinja-cursor" aria-hidden="true">
                        ▎
                      </span>
                    </div>
                  )}
                </div>

                {isActive && (
                  <span
                    className="pilelinja-sweep-line"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* === HINT for første gong === */}
        {!isCached && (
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--fg-muted)",
              fontStyle: "italic",
            }}
          >
            {L.firstTimeHint}
          </div>
        )}
      </div>
    </div>
  );
}
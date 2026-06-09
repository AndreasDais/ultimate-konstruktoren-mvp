"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import type { PilotFeedbackPayload, PilotFeedbackRating, PilotTrustLevel, PilotUseCase } from "@/lib/pilot/types";
import type { EngineeringContext } from "@/lib/engineering-context";
import { loadEngineeringContextFromStorage } from "@/lib/engineering-context/client";
import { isInternationalEnglishContext } from "@/lib/international/display";
import "./feedback.css";

type LangKey = "nb" | "nn" | "en";
type Option<T extends string> = { value: T; label: string };

const COPY: Record<LangKey, {
  eyebrow: string;
  title: string;
  intro: string;
  ratingLegend: string;
  trustLegend: string;
  useCaseLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  followup: string;
  saving: string;
  submit: string;
  back: string;
  success: string;
  error: string;
  ratings: Option<PilotFeedbackRating>[];
  trusts: Option<PilotTrustLevel>[];
  useCases: Option<PilotUseCase>[];
}> = {
  nb: {
    eyebrow: "PILAR · Pilotfeedback",
    title: "Var rapporten nyttig?",
    intro:
      "Feedbacken blir brukt til å forbedre PILAR, identifisere svake oppgavetyper og prioritere riktig før pilot.",
    ratingLegend: "Nytteverdi",
    trustLegend: "Tillit",
    useCaseLabel: "Hva brukte du rapporten til?",
    commentLabel: "Kommentar",
    commentPlaceholder: "Hva var nyttig, feil eller forvirrende?",
    followup: "Dette bør følges opp manuelt",
    saving: "Lagrer ...",
    submit: "Send feedback",
    back: "Tilbake til rapport",
    success: "Takk! Feedbacken er lagret.",
    error: "Kunne ikke lagre feedback.",
    ratings: [
      { value: "useful", label: "Nyttig" },
      { value: "partly", label: "Delvis nyttig" },
      { value: "not_useful", label: "Ikke nyttig" },
    ],
    trusts: [
      { value: "trusted", label: "Stolte på resultatet" },
      { value: "partly_trusted", label: "Stolte delvis" },
      { value: "not_trusted", label: "Stolte ikke" },
      { value: "not_sure", label: "Usikker" },
    ],
    useCases: [
      { value: "understand_task", label: "Forstå oppgaven" },
      { value: "check_answer", label: "Sjekke svar" },
      { value: "report_writing", label: "Skrive rapport" },
      { value: "calculation_sheet", label: "Bruke beregningsark" },
      { value: "latex_overleaf", label: "LaTeX / Overleaf" },
      { value: "word_report", label: "Word-rapport" },
      { value: "other", label: "Annet" },
    ],
  },
  nn: {
    eyebrow: "PILAR · Pilotfeedback",
    title: "Var rapporten nyttig?",
    intro:
      "Feedbacken blir brukt til å forbetre PILAR, identifisere svake oppgåvetypar og prioritere rett før pilot.",
    ratingLegend: "Nytteverdi",
    trustLegend: "Tillit",
    useCaseLabel: "Kva brukte du rapporten til?",
    commentLabel: "Kommentar",
    commentPlaceholder: "Kva var nyttig, feil eller forvirrande?",
    followup: "Dette bør følgjast opp manuelt",
    saving: "Lagrar ...",
    submit: "Send feedback",
    back: "Tilbake til rapport",
    success: "Takk! Feedbacken er lagra.",
    error: "Kunne ikkje lagre feedback.",
    ratings: [
      { value: "useful", label: "Nyttig" },
      { value: "partly", label: "Delvis nyttig" },
      { value: "not_useful", label: "Ikkje nyttig" },
    ],
    trusts: [
      { value: "trusted", label: "Stolte på resultatet" },
      { value: "partly_trusted", label: "Stolte delvis" },
      { value: "not_trusted", label: "Stolte ikkje" },
      { value: "not_sure", label: "Usikker" },
    ],
    useCases: [
      { value: "understand_task", label: "Forstå oppgåva" },
      { value: "check_answer", label: "Sjekke svar" },
      { value: "report_writing", label: "Skrive rapport" },
      { value: "calculation_sheet", label: "Bruke berekningsark" },
      { value: "latex_overleaf", label: "LaTeX / Overleaf" },
      { value: "word_report", label: "Word-rapport" },
      { value: "other", label: "Anna" },
    ],
  },
  en: {
    eyebrow: "PILAR · Pilot feedback",
    title: "Was the report useful?",
    intro:
      "Your feedback helps us improve PILAR, identify weak task types and prioritise the right work before the pilot.",
    ratingLegend: "Usefulness",
    trustLegend: "Trust",
    useCaseLabel: "What did you use the report for?",
    commentLabel: "Comment",
    commentPlaceholder: "What was useful, wrong or confusing?",
    followup: "This should be followed up manually",
    saving: "Saving...",
    submit: "Send feedback",
    back: "Back to report",
    success: "Thank you! The feedback has been saved.",
    error: "Could not save feedback.",
    ratings: [
      { value: "useful", label: "Useful" },
      { value: "partly", label: "Partly useful" },
      { value: "not_useful", label: "Not useful" },
    ],
    trusts: [
      { value: "trusted", label: "Trusted the result" },
      { value: "partly_trusted", label: "Partly trusted" },
      { value: "not_trusted", label: "Did not trust" },
      { value: "not_sure", label: "Unsure" },
    ],
    useCases: [
      { value: "understand_task", label: "Understand the task" },
      { value: "check_answer", label: "Check the answer" },
      { value: "report_writing", label: "Write report" },
      { value: "calculation_sheet", label: "Use calculation sheet" },
      { value: "latex_overleaf", label: "LaTeX / Overleaf" },
      { value: "word_report", label: "Word report" },
      { value: "other", label: "Other" },
    ],
  },
};

function isInternationalUiModeCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((cookie) => cookie === "pilar-ui-mode=intl");
}

export default function ReportFeedbackPage() {
  const { locale } = useLocale();
  const [engineeringContext, setEngineeringContext] = useState<EngineeringContext | null>(null);
  const [reportLanguage, setReportLanguage] = useState<LangKey | null>(null);
  const [isInternationalUiMode, setIsInternationalUiMode] = useState(false);
  const params = useParams<{ run_id: string }>();
  const runId = params?.run_id ?? null;

  useEffect(() => {
    setIsInternationalUiMode(isInternationalUiModeCookie());
    setEngineeringContext(loadEngineeringContextFromStorage());
  }, []);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    async function loadReportLanguage() {
      try {
        const response = await fetch(`/api/runs/${encodeURIComponent(runId ?? "")}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as {
          run?: { display_language?: unknown };
        } | null;
        const value = data?.run?.display_language;
        if ((value === "nb" || value === "nn" || value === "en") && !cancelled) {
          setReportLanguage(value);
        }
      } catch {
        // Behald eksisterande UI-språkfallback om rapport-språket ikkje kan hentast.
      }
    }

    void loadReportLanguage();

    return () => {
      cancelled = true;
    };
  }, [runId]);

  const langKey: LangKey =
    reportLanguage ?? (isInternationalUiMode || isInternationalEnglishContext(engineeringContext) ? "en" : locale);
  const T = COPY[langKey];
  const [rating, setRating] = useState<PilotFeedbackRating>("useful");
  const [trustLevel, setTrustLevel] = useState<PilotTrustLevel>("partly_trusted");
  const [useCase, setUseCase] = useState<PilotUseCase>("check_answer");
  const [comment, setComment] = useState("");
  const [wantsFollowup, setWantsFollowup] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const reportUrl = useMemo(() => {
    if (typeof window === "undefined" || !runId) return null;
    return `${window.location.origin}/rapport/${runId}`;
  }, [runId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError(null);

    const payload: PilotFeedbackPayload = {
      runId,
      rating,
      trustLevel,
      useCase,
      comment,
      wantsFollowup,
      reportUrl,
      source: "report",
      metadata: {
        locale,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    };

    const response = await fetch("/api/pilot/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus("error");
      setError(data.error || T.error);
      return;
    }

    setStatus("saved");
  }

  return (
    <main className="pilot-feedback-page">
      <section className="pilot-feedback-card">
        <p className="pilot-feedback-eyebrow">{T.eyebrow}</p>
        <h1>{T.title}</h1>
        <p>{T.intro}</p>

        <form onSubmit={onSubmit} className="pilot-feedback-form">
          <fieldset>
            <legend>{T.ratingLegend}</legend>
            <div className="pilot-radio-grid">
              {T.ratings.map((item) => (
                <label key={item.value}>
                  <input
                    type="radio"
                    name="rating"
                    value={item.value}
                    checked={rating === item.value}
                    onChange={() => setRating(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{T.trustLegend}</legend>
            <div className="pilot-radio-grid">
              {T.trusts.map((item) => (
                <label key={item.value}>
                  <input
                    type="radio"
                    name="trust"
                    value={item.value}
                    checked={trustLevel === item.value}
                    onChange={() => setTrustLevel(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="pilot-field">
            <span>{T.useCaseLabel}</span>
            <select value={useCase} onChange={(event) => setUseCase(event.target.value as PilotUseCase)}>
              {T.useCases.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="pilot-field">
            <span>{T.commentLabel}</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={T.commentPlaceholder}
              rows={6}
            />
          </label>

          <label className="pilot-check">
            <input
              type="checkbox"
              checked={wantsFollowup}
              onChange={(event) => setWantsFollowup(event.target.checked)}
            />
            <span>{T.followup}</span>
          </label>

          <div className="pilot-feedback-actions">
            <button type="submit" disabled={status === "saving"}>
              {status === "saving" ? T.saving : T.submit}
            </button>
            <Link href={runId ? `/rapport/${runId}` : "/mine"}>{T.back}</Link>
          </div>

          {status === "saved" && <p className="pilot-success">{T.success}</p>}
          {status === "error" && <p className="pilot-error">{error}</p>}
        </form>
      </section>
    </main>
  );
}

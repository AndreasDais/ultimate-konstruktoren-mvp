"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { PublicPipelineReview } from "@/lib/report/pipeline-review";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; review: PipelineReviewResponse };

type Lang = "nb" | "nn" | "en";

type PipelineReviewResponse = PublicPipelineReview & {
  viewer?: { access?: "owner" | "shared" };
};

const PIPELINE_FORK_SEED_KEY = "pilar-pipeline-fork-seed-v1";

const TEXT: Record<Lang, Record<string, string>> = {
  nb: {
    eyebrow: "Delt pipeline-review",
    title: "Pipeline-review",
    loading: "Henter trygg pipeline-review...",
    unavailable: "Pipeline-review er ikke tilgjengelig for denne kjøringen.",
    openReport: "Åpne rapport",
    downloadPdf: "Last ned PDF",
    downloadWord: "Last ned Word",
    calculationSheet: "Beregningsark",
    openWorkbench: "Åpne i Workbench",
    createShare: "Lag trygg delingslenke",
    shareCreated: "Delingslenke klar",
    forkRequest: "Fork / rediger forespørsel",
    actionFailed: "Handlingen kunne ikke fullføres trygt.",
    shareSecretMissing: "Deling er ikke konfigurert i dette miljøet.",
    shareOwnerRequired: "Bare eieren kan lage delingslenke.",
    shareRequiresReport: "En rapport må finnes før deling.",
    shareUnavailable: "Deling er midlertidig utilgjengelig.",
    problem: "Problemgrunnlag",
    interpretation: "Input-tolkning",
    engineers: "Uavhengige konstruktører",
    facts: "Beregningsfakta",
    steps: "Steg",
    comparison: "Sammenligning",
    controller: "Kontrollør",
    safety: "Review-status",
    status: "Status",
    confidence: "Tillit",
    warnings: "Advarsler",
    limitations: "Begrensninger",
    noFacts: "Ingen trygge resultatfelt er tilgjengelige i delt visning.",
    noSteps: "Ingen trygge beregningssteg er tilgjengelige i delt visning.",
    withheld: "Tilbakeholdt av kontrollør",
    missing: "Ikke tilgjengelig",
  },
  nn: {
    eyebrow: "Delt pipeline-review",
    title: "Pipeline-review",
    loading: "Hentar trygg pipeline-review...",
    unavailable: "Pipeline-review er ikkje tilgjengeleg for denne køyringa.",
    openReport: "Opne rapport",
    downloadPdf: "Last ned PDF",
    downloadWord: "Last ned Word",
    calculationSheet: "Berekningsark",
    openWorkbench: "Opne i Workbench",
    createShare: "Lag trygg delingslenke",
    shareCreated: "Delingslenke klar",
    forkRequest: "Fork / rediger førespurnad",
    actionFailed: "Handlinga kunne ikkje fullførast trygt.",
    shareSecretMissing: "Deling er ikkje konfigurert i dette miljøet.",
    shareOwnerRequired: "Berre eigaren kan lage delingslenke.",
    shareRequiresReport: "Ein rapport må finnast før deling.",
    shareUnavailable: "Deling er mellombels utilgjengeleg.",
    problem: "Problemgrunnlag",
    interpretation: "Input-tolking",
    engineers: "Uavhengige konstruktørar",
    facts: "Berekningsfakta",
    steps: "Steg",
    comparison: "Samanlikning",
    controller: "Kontrollør",
    safety: "Review-status",
    status: "Status",
    confidence: "Tillit",
    warnings: "Åtvaringar",
    limitations: "Avgrensingar",
    noFacts: "Ingen trygge resultatfelt er tilgjengelege i delt vising.",
    noSteps: "Ingen trygge berekningssteg er tilgjengelege i delt vising.",
    withheld: "Halde tilbake av kontrollør",
    missing: "Ikkje tilgjengeleg",
  },
  en: {
    eyebrow: "Shared pipeline review",
    title: "Pipeline review",
    loading: "Loading safe pipeline review...",
    unavailable: "Pipeline review is not available for this run.",
    openReport: "Open report",
    downloadPdf: "Download PDF",
    downloadWord: "Download Word",
    calculationSheet: "Calculation sheet",
    openWorkbench: "Open in Workbench",
    createShare: "Create safe share link",
    shareCreated: "Share link ready",
    forkRequest: "Fork / edit request",
    actionFailed: "The action could not be completed safely.",
    shareSecretMissing: "Sharing is not configured in this environment.",
    shareOwnerRequired: "Only the owner can create a share link.",
    shareRequiresReport: "A report must exist before sharing.",
    shareUnavailable: "Sharing is temporarily unavailable.",
    problem: "Problem summary",
    interpretation: "Input interpretation",
    engineers: "Independent engineers",
    facts: "Calculation facts",
    steps: "Steps",
    comparison: "Comparison",
    controller: "Controller",
    safety: "Review status",
    status: "Status",
    confidence: "Confidence",
    warnings: "Warnings",
    limitations: "Limitations",
    noFacts: "No safe result fields are available in the shared view.",
    noSteps: "No safe calculation steps are available in the shared view.",
    withheld: "Withheld by controller",
    missing: "Not available",
  },
};

function cardStyle() {
  return {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    boxShadow: "var(--shadow-sm)",
  };
}

function preLine(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function shareErrorMessage(error: unknown, labels: Record<string, string>): string {
  switch (error) {
    case "share_secret_missing":
      return labels.shareSecretMissing;
    case "owner_required":
      return labels.shareOwnerRequired;
    case "share_requires_completed_run":
    case "share_requires_report":
      return labels.shareRequiresReport;
    case "run_not_found":
    case "share_unavailable":
      return labels.shareUnavailable;
    default:
      return labels.actionFailed;
  }
}

export default function PipelineReviewPage() {
  const params = useParams();
  const runId = String(params.run_id ?? "");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [urlSearchReady, setUrlSearchReady] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("share") ?? "";
    setShareToken(token);
    setUrlSearchReady(true);
  }, []);

  useEffect(() => {
    if (!urlSearchReady) return;
    let cancelled = false;
    setState({ status: "loading" });

    const query = shareToken ? `?share=${encodeURIComponent(shareToken)}` : "";
    fetch(`/api/runs/${runId}/pipeline-review${query}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("pipeline_review_unavailable");
        return (await response.json()) as PipelineReviewResponse;
      })
      .then((review) => {
        if (!cancelled) setState({ status: "ready", review });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            message: TEXT.nb.unavailable,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [runId, shareToken, urlSearchReady]);

  const lang: Lang = useMemo(() => {
    if (state.status !== "ready") return "nb";
    return state.review.run.display_language;
  }, [state]);
  const T = TEXT[lang];

  if (state.status === "loading") {
    return (
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <p style={{ color: "var(--fg-muted)" }}>{T.loading}</p>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-4xl" style={cardStyle()}>
          <div className="p-6">
            <p style={{ color: "var(--fg)" }}>{state.message || T.unavailable}</p>
            <Link href={`/rapport/${runId}`} className="uk-btn uk-btn--primary mt-4">
              {T.openReport}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { review } = state;
  const context = review.problem.engineering_context;
  const isSharedView = review.viewer?.access === "shared";

  async function createShareLink() {
    setActionError(null);
    const response = await fetch(`/api/runs/${runId}/share`, {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: unknown } | null;
      setActionError(shareErrorMessage(data?.error, T));
      return;
    }
    const data = await response.json() as { share_url?: string; token?: string };
    if (!data.share_url || !data.token) {
      setActionError(T.actionFailed);
      return;
    }
    setShareUrl(data.share_url);
  }

  async function forkFromShare() {
    if (!shareToken) return;
    setActionError(null);
    const response = await fetch(`/api/pipeline-shares/${encodeURIComponent(shareToken)}/fork-seed`, {
      cache: "no-store",
    });
    if (!response.ok) {
      setActionError(T.actionFailed);
      return;
    }
    const data = await response.json() as {
      seed_text?: string;
      source_run_id?: string;
      engineering_context?: unknown;
      display_language?: string;
    };
    if (!data.seed_text) {
      setActionError(T.actionFailed);
      return;
    }
    sessionStorage.setItem(
      PIPELINE_FORK_SEED_KEY,
      JSON.stringify({
        seedText: data.seed_text,
        sourceRunId: data.source_run_id ?? runId,
        engineeringContext: data.engineering_context ?? null,
        displayLanguage: data.display_language ?? review.run.display_language,
      }),
    );
    window.location.href = "/";
  }

  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>
            {T.eyebrow}
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold" style={{ color: "var(--fg)" }}>
                {review.report.title || T.title}
              </h1>
              {review.report.subtitle && (
                <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
                  {review.report.subtitle}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={review.report.links.report} className="uk-btn uk-btn--primary">
                {T.openReport}
              </a>
              <a href={review.report.links.pdf} className="uk-btn" download>
                {T.downloadPdf}
              </a>
              <a href={review.report.links.word} className="uk-btn" download>
                {T.downloadWord}
              </a>
              <a href={review.report.links.calculationSheet} className="uk-btn">
                {T.calculationSheet}
              </a>
              {isSharedView ? (
                <button type="button" className="uk-btn uk-btn--primary" onClick={forkFromShare}>
                  {T.forkRequest}
                </button>
              ) : (
                <>
                  <a href={`/?from_run=${encodeURIComponent(runId)}`} className="uk-btn uk-btn--primary">
                    {T.openWorkbench}
                  </a>
                  <button type="button" className="uk-btn" onClick={createShareLink}>
                    {T.createShare}
                  </button>
                </>
              )}
            </div>
          </div>
          {(shareUrl || actionError) && (
            <div className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--fg)" }}>
              {actionError ? (
                <span>{actionError}</span>
              ) : (
                <a href={shareUrl ?? "#"} style={{ textDecoration: "underline" }}>
                  {T.shareCreated}
                </a>
              )}
            </div>
          )}
          <div className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: "var(--warn-border)", background: "var(--warn-bg)", color: "var(--fg)" }}>
            {review.safety.review_required_text}
          </div>
        </header>

        <section className="p-5" style={cardStyle()}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{T.problem}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-2 text-sm" style={{ color: "var(--fg-2)" }}>
              {preLine(review.problem.canonical_summary || review.report.summary).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm" style={{ color: "var(--fg-2)" }}>
              {context.country && <><dt>Region</dt><dd>{context.country}</dd></>}
              {context.standard && <><dt>Standard</dt><dd>{context.standard}</dd></>}
              {context.support_level && <><dt>Support</dt><dd>{context.support_level}</dd></>}
              {context.units && <><dt>Units</dt><dd>{context.units}</dd></>}
              <dt>{T.status}</dt><dd>{review.run.status ?? "-"}</dd>
            </dl>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="p-5" style={cardStyle()}>
            <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{T.interpretation}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--fg-2)" }}>
              {review.interpretation.status}
            </p>
            {review.interpretation.assumptions.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--fg-2)" }}>
                {review.interpretation.assumptions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </div>

          <div className="p-5" style={cardStyle()}>
            <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{T.controller}</h2>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--fg)" }}>
              {review.controller.status}
            </p>
            {review.controller.text && (
              <p className="mt-2 text-sm" style={{ color: "var(--fg-2)" }}>
                {review.controller.text}
              </p>
            )}
            {review.controller.blocked_fields.length > 0 && (
              <p className="mt-3 text-xs" style={{ color: "var(--fg-muted)" }}>
                Blocked: {review.controller.blocked_fields.join(", ")}
              </p>
            )}
          </div>
        </section>

        <section className="p-5" style={cardStyle()}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{T.engineers}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {review.engineers.map((engineer) => (
              <article key={engineer.role} className="rounded-md border p-4" style={{ borderColor: "var(--border-2)" }}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium" style={{ color: "var(--fg)" }}>{engineer.label}</h3>
                  <span className="uk-badge">
                    {engineer.status === "withheld" ? T.withheld : engineer.status === "missing" ? T.missing : engineer.confidence ?? "-"}
                  </span>
                </div>
                {engineer.summary && (
                  <p className="mt-3 text-sm" style={{ color: "var(--fg-2)" }}>{engineer.summary}</p>
                )}
                {engineer.warnings.length > 0 && (
                  <p className="mt-3 text-xs" style={{ color: "var(--fg-muted)" }}>
                    {T.warnings}: {engineer.warnings.join(" · ")}
                  </p>
                )}
                {engineer.limitations.length > 0 && (
                  <p className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                    {T.limitations}: {engineer.limitations.join(" · ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="p-5" style={cardStyle()}>
            <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{T.facts}</h2>
            {review.calculation.facts.length === 0 ? (
              <p className="mt-3 text-sm" style={{ color: "var(--fg-muted)" }}>{T.noFacts}</p>
            ) : (
              <dl className="mt-4 grid grid-cols-[minmax(80px,auto)_1fr] gap-x-4 gap-y-2 text-sm">
                {review.calculation.facts.map((fact) => (
                  <div key={`${fact.label}-${fact.value}`} className="contents">
                    <dt className="font-mono" style={{ color: "var(--fg-muted)" }}>{fact.label}</dt>
                    <dd style={{ color: "var(--fg)" }}>{fact.value}{fact.unit ? ` ${fact.unit}` : ""}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="p-5" style={cardStyle()}>
            <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{T.comparison}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--fg-2)" }}>{review.comparison.text || review.comparison.status}</p>
            {review.comparison.rows.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead style={{ color: "var(--fg-muted)" }}>
                    <tr><th>Field</th><th>A</th><th>B</th><th>Match</th></tr>
                  </thead>
                  <tbody>
                    {review.comparison.rows.slice(0, 8).map((row) => (
                      <tr key={`${row.label}-${row.engineer_a}-${row.engineer_b}`}>
                        <td className="py-1 pr-3">{row.label}</td>
                        <td className="py-1 pr-3">{row.engineer_a}</td>
                        <td className="py-1 pr-3">{row.engineer_b}</td>
                        <td className="py-1">{row.match ? "✓" : "!"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="p-5" style={cardStyle()}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{T.steps}</h2>
          {review.calculation.steps.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: "var(--fg-muted)" }}>{T.noSteps}</p>
          ) : (
            <div className="mt-4 space-y-4">
              {review.calculation.steps.map((step) => (
                <article key={step.title} className="rounded-md border p-4" style={{ borderColor: "var(--border-2)" }}>
                  <h3 className="font-medium" style={{ color: "var(--fg)" }}>{step.title}</h3>
                  {step.prose && <p className="mt-2 text-sm" style={{ color: "var(--fg-2)" }}>{step.prose}</p>}
                  {step.formulas.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm font-mono" style={{ color: "var(--fg)" }}>
                      {step.formulas.map((formula) => <li key={formula}>{formula}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="p-5 text-sm" style={cardStyle()}>
          <h2 className="font-semibold" style={{ color: "var(--fg)" }}>{T.safety}</h2>
          <p className="mt-2" style={{ color: "var(--fg-2)" }}>{review.safety.review_required_text}</p>
          <p className="mt-2" style={{ color: "var(--fg-muted)" }}>
            Mode: {review.mode} · read-only · no resume data
          </p>
        </footer>
      </div>
    </main>
  );
}

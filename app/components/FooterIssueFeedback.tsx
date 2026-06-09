"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type FooterIssueVariant = "en" | "no";
type PageContext = {
  url: string;
  path: string;
  viewport: string;
  browser: string;
};

const COPY: Record<
  FooterIssueVariant,
  {
    button: string;
    title: string;
    intro: string;
    commentLabel: string;
    commentPlaceholder: string;
    screenshotLabel: string;
    screenshotHint: string;
    screenshotPicked: string;
    contextLabel: string;
    cancel: string;
    submit: string;
    submitting: string;
    close: string;
    shortComment: string;
    success: string;
    error: string;
  }
> = {
  en: {
    button: "Report an issue",
    title: "Report an issue",
    intro:
      "Tell us if something looks wrong, confusing, or broken. Page context is attached automatically.",
    commentLabel: "What happened?",
    commentPlaceholder: "Describe what you saw and what you expected...",
    screenshotLabel: "Screenshot",
    screenshotHint:
      "Optional: choose a screenshot if you have one. For now only the file name and size are saved.",
    screenshotPicked: "Selected screenshot:",
    contextLabel: "Context",
    cancel: "Cancel",
    submit: "Send feedback",
    submitting: "Sending...",
    close: "Close issue feedback",
    shortComment: "Write at least 5 characters.",
    success: "Thanks. The feedback has been saved.",
    error: "Could not save feedback.",
  },
  no: {
    button: "Meld fra",
    title: "Meld fra",
    intro:
      "Si fra om noe ser feil, uklart eller ødelagt ut. Sidekontekst legges ved automatisk.",
    commentLabel: "Hva skjedde?",
    commentPlaceholder: "Beskriv hva du så og hva du forventet...",
    screenshotLabel: "Skjermbilde",
    screenshotHint:
      "Valgfritt: velg et skjermbilde hvis du har et. Foreløpig lagres bare filnavn og størrelse.",
    screenshotPicked: "Valgt skjermbilde:",
    contextLabel: "Kontekst",
    cancel: "Avbryt",
    submit: "Send tilbakemelding",
    submitting: "Sender...",
    close: "Lukk tilbakemelding",
    shortComment: "Skriv minst 5 tegn.",
    success: "Takk. Tilbakemeldingen er lagret.",
    error: "Kunne ikke lagre tilbakemelding.",
  },
};

function maskShareTokenInUrl(href: string) {
  try {
    const url = new URL(href);
    if (url.searchParams.has("share")) {
      url.searchParams.set("share", "secure-link");
    }
    return url.toString();
  } catch {
    return href.replace(/([?&]share=)[^&]+/, "$1secure-link");
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function pathFromMaskedHref(href: string) {
  try {
    const url = new URL(href);
    return `${url.pathname}${url.search}`;
  } catch {
    return href.replace(/^https?:\/\/[^/]+/i, "");
  }
}

export default function FooterIssueFeedback({
  variant,
}: {
  variant: FooterIssueVariant;
}) {
  const T = COPY[variant];
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [screenshotNote, setScreenshotNote] = useState("");
  const [context, setContext] = useState<PageContext | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const maskedUrl = maskShareTokenInUrl(window.location.href);
    setContext({
      url: maskedUrl,
      path: pathFromMaskedHref(maskedUrl),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      browser: truncate(window.navigator.userAgent, 180),
    });
  }, [open]);

  function close() {
    if (status === "submitting") return;
    setOpen(false);
    setTimeout(() => {
      setComment("");
      setScreenshotNote("");
      setContext(null);
      setStatus("idle");
      setError("");
    }, 180);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (comment.trim().length < 5) {
      setError(T.shortComment);
      return;
    }

    setStatus("submitting");

    const contextLines = [
      "",
      "---",
      "[PILAR footer issue context]",
      `Page: ${context?.url ?? "unknown"}`,
      `Viewport: ${context?.viewport ?? "unknown"}`,
      `Browser: ${context?.browser ?? "unknown"}`,
      screenshotNote ? `${T.screenshotPicked} ${screenshotNote}` : "",
    ].filter(Boolean);

    const response = await fetch("/api/pilot/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: "partly",
        trustLevel: "not_sure",
        useCase: "other",
        comment: `${comment.trim()}\n${contextLines.join("\n")}`,
        wantsFollowup: true,
        reportUrl: context?.url ?? null,
        source: "pilot_page",
        metadata: {
          page: "global_footer_issue",
          current_path: context?.path ?? null,
          ui_mode: variant === "en" ? "intl" : "no",
          locale: variant === "en" ? "en" : "nb",
        },
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus("error");
      setError(data.error || T.error);
      return;
    }

    setStatus("submitted");
  }

  return (
    <div className="uk-footer-feedback">
      <button
        type="button"
        className="uk-btn uk-btn--sm uk-footer-feedback__trigger"
        onClick={() => setOpen(true)}
      >
        {T.button}
      </button>

      {open && (
        <div className="uk-footer-feedback__backdrop" role="presentation" onClick={close}>
          <section
            className="uk-footer-feedback__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-feedback-title"
            onClick={(event) => event.stopPropagation()}
          >
            {status === "submitted" ? (
              <div className="uk-footer-feedback__success">
                <h2 id="footer-feedback-title">{T.title}</h2>
                <p>{T.success}</p>
                <button type="button" className="uk-btn uk-btn--primary" onClick={close}>
                  {T.close}
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <button
                  type="button"
                  className="uk-footer-feedback__close"
                  onClick={close}
                  aria-label={T.close}
                >
                  ×
                </button>
                <h2 id="footer-feedback-title">{T.title}</h2>
                <p className="uk-footer-feedback__intro">{T.intro}</p>

                <label className="uk-footer-feedback__field">
                  <span>{T.commentLabel}</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder={T.commentPlaceholder}
                    rows={5}
                  />
                </label>

                <label className="uk-footer-feedback__field">
                  <span>{T.screenshotLabel}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      setScreenshotNote(
                        file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : "",
                      );
                    }}
                  />
                  <small>{T.screenshotHint}</small>
                  {screenshotNote && <small>{`${T.screenshotPicked} ${screenshotNote}`}</small>}
                </label>

                <div className="uk-footer-feedback__context">
                  <span>{T.contextLabel}</span>
                  <code>{context?.url ?? ""}</code>
                </div>

                {error && (
                  <p className="uk-footer-feedback__error" role="alert">
                    {error}
                  </p>
                )}

                <div className="uk-footer-feedback__actions">
                  <button type="button" className="uk-btn" onClick={close}>
                    {T.cancel}
                  </button>
                  <button
                    type="submit"
                    className="uk-btn uk-btn--primary"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting" ? T.submitting : T.submit}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

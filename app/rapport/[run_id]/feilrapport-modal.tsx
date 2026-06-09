"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tilbakemelding-modal for rapport-sida (Dag 5).
 *
 * Triggast frå "Send tilbakemelding"-knappen i actions-panelet.
 * Features:
 * - Multi-select type-chips (5 spec'a chips)
 * - Seksjon-dropdown (matchar konsoliderte TOC-seksjonar frå dag 3)
 * - Alvorlegheits-radio (held for dag 6 sin Slack-webhook-trigger)
 * - Auto-vedlegg-blokk med Rapport-ID + Run-ID (transparens)
 * - Focus-trap, Escape-to-close, click-outside-to-close, body-scroll-lock
 * - i18n: tek displayLanguage-prop ("nb" | "nn" | "en") frå parent
 */

type LangKey = "nb" | "nn" | "en";

const ERROR_TYPES: { value: string; labels: Record<LangKey, string> }[] = [
  {
    value: "feil_talverdi",
    labels: { nb: "Feil tall", nn: "Feil tal", en: "Wrong number" },
  },
  {
    value: "feil_tolking",
    labels: { nb: "Feil tolkning", nn: "Feil tolking", en: "Wrong interpretation" },
  },
  {
    value: "feil_standardreferanse",
    labels: {
      nb: "Mangler standardreferanse",
      nn: "Manglar standardreferanse",
      en: "Missing standard reference",
    },
  },
  {
    value: "uklart_sprak",
    labels: { nb: "Uklart språk", nn: "Uklart språk", en: "Unclear language" },
  },
  {
    value: "manglande_kontroll",
    labels: {
      nb: "Manglende kontroll",
      nn: "Manglande kontroll",
      en: "Missing check",
    },
  },
  {
    value: "anna",
    labels: { nb: "Annet", nn: "Anna", en: "Other" },
  },
];

const SECTION_VALUES = [
  "Heile rapporten",
  "Samandrag",
  "Berekning",
  "Vurdering",
  "Kontroll",
  "Stegvis utrekning",
] as const;

const SECTION_LABELS: Record<(typeof SECTION_VALUES)[number], Record<LangKey, string>> = {
  "Heile rapporten": { nb: "Hele rapporten", nn: "Heile rapporten", en: "Entire report" },
  Samandrag: { nb: "Sammendrag", nn: "Samandrag", en: "Summary" },
  Berekning: { nb: "Beregning", nn: "Berekning", en: "Calculation" },
  Vurdering: { nb: "Vurdering", nn: "Vurdering", en: "Assessment" },
  Kontroll: { nb: "Kontroll", nn: "Kontroll", en: "Review" },
  "Stegvis utrekning": {
    nb: "Stegvis utregning",
    nn: "Stegvis utrekning",
    en: "Step-by-step calculation",
  },
};

const SEVERITIES: { value: "low" | "medium" | "high"; labels: Record<LangKey, string> }[] = [
  { value: "low", labels: { nb: "Lav", nn: "Låg", en: "Low" } },
  { value: "medium", labels: { nb: "Middels", nn: "Middels", en: "Medium" } },
  { value: "high", labels: { nb: "Høy", nn: "Høg", en: "High" } },
];

const COPY: Record<LangKey, {
  title: string;
  subtitle: string;
  typeLabel: string;
  typeHint: string;
  sectionLabel: string;
  severityLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  attachmentLabel: string;
  reportIdLabel: string;
  runIdLabel: string;
  cancel: string;
  submit: string;
  submitting: string;
  closeAria: string;
  successTitle: string;
  successBody: string;
  successClose: string;
  errorPickType: string;
  errorCommentShort: string;
  errorGeneric: string;
  errorUnknown: string;
  bugToolTitle: string;
  bugToolSubtitle: string;
  screenshotLabel: string;
  screenshotHint: string;
  screenshotPickedLabel: string;
  contextLabel: string;
  pageUrlLabel: string;
  viewportLabel: string;
  browserLabel: string;
  entryPointLabel: string;
}> = {
  nb: {
    title: "Send tilbakemelding",
    subtitle: "Hjelp oss å forbedre Pilar. Alle innsendinger blir gjennomgått manuelt.",
    typeLabel: "Type feil",
    typeHint: "(velg en eller flere)",
    sectionLabel: "Hvilken del av rapporten gjelder det?",
    severityLabel: "Alvorlighet",
    commentLabel: "Kommentar",
    commentPlaceholder: "Forklar hva som er feil og hva du forventet...",
    attachmentLabel: "Følger med innsendingen",
    reportIdLabel: "Rapport-ID:",
    runIdLabel: "Run-ID:",
    cancel: "Avbryt",
    submit: "Send tilbakemelding →",
    submitting: "Sender...",
    closeAria: "Lukk modal",
    successTitle: "Takk for tilbakemeldingen",
    successBody:
      "Innsendingen er lagret og blir gjennomgått manuelt. Bruker-tilbakemeldinger hjelper oss å fange feil som agentkontrollen ikke oppdaget, og å gjøre systemet bedre.",
    successClose: "Lukk",
    errorPickType: "Velg minst én feiltype.",
    errorCommentShort: "Kommentaren må være minst 5 tegn.",
    errorGeneric: "Kunne ikke sende tilbakemelding",
    errorUnknown: "Ukjent feil",
    bugToolTitle: "Meld feil",
    bugToolSubtitle: "Send en rask feilrapport fra denne rapportvisningen. Teknisk kontekst legges ved automatisk.",
    screenshotLabel: "Skjermbilde",
    screenshotHint: "Midlertidig: velg et bilde hvis du har et. Filnavn og størrelse lagres i admin, men selve bildet lagres ikke ennå.",
    screenshotPickedLabel: "Valgt skjermbilde:",
    contextLabel: "Teknisk kontekst",
    pageUrlLabel: "Side:",
    viewportLabel: "Visning:",
    browserLabel: "Nettleser:",
    entryPointLabel: "Kilde:",
  },
  nn: {
    title: "Send tilbakemelding",
    subtitle: "Hjelp oss å forbetre Pilar. Alle innsendingar blir gjennomgått manuelt.",
    typeLabel: "Type feil",
    typeHint: "(vel ein eller fleire)",
    sectionLabel: "Kva del av rapporten gjeld det?",
    severityLabel: "Alvorlegheit",
    commentLabel: "Kommentar",
    commentPlaceholder: "Forklar kva som er feil og kva du forventa...",
    attachmentLabel: "Følgjer med innsendinga",
    reportIdLabel: "Rapport-ID:",
    runIdLabel: "Run-ID:",
    cancel: "Avbryt",
    submit: "Send tilbakemelding →",
    submitting: "Sender...",
    closeAria: "Lukk modal",
    successTitle: "Takk for tilbakemeldinga",
    successBody:
      "Innsendinga er lagra og blir gjennomgått manuelt. Brukar-tilbakemeldingar hjelper oss å fange feil som agentkontrollen ikkje oppdaga, og å gjere systemet betre.",
    successClose: "Lukk",
    errorPickType: "Vel minst éin feiltype.",
    errorCommentShort: "Kommentaren må vere minst 5 teikn.",
    errorGeneric: "Kunne ikkje sende tilbakemelding",
    errorUnknown: "Ukjend feil",
    bugToolTitle: "Meld feil",
    bugToolSubtitle: "Send ein rask feilrapport frå denne rapportvisinga. Teknisk kontekst blir lagt ved automatisk.",
    screenshotLabel: "Skjermbilete",
    screenshotHint: "Mellombels: vel eit bilete om du har eit. Filnamn og storleik blir lagra i admin, men sjølve biletet blir ikkje lagra enno.",
    screenshotPickedLabel: "Valt skjermbilete:",
    contextLabel: "Teknisk kontekst",
    pageUrlLabel: "Side:",
    viewportLabel: "Vising:",
    browserLabel: "Nettlesar:",
    entryPointLabel: "Kjelde:",
  },
  en: {
    title: "Send feedback",
    subtitle: "Help us improve PILAR. All submissions are reviewed manually.",
    typeLabel: "Type of issue",
    typeHint: "(select one or more)",
    sectionLabel: "Which part of the report does it concern?",
    severityLabel: "Severity",
    commentLabel: "Comment",
    commentPlaceholder: "Explain what is wrong and what you expected...",
    attachmentLabel: "Attached to the submission",
    reportIdLabel: "Report ID:",
    runIdLabel: "Run ID:",
    cancel: "Cancel",
    submit: "Send feedback →",
    submitting: "Sending...",
    closeAria: "Close modal",
    successTitle: "Thank you for the feedback",
    successBody:
      "Your submission has been saved and will be reviewed manually. User feedback helps us catch errors the agent review missed and improve the system.",
    successClose: "Close",
    errorPickType: "Select at least one issue type.",
    errorCommentShort: "The comment must be at least 5 characters.",
    errorGeneric: "Could not send feedback",
    errorUnknown: "Unknown error",
    bugToolTitle: "Report a bug",
    bugToolSubtitle: "Send a quick bug report from this report view. Technical context is attached automatically.",
    screenshotLabel: "Screenshot",
    screenshotHint: "Temporary: select an image if you have one. The file name and size are saved in admin, but the image itself is not stored yet.",
    screenshotPickedLabel: "Selected screenshot:",
    contextLabel: "Technical context",
    pageUrlLabel: "Page:",
    viewportLabel: "Viewport:",
    browserLabel: "Browser:",
    entryPointLabel: "Source:",
  },
};

type Severity = "low" | "medium" | "high";
type SubmitState = "idle" | "submitting" | "submitted" | "error";
type FeedbackEntryPoint = "actions" | "bugfix";
type PageContext = {
  url: string;
  viewport: string;
  browser: string;
  source: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  reportId: string;
  documentId: string;
  runId: string;
  /** "nb" | "nn" | "en" — frå parent (typisk reportDisplayLanguage). Default "nb". */
  displayLanguage?: LangKey;
  entryPoint?: FeedbackEntryPoint;
};

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

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

export default function FeilrapportModal({
  open,
  onClose,
  reportId,
  documentId,
  runId,
  displayLanguage = "nb",
  entryPoint = "actions",
}: Props) {
  const T = COPY[displayLanguage];
  const [errorTypes, setErrorTypes] = useState<string[]>([]);
  const [section, setSection] = useState<string>("Heile rapporten");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [comment, setComment] = useState("");
  const [screenshotNote, setScreenshotNote] = useState("");
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const firstChipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    setPageContext({
      url: maskShareTokenInUrl(window.location.href),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      browser: truncate(window.navigator.userAgent, 180),
      source: entryPoint === "bugfix" ? "floating bugfix button" : "report actions",
    });

    if (entryPoint === "bugfix") {
      setErrorTypes((prev) => (prev.length > 0 ? prev : ["anna"]));
      setSection("Heile rapporten");
      setSeverity("medium");
    }
  }, [entryPoint, open]);

  // Focus-trap + Escape + body-scroll-lock når modal er open
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Fokus første chip etter rendering har stabilisert
    const focusTimer = setTimeout(() => {
      firstChipRef.current?.focus();
    }, 50);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;

      // Focus-trap: hold Tab/Shift+Tab innanfor modalen
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
      clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    if (submitState === "submitting") return; // ikkje tillat lukking midt i innsending
    onClose();
    // Reset state etter at modalen har fada ut (220ms = animasjons-tid + buffer)
    setTimeout(() => {
      setErrorTypes([]);
      setSection("Heile rapporten");
      setSeverity("medium");
      setComment("");
      setScreenshotNote("");
      setPageContext(null);
      setSubmitState("idle");
      setErrorMessage("");
    }, 220);
  }

  function toggleType(value: string) {
    setErrorTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit() {
    setErrorMessage("");

    if (errorTypes.length === 0) {
      setErrorMessage(T.errorPickType);
      return;
    }
    if (comment.trim().length < 5) {
      setErrorMessage(T.errorCommentShort);
      return;
    }

    setSubmitState("submitting");

    try {
      const contextLines = [
        "",
        "---",
        "[PILAR bugfix context]",
        `${T.entryPointLabel} ${pageContext?.source ?? "unknown"}`,
        `${T.pageUrlLabel} ${pageContext?.url ?? "unknown"}`,
        `${T.viewportLabel} ${pageContext?.viewport ?? "unknown"}`,
        `${T.browserLabel} ${pageContext?.browser ?? "unknown"}`,
        screenshotNote ? `${T.screenshotPickedLabel} ${screenshotNote}` : "",
      ].filter(Boolean);
      const enrichedComment = `${comment.trim()}\n${contextLines.join("\n")}`;

      const res = await fetch("/api/error-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          error_types: errorTypes,
          selected_section: section,
          severity_user: severity,
          user_comment: enrichedComment,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || T.errorGeneric);
      }

      setSubmitState("submitted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : T.errorUnknown;
      setErrorMessage(msg);
      setSubmitState("error");
    }
  }

  if (!open) return null;

  const modalTitle = entryPoint === "bugfix" ? T.bugToolTitle : T.title;
  const modalSubtitle = entryPoint === "bugfix" ? T.bugToolSubtitle : T.subtitle;

  return (
    <div
      className="feilrapport-modal-backdrop"
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="feilrapport-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feilrapport-modal-title"
      >
        {submitState === "submitted" ? (
          <div className="feilrapport-modal__success">
            <h2 id="feilrapport-modal-title">{T.successTitle}</h2>
            <p>{T.successBody}</p>
            <div className="feilrapport-modal__actions">
              <button onClick={handleClose} className="uk-btn uk-btn--primary">
                {T.successClose}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="feilrapport-modal__close"
              onClick={handleClose}
              aria-label={T.closeAria}
              tabIndex={-1}
            >
              ×
            </button>

            <h2 id="feilrapport-modal-title" className="feilrapport-modal__title">
              {modalTitle}
            </h2>
            <p className="feilrapport-modal__subtitle">{modalSubtitle}</p>

            {/* TYPE-CHIPS (multi-select) */}
            <div className="feilrapport-modal__field">
              <span className="feilrapport-modal__label">
                {T.typeLabel} <span className="feilrapport-modal__label-hint">{T.typeHint}</span>
              </span>
              <div className="feilrapport-modal__chips" role="group">
                {ERROR_TYPES.map((t, i) => {
                  const active = errorTypes.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      ref={i === 0 ? firstChipRef : null}
                      type="button"
                      className={`feilrapport-modal__chip${
                        active ? " feilrapport-modal__chip--active" : ""
                      }`}
                      onClick={() => toggleType(t.value)}
                      aria-pressed={active}
                    >
                      {t.labels[displayLanguage]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEKSJON-DROPDOWN */}
            <div className="feilrapport-modal__field">
              <label htmlFor="fr-section" className="feilrapport-modal__label">
                {T.sectionLabel}
              </label>
              <select
                id="fr-section"
                className="feilrapport-modal__select"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {SECTION_VALUES.map((s) => (
                  <option key={s} value={s}>{SECTION_LABELS[s][displayLanguage]}</option>
                ))}
              </select>
            </div>

            {/* ALVORLEGHEIT */}
            <div className="feilrapport-modal__field">
              <span className="feilrapport-modal__label">{T.severityLabel}</span>
              <div className="feilrapport-modal__severity" role="radiogroup">
                {SEVERITIES.map((s) => (
                  <label key={s.value} className="feilrapport-modal__severity-option">
                    <input
                      type="radio"
                      name="severity"
                      value={s.value}
                      checked={severity === s.value}
                      onChange={() => setSeverity(s.value as Severity)}
                    />
                    <span>{s.labels[displayLanguage]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* KOMMENTAR */}
            <div className="feilrapport-modal__field">
              <label htmlFor="fr-comment" className="feilrapport-modal__label">
                {T.commentLabel}
              </label>
              <textarea
                id="fr-comment"
                className="feilrapport-modal__textarea"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={T.commentPlaceholder}
                rows={5}
              />
            </div>

            {/* SKJERMBILDE-NOTAT */}
            <div className="feilrapport-modal__field">
              <label htmlFor="fr-screenshot" className="feilrapport-modal__label">
                {T.screenshotLabel}
              </label>
              <input
                id="fr-screenshot"
                className="feilrapport-modal__file"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  setScreenshotNote(
                    file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : "",
                  );
                }}
              />
              <p className="feilrapport-modal__hint">{T.screenshotHint}</p>
              {screenshotNote && (
                <p className="feilrapport-modal__hint">
                  {T.screenshotPickedLabel} {screenshotNote}
                </p>
              )}
            </div>

            {/* AUTO-VEDLEGG */}
            <div className="feilrapport-modal__attachment">
              <div className="feilrapport-modal__attachment-label">
                {T.attachmentLabel}
              </div>
              <pre className="feilrapport-modal__attachment-data">
{`${T.reportIdLabel}  ${documentId}
${T.runIdLabel}      ${runId.slice(0, 8)}…`}
              </pre>
              <pre className="feilrapport-modal__attachment-data feilrapport-modal__attachment-data--context">
{`${T.contextLabel}
${T.pageUrlLabel} ${pageContext?.url ?? "unknown"}
${T.viewportLabel} ${pageContext?.viewport ?? "unknown"}`}
              </pre>
            </div>

            {errorMessage && (
              <p className="feilrapport-modal__error" role="alert">
                {errorMessage}
              </p>
            )}

            {/* ACTIONS */}
            <div className="feilrapport-modal__actions">
              <button
                onClick={handleClose}
                className="uk-btn"
                disabled={submitState === "submitting"}
              >
                {T.cancel}
              </button>
              <button
                onClick={handleSubmit}
                className="uk-btn uk-btn--primary"
                disabled={submitState === "submitting"}
              >
                {submitState === "submitting" ? T.submitting : T.submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

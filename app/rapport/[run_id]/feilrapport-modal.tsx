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
 */

const ERROR_TYPES = [
  { value: "feil_talverdi", label: "Feil tal" },
  { value: "feil_tolking", label: "Feil tolking" },
  { value: "feil_standardreferanse", label: "Manglar standardreferanse" },
  { value: "uklart_sprak", label: "Uklart språk" },
  { value: "manglande_kontroll", label: "Manglande kontroll" },
] as const;

const SECTIONS = [
  "Heile rapporten",
  "Samandrag",
  "Berekning",
  "Vurdering",
  "Kontroll",
  "Stegvis utrekning",
] as const;

const SEVERITIES = [
  { value: "low", label: "Låg" },
  { value: "medium", label: "Middels" },
  { value: "high", label: "Høg" },
] as const;

type Severity = "low" | "medium" | "high";
type SubmitState = "idle" | "submitting" | "submitted" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  reportId: string;
  documentId: string;
  runId: string;
};

export default function FeilrapportModal({
  open,
  onClose,
  reportId,
  documentId,
  runId,
}: Props) {
  const [errorTypes, setErrorTypes] = useState<string[]>([]);
  const [section, setSection] = useState<string>("Heile rapporten");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [comment, setComment] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const firstChipRef = useRef<HTMLButtonElement>(null);

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
      setErrorMessage("Vel minst éin feiltype.");
      return;
    }
    if (comment.trim().length < 5) {
      setErrorMessage("Kommentaren må vere minst 5 teikn.");
      return;
    }

    setSubmitState("submitting");

    try {
      const res = await fetch("/api/error-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          error_types: errorTypes,
          selected_section: section,
          severity_user: severity,
          user_comment: comment.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Kunne ikkje sende tilbakemelding");
      }

      setSubmitState("submitted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ukjend feil";
      setErrorMessage(msg);
      setSubmitState("error");
    }
  }

  if (!open) return null;

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
            <h2 id="feilrapport-modal-title">Takk for tilbakemeldinga</h2>
            <p>
              Innsendinga er lagra og blir gjennomgått manuelt. Brukar-tilbakemeldingar
              hjelper oss å fange feil som agentkontrollen ikkje oppdaga, og å gjere
              systemet betre.
            </p>
            <div className="feilrapport-modal__actions">
              <button onClick={handleClose} className="uk-btn uk-btn--primary">
                Lukk
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="feilrapport-modal__close"
              onClick={handleClose}
              aria-label="Lukk modal"
              tabIndex={-1}
            >
              ×
            </button>

            <h2 id="feilrapport-modal-title" className="feilrapport-modal__title">
              Send tilbakemelding
            </h2>
            <p className="feilrapport-modal__subtitle">
              Hjelp oss å forbetre Pilar. Alle innsendingar blir gjennomgått manuelt.
            </p>

            {/* TYPE-CHIPS (multi-select) */}
            <div className="feilrapport-modal__field">
              <span className="feilrapport-modal__label">
                Type feil <span className="feilrapport-modal__label-hint">(vel ein eller fleire)</span>
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
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEKSJON-DROPDOWN */}
            <div className="feilrapport-modal__field">
              <label htmlFor="fr-section" className="feilrapport-modal__label">
                Kva del av rapporten gjeld det?
              </label>
              <select
                id="fr-section"
                className="feilrapport-modal__select"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* ALVORLEGHEIT */}
            <div className="feilrapport-modal__field">
              <span className="feilrapport-modal__label">Alvorlegheit</span>
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
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* KOMMENTAR */}
            <div className="feilrapport-modal__field">
              <label htmlFor="fr-comment" className="feilrapport-modal__label">
                Kommentar
              </label>
              <textarea
                id="fr-comment"
                className="feilrapport-modal__textarea"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Forklar kva som er feil og kva du forventa..."
                rows={5}
              />
            </div>

            {/* AUTO-VEDLEGG */}
            <div className="feilrapport-modal__attachment">
              <div className="feilrapport-modal__attachment-label">
                Følgjer med innsendinga
              </div>
              <pre className="feilrapport-modal__attachment-data">
{`Rapport-ID:  ${documentId}
Run-ID:      ${runId.slice(0, 8)}…`}
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
                Avbryt
              </button>
              <button
                onClick={handleSubmit}
                className="uk-btn uk-btn--primary"
                disabled={submitState === "submitting"}
              >
                {submitState === "submitting" ? "Sender..." : "Send tilbakemelding →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}